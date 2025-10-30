# Trello MD Sync

Bidirectional sync between Trello boards and Markdown stories.

trello-md-sync. Parse, render, and sync Markdown stories with Trello cards, lists, and checklists.

## Overview

This tool provides bidirectional sync between Markdown and Trello:

- md → Trello: parse Markdown stories and upsert Trello cards, move to lists via status mapping, and sync checklists.
- Trello → md: export Trello cards as single-story Markdown files using a consistent template.

Screenshots:

- Markdown files:
  https://cdn.jsdelivr.net/gh/NZLouislu/trello-md-sync@main/images/md.png
- Trello board:
  https://cdn.jsdelivr.net/gh/NZLouislu/trello-md-sync@main/images/project.png

## Features

- Trello-only bidirectional sync
- Story model parsing (title, storyId, status, body, todos)
- Status → Trello list mapping via JSON
- Checklist sync (default name "Todos")
- Deterministic naming and idempotent updates
- Canonical story naming `STORY-XXXX <title>` with legacy `ID:` fallback parsing
- Configurable via .env (no Actions required)
- TypeScript support and examples

## Requirements

- Node.js (LTS recommended)
- Trello API Key and Token

## Verification

Ensure code quality before deployment:

```bash
npm run build
npm test
```

Both commands must pass without errors. Test coverage should be ≥90%.

For migration from legacy `ID:` format to `STORY-XXXX` format, see [MIGRATION.md](./MIGRATION.md).

## Environment (.env)

Create a `.env` file in project root with at least:

Required

- TRELLO_KEY
- TRELLO_TOKEN
- TRELLO_BOARD_ID

Optional

- MD_INPUT_DIR (default: examples/md)
- MD_OUTPUT_DIR (default: examples/items)
- CHECKLIST_NAME (default: Todos)
- TRELLO_LIST_MAP_JSON (default: {"backlog":"Backlog","ready":"Ready","doing":"Doing","done":"Done"})
- MDSYNC_CONCURRENCY (default: 4)
- MDSYNC_DRY_RUN (1/true to enable)
- MDSYNC_STRICT_STATUS (1/true to enforce status mapping)
- MDSYNC_WRITE_LOCAL (1/true to write local artifacts where applicable)
- PRIORITY_LABEL_MAP_JSON (JSON map of priority value → Trello label name)
- LABEL_TOKEN_MAP_JSON (JSON map of markdown label token → Trello label name or id)
- MEMBER_ALIAS_MAP_JSON (JSON map of assignee alias → Trello member name or id)
- REQUIRED_LABELS (comma-separated or JSON array of label names to validate)
- MDSYNC_ENSURE_LABELS (1/true to create required labels on the board when missing)

The examples load .env explicitly and set paths programmatically; the library/CLIs honor these env vars when present.

## Installation

```bash
npm install trello-md-sync
```

## Usage

### 1) Run examples (quick start)

```bash
# md -> Trello (import stories from Markdown to Trello)
cd examples
npm run md

# Trello -> md (export Trello cards to Markdown)
npm run project
```

These example scripts will:

- Load ../.env
- Use examples/md as input and examples/items as output (overridable by env)

### 2) CLI-style

md → Trello

```bash
# Ensure .env contains TRELLO_* and optional path variables
npx trello-md-sync md-to-trello --ensure-labels --required-labels="alpha,beta"
# or if installed locally:
# npx trello-md-sync md-to-trello
```

Flags of interest:

- `--priority-label-map` to supply a JSON string mapping markdown priority values to Trello labels.
- `--label-token-map` to translate markdown label tokens to Trello labels or ids.
- `--required-labels` to declare label names that must exist (comma-separated or JSON array).
- `--ensure-labels` to automatically create required labels on the Trello board when missing.
- `--member-alias-map` to translate assignee aliases to Trello member names or ids.
- `--json` to emit machine-readable `mdsyncDryRun` output for dashboards and CI.

Trello → md

```bash
npx trello-md-sync trello-to-md
# or if installed locally:
# npx trello-md-sync trello-to-md
# filter by list/label/story id
# npx trello-md-sync trello-to-md --list="Ready" --label="Blue" --storyId="STORY-123"
# capture JSON summary for automation
# npx trello-md-sync trello-to-md --list="Ready" --json
```

You can fine-tune behavior with env variables:

