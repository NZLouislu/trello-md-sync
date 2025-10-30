import "dotenv/config";
import fs from "fs/promises";
import path from "path";
import { TrelloProvider } from "./provider";
import { renderSingleStoryMarkdown } from "./renderer";
import { parseMarkdownToStories } from "./markdown-parser";
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

export function mapCardToStory(card: any, checklistName: string): Story {
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
  return {
    storyId,
    title,
    status,
    body: card.desc || "",
    todos,
    assignees: [],
    labels,
    meta: { generatedId: !storyId }
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
export async function trelloToMd(
  args?: {
    trelloKey: string;
    trelloToken: string;
    trelloBoardId: string;
    checklistName?: string;
    trelloListMapJson?: Record<string,string> | string;
    mdOutputDir?: string;
    projectRoot?: string;
    provider?: TrelloToMdProviderLike;
    list?: string | string[];
    label?: string | string[];
    storyId?: string | string[];
  },
  opts: { logLevel?: 'info'|'debug'; json?: boolean; verbose?: boolean; projectRoot?: string } = {}
): Promise<{ written: number; files: { file: string; storyId: string; title: string; status: string }[]; totalCards: number; filteredCards: number }> {
  const projectRoot = opts.projectRoot ?? args?.projectRoot ?? path.resolve(__dirname, "../../");
  const key = args?.trelloKey ?? process.env.TRELLO_KEY ?? "";
  const token = args?.trelloToken ?? process.env.TRELLO_TOKEN ?? "";
  const boardId = args?.trelloBoardId ?? process.env.TRELLO_BOARD_ID ?? "";
  const checklistName = args?.checklistName ?? process.env.CHECKLIST_NAME ?? "Todos";
  const listMapRaw = args?.trelloListMapJson ?? process.env.TRELLO_LIST_MAP_JSON ?? "";
  const outputDir = args?.mdOutputDir
    ? (path.isAbsolute(args.mdOutputDir) ? args.mdOutputDir : path.resolve(projectRoot, args.mdOutputDir))
    : (process.env.MD_OUTPUT_DIR
        ? (path.isAbsolute(process.env.MD_OUTPUT_DIR) ? process.env.MD_OUTPUT_DIR : path.resolve(projectRoot, process.env.MD_OUTPUT_DIR))
        : path.resolve(projectRoot, "trello"));
  const listMap = (() => {
    const fallback = { backlog: "Backlog", ready: "Ready", doing: "Doing", done: "Done" } as Record<string,string>;
    if (!listMapRaw) return fallback;
    if (typeof listMapRaw !== "string") {
      const m: Record<string,string> = {};
      for (const k of Object.keys(listMapRaw)) m[k.toLowerCase()] = (listMapRaw as any)[k];
      return Object.keys(m).length ? m : fallback;
    }
    try {
      return JSON.parse(listMapRaw as string);
    } catch {
      const m: Record<string,string> = {};
      for (const pair of (listMapRaw as string).split(",").map(s => s.trim()).filter(Boolean)) {
        const [k, v] = pair.split(":").map(s => s.trim());
        if (k && v) m[k.toLowerCase()] = v;
      }
      return Object.keys(m).length ? m : fallback;
    }
  })();
  const verbose = (opts.logLevel === 'debug') || !!opts.verbose;
  const logJson = !!opts.json;
  const listFilters = normalizeFilters(args?.list, process.env.TRELLO_FILTER_LIST);
  const labelFilters = normalizeFilters(args?.label, process.env.TRELLO_FILTER_LABEL);
  const storyIdFilters = normalizeFilters(args?.storyId, process.env.TRELLO_FILTER_STORYID);

  await ensureDir(outputDir);
  const provider: TrelloToMdProviderLike = args?.provider ?? new TrelloProvider({ auth: { key, token }, listMap, checklistName });
  const cards: any[] = await provider.listItems(boardId);
  if (verbose) console.log(`mdsync: fetched cards=${cards.length}`);
  const lists = await provider.getLists(boardId);
  const listNameById: Record<string,string> = {};
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

  for (const c of sortedCards) {
    const s = mapCardToStory(c, checklistName);
    const md = renderSingleStoryMarkdown(s);
    const file = path.join(outputDir, fileNameFromStory(s));
    await fs.writeFile(file, md, "utf8");
    written++;
    writtenFiles.push({ file, storyId: s.storyId, title: s.title, status: s.status });
    if (s.meta?.generatedId) {
      console.warn(`trello-to-md: generated storyId for "${s.title}"`);
    }
    const parsed = parseMarkdownToStories(md, { statusMap: listMap, defaultChecklistName: checklistName });
    const roundTrip = parsed[0];
    const equivalent = roundTrip ? storyEquivalent(s, roundTrip) : false;
    if (!equivalent) {
      throw new Error(`Round-trip validation failed for ${s.storyId || s.title}`);
    }
    if (verbose) console.log(`mdsync: wrote "${file}" | ${s.storyId} | ${s.title} | ${s.status}`);
  }
  if (verbose) {
    console.log(`mdsync: written files=${written}`);
    writtenFiles.forEach(w => console.log(`  > ${w.file}`));
  }
  if (logJson) {
    try { console.log(JSON.stringify({ mdsyncDetails: { writtenFiles } })); } catch {}
  }
  return { written, files: writtenFiles, totalCards: cards.length, filteredCards: filteredCards.length };
}
if (require.main === module) {
  trelloToMd().then(r => {
    console.log(`written=${r.written}`);
  }).catch(e => {
    const msg = (e as any)?.message || String(e);
    console.error(`[ERROR] trello-to-md: ${msg}`);
    const stack = (e as any)?.stack ? String((e as any).stack) : "";
    const nl = stack.indexOf(String.fromCharCode(10));
    const first = nl >= 0 ? stack.slice(0, nl) : (stack || String(e));
    console.error("[stack]", first);
    process.exit(1);
  });
}