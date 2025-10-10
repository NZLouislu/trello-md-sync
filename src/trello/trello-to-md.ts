import "dotenv/config";
import fs from "fs/promises";
import path from "path";
import { TrelloProvider } from "./provider";
import { renderSingleStoryMarkdown } from "./renderer";
import type { Story, Todo } from "./types";


export function mapCardToStory(card: any, checklistName: string): Story {
  const storyId = extractStoryIdFromCustomFields(card) || slugId(card.name || "");
  const status = card.idListName || "";
  const todos: Todo[] = [];
  if (Array.isArray(card.checklists)) {
    const cl = card.checklists.find((c: any) => c.name === checklistName);
    if (cl && Array.isArray(cl.checkItems)) {
      for (const it of cl.checkItems) {
        todos.push({ text: it.name, done: (it.state || "").toLowerCase() === "complete" });
      }
    }
  }
  return {
    storyId,
    title: card.name || "",
    status,
    body: card.desc || "",
    todos,
    assignees: [],
    labels: [],
    meta: {}
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
function slugId(title: string): string {
  const s = (title || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return s ? `mdsync-${s}` : "mdsync-untitled";
}
function safeSlug(s: string): string {
  return (s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
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
  const id = (s.storyId || "").trim();
  const titleSlug = safeSlug(s.title || "");
  const base = id ? `${safeSlug(id)}-${titleSlug || "untitled"}.md` : `mdsync-${titleSlug || "untitled"}.md`;
  return truncateBaseName(base, 120);
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
    trelloStoryIdCustomFieldId?: string;
    projectRoot?: string;
  },
  opts: { logLevel?: 'info'|'debug'; json?: boolean; verbose?: boolean; projectRoot?: string } = {}
): Promise<{ written: number }> {
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
  const storyIdField = args?.trelloStoryIdCustomFieldId ?? process.env.TRELLO_STORY_ID_CUSTOM_FIELD_ID ?? undefined;
  const verbose = (opts.logLevel === 'debug') || !!opts.verbose;
  const logJson = !!opts.json;

  await ensureDir(outputDir);
  const provider = new TrelloProvider({ auth: { key, token }, listMap, checklistName, storyIdCustomFieldId: storyIdField });
  const cards: any[] = await provider.listItems(boardId);
  if (verbose) console.log(`mdsync: fetched cards=${cards.length}`);
  const lists = await provider.getLists(boardId);
  const listNameById: Record<string,string> = {};
  for (const l of lists) listNameById[l.id] = l.name;
  for (const c of cards) c.idListName = listNameById[c.idList] || "";
  await fs.mkdir(outputDir, { recursive: true });
  let written = 0;
  const writtenFiles: { file: string; storyId: string; title: string; status: string }[] = [];
  for (const c of cards) {
    const s = mapCardToStory(c, checklistName);
    const md = renderSingleStoryMarkdown(s);
    const file = path.join(outputDir, fileNameFromStory(s));
    await fs.writeFile(file, md, "utf8");
    written++;
    writtenFiles.push({ file, storyId: s.storyId, title: s.title, status: s.status });
    if (verbose) console.log(`mdsync: wrote "${file}" | ${s.storyId} | ${s.title} | ${s.status}`);
  }
  if (verbose) {
    console.log(`mdsync: written files=${written}`);
    writtenFiles.forEach(w => console.log(`  > ${w.file}`));
  }
  if (logJson) {
    try { console.log(JSON.stringify({ mdsyncDetails: { writtenFiles } })); } catch {}
  }
  return { written };
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