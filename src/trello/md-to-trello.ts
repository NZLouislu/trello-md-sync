import fs from "fs/promises";
import path from "path";
import { parseMarkdownToStories } from "./markdown-parser";
import { renderSingleStoryMarkdown, preferredStoryFileName } from "./renderer";
import { formatLegacyStoryName, formatStoryName, parseFormattedStoryName } from "./story-format";

import { TrelloProvider } from "./provider";
import type { Story } from "./types";

type ChecklistItem = { text: string; checked: boolean };
type MdToTrelloDryRunSummary = {
  created: string[];
  updated: string[];
  moved: string[];
  checklistChanges: string[];
  priorityWarnings: string[];
  missingLabels: string[];
  aliasWarnings: string[];
  stats: {
    prioritiesWithMappings: number;
    prioritiesMissingLabels: number;
    storiesWithMissingLabels: number;
    storiesWithAliasIssues: number;
  };
};

type MdToTrelloResultPayload = {
  result: {
    created: number;
    updated: number;
    skipped: number;
    failed: number;
    errors: { storyId: string; title: string; message: string }[];
    processedFiles: number;
    processedStories: number;
    renderedFiles: number;
  };
  logs: string[];
  dryRunSummary?: MdToTrelloDryRunSummary;
  writeLocalFiles?: string[];
};

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
  ensureLabels?(boardId: string, labels: { name: string; color?: string }[], options?: { create?: boolean }): Promise<{ created: string[]; existing: string[]; missing: string[] }>;
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
  ensureLabels?: boolean;
  requiredLabels?: string[];
  memberAliasMap?: Record<string, string> | string;
  priorityLabelMap?: Record<string, string> | string;
  labelTokenMap?: Record<string, string> | string;
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
  expectedName: string;
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
  if (storyIdField && Array.isArray(card?.customFieldItems)) {
    for (const it of card.customFieldItems) {
      if (it?.idCustomField === storyIdField) {
        const v = it?.value;
        if (v?.text) return String(v.text);
        if (v?.number) return String(v.number);
        if (v?.checked) return String(v.checked);
      }
    }
  }
  const parsed = parseFormattedStoryName(String(card?.name || ""));
  if (parsed.storyId) return parsed.storyId;
  return "";
}

