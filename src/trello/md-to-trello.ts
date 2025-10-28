import fs from "fs/promises";
import path from "path";
import { parseMarkdownToStories } from "./markdown-parser";
import { renderSingleStoryMarkdown, preferredStoryFileName } from "./renderer";
import { TrelloProvider } from "./provider";
import type { Story } from "./types";

type ChecklistItem = { text: string; checked: boolean };

type TrelloProviderLike = {
  getLists(boardId: string): Promise<{ id: string; name: string }[]>;
  listItems(boardId: string): Promise<any[]>;
  getCustomFields(boardId: string): Promise<any[]>;
  findItemByStoryIdOrTitle(boardId: string, storyId: string, title: string): Promise<any | null>;
  createItem(boardId: string, name: string, desc: string, status: string): Promise<any>;
  updateItem(cardId: string, name: string, desc: string): Promise<void>;
  moveItemToStatus(cardId: string, boardId: string, status: string): Promise<void>;
  setStoryId(cardId: string, value: string): Promise<void>;
  ensureChecklist(cardId: string, items: ChecklistItem[]): Promise<void>;
  resolveLabelIds(boardId: string, names: string[]): Promise<{ ids: string[]; missing: string[] }>;
  setCardLabels(cardId: string, labelIds: string[]): Promise<void>;
  resolveMemberIds(boardId: string, names: string[]): Promise<{ ids: string[]; missing: string[] }>;
  setCardMembers(cardId: string, memberIds: string[]): Promise<void>;
};



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
  provider?: TrelloProviderLike;
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

type StoryPlan = {
  story: Story;
  existing: any | null;
  create: boolean;
  updateContent: boolean;
  move: boolean;
  checklist: { items: ChecklistItem[]; changed: boolean };
  labels: { ids: string[]; missing: string[]; changed: boolean };
  members: { ids: string[]; missing: string[]; changed: boolean };
  hasChanges: boolean;
  currentListName: string;
  targetListName: string;
};

type CardLookup = {
  takeByStoryId(id: string): any | null;
  takeByTitle(title: string): any | null;
};

function normalizeStatusKey(status: string): string {
  return (status || "").trim().toLowerCase();
}

function sanitizeValue(value: string): string {
  const trimmed = (value || "").trim();
  return trimmed.replace(/^\[|\]$/g, "").replace(/^"|"$/g, "").replace(/^'|'$/g, "");
}

function extractLabelIds(card: any): string[] {
  if (!card) return [];
  if (Array.isArray(card.idLabels)) return card.idLabels.map((id: any) => String(id));
  if (Array.isArray(card.labels)) return card.labels.map((l: any) => String(l?.id)).filter(Boolean);
  return [];
}

function extractMemberIds(card: any): string[] {
  if (!card) return [];
  if (Array.isArray(card.idMembers)) return card.idMembers.map((id: any) => String(id));
  return [];
}

function storyTodosToChecklist(story: Story): ChecklistItem[] {
  if (!Array.isArray(story.todos)) return [];
  return story.todos.map((t) => ({ text: t.text?.trim() || "", checked: !!t.done })).filter((t) => t.text);
}

function extractChecklistFromCard(card: any, checklistName: string): ChecklistItem[] {
  if (!card || !Array.isArray(card.checklists)) return [];
  const match = card.checklists.find((cl: any) => (cl?.name || "") === checklistName);
  if (!match || !Array.isArray(match.checkItems)) return [];
  return match.checkItems.map((it: any) => ({
    text: String(it?.name || "").trim(),
    checked: String(it?.state || "").toLowerCase() === "complete"
  })).filter((it: ChecklistItem) => it.text);
}

function checklistEqual(a: ChecklistItem[], b: ChecklistItem[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i].text !== b[i].text || a[i].checked !== b[i].checked) return false;
  }
  return true;
}

function sameSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sa = [...a].sort();
  const sb = [...b].sort();
  for (let i = 0; i < sa.length; i++) {
    if (sa[i] !== sb[i]) return false;
  }
  return true;
}

function getCardStoryIdFromCard(card: any, storyIdField?: string): string {
  if (!storyIdField) return "";
  if (!Array.isArray(card?.customFieldItems)) return "";
  for (const it of card.customFieldItems) {
    if (it?.idCustomField === storyIdField) {
      const v = it?.value;
      if (v?.text) return String(v.text);
      if (v?.number) return String(v.number);
      if (v?.checked) return String(v.checked);
    }
  }
  return "";
}

