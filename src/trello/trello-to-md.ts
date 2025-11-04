import "dotenv/config";
import fs from "fs/promises";
import path from "path";
import { TrelloProvider } from "./provider";
import { renderSingleStoryMarkdown } from "./renderer";
import { parseMarkdownToStories } from "./markdown-parser";
import { validateTrelloConfig } from "../utils/config-validator";
import { validateAndEnsureDirectory } from "../utils/directory-manager";
import { handleCommonErrors } from "../utils/error-handler";
import type { Story, Todo } from "./types";
import { parseFormattedStoryName, storyFileName } from "./story-format";

type TrelloToMdProviderLike = {
  listItems(boardId: string): Promise<any[]>;
  getLists(boardId: string): Promise<{ id: string; name: string }[]>;
};

function toArray(value: unknown): string[] {
  if (value === undefined || value === null) return [];
  if (Array.isArray(value)) return value.flatMap(toArray);
  if (typeof value === "string") return value.split(",").map(s => s.trim()).filter(Boolean);
  return [String(value)].map(s => s.trim()).filter(Boolean);
}

function normalizeFilters(...inputs: unknown[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const input of inputs) {
    for (const raw of toArray(input)) {
      const lower = raw.toLowerCase();
      if (!lower) continue;
      if (!seen.has(lower)) {
        seen.add(lower);
        out.push(lower);
      }
    }
  }
  return out;
}

function todosEqual(a: Todo[], b: Todo[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const ta = a[i];
    const tb = b[i];
    if ((ta.text || "").trim() !== (tb.text || "").trim()) return false;
    if (!!ta.done !== !!tb.done) return false;
  }
  return true;
}

function storyEquivalent(a: Story, b: Story): boolean {
  if ((a.storyId || "").trim() !== (b.storyId || "").trim()) return false;
  if ((a.title || "").trim() !== (b.title || "").trim()) return false;
  if ((a.status || "").trim() !== (b.status || "").trim()) return false;
  if ((a.body || "").trim() !== (b.body || "").trim()) return false;
  return todosEqual(a.todos || [], b.todos || []);
}

export function mapCardToStory(card: any, checklistName: string, options?: { priorityLabelMap?: Record<string, string>; memberAliasMap?: Record<string, string> }): Story {
  const rawName = String(card?.name || "").trim();
  const parsedName = parseFormattedStoryName(rawName);
  const rawId = extractStoryIdFromCustomFields(card);
  let storyId = rawId || "";
  if (parsedName.storyId && !storyId) storyId = parsedName.storyId;
  let title = rawName;
  if (parsedName.storyId) title = parsedName.title || "";
  const status = (card.idListName || "").replace(/[^\w\s-]/g, "").trim();
  const todos: Todo[] = [];
  if (Array.isArray(card.checklists)) {
    const cl = card.checklists.find((c: any) => c.name === checklistName);
    if (cl && Array.isArray(cl.checkItems)) {
      for (const it of cl.checkItems) {
        todos.push({ text: it.name, done: (it.state || "").toLowerCase() === "complete" });
      }
    }
  }
  const labels = Array.isArray(card.labels)
    ? card.labels.map((l: any) => (l?.name || "").trim()).filter((n: string) => !!n)
    : [];

  const assignees: string[] = [];
  if (Array.isArray(card.members)) {
    for (const m of card.members) {
      const username = m?.username || m?.fullName || m?.memberFullName || "";
      if (username) {
        if (options?.memberAliasMap) {
          const reverseMap: Record<string, string> = {};
          for (const [alias, trelloName] of Object.entries(options.memberAliasMap)) {
            reverseMap[trelloName.toLowerCase()] = alias;
          }
          const alias = reverseMap[username.toLowerCase()];
          assignees.push(alias || username);
        } else {
          assignees.push(username);
        }
      }
    }
  } else if (Array.isArray(card.idMembers)) {
    assignees.push(...card.idMembers.map((id: any) => String(id)));
  }

  const meta: Record<string, any> = { generatedId: !storyId };
  if (options?.priorityLabelMap && labels.length > 0) {
    const reverseMap: Record<string, string> = {};
    for (const [priority, labelName] of Object.entries(options.priorityLabelMap)) {
      reverseMap[labelName.toLowerCase()] = priority;
    }
    for (const label of labels) {
      const priority = reverseMap[label.toLowerCase()];
      if (priority) {
        meta.priority = priority;
        meta.priorityLabel = options.priorityLabelMap[priority] || label;
        break;
      }
    }
  }

  return {
    storyId,
    title,
    status,
    body: card.desc || "",
    todos,
    assignees,
    labels,
    meta
  };
}

