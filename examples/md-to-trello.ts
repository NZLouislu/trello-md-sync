import { mdToTrello } from "../src";
import dotenv from "dotenv";
import path from "path";

interface MdToTrelloConfig {
  trelloKey: string;
  trelloToken: string;
  trelloBoardId: string;
  trelloListMapJson?: Record<string, string> | string;
  trelloStoryIdCustomFieldId?: string;
  mdInputDir?: string;
  mdOutputDir?: string;
  checklistName?: string;
  projectRoot?: string;
  logLevel?: 'info' | 'debug';
  json?: boolean;
  writeLocal?: boolean;
  dryRun?: boolean;
  strictStatus?: boolean;
  concurrency?: number;
}

export async function main() {
  dotenv.config({ path: path.resolve(__dirname, "../.env") });
  const trelloKey = process.env.TRELLO_KEY || process.env.TRELLO_API_KEY || "";
  const trelloToken = process.env.TRELLO_TOKEN || process.env.TRELLO_API_TOKEN || "";
  const trelloBoardId = process.env.TRELLO_BOARD_ID || process.env.BOARD_ID || "";
  const trelloListMapJson = process.env.TRELLO_LIST_MAP_JSON;
  const trelloStoryIdCustomFieldId = process.env.TRELLO_STORY_ID_CUSTOM_FIELD_ID;
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
  const concurrency = Number.isFinite(Number(process.env.CONCURRENCY)) ? Number(process.env.CONCURRENCY) : undefined;

  const cfg: MdToTrelloConfig = {
    trelloKey,
    trelloToken,
    trelloBoardId,
    trelloListMapJson,
    trelloStoryIdCustomFieldId,
    mdInputDir,
    mdOutputDir,
    checklistName,
    projectRoot,
    logLevel,
    json,
    writeLocal,
    dryRun,
    strictStatus,
    concurrency
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