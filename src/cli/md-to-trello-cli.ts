import path from "path";
import { mdToTrello, makeMdToTrelloSummary } from "../trello/md-to-trello";
import { validateTrelloConfig } from "../utils/config-validator";
import { handleCommonErrors, formatErrorForUser } from "../utils/error-handler";
import type { MdToTrelloConfig } from "../trello/md-to-trello";

type FlagValue = string | boolean;
type FlagMap = Record<string, FlagValue>;

function showHelp() {
  console.log(`
Usage: md-to-trello [options]

Sync markdown files to Trello cards

Options:
  --help                    Show this help message
  --projectroot <path>      Project root directory (default: current directory)
  --input <path>           Input directory for markdown files (default: trello)
  --output <path>          Output directory for processed files (default: trello)
  --checklist <name>       Checklist name in Trello cards (default: Todos)
  --loglevel <level>       Log level: info or debug (default: info)
  --debug                  Enable debug logging
  --json                   Output results in JSON format
  --dry-run                Show what would be done without making changes
  --strict-status          Require all statuses to be mapped
  --write-local            Write processed markdown files locally
  --ensure-labels          Create missing labels in Trello
  --required-labels <list> Comma-separated list of required labels
  --concurrency <number>   Number of parallel operations (default: 4)
  --priority-label-map <json>  Map priority values to label names
  --member-alias-map <json>    Map member aliases to Trello usernames
  --label-token-map <json>     Map tokens to label names

Environment Variables:
  TRELLO_KEY              Trello API key (required)
  TRELLO_TOKEN            Trello API token (required)
  TRELLO_BOARD_ID         Trello board ID (required)
  TRELLO_LIST_MAP_JSON    JSON mapping of status to list names
  PROJECT_ROOT            Project root directory
  MD_INPUT_DIR            Input directory for markdown files
  MD_OUTPUT_DIR           Output directory for processed files
  CHECKLIST_NAME          Checklist name in Trello cards
  LOG_LEVEL               Log level (info or debug)
  LOG_JSON                Output in JSON format (true/false)

Examples:
  md-to-trello --input ./stories --output ./processed
  md-to-trello --dry-run --debug
  md-to-trello --ensure-labels --required-labels "bug,feature,priority"
`);
}