function extractStoryIdFromCustomFields(card: any): string | "" {
  if (!Array.isArray(card.customFieldItems)) return "";
  for (const it of card.customFieldItems) {
    const v = it.value;
    if (!v) continue;
    if (typeof v.text === "string" && v.text) return v.text;
    if (typeof v.number === "string" && v.number) return v.number;
    if (typeof v.checked === "string" && v.checked) return v.checked;
  }
  return "";
}
function truncateBaseName(name: string, max: number): string {
  if (name.length <= max) return name;
  const extIdx = name.lastIndexOf(".");
  const ext = extIdx >= 0 ? name.slice(extIdx) : "";
  const base = extIdx >= 0 ? name.slice(0, extIdx) : name;
  const keep = Math.max(1, max - ext.length);
  return base.slice(0, keep) + ext;
}
function fileNameFromStory(s: Story): string {
  const base = storyFileName(s);
  return truncateBaseName(base, 200);
}
async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}
/**
 * Arguments interface for Trello to Markdown synchronization
 * 
 * @interface TrelloToMdArgs
 */
export interface TrelloToMdArgs {
  /**
   * Trello API key - required for authentication
   * @description Get your API key from https://developer.atlassian.com/cloud/trello/guides/rest-api/api-introduction/
   * @example "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6"
   * @validation Must be a 32-character hexadecimal string
   */
  trelloKey: string;

  /**
   * Trello API token - required for authentication
   * @description Generate a token from https://developer.atlassian.com/cloud/trello/guides/rest-api/api-introduction/
   * @example "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2g3h4"
   * @validation Must be a 64-character hexadecimal string
   */
  trelloToken: string;

  /**
   * Trello board ID - identifies the source board
   * @description Find your board ID in the Trello board URL
   * @example "5f4e3d2c1b0a9f8e7d6c5b4a"
   * @validation Must be a 24-character alphanumeric string
   */
  trelloBoardId: string;

  /**
   * Name of the checklist in Trello cards
   * @description Name of the checklist to export as markdown todos
   * @default "Todos"
   * @example "Tasks"
   */
  checklistName?: string;

  /**
   * Mapping of Trello list names to status values
   * @description Maps Trello list names to markdown status values
   * @default { "backlog": "Backlog", "ready": "Ready", "doing": "Doing", "done": "Done" }
   * @example { "To Do": "todo", "In Progress": "in-progress", "Done": "completed" }
   */
  trelloListMapJson?: Record<string, string> | string;

  /**
   * Output directory for markdown files
   * @description Directory to write markdown files (relative to projectRoot)
   * @default "trello"
   * @example "output/stories"
   */
  mdOutputDir?: string;

  /**
   * Project root directory
   * @description Base directory for resolving relative paths
   * @default process.cwd()
   * @example "/path/to/project"
   */
  projectRoot?: string;

  /**
   * Custom Trello provider implementation
   * @description Override default Trello provider for testing or customization
   */
  provider?: TrelloToMdProviderLike;

  /**
   * Filter by Trello list names
   * @description Only export cards from specified lists
   * @example ["Backlog", "In Progress"]
   */
  list?: string | string[];

  /**
   * Filter by label names
   * @description Only export cards with specified labels
   * @example ["bug", "feature"]
   */
  label?: string | string[];

  /**
   * Filter by story IDs
   * @description Only export cards with specified story IDs
   * @example ["STORY-1001", "STORY-1002"]
   */
  storyId?: string | string[];

  /**
   * Mapping of priority values to label names
   * @description Maps Trello label names back to priority metadata
   * @example { "high": "Priority: High", "medium": "Priority: Medium", "low": "Priority: Low" }
   */
  priorityLabelMap?: Record<string, string> | string;

  /**
   * Mapping of Trello usernames to member aliases
   * @description Maps Trello usernames to friendly names
   * @example { "john.doe": "john", "jane.smith": "jane" }
   */
  memberAliasMap?: Record<string, string> | string;
}

