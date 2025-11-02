import { mdToTrello } from "../src";
import type { MdToTrelloConfig } from "../src/trello/md-to-trello";
import dotenv from "dotenv";
import path from "path";

type TrelloProviderLike = NonNullable<MdToTrelloConfig["provider"]>;

function parseListMap(input?: MdToTrelloConfig["trelloListMapJson"]): Record<string, string> {
  if (!input) return {};
  if (typeof input === "string") {
    try {
      const parsed = JSON.parse(input) as Record<string, string>;
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }
  return input;
}

function createMockProvider(listMap: Record<string, string>): TrelloProviderLike {
  const names = new Set<string>();
  for (const name of Object.values(listMap)) {
    if (name) names.add(name);
  }
  if (!names.size) {
    ["Backlog", "Design", "To-Do", "Doing", "Code Review", "Testing", "Done"].forEach((name) => names.add(name));
  }
  const lists = Array.from(names).map((name, idx) => ({ id: `mock-list-${idx}`, name }));
  const labelIdMap = new Map<string, string>();
  const memberIdMap = new Map<string, string>();
  let cardCounter = 0;

  const ensureIds = (source: string, store: Map<string, string>, prefix: string) => {
    const key = source.toLowerCase();
    if (!store.has(key)) {
      store.set(key, `${prefix}${store.size}`);
    }
    return store.get(key)!;
  };

  return {
    async getLists() {
      return lists;
    },
    async listItems() {
      return [] as any[];
    },
    async findItemByStoryIdOrTitle() {
      return null;
    },
    async createItem() {
      cardCounter += 1;
      return { id: `mock-card-${cardCounter}` } as any;
    },
    async updateItem() {
      return;
    },
    async moveItemToStatus() {
      return;
    },
    async ensureChecklist() {
      return;
    },
    async resolveLabelIds(_boardId: string, names: string[]) {
      const ids = names.map((name) => ensureIds(name || "missing", labelIdMap, "mock-label-"));
      return { ids, missing: [] };
    },
    async setCardLabels() {
      return;
    },
    async resolveMemberIds(_boardId: string, names: string[]) {
      const ids = names.map((name) => ensureIds(name || "missing", memberIdMap, "mock-member-"));
      return { ids, missing: [] };
    },
    async setCardMembers() {
      return;
    },
    async ensureLabels() {
      return { created: [], existing: [], missing: [] };
    }
  };
}

export async function main() {
  dotenv.config({ path: path.resolve(__dirname, "../.env") });
  const trelloKey = process.env.TRELLO_KEY || process.env.TRELLO_API_KEY || "";
  const trelloToken = process.env.TRELLO_TOKEN || process.env.TRELLO_API_TOKEN || "";
  const trelloBoardId = process.env.TRELLO_BOARD_ID || process.env.BOARD_ID || "";
  const trelloListMapJson = process.env.TRELLO_LIST_MAP_JSON;

  const mdInputDir = process.env.MD_INPUT_DIR || undefined;
  const mdOutputDir = process.env.MD_OUTPUT_DIR || undefined;
  const checklistName = process.env.CHECKLIST_NAME || undefined;
  const projectRoot = (mdInputDir?.startsWith("examples/") || mdOutputDir?.startsWith("examples/"))
    ? path.resolve(__dirname, "..")
    : __dirname;

  const lvl = (process.env.LOG_LEVEL || "").toLowerCase();
  const json = ((process.env.LOG_JSON || "").toLowerCase() === "1") || ((process.env.LOG_JSON || "").toLowerCase() === "true");
  const logLevel = (lvl === "debug" ? "debug" : "info") as 'info'|'debug';
  const bool = (v?: string) => {
    const s = (v || "").toLowerCase();
    return s === "1" || s === "true" || s === "yes" || s === "on";
  };
  const writeLocal = bool(process.env.WRITE_LOCAL);
  const dryRun = bool(process.env.DRY_RUN);
  const strictStatus = bool(process.env.STRICT_STATUS);
  const ensureLabels = bool(process.env.MDSYNC_ENSURE_LABELS || process.env.ENSURE_LABELS);
  const concurrency = Number.isFinite(Number(process.env.CONCURRENCY)) ? Number(process.env.CONCURRENCY) : undefined;

  const requiredLabels = process.env.REQUIRED_LABELS
    ? process.env.REQUIRED_LABELS.split(",").map(s => s.trim()).filter(Boolean)
    : undefined;
  const priorityLabelMap = process.env.PRIORITY_LABEL_MAP_JSON || undefined;
  const labelTokenMap = process.env.LABEL_TOKEN_MAP_JSON || undefined;
  const memberAliasMap = process.env.MEMBER_ALIAS_MAP_JSON || undefined;

  const shouldMockProvider = dryRun && (trelloKey === "" || trelloKey === "test" || trelloToken === "test" || trelloBoardId === "test");
  const listMapObject = parseListMap(trelloListMapJson);
  const provider = shouldMockProvider ? createMockProvider(listMapObject) : undefined;

  const cfg: MdToTrelloConfig = {
    trelloKey,
    trelloToken,
    trelloBoardId,
    trelloListMapJson,
    mdInputDir,
    mdOutputDir,
    checklistName,
    projectRoot,
    logLevel,
    json,
    writeLocal,
    dryRun,
    strictStatus,
    concurrency,
    ensureLabels,
    requiredLabels,
    priorityLabelMap,
    labelTokenMap,
    memberAliasMap,
    ...(provider ? { provider } : {})
  };
  const res = await mdToTrello(cfg);
  return res;
}

if (require.main === module) {
  main().then((r) => {
    console.log("md-to-trello:", r);
  }).catch((e) => {
    console.error(e);
    process.exit(1);
  });
}