function createCardLookup(cards: any[], storyIdField?: string): CardLookup {
  const byStoryId = new Map<string, any | any[]>();
  const byTitle = new Map<string, any[]>();
  const cardTitleKeys = new Map<any, string[]>();

  const addCardToTitleIndex = (card: any, key: string) => {
    if (!key) return;
    const arr = byTitle.get(key) || [];
    arr.push(card);
    byTitle.set(key, arr);
  };

  const normalizeTitleKey = (value: string): string => value.trim().toLowerCase();

  const recordStoryId = (id: string, card: any) => {
    if (!id) return;
    const key = id.trim();
    if (!key) return;
    const existing = byStoryId.get(key);
    if (!existing) {
      byStoryId.set(key, card);
      return;
    }
    if (Array.isArray(existing)) {
      existing.push(card);
      return;
    }
    byStoryId.set(key, [existing, card]);
  };

  const collectTitleKeysForCard = (card: any): string[] => {
    const keys = new Set<string>();
    const rawName = String(card?.name || "");
    const normalizedRaw = normalizeTitleKey(rawName);
    if (normalizedRaw) keys.add(normalizedRaw);
    const parsed = parseFormattedStoryName(rawName);
    const formatted = formatStoryName(parsed.storyId, parsed.title);
    if (formatted) {
      const formattedKey = normalizeTitleKey(formatted);
      if (formattedKey) keys.add(formattedKey);
    }
    if (parsed.title) {
      const titleKey = normalizeTitleKey(parsed.title);
      if (titleKey) keys.add(titleKey);
    }
    return Array.from(keys);
  };

  for (const card of cards) {
    const sidFromField = getCardStoryIdFromCard(card, storyIdField);
    recordStoryId(sidFromField, card);
    const parsed = parseFormattedStoryName(String(card?.name || ""));
    if (parsed.storyId && parsed.storyId !== sidFromField) recordStoryId(parsed.storyId, card);
    const titleKeys = collectTitleKeysForCard(card);
    cardTitleKeys.set(card, titleKeys);
    for (const key of titleKeys) addCardToTitleIndex(card, key);
  }

  const removeCardFromTitleIndex = (card: any) => {
    const keys = cardTitleKeys.get(card) || [];
    for (const key of keys) {
      const arr = byTitle.get(key);
      if (!arr) continue;
      const next = arr.filter((c) => c !== card);
      if (next.length) byTitle.set(key, next);
      else byTitle.delete(key);
    }
    cardTitleKeys.delete(card);
  };

  const detachStoryIdEntry = (card: any) => {
    const parsed = parseFormattedStoryName(String(card?.name || ""));
    const candidateIds = new Set<string>();
    const customId = getCardStoryIdFromCard(card, storyIdField);
    if (customId) candidateIds.add(customId.trim());
    if (parsed.storyId) candidateIds.add(parsed.storyId.trim());
    for (const id of Array.from(candidateIds)) {
      const entry = byStoryId.get(id);
      if (!entry) continue;
      if (Array.isArray(entry)) {
        const filtered = entry.filter((c) => c !== card);
        if (!filtered.length) byStoryId.delete(id);
        else if (filtered.length === 1) byStoryId.set(id, filtered[0]);
        else byStoryId.set(id, filtered);
      } else if (entry === card) {
        byStoryId.delete(id);
      }
    }
  };

  const takeFromStoryId = (key: string): any | null => {
    if (!key) return null;
    const val = byStoryId.get(key);
    if (!val) return null;
    if (Array.isArray(val)) {
      if (val.length !== 1) {
        throw new Error(`Multiple cards share story id ${key}`);
      }
      const card = val[0];
      byStoryId.delete(key);
      removeCardFromTitleIndex(card);
      return card;
    }
    byStoryId.delete(key);
    removeCardFromTitleIndex(val);
    return val;
  };

  return {
    takeByStoryId(id: string) {
      const key = String(id || "").trim();
      return takeFromStoryId(key);
    },
    takeByTitle(title: string) {
      const key = normalizeTitleKey(String(title || ""));
      if (!key) return null;
      const arr = byTitle.get(key);
      if (!arr || !arr.length) return null;
      const card = arr.shift()!;
      if (arr.length) byTitle.set(key, arr);
      else byTitle.delete(key);
      detachStoryIdEntry(card);
      removeCardFromTitleIndex(card);
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
    collectPriority: (value: string | undefined, isMapped: boolean, labelExists: boolean) => void;
    collectLabelMiss: (storyId: string | undefined, labels: string[]) => void;
    collectAliasMiss: (storyId: string | undefined, aliases: string[]) => void;
    memberAliasMap?: Record<string, string> | string;
    priorityLabelMap?: Record<string, string> | string;
  }
): Promise<StoryPlan> {
  const statusKey = normalizeStatusKey(story.status);
  const mapped = ctx.statusMap[statusKey];
  const targetListName = mapped || (story.status || "").trim();
  if (!mapped && ctx.strictStatus) {
    throw new Error(`Status "${story.status}" is not mapped`);
  }

  const expectedCardName = formatStoryName(story.storyId, story.title);
  let existing: any | null = null;
  if (story.storyId) existing = ctx.lookup.takeByStoryId(story.storyId);
  if (!existing && expectedCardName) existing = ctx.lookup.takeByTitle(expectedCardName);
  if (!existing && story.storyId) {
    const legacyName = formatLegacyStoryName(story.storyId, story.title);
    if (legacyName) existing = ctx.lookup.takeByTitle(legacyName);
  }
  if (!existing && story.title) existing = ctx.lookup.takeByTitle(story.title);

  const currentListName = existing ? (ctx.listNameById[existing.idList] || "") : "";
  const create = !existing;

  const desiredName = expectedCardName || story.title || "";
  const normalizedDesiredName = desiredName.trim().toLowerCase();
  const normalizedExistingName = String(existing?.name || "").trim().toLowerCase();
  const nameNeedsUpdate = existing
    ? (desiredName ? normalizedExistingName !== normalizedDesiredName : normalizedExistingName !== (story.title || "").trim().toLowerCase())
    : false;
  const updateContent = existing ? (nameNeedsUpdate || String(existing.desc || "") !== (story.body || "")) : false;
  const move = existing ? (String(currentListName || "").toLowerCase() !== String(targetListName || "").toLowerCase()) : false;

  const desiredChecklist = storyTodosToChecklist(story);
  const currentChecklist = existing ? extractChecklistFromCard(existing, ctx.checklistName) : [];
  const checklistChanged = create ? desiredChecklist.length > 0 : !checklistEqual(currentChecklist, desiredChecklist);

  const desiredLabelNames = (story.labels || []).map(sanitizeValue).filter(Boolean);
  let desiredMemberNames = (story.assignees || []).map(sanitizeValue).filter(Boolean);

  // Apply member alias mapping if configured
  if (ctx.memberAliasMap) {
    const aliasMap = typeof ctx.memberAliasMap === 'string'
      ? (() => { try { return JSON.parse(ctx.memberAliasMap as string); } catch { return {}; } })()
      : ctx.memberAliasMap;
    desiredMemberNames = desiredMemberNames.map(name => aliasMap[name] || name);
  }

  const priorityValue = sanitizeValue(story.meta?.priority || "");

  const labelResult = desiredLabelNames.length
    ? await ctx.provider.resolveLabelIds(ctx.boardId, desiredLabelNames)
    : { ids: [] as string[], missing: [] as string[] };
  const memberResult = desiredMemberNames.length
    ? await ctx.provider.resolveMemberIds(ctx.boardId, desiredMemberNames)
    : { ids: [] as string[], missing: [] as string[] };

  // Handle priority after resolving labels
  if (priorityValue) {
    // Check if priority maps to a label
    const isMapped = ctx.priorityLabelMap ? (() => {
      const map = typeof ctx.priorityLabelMap === 'string'
        ? (() => { try { return JSON.parse(ctx.priorityLabelMap as string); } catch { return {}; } })()
        : ctx.priorityLabelMap;
      return !!map && !!map[priorityValue];
    })() : false;

    let labelExists = false;
    if (isMapped) {
      const mappedLabel = (() => {
        const map = typeof ctx.priorityLabelMap === 'string'
          ? (() => { try { return JSON.parse(ctx.priorityLabelMap as string); } catch { return {}; } })()
          : ctx.priorityLabelMap;
        return map[priorityValue];
      })();

      // Check if the mapped label exists
      if (desiredLabelNames.includes(mappedLabel)) {
        labelExists = !labelResult.missing.includes(mappedLabel);
      } else {
        // Need to check separately
        const priorityLabelResult = await ctx.provider.resolveLabelIds(ctx.boardId, [mappedLabel]);
        labelExists = priorityLabelResult.missing.length === 0;
      }
    }

    ctx.collectPriority(priorityValue, isMapped, labelExists);
  }

  if (labelResult.missing.length) {
    ctx.warn(`[warn] missing labels for ${story.storyId || story.title}: ${labelResult.missing.join(", ")} - run with --ensure-labels to create them`);
    ctx.collectLabelMiss(story.storyId, labelResult.missing);
  }
  if (memberResult.missing.length) {
    ctx.warn(`[warn] missing members for ${story.storyId || story.title}: ${memberResult.missing.join(", ")} - consider configuring member-alias-map`);
    ctx.collectAliasMiss(story.storyId, memberResult.missing);
  }

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
    targetListName,
    expectedName: expectedCardName
  };
}

