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
- Configurable via .env (no Actions required)
- TypeScript support and examples

## Requirements

- Node.js (LTS recommended)
- Trello API Key and Token

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
- TRELLO_STORY_ID_CUSTOM_FIELD_ID
- MDSYNC_CONCURRENCY (default: 4)
- MDSYNC_DRY_RUN (1/true to enable)
- MDSYNC_STRICT_STATUS (1/true to enforce status mapping)
- MDSYNC_WRITE_LOCAL (1/true to write local artifacts where applicable)

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
npx trello-md-sync md-to-trello
# or if installed locally:
# npx trello-md-sync md-to-trello
```

Trello → md

```bash
npx trello-md-sync trello-to-md
# or if installed locally:
# npx trello-md-sync trello-to-md
```

You can fine-tune behavior with env variables:
- MDSYNC_DRY_RUN=1 to validate without writing
- MDSYNC_CONCURRENCY=5 for higher throughput
- MDSYNC_STRICT_STATUS=true to enforce exact list mapping
- LOG_LEVEL=debug and/or LOG_JSON=true for diagnostics

### 3) package.json scripts (Windows)

Add these scripts to your package.json to quickly run imports/exports with environment overrides on Windows:

```json
{
  "scripts": {
    "md": "set MD_INPUT_DIR=./examples/md&& set MD_OUTPUT_DIR=./examples/items&& node dist/src/trello/md-to-trello.js",
    "md:logs": "set VERBOSE=1&& npm run md",
    "md:json": "set LOG_JSON=1&& npm run md",
    "trello": "set MD_OUTPUT_DIR=./examples/items&& node dist/src/trello/trello-to-md.js",
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
  const json = ((process.env.LOG_JSON || "").toLowerCase() === "1") || ((process.env.LOG_JSON || "").toLowerCase() === "true");
  const logLevel = lvl === "debug" ? "debug" : "info";
  const res = await mdToTrello({ logLevel: logLevel as any, json });
  return res;
}

if (require.main === module) {
  const useJson = ((process.env.LOG_JSON || "").toLowerCase() === "1") || ((process.env.LOG_JSON || "").toLowerCase() === "true");
  mdToTrello()
    .then((r) => {
      if (useJson) {
        console.log(JSON.stringify({ phase: "mdToTrello", result: r }, null, 2));
      } else {
        console.log("md-to-trello:", r);
      }
    })
    .catch((e) => {
      if (useJson) {
        console.error(JSON.stringify({ phase: "mdToTrello", error: e?.message || String(e) }, null, 2));
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
  const json = ((process.env.LOG_JSON || "").toLowerCase() === "1") || ((process.env.LOG_JSON || "").toLowerCase() === "true");
  const logLevel = lvl === "debug" ? "debug" : "info";
  const res = await trelloToMd({ logLevel: logLevel as any, json });
  return res;
}

if (require.main === module) {
  const useJson = ((process.env.LOG_JSON || "").toLowerCase() === "1") || ((process.env.LOG_JSON || "").toLowerCase() === "true");
  trelloToMd()
    .then((r) => {
      if (useJson) {
        console.log(JSON.stringify({ phase: "trelloToMd", result: r }, null, 2));
      } else {
        console.log("trello-to-md:", r);
      }
    })
    .catch((e) => {
      if (useJson) {
        console.error(JSON.stringify({ phase: "trelloToMd", error: e?.message || String(e) }, null, 2));
      } else {
        console.error(e);
      }
      process.exit(1);
    });
}
```

Tips:
- Prefer LOG_JSON for CI; parse stdout as JSON and assert fields like created/updated/failed.
- Use LOG_LEVEL=debug or VERBOSE=1 locally to troubleshoot mapping, checklist alignment, and list moves.
- Combine with MDSYNC_DRY_RUN=1 to preview changes without writing.

// Trello -> md
const exportResult = await trelloToMd({
  key: process.env.TRELLO_KEY || "",
  token: process.env.TRELLO_TOKEN || "",
  boardId: process.env.TRELLO_BOARD_ID || "",
  outputDir: process.env.MD_OUTPUT_DIR || "examples/items",
  checklistName: process.env.CHECKLIST_NAME || "Todos",
  listMapJson: process.env.TRELLO_LIST_MAP_JSON,
  storyIdField: process.env.TRELLO_STORY_ID_CUSTOM_FIELD_ID,
  verbose: (process.env.LOG_LEVEL || "").toLowerCase() === "debug" || process.env.VERBOSE === "1",
  logJson: (process.env.LOG_JSON || "").toLowerCase() === "1" || (process.env.LOG_JSON || "").toLowerCase() === "true",
});
```

Note: Function names and options mirror the actual example imports found in this repository. Env variables take precedence where applicable.

## Story Mapping

- Story.title → Trello card name
- Story.body → Trello card description
- Story.status → Trello list via TRELLO_LIST_MAP_JSON
- Story.todos → Trello checklist items under CHECKLIST_NAME (default "Todos")
- Story.storyId → Trello custom field via TRELLO_STORY_ID_CUSTOM_FIELD_ID (recommended) or embedded in description/frontmatter as fallback

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

See examples under:
- examples/md/ (inputs)
- examples/items/ (outputs)

### Examples

Single-story (sections)

```
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
- [ ] Provide .env.example with TRELLO_KEY, TRELLO_TOKEN, TRELLO_BOARD_ID, TRELLO_LIST_MAP_JSON, TRELLO_STORY_ID_CUSTOM_FIELD_ID, MD_INPUT_DIR, MD_OUTPUT_DIR, CHECKLIST_NAME
- [ ] Use path.resolve(__dirname, '../../examples/...') for all defaults
- [ ] README mentions Trello-only positioning and environment variables

### Priority
p1

### Labels
[trello-md-sync, env, docs]

### Assignees
[]
```

Multi-story markdown example:

```markdown
<!-- examples/trello/multi-story-example.md -->
## Backlog

- Story: Establish Trello-only environment and path strategy
id: STORY-01
description: As a maintainer, I want a Trello-only environment configuration and unified path strategy so that runs are reliable and portable across machines.
acceptance_criteria:
  - [x] Provide .env.example (TRELLO_KEY, TRELLO_TOKEN, TRELLO_BOARD_ID, TRELLO_LIST_MAP_JSON, TRELLO_STORY_ID_CUSTOM_FIELD_ID, MD_INPUT_DIR, MD_OUTPUT_DIR, CHECKLIST_NAME)
  - [x] Use path.resolve(__dirname, '../../examples/...') defaults; remove drive-letter hardcoding
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