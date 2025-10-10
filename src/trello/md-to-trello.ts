import fs from "fs/promises";
import path from "path";
import { parseMarkdownToStories } from "./markdown-parser";
import { renderSingleStoryMarkdown, preferredStoryFileName } from "./renderer";
import { TrelloProvider } from "./provider";
import type { Story } from "./types";



export interface MdToTrelloConfig {
  trelloKey: string;
  trelloToken: string;
  trelloBoardId: string;
  trelloListMapJson?: Record<string, string> | string;
  trelloStoryIdCustomFieldId?: string;
  mdInputDir?: string;
  mdOutputDir?: string;
  checklistName?: string;
  projectRoot?: string;
  logLevel?: 'info'|'debug';
  json?: boolean;
  writeLocal?: boolean;
  dryRun?: boolean;
  strictStatus?: boolean;
  concurrency?: number;
}



async function readAllMarkdown(dir: string): Promise<{ file: string; content: string }[]> {
  const ents = await fs.readdir(dir);
  const out: { file: string; content: string }[] = [];
  for (const f of ents) {
    if (!f.toLowerCase().endsWith(".md")) continue;
    const p = path.join(dir, f);
    const c = await fs.readFile(p, "utf8");
    out.push({ file: p, content: c });
  }
  return out;
}



async function ensureRenderedOut(stories: Story[], outDir: string): Promise<string[]> {
  await fs.mkdir(outDir, { recursive: true });
  const files: string[] = [];
  for (const s of stories) {
    const md = renderSingleStoryMarkdown(s);
    const name = preferredStoryFileName(s);
    const full = path.join(outDir, name);
    await fs.writeFile(full, md, "utf8");
    files.push(full);
  }
  return files;
}

function extendStatusMap(base: Record<string, string>): Record<string, string> {
  const m = { ...base };
  if (m.backlog && !m.todo) m.todo = m.backlog;
  if (m["in progress"] && !m.doing) m.doing = m["in progress"];
  if (m.doing && !m["in progress"]) m["in progress"] = m.doing;
  if (m["in review"] && !m.review) m.review = m["in review"];
  return m;
}