export async function mdToTrello(
  cfg: MdToTrelloConfig
): Promise<MdToTrelloResultPayload> {
  const logs: string[] = [];
  const projectRoot = cfg.projectRoot;
  if (!projectRoot) {
    const msg = "Please specify the markdown files path (set opts.projectRoot or args.projectRoot).";
    console.error(msg);
    logs.push(msg);
    return { result: { created: 0, updated: 0, skipped: 0, failed: 1, errors: [{ storyId: "", title: "(init)", message: msg }], processedFiles: 0, processedStories: 0, renderedFiles: 0 }, logs };
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

  const fallbackMap: Record<string, string> = {
    backlog: "Backlog",
    ready: "Ready",
    doing: "Doing",
    "in progress": "Doing",
    "in review": "In review",
    review: "In review",
    done: "Done",
    todo: "Backlog"
  };
  let listMapBase: Record<string, string> = fallbackMap;
  if (cfg.trelloListMapJson) {
    if (typeof cfg.trelloListMapJson === "string") {
      try { listMapBase = JSON.parse(cfg.trelloListMapJson as string); } catch { listMapBase = fallbackMap; }
    } else {
      listMapBase = cfg.trelloListMapJson as Record<string, string>;
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
  const listNameById: Record<string, string> = {};
  for (const l of lists) listNameById[l.id] = l.name;

  const warn = (msg: string) => {
    logs.push(msg);
    if (verbose) console.warn(msg);
  };

  const boardCards = await provider.listItems(boardId);
  const lookup = createCardLookup(boardCards, resolvedStoryIdField);

  const priorityWarnings: string[] = [];
  const missingLabels: string[] = [];
  const aliasWarnings: string[] = [];
  const priorityStats = {
    prioritiesWithMappings: 0,
    prioritiesMissingLabels: 0
  };
  const aliasIssues = new Set<string>();

  const dryRunSummary: MdToTrelloDryRunSummary = {
    created: [],
    updated: [],
    moved: [],
    checklistChanges: [],
    priorityWarnings,
    missingLabels,
    aliasWarnings,
    stats: {
      prioritiesWithMappings: 0,
      prioritiesMissingLabels: 0,
      storiesWithMissingLabels: 0,
      storiesWithAliasIssues: 0
    }
  };

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
      warn,
      collectPriority: (priority, isMapped, labelExists) => {
        if (!priority) return;
        if (isMapped) {
          priorityStats.prioritiesWithMappings++;
          if (!labelExists) {
            priorityStats.prioritiesMissingLabels++;
            priorityWarnings.push(priority);
          }
        } else {
          priorityStats.prioritiesMissingLabels++;
          priorityWarnings.push(priority);
        }
      },
      collectLabelMiss(storyId, labels) {
        if (!labels.length) return;
        missingLabels.push(`${storyId || "(no-id)"}:${labels.join("|")}`);
        dryRunSummary.stats.storiesWithMissingLabels++;
      },
      collectAliasMiss(storyId, aliases) {
        if (!aliases.length) return;
        aliasWarnings.push(`${storyId || "(no-id)"}:${aliases.join("|")}`);
        aliasIssues.add(storyId || "(no-id)");
      },
      memberAliasMap: cfg.memberAliasMap,
      priorityLabelMap: cfg.priorityLabelMap
    });
    plans.push(plan);
  }

  dryRunSummary.stats.prioritiesWithMappings = priorityStats.prioritiesWithMappings;
  dryRunSummary.stats.prioritiesMissingLabels = priorityStats.prioritiesMissingLabels;
  dryRunSummary.stats.storiesWithAliasIssues = aliasIssues.size;

  const createdPlans = plans.filter(p => p.create);
  const updatedPlans = plans.filter(p => !p.create && (p.updateContent || p.labels.changed || p.members.changed));
  const movedPlans = plans.filter(p => p.move);
  const checklistPlans = plans.filter(p => p.checklist.changed);
  const skippedPlans = plans.filter(p => !p.hasChanges);

  dryRunSummary.created = createdPlans.map(p => p.story.storyId || p.story.title);
  dryRunSummary.updated = updatedPlans.map(p => p.story.storyId || p.story.title);
  dryRunSummary.moved = movedPlans.map(p => p.story.storyId || p.story.title);
  dryRunSummary.checklistChanges = checklistPlans.map(p => p.story.storyId || p.story.title);

  // Ensure required labels are created if ensureLabels is enabled
  if (cfg.ensureLabels && cfg.requiredLabels && cfg.requiredLabels.length > 0) {
    const allLabelNames = new Set<string>();
    for (const story of allStories) {
      if (story.labels) {
        for (const label of story.labels) {
          if (label) allLabelNames.add(sanitizeValue(label));
        }
      }
    }
    for (const req of cfg.requiredLabels) {
      if (req) allLabelNames.add(sanitizeValue(req));
    }
    const labelsToEnsure = Array.from(allLabelNames).filter(Boolean).map(name => ({ name }));
    if (labelsToEnsure.length > 0 && provider.ensureLabels) {
      vlog("[init] ensuring labels:", labelsToEnsure.map(l => l.name).join(", "));
      await provider.ensureLabels(boardId, labelsToEnsure);
    }
  }

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
        errors: [],
        processedFiles: mdFiles.length,
        processedStories: allStories.length,
        renderedFiles: outFiles.length
      },
      logs,
      dryRunSummary,
      writeLocalFiles: outFiles
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
      const desiredCardName = plan.expectedName || story.title;

      if (plan.create) {
        const targetStatus = plan.targetListName || story.status;
        const card = await provider.createItem(boardId, desiredCardName, story.body, targetStatus);
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
        await provider.updateItem(cardId, desiredCardName, story.body);
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
      errors,
      processedFiles: mdFiles.length,
      processedStories: allStories.length,
      renderedFiles: outFiles.length
    },
    logs,
    dryRunSummary,
    writeLocalFiles: outFiles
  };
}

export function makeMdToTrelloSummary(r: {
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  errors?: any[];
  processedFiles: number;
  processedStories: number;
  renderedFiles: number;
}) {
  return { created: r.created, updated: r.updated, skipped: r.skipped, failed: r.failed, errors: r.errors ?? [], processedFiles: r.processedFiles, processedStories: r.processedStories, renderedFiles: r.renderedFiles };
}

if (require.main === module) {
  console.error("Please call mdToTrello(config).");
  process.exit(1);
}