function createCardLookup(cards: any[], storyIdField?: string): CardLookup {
  const byStoryId = new Map<string, any>();
  const byTitle = new Map<string, any[]>();
  for (const card of cards) {
    const sid = getCardStoryIdFromCard(card, storyIdField);
    if (sid) byStoryId.set(String(sid), card);
    const titleKey = String(card?.name || "").trim().toLowerCase();
    if (titleKey) {
      const arr = byTitle.get(titleKey) || [];
      arr.push(card);
      byTitle.set(titleKey, arr);
    }
  }
  const take = (map: Map<string, any>, key: string): any | null => {
    if (!key) return null;
    const val = map.get(key);
    if (!val) return null;
    map.delete(key);
    return val;
  };
  return {
    takeByStoryId(id: string) {
      const key = String(id || "");
      const card = take(byStoryId, key);
      if (card) {
        const titleKey = String(card?.name || "").trim().toLowerCase();
        if (titleKey && byTitle.has(titleKey)) {
          const arr = byTitle.get(titleKey)!.filter((c) => c !== card);
          if (arr.length) byTitle.set(titleKey, arr);
          else byTitle.delete(titleKey);
        }
      }
      return card || null;
    },
    takeByTitle(title: string) {
      const key = String(title || "").trim().toLowerCase();
      if (!key) return null;
      const arr = byTitle.get(key);
      if (!arr || !arr.length) return null;
      const card = arr.shift()!;
      if (arr.length) byTitle.set(key, arr);
      else byTitle.delete(key);
      if (card) {
        const sid = getCardStoryIdFromCard(card, storyIdField);
        if (sid) byStoryId.delete(String(sid));
      }
      return card;
    }
  };
}

