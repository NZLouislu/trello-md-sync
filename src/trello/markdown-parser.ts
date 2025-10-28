import { normalizeStatus } from "./status-normalizer";
import type { Story, Todo } from "./types";

type ParserLocation = { file?: string; line: number };

export class MarkdownParseError extends Error {
  code: string;
  location: ParserLocation;
  details?: Record<string, any>;
  constructor(message: string, code: string, location: ParserLocation, details?: Record<string, any>) {
    super(message);
    this.name = "MarkdownParseError";
    this.code = code;
    this.location = location;
    this.details = details;
  }
}

type ParseOptions = {
  statusMap?: Record<string, string>;
  defaultChecklistName?: string;
  filePath?: string;
  strictStatus?: boolean;
  requireStoryId?: boolean;
};

const sectionHeaderRe = /^##\s+Story:\s*(.+)\s*$/i;
const columnHeaderRe = /^##\s+(?!Story:)(.+)\s*$/i;
const blockStoryRe = /^-\s*Story:\s*(.+)\s*$/i;

export function parseMarkdownToStories(md: string, options: ParseOptions = {}): Story[] {
  const lines = md.split(/\r?\n/);
  const stories: Story[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    const sec = line.match(sectionHeaderRe);
    if (sec) {
      const { story, nextIndex } = parseStorySection(lines, i, options);
      stories.push(story);
      i = nextIndex;
      continue;
    }

    const col = line.match(columnHeaderRe);
    if (col) {
      const column = col[1];
      i++;
      while (i < lines.length) {
        const l = lines[i];
        if (l.match(/^##\s+/)) break;
        const bs = l.match(blockStoryRe);
        if (bs) {
          const { story, nextIndex } = parseBlockStory(lines, i, column, options);
          stories.push(story);
          i = nextIndex;
          continue;
        }

        i++;
      }
      continue;
    }

    i++;
  }

  return stories;
}

function parseStorySection(lines: string[], start: number, options: ParseOptions): { story: Story; nextIndex: number } {
  const title = (lines[start].match(sectionHeaderRe)![1] || "").trim();
  let storyId = "";
  let status = "";

  let bodyLines: string[] = [];
  const todos: Todo[] = [];
  const assignees: string[] = [];
  const labels: string[] = [];
  const meta: Record<string, any> = {};

  let i = start + 1;
  let section = "";

  while (i < lines.length) {
    const l = lines[i];

    if (l.match(/^##\s+/) && i !== start) break;

    const h3 = l.match(/^###\s+(.+?)\s*$/);
    if (h3) {
      section = h3[1].toLowerCase();
      i++;
      continue;
    }

    if (section.includes("story id")) {
      if (l.trim()) storyId = l.trim();
    } else if (section.includes("status")) {
      if (l.trim()) status = l.trim();
    } else if (section.includes("description")) {
      bodyLines.push(l);
    } else if (section.includes("acceptance") || section.includes("criteria") || section.includes("todos")) {
      const todo = parseTodoLine(l);
      if (todo) todos.push(todo);
    } else if (section.includes("assignee")) {
      const vals = splitCsvLine(l);
      for (const v of vals) if (v) assignees.push(v);
    } else if (section.includes("label")) {
      const vals = splitCsvLine(l);
      for (const v of vals) if (v) labels.push(v);
    }

    i++;
  }

  const normalizedStatus = normalizeAndMapStatus(status, options.statusMap, options.strictStatus, {
    file: options.filePath,
    line: start + 1,
    context: title || status
  });
  if (!storyId && options.requireStoryId) {
    throw new MarkdownParseError("Story ID is required", "STORY_ID_MISSING", { file: options.filePath, line: start + 1 }, { title });
  }
  const finalId = storyId || slugId(title);

  const story: Story = {
    storyId: finalId,
    title,
    status: normalizedStatus,
    body: trimBody(bodyLines.join("\n")),
    todos,
    assignees,
    labels,
    meta: {
      ...meta,
      source: {
        file: options.filePath,
        line: start + 1
      }
    }
  };

  return { story, nextIndex: i };
}

function parseBlockStory(lines: string[], start: number, column: string, options: ParseOptions): { story: Story; nextIndex: number } {
  const title = (lines[start].match(blockStoryRe)![1] || "").trim();
  let storyId = "";

  let bodyLines: string[] = [];
  const todos: Todo[] = [];
  const assignees: string[] = [];
  const labels: string[] = [];
  const meta: Record<string, any> = {};

  let i = start + 1;
  while (i < lines.length) {
    const l = lines[i];

    if (l.match(/^-\s*Story:/i) || l.match(/^##\s+/)) break;

    const kv = l.match(/^\s{0,2}[-*]?\s*(\w[\w_ -]*):\s*(.*)$/i);
    if (kv) {
      const key = kv[1].toLowerCase().trim();
      const value = kv[2];

      if (key === "id" || key === "story id" || key === "story_id") {
        storyId = value.trim();
      } else if (key === "description" || key === "desc" || key === "body") {
        i++;
        const descLines: string[] = [];
        while (i < lines.length) {
          const dl = lines[i];
          if (dl.match(/^\s{0,2}[-*]?\s*\w[\w_ -]*:\s*.*$/) || dl.match(/^-\s*Story:/i) || dl.match(/^##\s+/)) {
            i--;
            break;
          }
          descLines.push(dl);
          i++;
        }
        bodyLines.push(value ? value : "");
        if (descLines.length) bodyLines.push(descLines.join("\n"));
      } else if (key === "acceptance_criteria" || key === "acceptance criteria" || key === "todos") {
        i++;
        while (i < lines.length) {
          const tl = lines[i];
          if (tl.match(/^\s{0,2}[-*]?\s*\w[\w_ -]*:\s*.*$/) || tl.match(/^-\s*Story:/i) || tl.match(/^##\s+/)) {
            i--;
            break;
          }
          const todo = parseTodoLine(tl);
          if (todo) todos.push(todo);
          i++;
        }
      } else if (key === "priority") {
        meta.priority = value.trim();
      } else if (key === "labels") {
        labels.push(...splitCsv(value));
      } else if (key === "assignees") {
        assignees.push(...splitCsv(value));
      } else {
        meta[key] = value.trim();
      }
    }

    i++;
  }

  const inferred = normalizeAndMapStatus(column, options.statusMap, options.strictStatus, {
    file: options.filePath,
    line: start + 1,
    context: title || column
  });
  if (!storyId && options.requireStoryId) {
    throw new MarkdownParseError("Story ID is required", "STORY_ID_MISSING", { file: options.filePath, line: start + 1 }, { title });
  }
  const finalId = storyId || slugId(title);

  const story: Story = {
    storyId: finalId,
    title,
    status: inferred,
    body: trimBody(bodyLines.join("\n")),
    todos,
    assignees,
    labels,
    meta: {
      ...meta,
      source: {
        file: options.filePath,
        line: start + 1
      }
    }
  };

  return { story, nextIndex: i };
}

function parseTodoLine(line: string): Todo | null {
  const m = line.match(/^\s*[-*]?\s*\[\s*([xX ])\s*\]\s*(.+)$/);
  if (!m) return null;
  const done = m[1].toLowerCase() === "x";
  const text = m[2].trim();
  return { text, done };
}

function splitCsv(val: string): string[] {
  return val.split(/[,;]\s*/).map((s) => s.trim()).filter(Boolean);
}

function splitCsvLine(line: string): string[] {
  if (!line.trim()) return [];
  return splitCsv(line);
}

function slugId(title: string): string {
  const s = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return s ? `mdsync-${s}` : `mdsync-untitled`;
}

function normalizeAndMapStatus(
  status: string,
  map: Record<string, string> | undefined,
  strict: boolean | undefined,
  ctx: { file?: string; line: number; context?: string }
): string {
  const n = normalizeStatus(status || "", map || {});
  const plain = n.replace(/\s+/g, " ").trim();
  if (!map) return plain;
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const key = norm(plain);
  let hit: string | undefined;
  for (const k of Object.keys(map)) {
    if (norm(k) === key) {
      hit = k;
      break;
    }
  }
  if (!hit && strict) {
    throw new MarkdownParseError("Status is not mapped", "STATUS_UNKNOWN", { file: ctx.file, line: ctx.line }, { status, context: ctx.context });
  }
  return hit ? map[hit] : plain;
}

function trimBody(s: string): string {
  return s.replace(/^\n+|\n+$/g, "");
}