function parseArgs(argv: string[]): FlagMap {
  const flags: FlagMap = {};
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (token === "--help" || token === "-h") {
      showHelp();
      process.exit(0);
    }
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

function parseBoolean(input: FlagValue | undefined): boolean | undefined {
  if (typeof input === "boolean") return input;
  if (typeof input !== "string") return undefined;
  const lower = input.toLowerCase();
  if (lower === "1" || lower === "true" || lower === "yes" || lower === "on") return true;
  if (lower === "0" || lower === "false" || lower === "no" || lower === "off") return false;
  return undefined;
}

function parseBooleanEnv(value: string | undefined): boolean | undefined {
  if (!value) return undefined;
  return parseBoolean(value as FlagValue);
}

function parseJsonOrString<T>(value: string | undefined): T | string | undefined {
  if (!value) return undefined;
  try {
    return JSON.parse(value) as T;
  } catch {
    return value;
  }
}

function parseNumber(input: FlagValue | undefined, envValue: string | undefined): number | undefined {
  if (typeof input === "string" && input.trim()) {
    const parsed = Number(input);
    if (!Number.isNaN(parsed)) return parsed;
  }
  if (envValue && envValue.trim()) {
    const parsed = Number(envValue);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return undefined;
}

function resolvePath(input: string | undefined, fallback: string): string {
  if (!input) return fallback;
  return path.isAbsolute(input) ? input : path.resolve(process.cwd(), input);
}

async function main() {
  const flags = parseArgs(process.argv.slice(2));
  
  const logLevelFlag = flags["loglevel"];
  const jsonFlag = parseBoolean(flags["json"]);
  const dryRunFlag = parseBoolean(flags["dry-run"]);
  const strictFlag = parseBoolean(flags["strict-status"]);
  const writeLocalFlag = parseBoolean(flags["write-local"]);
  const debugFlag = parseBoolean(flags["debug"]);
  const projectRootFlag = typeof flags["projectroot"] === "string" ? flags["projectroot"] as string : undefined;
  const inputDirFlag = typeof flags["input"] === "string" ? flags["input"] as string : undefined;
  const outputDirFlag = typeof flags["output"] === "string" ? flags["output"] as string : undefined;
  const checklistFlag = typeof flags["checklist"] === "string" ? flags["checklist"] as string : undefined;
  const priorityMapFlag = typeof flags["priority-label-map"] === "string" ? flags["priority-label-map"] as string : undefined;
  const labelTokenMapFlag = typeof flags["label-token-map"] === "string" ? flags["label-token-map"] as string : undefined;
  const ensureLabelsFlag = parseBoolean(flags["ensure-labels"]);
  const requiredLabelsFlag = typeof flags["required-labels"] === "string" ? flags["required-labels"] as string : undefined;
  const memberAliasMapFlag = typeof flags["member-alias-map"] === "string" ? flags["member-alias-map"] as string : undefined;
  const concurrencyValue = parseNumber(flags["concurrency"], process.env.MDSYNC_CONCURRENCY);

  const envLogLevel = (process.env.LOG_LEVEL || "").toLowerCase() === "debug" ? "debug" : "info";
  const projectRoot = resolvePath(projectRootFlag ?? process.env.PROJECT_ROOT, process.cwd());
  
  const config: MdToTrelloConfig = {
    trelloKey: process.env.TRELLO_KEY || "",
    trelloToken: process.env.TRELLO_TOKEN || "",
    trelloBoardId: process.env.TRELLO_BOARD_ID || "",
    trelloListMapJson: process.env.TRELLO_LIST_MAP_JSON,
    projectRoot,
    logLevel: (() => {
      if (typeof logLevelFlag === "string" && logLevelFlag.toLowerCase() === "debug") return "debug";
      if (debugFlag === true) return "debug";
      return envLogLevel;
    })(),
    json: jsonFlag ?? parseBooleanEnv(process.env.LOG_JSON) ?? false,
    dryRun: dryRunFlag ?? parseBooleanEnv(process.env.MDSYNC_DRY_RUN),
    strictStatus: strictFlag ?? parseBooleanEnv(process.env.MDSYNC_STRICT_STATUS),
    writeLocal: writeLocalFlag ?? parseBooleanEnv(process.env.MDSYNC_WRITE_LOCAL),
    checklistName: checklistFlag ?? process.env.CHECKLIST_NAME,
    mdInputDir: inputDirFlag ?? process.env.MD_INPUT_DIR,
    mdOutputDir: outputDirFlag ?? process.env.MD_OUTPUT_DIR,
    concurrency: concurrencyValue,
    priorityLabelMap: parseJsonOrString<Record<string, string>>(priorityMapFlag as string | undefined ?? process.env.PRIORITY_LABEL_MAP_JSON) as Record<string, string> | string | undefined,
    labelTokenMap: parseJsonOrString<Record<string, string>>(labelTokenMapFlag as string | undefined ?? process.env.LABEL_TOKEN_MAP_JSON) as Record<string, string> | string | undefined,
    ensureLabels: ensureLabelsFlag ?? parseBooleanEnv(process.env.MDSYNC_ENSURE_LABELS) ?? false,
    requiredLabels: (() => {
      const raw = requiredLabelsFlag as string | undefined ?? process.env.REQUIRED_LABELS;
      if (!raw) return undefined;
      if (typeof raw === 'string') {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) return parsed;
        } catch {}
        return raw.split(',').map(s => s.trim()).filter(Boolean);
      }
      return undefined;
    })(),
    memberAliasMap: parseJsonOrString<Record<string, string>>(memberAliasMapFlag as string | undefined ?? process.env.MEMBER_ALIAS_MAP_JSON) as Record<string, string> | string | undefined,
  };

  const validation = validateTrelloConfig({
    trelloKey: config.trelloKey,
    trelloToken: config.trelloToken,
    trelloBoardId: config.trelloBoardId
  });

  if (!validation.isValid) {
    const errorMessages = validation.errors.map(e => `${e.field}: ${e.message}${e.suggestion ? ` (${e.suggestion})` : ''}`);
    if (config.json) {
      console.error(JSON.stringify({ 
        kind: "md-to-trello", 
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

  if (validation.warnings.length > 0 && !config.json) {
    console.warn("⚠️  Configuration warnings:");
    validation.warnings.forEach(w => {
      console.warn(`  ${w.field}: ${w.message}${w.suggestion ? ` (${w.suggestion})` : ''}`);
    });
    console.warn();
  }

  try {
    const result = await mdToTrello(config);
    const summary = makeMdToTrelloSummary(result.result);
    if (config.json) {
      console.log(JSON.stringify({ kind: "md-to-trello", summary, logs: result.logs }));
    } else {
      console.log("✅ md-to-trello summary:", summary);
      console.log(`📄 Processed ${summary.processedFiles} markdown files, parsed ${summary.processedStories} stories, rendered ${summary.renderedFiles} local files.`);
      if (result.result.errors.length) {
        console.error("\n❌ Errors encountered:");
        for (const error of result.result.errors) {
          console.error(`  ${error.storyId || '(unknown)'}: ${error.message}`);
        }
      }
    }
    if (result.result.failed > 0) {
      process.exitCode = 1;
    }
  } catch (err) {
    const syncError = handleCommonErrors(err);
    if (config.json || jsonFlag) {
      console.error(JSON.stringify({ 
        kind: "md-to-trello", 
        error: syncError.message,
        code: syncError.code,
        suggestion: syncError.suggestion
      }));
    } else {
      console.error(formatErrorForUser(syncError));
    }
    process.exitCode = 1;
  }
}

main();