export async function trelloToMd(
  args?: TrelloToMdArgs,
  opts: { logLevel?: 'info' | 'debug'; json?: boolean; verbose?: boolean; projectRoot?: string } = {}
): Promise<{ written: number; files: { file: string; storyId: string; title: string; status: string }[]; totalCards: number; filteredCards: number }> {
  const projectRoot = opts.projectRoot ?? args?.projectRoot ?? process.cwd();
  const key = args?.trelloKey ?? process.env.TRELLO_KEY ?? "";
  const token = args?.trelloToken ?? process.env.TRELLO_TOKEN ?? "";
  const boardId = args?.trelloBoardId ?? process.env.TRELLO_BOARD_ID ?? "";

  // Skip validation if a custom provider is provided (for testing)
  if (!args?.provider) {
    const validation = validateTrelloConfig({
      trelloKey: key,
      trelloToken: token,
      trelloBoardId: boardId
    });

    if (!validation.isValid) {
      const errorMessages = validation.errors.map(e => `${e.field}: ${e.message}${e.suggestion ? ` (${e.suggestion})` : ''}`);
      throw new Error(`Configuration validation failed: ${errorMessages.join('; ')}`);
    }

    if (validation.warnings.length > 0) {
      validation.warnings.forEach(w => {
        const warningMsg = `Warning - ${w.field}: ${w.message}${w.suggestion ? ` (${w.suggestion})` : ''}`;
        console.warn(warningMsg);
      });
    }
  }
  const checklistName = args?.checklistName ?? process.env.CHECKLIST_NAME ?? "Todos";
  const listMapRaw = args?.trelloListMapJson ?? process.env.TRELLO_LIST_MAP_JSON ?? "";
  const outputDir = args?.mdOutputDir
    ? (path.isAbsolute(args.mdOutputDir) ? args.mdOutputDir : path.resolve(projectRoot, args.mdOutputDir))
    : (process.env.MD_OUTPUT_DIR
      ? (path.isAbsolute(process.env.MD_OUTPUT_DIR) ? process.env.MD_OUTPUT_DIR : path.resolve(projectRoot, process.env.MD_OUTPUT_DIR))
      : path.resolve(projectRoot, "trello"));

  const verbose = (opts.logLevel === 'debug') || !!opts.verbose;

  const outputDirValidation = await validateAndEnsureDirectory(outputDir);
  if (!outputDirValidation.success) {
    throw new Error(`Output directory validation failed: ${outputDirValidation.error}`);
  }

  if (outputDirValidation.created && verbose) {
    console.log(`trello-to-md: Created output directory: ${outputDir}`);
  }

  const listMap = (() => {
    const fallback = { backlog: "Backlog", ready: "Ready", doing: "Doing", done: "Done" } as Record<string, string>;
    if (!listMapRaw) return fallback;
    if (typeof listMapRaw !== "string") {
      const m: Record<string, string> = {};
      for (const k of Object.keys(listMapRaw)) m[k.toLowerCase()] = (listMapRaw as any)[k];
      return Object.keys(m).length ? m : fallback;
    }
    try {
      return JSON.parse(listMapRaw as string);
    } catch {
      const m: Record<string, string> = {};
      for (const pair of (listMapRaw as string).split(",").map(s => s.trim()).filter(Boolean)) {
        const [k, v] = pair.split(":").map(s => s.trim());
        if (k && v) m[k.toLowerCase()] = v;
      }
      return Object.keys(m).length ? m : fallback;
    }
  })();
  const logJson = !!opts.json;
  const listFilters = normalizeFilters(args?.list, process.env.TRELLO_FILTER_LIST);
  const labelFilters = normalizeFilters(args?.label, process.env.TRELLO_FILTER_LABEL);
  const storyIdFilters = normalizeFilters(args?.storyId, process.env.TRELLO_FILTER_STORYID);

  await ensureDir(outputDir);
  const provider: TrelloToMdProviderLike = args?.provider ?? new TrelloProvider({ auth: { key, token }, listMap, checklistName });
  const cards: any[] = await provider.listItems(boardId);
  if (verbose) console.log(`mdsync: fetched cards=${cards.length}`);
  const lists = await provider.getLists(boardId);
  const listNameById: Record<string, string> = {};
  for (const l of lists) listNameById[l.id] = l.name;
  for (const c of cards) c.idListName = listNameById[c.idList] || "";
  await fs.mkdir(outputDir, { recursive: true });
  let written = 0;
  const writtenFiles: { file: string; storyId: string; title: string; status: string }[] = [];
  const filteredCards = cards.filter((card: any) => {
    if (listFilters.length) {
      const listName = String(card.idListName || "").toLowerCase();
      if (!listFilters.includes(listName)) return false;
    }
    if (labelFilters.length && Array.isArray(card.labels)) {
      const cardLabels = card.labels.map((l: any) => String(l?.name || "").toLowerCase()).filter(Boolean);
      if (!labelFilters.some(l => cardLabels.includes(l))) return false;
    } else if (labelFilters.length && !Array.isArray(card.labels)) {
      return false;
    }
    if (storyIdFilters.length) {
      const sidRaw = extractStoryIdFromCustomFields(card) || parseFormattedStoryName(String(card?.name || "")).storyId || "";
      const sid = String(sidRaw).toLowerCase();
      if (!sid || !storyIdFilters.includes(sid)) return false;
    }
    return true;
  });

  const sortedCards = filteredCards.slice().sort((a, b) => {
    const parsedA = parseFormattedStoryName(String(a?.name || ""));
    const parsedB = parseFormattedStoryName(String(b?.name || ""));
    const idA = (extractStoryIdFromCustomFields(a) || parsedA.storyId || "").toLowerCase();
    const idB = (extractStoryIdFromCustomFields(b) || parsedB.storyId || "").toLowerCase();
    if (idA && idB && idA !== idB) return idA < idB ? -1 : 1;
    if (idA && !idB) return -1;
    if (!idA && idB) return 1;
    const titleA = (parsedA.title || a?.name || "").toLowerCase();
    const titleB = (parsedB.title || b?.name || "").toLowerCase();
    if (titleA !== titleB) return titleA < titleB ? -1 : 1;
    return String(a?.id || "").localeCompare(String(b?.id || ""));
  });

  if (listFilters.length && filteredCards.length === 0 && verbose) console.warn("trello-to-md: no cards found for list filters", listFilters);
  if (labelFilters.length && filteredCards.length === 0 && verbose) console.warn("trello-to-md: no cards found for label filters", labelFilters);
  if (storyIdFilters.length && filteredCards.length === 0 && verbose) console.warn("trello-to-md: no cards found for storyId filters", storyIdFilters);

  const priorityLabelMap = (() => {
    if (!args?.priorityLabelMap) return undefined;
    if (typeof args.priorityLabelMap === 'string') {
      try { return JSON.parse(args.priorityLabelMap); } catch { return undefined; }
    }
    return args.priorityLabelMap;
  })();
  const memberAliasMap = (() => {
    if (!args?.memberAliasMap) return undefined;
    if (typeof args.memberAliasMap === 'string') {
      try { return JSON.parse(args.memberAliasMap); } catch { return undefined; }
    }
    return args.memberAliasMap;
  })();

  for (const c of sortedCards) {
    const s = mapCardToStory(c, checklistName, { priorityLabelMap, memberAliasMap });
    const md = renderSingleStoryMarkdown(s);
    const file = path.join(outputDir, fileNameFromStory(s));
    await fs.writeFile(file, md, "utf8");
    written++;
    writtenFiles.push({ file, storyId: s.storyId, title: s.title, status: s.status });
    if (s.meta?.generatedId) {
      console.warn(`trello-to-md: generated storyId for "${s.title}"`);
    }
    try {
      const parsed = parseMarkdownToStories(md, { statusMap: listMap, defaultChecklistName: checklistName });
      const roundTrip = parsed[0];
      const equivalent = roundTrip ? storyEquivalent(s, roundTrip) : false;
      if (!equivalent && verbose) {
        console.warn(`Round-trip validation failed for ${s.storyId || s.title}, but continuing...`);
      }
    } catch (error) {
      if (verbose) {
        console.warn(`Round-trip validation error for ${s.storyId || s.title}: ${error}, but continuing...`);
      }
    }
    if (verbose) console.log(`mdsync: wrote "${file}" | ${s.storyId} | ${s.title} | ${s.status}`);
  }
  if (verbose) {
    console.log(`mdsync: written files=${written}`);
    writtenFiles.forEach(w => console.log(`  > ${w.file}`));
  }
  if (logJson) {
    try { console.log(JSON.stringify({ mdsyncDetails: { writtenFiles } })); } catch { }
  }
  return { written, files: writtenFiles, totalCards: cards.length, filteredCards: filteredCards.length };
}
if (require.main === module) {
  trelloToMd().then(r => {
    console.log(`written=${r.written}`);
  }).catch(e => {
    const syncError = handleCommonErrors(e);
    console.error(`[ERROR] trello-to-md: ${syncError.message}`);

    if (syncError.suggestion) {
      console.error(`[SUGGESTION] ${syncError.suggestion}`);
    }

    console.error(`[ERROR_CODE] ${syncError.code}`);

    const stack = (e as any)?.stack ? String((e as any).stack) : "";
    const nl = stack.indexOf(String.fromCharCode(10));
    const first = nl >= 0 ? stack.slice(0, nl) : (stack || String(e));
    console.error("[stack]", first);
    process.exit(1);
  });
}