- MDSYNC_DRY_RUN=1 to validate without writing
- MDSYNC_CONCURRENCY=5 for higher throughput
- MDSYNC_STRICT_STATUS=true to enforce exact list mapping
- LOG_LEVEL=debug and/or LOG_JSON=true for diagnostics
- LOG_JSON=1 emits `mdsyncDryRun`/`mdsyncDetails` JSON payloads for CI ingestion
- MDSYNC_ENSURE_LABELS=true to create required labels automatically before sync
- REQUIRED_LABELS="alpha,beta" to require these labels to exist on the board
- PRIORITY_LABEL_MAP_JSON='{"p0":"Critical","p1":"High"}' to map markdown priority meta to Trello labels
- LABEL_TOKEN_MAP_JSON='{"bug":"Critical"}' to translate markdown label tokens to Trello labels/ids
- MEMBER_ALIAS_MAP_JSON='{"qa":"qa@example.com"}' to translate assignee aliases to Trello members
- STORY names must follow `STORY-<number> <title>`; legacy `ID:` prefixes are parsed but not emitted
- TRELLO_FILTER_LIST, TRELLO_FILTER_LABEL, and TRELLO_FILTER_STORYID filter Trello exports without touching input markdown

### 3) package.json scripts (Windows)

Add these scripts to your package.json to quickly run imports/exports with environment overrides on Windows:

```json
{
  "scripts": {
    "md": "set MD_INPUT_DIR=./examples/md&& set MD_OUTPUT_DIR=./examples/items&& node dist/src/trello/md-to-trello.js",
    "md:logs": "set VERBOSE=1&& npm run md",
    "md:json": "set LOG_JSON=1&& npm run md",
    "trello": "set MD_OUTPUT_DIR=./examples/items&& node dist/src/trello/trello-to-md.js",
    "trello:filters": "set TRELLO_FILTER_LIST=Ready&& set TRELLO_FILTER_LABEL=Blue&& npm run trello",
    "trello:logs": "set VERBOSE=1&& npm run trello",
    "trello:json": "set LOG_JSON=1&& npm run trello"
  }
}
```

Notes:

- These commands use Windows cmd-style env syntax (set ... &&). On Unix shells, use ENV=... npm run ... or $env:VAR=... for PowerShell.
- MD_INPUT_DIR/MD_OUTPUT_DIR override defaults from .env for a quick start.

### 4) As a library (TypeScript)

```ts
export async function mdToTrello(): Promise<any> {
  dotenv.config({ path: path.resolve(__dirname, "../.env") });

  process.env.MD_INPUT_DIR = path.resolve(__dirname, "md");
  process.env.MD_OUTPUT_DIR = path.resolve(__dirname, "items");
  const lvl = (process.env.LOG_LEVEL || "").toLowerCase();
  const json =
    (process.env.LOG_JSON || "").toLowerCase() === "1" ||
    (process.env.LOG_JSON || "").toLowerCase() === "true";
  const logLevel = lvl === "debug" ? "debug" : "info";
  const res = await mdToTrello({ logLevel: logLevel as any, json });
  return res;
}

if (require.main === module) {
  const useJson =
    (process.env.LOG_JSON || "").toLowerCase() === "1" ||
    (process.env.LOG_JSON || "").toLowerCase() === "true";
  mdToTrello()
    .then((r) => {
      if (useJson) {
        console.log(
          JSON.stringify({ phase: "mdToTrello", result: r }, null, 2),
        );
      } else {
        console.log("md-to-trello:", r);
      }
    })
    .catch((e) => {
      if (useJson) {
        console.error(
          JSON.stringify(
            { phase: "mdToTrello", error: e?.message || String(e) },
            null,
            2,
          ),
        );
      } else {
        console.error(e);
      }
      process.exit(1);
    });
}

export async function trelloToMd(): Promise<any> {
  dotenv.config({ path: path.resolve(__dirname, "../.env") });

  process.env.MD_OUTPUT_DIR = path.resolve(__dirname, "items");
  const lvl = (process.env.LOG_LEVEL || "").toLowerCase();
  const json =
    (process.env.LOG_JSON || "").toLowerCase() === "1" ||
    (process.env.LOG_JSON || "").toLowerCase() === "true";
  const logLevel = lvl === "debug" ? "debug" : "info";
  const res = await trelloToMd({ logLevel: logLevel as any, json });
  return res;
}

if (require.main === module) {
  const useJson =
    (process.env.LOG_JSON || "").toLowerCase() === "1" ||
    (process.env.LOG_JSON || "").toLowerCase() === "true";
  trelloToMd()
    .then((r) => {
      if (useJson) {
        console.log(
          JSON.stringify({ phase: "trelloToMd", result: r }, null, 2),
        );
      } else {
        console.log("trello-to-md:", r);
      }
    })
    .catch((e) => {
      if (useJson) {
        console.error(
          JSON.stringify(
            { phase: "trelloToMd", error: e?.message || String(e) },
            null,
            2,
          ),
        );
      } else {
        console.error(e);
      }
      process.exit(1);
    });
}

// Trello -> md
const exportResult = await trelloToMd({
key: process.env.TRELLO_KEY || "",
token: process.env.TRELLO_TOKEN || "",
boardId: process.env.TRELLO_BOARD_ID || "",
outputDir: process.env.MD_OUTPUT_DIR || "examples/items",
checklistName: process.env.CHECKLIST_NAME || "Todos",
listMapJson: process.env.TRELLO_LIST_MAP_JSON,
verbose: (process.env.LOG_LEVEL || "").toLowerCase() === "debug" || process.env.VERBOSE === "1",
logJson: (process.env.LOG_JSON || "").toLowerCase() === "1" || (process.env.LOG_JSON || "").toLowerCase() === "true",
});

Note: Function names and options mirror the actual example imports found in this repository. Env variables take precedence where applicable.

## Story Mapping

- Story.title → Trello card name
- Story.body → Trello card description
- Story.status → Trello list via TRELLO_LIST_MAP_JSON
- Story.todos → Trello checklist items under CHECKLIST_NAME (default "Todos")
- Story.storyId → Trello card name (preferred) with legacy `ID:` name parsing as fallback
  - Card names are emitted as `STORY-XXXX <title>`; legacy cards named with `ID:` are still readable but will be normalized on update

## Markdown Formats

The parser supports:

- Single-story file with sections:
  - ## Story: {title}

  - ### Story ID
  - ### Status
  - ### Description
  - ### Acceptance Criteria
  - Optional: Priority, Labels, Assignees

- Multi-story file (todo-list style) grouped under H2 status sections (Backlog/Ready/Doing/Done), with “- Story: …” items and optional fields (id/priority/labels/assignees) and acceptance_criteria list.
- Titles should begin with `STORY-XXXX` for new content; legacy `ID:` prefixes remain backward compatible.

See examples under:

- examples/md/ (inputs)
- examples/items/ (outputs)

### Examples

Single-story (sections)

````
Single story markdown example:

```markdown
<!-- examples/trello/single-story-example.md -->
## Story: Enable Trello-only environment and path strategy

