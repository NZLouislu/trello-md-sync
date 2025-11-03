import { trelloToMd } from "../src";
import dotenv from "dotenv";
import path from "path";

function parseArgs(argv: string[]): { flags: Record<string, string | boolean>; positional: string[] } {
  const flags: Record<string, string | boolean> = {};
  const positional: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (!token.startsWith("--")) {
      positional.push(token);
      continue;
    }
    const raw = token.slice(2);
    const eq = raw.indexOf("=");
    let key = raw;
    let value: string | boolean = true;
    if (eq >= 0) {
      key = raw.slice(0, eq);
      value = raw.slice(eq + 1);
    } else {
      const next = argv[i + 1];
      if (next && !next.startsWith("--")) {
        value = next;
        i++;
      }
    }
    flags[key.toLowerCase()] = value;
  }
  return { flags, positional };
}

export async function main() {
  dotenv.config({ path: path.resolve(__dirname, "../.env") });
  
  const { flags, positional } = parseArgs(process.argv.slice(2));
  const storyFlag = typeof flags["story"] === "string" ? flags["story"] : undefined;
  const outputFlag = typeof flags["output"] === "string" ? flags["output"] : undefined;
  
  let storyId = storyFlag;
  let outputDir = outputFlag;

  for (const arg of positional) {
    if (/^Story-/i.test(arg) && !storyId) {
      storyId = arg;
    } else if (!outputDir) {
      outputDir = arg;
    }
  }
  
  const lvl = (process.env.LOG_LEVEL || "").toLowerCase();
  const json = ((process.env.LOG_JSON || "").toLowerCase() === "1") || ((process.env.LOG_JSON || "").toLowerCase() === "true");
  const logLevel = (lvl === "debug" ? "debug" : "info") as 'info'|'debug';
  const bool = (v?: string) => {
    const s = (v || "").toLowerCase();
    return s === "1" || s === "true" || s === "yes" || s === "on";
  };
  if (bool(process.env.DRY_RUN)) {
    return { written: 0 };
  }
  
  const defaultOutputDir = outputDir || process.env.MD_OUTPUT_DIR || path.resolve(__dirname, "items");

  const priorityLabelMap = process.env.PRIORITY_LABEL_MAP_JSON || undefined;
  const memberAliasMap = process.env.MEMBER_ALIAS_MAP_JSON || undefined;

  const res = await trelloToMd({
    trelloKey: process.env.TRELLO_KEY || "",
    trelloToken: process.env.TRELLO_TOKEN || "",
    trelloBoardId: process.env.TRELLO_BOARD_ID || "",
    mdOutputDir: defaultOutputDir,
    storyId: storyId,
    priorityLabelMap,
    memberAliasMap
  }, { logLevel, json });
  return res;
}

if (require.main === module) {
  main().then((r) => {
    console.log("trello-to-md:", r ?? "ok");
  }).catch((e) => {
    console.error(e);
    process.exit(1);
  });
}