export async function mdToTrello(
  cfg: MdToTrelloConfig
): Promise<{
  result: {
    created: number;
    updated: number;
    skipped: number;
    failed: number;
    errors: { storyId: string; title: string; message: string }[];
  };
  logs: string[];
}> {
  const logs: string[] = [];
  const projectRoot = cfg.projectRoot;
  if (!projectRoot) {
    const msg = "Please specify the markdown files path (set opts.projectRoot or args.projectRoot).";
    console.error(msg);
    logs.push(msg);
    return { result: { created: 0, updated: 0, skipped: 0, failed: 1, errors: [{ storyId: "", title: "(init)", message: msg }] }, logs };
  }

  const key = cfg.trelloKey;
  const token = cfg.trelloToken;
  const boardId = cfg.trelloBoardId;

  if (!key) throw new Error("trelloKey is required.");
  if (!token) throw new Error("trelloToken is required.");
  if (!boardId) throw new Error("trelloBoardId is required.");

  const inputDir = cfg.mdInputDir
    ? (path.isAbsolute(cfg.mdInputDir) ? cfg.mdInputDir : path.resolve(projectRoot, cfg.mdInputDir))
    : path.resolve(projectRoot, "examples/md");
  const outputDir = cfg.mdOutputDir
    ? (path.isAbsolute(cfg.mdOutputDir) ? cfg.mdOutputDir : path.resolve(projectRoot, cfg.mdOutputDir))
    : path.resolve(projectRoot, "examples/items");
  const checklistName = cfg.checklistName || "Todos";

  const fallbackMap: Record<string,string> = {
    backlog: "Backlog",
    ready: "Ready",
    doing: "Doing",
    "in progress": "Doing",
    "in review": "In review",
    review: "In review",
    done: "Done",
    todo: "Backlog"
  };
  let listMapBase: Record<string,string> = fallbackMap;
  if (cfg.trelloListMapJson) {
    if (typeof cfg.trelloListMapJson === "string") {
      try { listMapBase = JSON.parse(cfg.trelloListMapJson as string); } catch { listMapBase = fallbackMap; }
    } else {
      listMapBase = cfg.trelloListMapJson as Record<string,string>;
    }
  }
  const extendedMap = extendStatusMap(listMapBase);

  const concurrency = typeof cfg.concurrency === 'number' ? cfg.concurrency : 4;
  const dryRun = !!cfg.dryRun;
  const strictStatus = !!cfg.strictStatus;
  const shouldWriteLocal = !!cfg.writeLocal;

  const verbose = (cfg.logLevel === 'debug');
  const logJson = !!cfg.json;

  const vlog = (...args: any[]) => {
    const msg = args.map(a => {
      if (typeof a === "string") return a;
      try { return JSON.stringify(a); } catch { return String(a); }
    }).join(" ");
    logs.push(msg);
    if (verbose) console.log(...args);
  };

  vlog("[init] inputDir=", inputDir, "outputDir=", outputDir, "concurrency=", concurrency, "strictStatus=", strictStatus, "dryRun=", dryRun);
  vlog("[init] checklistName=", checklistName);
  vlog("[init] listMap(normalized)=", JSON.stringify(extendedMap));

  let storyIdField = cfg.trelloStoryIdCustomFieldId || "Story ID";
  if (storyIdField && !/^[a-f0-9]{8}/i.test(storyIdField)) {
    const probe = new TrelloProvider({
      auth: { key, token },
      listMap: extendedMap,
      checklistName,
    });
    try {
      const fields = await probe.getCustomFields(boardId);
      const found = Array.isArray(fields)
        ? fields.find(f => (f.name || "").toLowerCase() === String(storyIdField).toLowerCase())
        : undefined;
      storyIdField = found?.id || undefined;
    } catch {}
  }

  const provider = new TrelloProvider({
    auth: { key, token },
    listMap: extendedMap,
    checklistName,
    storyIdCustomFieldId: storyIdField,
  });
  vlog("[init] using storyIdCustomFieldId=", storyIdField || "(none)");

  const mdFiles = await readAllMarkdown(inputDir);
  if (verbose) {
    console.log(`mdsync: files=${mdFiles.length}`);
    mdFiles.forEach(f => console.log(`  file: ${f.file}`));
  }
  const allStories: Story[] = [];
  for (const f of mdFiles) {
    const stories = parseMarkdownToStories(f.content, { statusMap: extendedMap });
    if (verbose) {
      console.log(`mdsync: parsed stories from ${f.file}: ${stories.length}`);
      stories.forEach(s => console.log(`  story: ${s.storyId || "(no-id)"} | ${s.title} | status=${s.status}`));
    }
    allStories.push(...stories);
  }

  let outFiles: string[] = [];
  if (shouldWriteLocal) {
    outFiles = await ensureRenderedOut(allStories, outputDir);
    if (verbose) {
      console.log(`mdsync: rendered files=${outFiles.length}`);
      outFiles.forEach(f => console.log(`  wrote: ${f}`));
    }
  } else {
    if (verbose) console.log("mdsync: skip local render (writeLocal not enabled)");
  }

  let created = 0,
    updated = 0,
    skipped = 0,
    failed = 0;
  const errors: { storyId: string; title: string; message: string }[] = [];
  const createdItems: string[] = [];
  const updatedItems: string[] = [];

  if (dryRun) { vlog("[dry-run] stories=", allStories.length); return { result: { created, updated, skipped, failed, errors: [] }, logs }; }

  const queue = [...allStories];
  const workers = Math.max(1, concurrency);
  vlog("[run] workers=", workers, "queue=", queue.length);

  const lists = await provider.getLists(boardId);
  const listNameById: Record<string,string> = {};
  for (const l of lists) listNameById[l.id] = l.name;

  async function worker() {
    while (queue.length) {
      const s = queue.shift()!;
      try {
        vlog(`mdsync: processing "${s.title}" id=${s.storyId} status=${s.status}`);
        {
          const normKey = (s.status || "").toLowerCase();
          const targetList = extendedMap[normKey];
          vlog("[map] status=", s.status, "normKey=", normKey, "targetList=", targetList || "(not-mapped)");
        }
        const existing = await provider.findItemByStoryIdOrTitle(boardId, s.storyId, s.title);
        if (!existing) {
          vlog(`mdsync: creating "${s.title}" in status=${s.status}`);
          const card = await provider.createItem(boardId, s.title, s.body, s.status);
          vlog(`mdsync: created id=${card.id}`);

          if (storyIdField && s.storyId) {
            await provider.setStoryId(card.id, s.storyId);
            vlog(`mdsync: storyId set via custom field`);
          }
          createdItems.push(`${s.storyId || "(no-id)"} | ${s.title} | ${s.status}`);
          created++;
        } else {
          const currentTitle = existing.name;
          const currentDesc = (existing as any).desc || "";
          const currentListName = listNameById[existing.idList] || "";
          const targetListName = (extendedMap[(s.status || "").toLowerCase()] || s.status || "").trim();

          const titleChanged = currentTitle !== s.title;
          const descChanged = (currentDesc || "") !== (s.body || "");
          const statusChanged = (currentListName || "").toLowerCase() !== (targetListName || "").toLowerCase();

          if (titleChanged || descChanged || statusChanged) {
            vlog(`mdsync: updating "${s.title}" id=${existing.id}`);
            if (titleChanged || descChanged) {
              await provider.updateItem(existing.id, s.title, s.body);
            }
            if (statusChanged) {
              vlog(`mdsync: move "${s.title}" ${currentListName || "(unknown)"} -> ${targetListName || "(unmapped)"}`);
              await provider.moveItemToStatus(existing.id, boardId, s.status);
            }
            if (storyIdField && s.storyId) {
              await provider.setStoryId(existing.id, s.storyId);
              vlog(`mdsync: storyId set via custom field`);
            }
            updatedItems.push(`${s.storyId || "(no-id)"} | ${s.title} | ${targetListName || s.status}`);
            updated++;
          } else {
            skipped++;
          }
        }
      } catch (e: any) {
        failed++;
        const msg = e?.message || String(e);
        errors.push({ storyId: s.storyId, title: s.title, message: msg });
        console.error(`[ERROR] ${s.storyId} ${s.title}: ${msg}`);
        if (verbose) {
          const stackStr = (e as any)?.stack ? String((e as any).stack) : "";
          const nl = stackStr.indexOf("\n");
          const first = nl >= 0 ? stackStr.slice(0, nl) : (stackStr || String(e));
          console.error("[stack]", first);
        }
        if (/List not found for status/i.test(msg) && verbose) {
          console.error(`mdsync: status="${s.status}" mapKeys=[${Object.keys(extendedMap).join(", ")}] map=${JSON.stringify(extendedMap)}`);
        }
      }
    }
  }

  await Promise.all(Array.from({ length: workers }, () => worker()));

  if (verbose) {
    if (createdItems.length) {
      console.log("mdsync: created items:");
      createdItems.forEach(x => console.log(`  + ${x}`));
    }
    if (updatedItems.length) {
      console.log("mdsync: updated items:");
      updatedItems.forEach(x => console.log(`  ~ ${x}`));
    }
    if (errors.length) {
      console.log("mdsync: error items:");
      errors.forEach(e => console.log(`  ! ${e.storyId || "(no-id)"} | ${e.title} | ${e.message}`));
    }
  }
  if (logJson) {
    const details = { createdItems, updatedItems, errors };
    try {
      console.log(JSON.stringify({ mdsyncDetails: details }));
      logs.push(JSON.stringify({ mdsyncDetails: details }));
    } catch {}
  }
  vlog("[done] created=", created, "updated=", updated, "skipped=", skipped, "failed=", failed);
  return { result: { created, updated, skipped, failed, errors }, logs };
}

export function makeMdToTrelloSummary(r: {
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  errors?: any[];
}) {
  return { created: r.created, updated: r.updated, skipped: r.skipped, failed: r.failed, errors: r.errors ?? [] };
}

if (require.main === module) {
  console.error("Please call mdToTrello(config).");
  process.exit(1);
}