async function buildStoryPlan(
  story: Story,
  ctx: {
    provider: TrelloProviderLike;
    boardId: string;
    checklistName: string;
    statusMap: Record<string, string>;
    strictStatus: boolean;
    storyIdField?: string;
    listNameById: Record<string, string>;
    lookup: CardLookup;
    warn: (msg: string) => void;
  }
): Promise<StoryPlan> {
  const statusKey = normalizeStatusKey(story.status);
  const mapped = ctx.statusMap[statusKey];
  const targetListName = mapped || (story.status || "").trim();
  if (!targetListName && ctx.strictStatus) {
    throw new Error(`Unmapped status for story ${story.storyId || story.title}`);
  }

  let existing: any | null = null;
  if (story.storyId) existing = ctx.lookup.takeByStoryId(story.storyId);
  if (!existing) existing = ctx.lookup.takeByTitle(story.title);

  const currentListName = existing ? (ctx.listNameById[existing.idList] || "") : "";
  const create = !existing;

  const updateContent = existing ? (String(existing.name || "") !== story.title || String(existing.desc || "") !== (story.body || "")) : false;
  const move = existing ? (String(currentListName || "").toLowerCase() !== String(targetListName || "").toLowerCase()) : false;

  const desiredChecklist = storyTodosToChecklist(story);
  const currentChecklist = existing ? extractChecklistFromCard(existing, ctx.checklistName) : [];
  const checklistChanged = create ? desiredChecklist.length > 0 : !checklistEqual(currentChecklist, desiredChecklist);

  const desiredLabelNames = (story.labels || []).map(sanitizeValue).filter(Boolean);
  const desiredMemberNames = (story.assignees || []).map(sanitizeValue).filter(Boolean);

  const labelResult = desiredLabelNames.length
    ? await ctx.provider.resolveLabelIds(ctx.boardId, desiredLabelNames)
    : { ids: [] as string[], missing: [] as string[] };
  const memberResult = desiredMemberNames.length
    ? await ctx.provider.resolveMemberIds(ctx.boardId, desiredMemberNames)
    : { ids: [] as string[], missing: [] as string[] };

  if (labelResult.missing.length) ctx.warn(`[warn] missing labels for ${story.storyId || story.title}: ${labelResult.missing.join(", ")}`);
  if (memberResult.missing.length) ctx.warn(`[warn] missing members for ${story.storyId || story.title}: ${memberResult.missing.join(", ")}`);

  const existingLabelIds = extractLabelIds(existing);
  const existingMemberIds = extractMemberIds(existing);
  const labelsChanged = create ? labelResult.ids.length > 0 : !sameSet(existingLabelIds, labelResult.ids);
  const membersChanged = create ? memberResult.ids.length > 0 : !sameSet(existingMemberIds, memberResult.ids);

  const hasChanges = create || updateContent || move || checklistChanged || labelsChanged || membersChanged;

  return {
    story,
    existing,
    create,
    updateContent,
    move,
    checklist: { items: desiredChecklist, changed: checklistChanged },
    labels: { ids: labelResult.ids, missing: labelResult.missing, changed: labelsChanged },
    members: { ids: memberResult.ids, missing: memberResult.missing, changed: membersChanged },
    hasChanges,
    currentListName,
    targetListName
  };
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

  let storyIdFieldHint = cfg.trelloStoryIdCustomFieldId || "Story ID";
  let resolvedStoryIdField: string | undefined =
    storyIdFieldHint && /^[a-f0-9]{8}/i.test(String(storyIdFieldHint)) ? String(storyIdFieldHint) : undefined;

  let provider: TrelloProviderLike;
  if (cfg.provider) {
    provider = cfg.provider;
    if (!resolvedStoryIdField && storyIdFieldHint) {
      try {
        const fields = await provider.getCustomFields(boardId);
        const found = Array.isArray(fields)
          ? fields.find((f: any) => String(f?.name || "").toLowerCase() === String(storyIdFieldHint).toLowerCase())
          : undefined;
        resolvedStoryIdField = found?.id ? String(found.id) : undefined;
      } catch {}
    }
  } else {
    if (!resolvedStoryIdField && storyIdFieldHint) {
      const probe = new TrelloProvider({
        auth: { key, token },
        listMap: extendedMap,
        checklistName,
      });
      try {
        const fields = await probe.getCustomFields(boardId);
        const found = Array.isArray(fields)
          ? fields.find((f: any) => String(f?.name || "").toLowerCase() === String(storyIdFieldHint).toLowerCase())
          : undefined;
        resolvedStoryIdField = found?.id ? String(found.id) : undefined;
      } catch {}
    }
    provider = new TrelloProvider({
      auth: { key, token },
      listMap: extendedMap,
      checklistName,
      storyIdCustomFieldId: resolvedStoryIdField,
    });
  }

  if (!resolvedStoryIdField || !/^[a-f0-9]{8}/i.test(resolvedStoryIdField)) {
    resolvedStoryIdField = undefined;
  }

  vlog("[init] using storyIdCustomFieldId=", resolvedStoryIdField || "(none)");

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
  const lists = await provider.getLists(boardId);
  const listNameById: Record<string,string> = {};
  for (const l of lists) listNameById[l.id] = l.name;

  const warn = (msg: string) => {
    logs.push(msg);
    if (verbose) console.warn(msg);
  };

  const boardCards = await provider.listItems(boardId);
  const lookup = createCardLookup(boardCards, resolvedStoryIdField);

  const plans: StoryPlan[] = [];
  for (const story of allStories) {
    const plan = await buildStoryPlan(story, {
      provider,
      boardId,
      checklistName,
      statusMap: extendedMap,
      strictStatus,
      storyIdField: resolvedStoryIdField,
      listNameById,
      lookup,
      warn
    });
    plans.push(plan);
  }

  const createdPlans = plans.filter(p => p.create);
  const updatedPlans = plans.filter(p => !p.create && (p.updateContent || p.labels.changed || p.members.changed));
  const movedPlans = plans.filter(p => p.move);
  const checklistPlans = plans.filter(p => p.checklist.changed);
  const skippedPlans = plans.filter(p => !p.hasChanges);

  const dryRunSummary = {
    created: createdPlans.map(p => p.story.storyId || p.story.title),
    updated: updatedPlans.map(p => p.story.storyId || p.story.title),
    moved: movedPlans.map(p => p.story.storyId || p.story.title),
    checklistChanges: checklistPlans.map(p => p.story.storyId || p.story.title)
  };

  if (dryRun) {
    vlog("[dry-run] stories=", allStories.length);
    vlog("[dry-run] summary=", JSON.stringify(dryRunSummary));
    if (logJson) {
      try {
        const payload = JSON.stringify({ mdsyncDryRun: dryRunSummary });
        console.log(payload);
        logs.push(payload);
      } catch {}
    }
    return {
      result: {
        created: createdPlans.length,
        updated: updatedPlans.length,
        skipped: skippedPlans.length,
        failed: 0,
        errors: []
      },
      logs
    };
  }

  const createdItems: string[] = [];
  const updatedItems: string[] = [];
  const movedItems: string[] = [];
  const checklistItems: string[] = [];

  let planIndex = 0;
  const workerCount = Math.max(1, concurrency);

  const executePlan = async (plan: StoryPlan) => {
    const story = plan.story;
    const summaryId = story.storyId || story.title;
    if (!plan.hasChanges) {
      skipped++;
      return;
    }

    try {
      vlog(`mdsync: processing "${story.title}" id=${story.storyId} status=${story.status}`);
      let cardId: string | undefined = plan.existing?.id ? String(plan.existing.id) : undefined;

      if (plan.create) {
        const targetStatus = plan.targetListName || story.status;
        const card = await provider.createItem(boardId, story.title, story.body, targetStatus);
        cardId = String(card?.id || "");
        if (!cardId) throw new Error("createItem did not return card id");
        created++;
        createdItems.push(`${summaryId} | ${story.title} | ${targetStatus}`);
        if (resolvedStoryIdField && story.storyId) {
          await provider.setStoryId(cardId, story.storyId);
          vlog("[create] storyId set", story.storyId);
        }
      }

      if (!cardId) throw new Error("Missing card id for plan execution");

      if (!plan.create && resolvedStoryIdField && story.storyId) {
        await provider.setStoryId(cardId, story.storyId);
      }

      const updatesPerformed: string[] = [];

      if (plan.updateContent) {
        await provider.updateItem(cardId, story.title, story.body);
        updatesPerformed.push("content");
      }

      if (plan.labels.changed) {
        await provider.setCardLabels(cardId, plan.labels.ids);
        updatesPerformed.push("labels");
      }

      if (plan.members.changed) {
        await provider.setCardMembers(cardId, plan.members.ids);
        updatesPerformed.push("members");
      }

      if (plan.move) {
        await provider.moveItemToStatus(cardId, boardId, story.status);
        movedItems.push(`${summaryId} | ${plan.currentListName} -> ${plan.targetListName || story.status}`);
      }

      if (plan.checklist.changed) {
        await provider.ensureChecklist(cardId, plan.checklist.items);
        checklistItems.push(`${summaryId} | checklist`);
      }

      if (!plan.create && updatesPerformed.length) {
        updated++;
        updatedItems.push(`${summaryId} | ${updatesPerformed.join("+")}`);
      }

    } catch (e: any) {
      failed++;
      const msg = e?.message || String(e);
      errors.push({ storyId: story.storyId, title: story.title, message: msg });
      console.error(`[ERROR] ${story.storyId} ${story.title}: ${msg}`);
      if (verbose) {
        const stackStr = (e as any)?.stack ? String((e as any).stack) : "";
        const nl = stackStr.indexOf("\n");
        const first = nl >= 0 ? stackStr.slice(0, nl) : (stackStr || String(e));
        console.error("[stack]", first);
      }
      if (/List not found for status/i.test(msg) && verbose) {
        console.error(`mdsync: status="${story.status}" mapKeys=[${Object.keys(extendedMap).join(", ")}] map=${JSON.stringify(extendedMap)}`);
      }
    }
  };

  const workers: Promise<void>[] = [];
  for (let i = 0; i < workerCount; i++) {
    workers.push((async () => {
      while (true) {
        const idx = planIndex++;
        if (idx >= plans.length) break;
        await executePlan(plans[idx]);
      }
    })());
  }

  await Promise.all(workers);

  if (verbose) {
    if (createdItems.length) {
      console.log("mdsync: created items:");
      createdItems.forEach(x => console.log(`  + ${x}`));
    }
    if (updatedItems.length) {
      console.log("mdsync: updated content:");
      updatedItems.forEach(x => console.log(`  ~ ${x}`));
    }
    if (movedItems.length) {
      console.log("mdsync: moved cards:");
      movedItems.forEach(x => console.log(`  > ${x}`));
    }
    if (checklistItems.length) {
      console.log("mdsync: checklist updates:");
      checklistItems.forEach(x => console.log(`  * ${x}`));
    }
    if (errors.length) {
      console.log("mdsync: error items:");
      errors.forEach(e => console.log(`  ! ${e.storyId || "(no-id)"} | ${e.title} | ${e.message}`));
    }
  }

  if (logJson) {
    const details = { createdItems, updatedItems, movedItems, checklistItems, errors };
    try {
      console.log(JSON.stringify({ mdsyncDetails: details }));
      logs.push(JSON.stringify({ mdsyncDetails: details }));
    } catch {}
  }

  const totalSkipped = skipped + skippedPlans.length;
  vlog("[done] created=", created, "updated=", updated, "moved=", movedItems.length, "checklists=", checklistItems.length, "skipped=", totalSkipped, "failed=", failed);
  return {
    result: {
      created,
      updated,
      skipped: totalSkipped,
      failed,
      errors
    },
    logs
  };
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