import { trelloToMd } from "../trello/trello-to-md";
import { validateTrelloConfig } from "../utils/config-validator";
import { handleCommonErrors, formatErrorForUser } from "../utils/error-handler";

type FlagValue = string | boolean;
type FlagMap = Record<string, FlagValue>;

function showHelp() {
  console.log(`
Usage: trello-to-md [options] [story-id] [output-dir]

Export Trello cards to markdown files

Options:
  --help                    Show this help message
  --projectroot <path>      Project root directory (default: current directory)
  --output <path>          Output directory for markdown files (default: trello)
  --checklist <name>       Checklist name in Trello cards (default: Todos)
  --loglevel <level>       Log level: info or debug (default: info)
  --debug                  Enable debug logging
  --json                   Output results in JSON format
  --list <names>           Filter by list names (comma-separated)
  --label <names>          Filter by label names (comma-separated)
  --storyid <ids>          Filter by story IDs (comma-separated)
  --story <id>             Filter by single story ID (alias for --storyid)

Environment Variables:
  TRELLO_KEY              Trello API key (required)
  TRELLO_TOKEN            Trello API token (required)
  TRELLO_BOARD_ID         Trello board ID (required)
  TRELLO_LIST_MAP_JSON    JSON mapping of list names to status values
  PROJECT_ROOT            Project root directory
  MD_OUTPUT_DIR           Output directory for markdown files
  CHECKLIST_NAME          Checklist name in Trello cards
  LOG_LEVEL               Log level (info or debug)
  LOG_JSON                Output in JSON format (true/false)
  VERBOSE                 Enable verbose output (true/false)
  TRELLO_FILTER_LIST      Filter by list names
  TRELLO_FILTER_LABEL     Filter by label names
  TRELLO_FILTER_STORYID   Filter by story IDs

Examples:
  trello-to-md --output ./stories
  trello-to-md --list "Backlog,In Progress" --debug
  trello-to-md --storyid "STORY-1001,STORY-1002"
  trello-to-md STORY-1001 ./output
`);
}

function parseArgs(argv: string[]): { flags: FlagMap; positional: string[] } {
  const flags: FlagMap = {};
  const positional: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (token === "--help" || token === "-h") {
      showHelp();
      process.exit(0);
    }
    if (!token.startsWith("--")) {
      positional.push(token);
      continue;
    }
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
  return { flags, positional };
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
  const { flags, positional } = parseArgs(process.argv.slice(2));
  
  const logLevelFlag = flags["loglevel"];
  const jsonFlag = parseBoolean(flags["json"]);
  const debugFlag = parseBoolean(flags["debug"]);
  const projectRootFlag = typeof flags["projectroot"] === "string" ? flags["projectroot"] as string : undefined;
  const outputDirFlag = typeof flags["output"] === "string" ? flags["output"] as string : undefined;
  const checklistFlag = typeof flags["checklist"] === "string" ? flags["checklist"] as string : undefined;
  const listFlag = typeof flags["list"] === "string" ? flags["list"] as string : undefined;
  const labelFlag = typeof flags["label"] === "string" ? flags["label"] as string : undefined;
  const storyIdFlag = typeof flags["storyid"] === "string" ? flags["storyid"] as string : undefined;
  const storyFlag = typeof flags["story"] === "string" ? flags["story"] as string : undefined;

  let storyId = storyIdFlag || storyFlag;
  let outputDir = outputDirFlag;

  for (const arg of positional) {
    if (/^Story-/i.test(arg) && !storyId) {
      storyId = arg;
    } else if (!outputDir) {
      outputDir = arg;
    }
  }

  const args = {
    trelloKey: process.env.TRELLO_KEY || "",
    trelloToken: process.env.TRELLO_TOKEN || "",
    trelloBoardId: process.env.TRELLO_BOARD_ID || "",
    checklistName: checklistFlag ?? process.env.CHECKLIST_NAME,
    mdOutputDir: outputDir ?? process.env.MD_OUTPUT_DIR,
    trelloListMapJson: process.env.TRELLO_LIST_MAP_JSON,
    list: listFlag ?? process.env.TRELLO_FILTER_LIST,
    label: labelFlag ?? process.env.TRELLO_FILTER_LABEL,
    storyId: storyId ?? process.env.TRELLO_FILTER_STORYID,
  };
  
  const opts = {
    logLevel: (() => {
      if (typeof logLevelFlag === "string" && logLevelFlag.toLowerCase() === "debug") return "debug" as const;
      if (debugFlag) return "debug" as const;
      return (process.env.LOG_LEVEL || "info").toLowerCase() === "debug" ? "debug" as const : "info" as const;
    })(),
    json: jsonFlag ?? ((process.env.LOG_JSON || "").toLowerCase() === "1"),
    verbose: debugFlag ?? ((process.env.VERBOSE || "").toLowerCase() === "1"),
    projectRoot: projectRootFlag ?? process.env.PROJECT_ROOT ?? process.cwd()
  };

  const validation = validateTrelloConfig({
    trelloKey: args.trelloKey,
    trelloToken: args.trelloToken,
    trelloBoardId: args.trelloBoardId
  });

  if (!validation.isValid) {
    const errorMessages = validation.errors.map(e => `${e.field}: ${e.message}${e.suggestion ? ` (${e.suggestion})` : ''}`);
    if (opts.json) {
      console.error(JSON.stringify({ 
        kind: "trello-to-md", 
        error: "Configuration validation failed", 
        details: errorMessages 
      }));
    } else {
      console.error("❌ Configuration validation failed:");
      errorMessages.forEach(msg => console.error(`  ${msg}`));
      console.error("\n💡 Run 'npm run validate' to check your configuration");
    }
    process.exit(1);
  }

  if (validation.warnings.length > 0 && !opts.json) {
    console.warn("⚠️  Configuration warnings:");
    validation.warnings.forEach(w => {
      console.warn(`  ${w.field}: ${w.message}${w.suggestion ? ` (${w.suggestion})` : ''}`);
    });
    console.warn();
  }

  const res = await trelloToMd(args, opts);
  if (opts.json) {
    console.log(JSON.stringify({ kind: "trello-to-md", written: res.written, files: res.files, totalCards: res.totalCards, filteredCards: res.filteredCards }));
  } else {
    console.log(`✅ trello-to-md written=${res.written}`);
    console.log(`📄 Fetched ${res.totalCards} cards from Trello, filtered to ${res.filteredCards} cards, generated ${res.written} markdown files.`);
    if (res.files.length) {
      console.log("\n📝 Generated files:");
      for (const f of res.files) {
        console.log(`  > ${f.file} | ${f.storyId} | ${f.title} | ${f.status}`);
      }
    }
  }
}

main().catch((err) => {
  const syncError = handleCommonErrors(err);
  const jsonFlag = process.argv.includes('--json') || process.env.LOG_JSON === '1';
  
  if (jsonFlag) {
    console.error(JSON.stringify({ 
      kind: "trello-to-md", 
      error: syncError.message,
      code: syncError.code,
      suggestion: syncError.suggestion
    }));
  } else {
    console.error(formatErrorForUser(syncError));
  }
  process.exit(1);
});
