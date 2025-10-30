import path from "path";
import { mdToTrello, makeMdToTrelloSummary } from "../trello/md-to-trello";
import type { MdToTrelloConfig } from "../trello/md-to-trello";

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

  try {
    const result = await mdToTrello(config);
    const summary = makeMdToTrelloSummary(result.result);
    if (config.json) {
      console.log(JSON.stringify({ kind: "md-to-trello", summary, logs: result.logs }));
    } else {
      console.log("md-to-trello summary:", summary);
      console.log(`Processed ${summary.processedFiles} markdown files, parsed ${summary.processedStories} stories, rendered ${summary.renderedFiles} local files.`);
      if (result.result.errors.length) {
        for (const error of result.result.errors) {
          console.error("md-to-trello error:", error);
        }
      }
    }
    if (result.result.failed > 0) {
      process.exitCode = 1;
    }
  } catch (err) {
    const message = (err as any)?.message || String(err);
    if (config.json || jsonFlag) {
      console.error(JSON.stringify({ kind: "md-to-trello", error: message }));
    } else {
      console.error("md-to-trello failed:", message);
    }
    process.exitCode = 1;
  }
}

main();