### Story ID
STORY-001

### Status
Backlog

### Description
As a maintainer, I want a Trello-only environment configuration and a unified path strategy so that the tool runs reliably across machines and avoids hard-coded drive letters.

### Acceptance Criteria
- [ ] Provide .env.example with TRELLO_KEY, TRELLO_TOKEN, TRELLO_BOARD_ID, TRELLO_LIST_MAP_JSON, MD_INPUT_DIR, MD_OUTPUT_DIR, CHECKLIST_NAME
- [ ] Use path.resolve(__dirname, '../../examples/...') for all defaults
- [ ] README mentions Trello-only positioning and environment variables

### Priority
p1

### Labels
[trello-md-sync, env, docs]

### Assignees
[]
````

Multi-story markdown example:

```markdown
<!-- examples/trello/multi-story-example.md -->

## Backlog

- Story: Establish Trello-only environment and path strategy
  id: STORY-01
  description: As a maintainer, I want a Trello-only environment configuration and unified path strategy so that runs are reliable and portable across machines.
  acceptance_criteria:
  - [x] Provide .env.example (TRELLO_KEY, TRELLO_TOKEN, TRELLO_BOARD_ID, TRELLO_LIST_MAP_JSON, MD_INPUT_DIR, MD_OUTPUT_DIR, CHECKLIST_NAME)
  - [x] Use path.resolve(\_\_dirname, '../../examples/...') defaults; remove drive-letter hardcoding
  - [x] README updated with Trello-only positioning and env table
        priority: p1
        labels: [trello-md-sync, env, docs]
        assignees: []

- Story: Define unified Story/Todo model and types
  id: STORY-02
  description: As a developer, I need a unified Story/Todo model so parsing and syncing share one contract.
  acceptance_criteria:
  - [x] Define Story {storyId, title, status, body, todos[], assignees[], labels[], meta}
  - [x] Define Todo {text, done, assignee?, due?}
        ️- [x] Document field mapping to Trello (name/desc/checklist/list)
        priority: p1
        labels: [trello-md-sync, core, types]
        assignees: []
```

## Notes

- This package runs in Node.js only (not in the browser).
- Paths in env can be absolute or relative; relative paths resolve against the project root.
- Trello export prefers a single-story-per-file template to ensure stable roundtrip.

## Feedback

If you encounter any problems during use, or have suggestions for improvement, feel free to contact me:

- 🌐 Personal Website: [https://nzlouis.com](https://nzlouis.com)
- 📝 Blog: [https://blog.nzlouis.com](https://blog.nzlouis.com)
- 💼 LinkedIn: [https://www.linkedin.com/in/ailouis](https://www.linkedin.com/in/ailouis)
- 📧 Email: nzlouis.com@gmail.com

You are also welcome to submit feedback directly in [GitHub Issues](https://github.com/nzlouislu/trello-md-sync/issues) 🙌

---

If you find this tool helpful, please consider giving it a ⭐️ Star on [GitHub](https://github.com/nzlouislu/trello-md-sync) to support the project, or connect with me on [LinkedIn](https://www.linkedin.com/in/ailouis).
