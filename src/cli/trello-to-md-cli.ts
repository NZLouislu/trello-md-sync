import { trelloToMd } from "../trello/trello-to-md";

type FlagValue = string | boolean;
type FlagMap = Record<string, FlagValue>;

function parseArgs(argv: string[]): FlagMap {
  const flags: FlagMap = {};
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (!token.startsWith("--")) continue;
    const raw = token.slice(2);
    const eq = raw.indexOf("=");
    let key = raw;
    let value: FlagValue = true;
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
  return flags;
}

function parseBoolean(value: FlagValue | undefined): boolean | undefined {
  if (typeof value === "boolean") return value;
  if (typeof value !== "string") return undefined;
  const lower = value.toLowerCase();
  if (["1", "true", "yes", "on"].includes(lower)) return true;
  if (["0", "false", "no", "off"].includes(lower)) return false;
  return undefined;
}

async function main() {
  const flags = parseArgs(process.argv.slice(2));
  const logLevelFlag = flags["loglevel"];
  const jsonFlag = parseBoolean(flags["json"]);
  const debugFlag = parseBoolean(flags["debug"]);
  const projectRootFlag = typeof flags["projectroot"] === "string" ? flags["projectroot"] as string : undefined;
  const outputDirFlag = typeof flags["output"] === "string" ? flags["output"] as string : undefined;
  const checklistFlag = typeof flags["checklist"] === "string" ? flags["checklist"] as string : undefined;
  const listFlag = typeof flags["list"] === "string" ? flags["list"] as string : undefined;
  const labelFlag = typeof flags["label"] === "string" ? flags["label"] as string : undefined;
  const storyIdFlag = typeof flags["storyid"] === "string" ? flags["storyid"] as string : undefined;

  const args = {
    trelloKey: process.env.TRELLO_KEY || "",
    trelloToken: process.env.TRELLO_TOKEN || "",
    trelloBoardId: process.env.TRELLO_BOARD_ID || "",
    checklistName: checklistFlag ?? process.env.CHECKLIST_NAME,
    mdOutputDir: outputDirFlag ?? process.env.MD_OUTPUT_DIR,
    trelloListMapJson: process.env.TRELLO_LIST_MAP_JSON,
    list: listFlag ?? process.env.TRELLO_FILTER_LIST,
    label: labelFlag ?? process.env.TRELLO_FILTER_LABEL,
    storyId: storyIdFlag ?? process.env.TRELLO_FILTER_STORYID,
  };
  const opts = {
    logLevel: (() => {
      if (typeof logLevelFlag === "string" && logLevelFlag.toLowerCase() === "debug") return "debug" as const;
      if (debugFlag) return "debug" as const;
      return (process.env.LOG_LEVEL || "info").toLowerCase() === "debug" ? "debug" as const : "info" as const;
    })(),
    json: jsonFlag ?? ((process.env.LOG_JSON || "").toLowerCase() === "1"),
    verbose: debugFlag ?? ((process.env.VERBOSE || "").toLowerCase() === "1"),
    projectRoot: projectRootFlag ?? process.env.PROJECT_ROOT
  };
  const res = await trelloToMd(args, opts);
  if (opts.json) {
    console.log(JSON.stringify({ kind: "trello-to-md", written: res.written, files: res.files, totalCards: res.totalCards, filteredCards: res.filteredCards }));
  } else {
    console.log(`trello-to-md written=${res.written}`);
    console.log(`Fetched ${res.totalCards} cards from Trello, filtered to ${res.filteredCards} cards, generated ${res.written} markdown files.`);
    if (res.files.length) {
      for (const f of res.files) {
        console.log(`  > ${f.file} | ${f.storyId} | ${f.title} | ${f.status}`);
      }
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
