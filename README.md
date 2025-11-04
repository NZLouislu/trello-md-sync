# Trello MD Sync

[![npm version](https://img.shields.io/badge/npm-v0.1.0-orange.svg)](https://www.npmjs.com/package/trello-md-sync)
![MD Sync Series](https://img.shields.io/badge/MD%20Sync%20Series-NZLouis-2EA44F?logo=githubactions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Sync Trello boards with Markdown stories. Licensed under the MIT License.

![Markdown Example](https://cdn.jsdelivr.net/gh/NZLouislu/trello-md-sync@main/images/md.png)

## Overview

The latest release introduces a safer, clearer sync model:
- Single entry for md→Trello with create-only enforcement
- Separated formats: Multi-Story for import, Single-Story for export
- Dry-run diagnostics for CI and previewing plans

This tool synchronises Markdown documents and Trello boards so teams can manage work in text while keeping the board current.

## Features

- Create-only import: Multi-Story Markdown → Trello board items by Story ID
- Read-only export: Trello board → Single-Story Markdown files
- Status mapping: Backlog, Ready, In progress, In review, Done (with aliases)
- Deterministic, idempotent behaviour keyed by Story ID
- Dry-run with structured logs for CI gates
- **Configuration validation** with clear error messages and suggestions
- **Enhanced error handling** with recovery recommendations
- **Directory management** with automatic creation and permission validation
- **CLI validation command** to test configuration before sync operations
- TypeScript API and runnable examples

## Requirements

- Node.js 18 or newer

## Quick start

1. Install the package in a Node.js workspace:

```bash
npm install trello-md-sync
```

2. Create a `.env` file in the project root with credentials that can access Trello:

```env
TRELLO_KEY=your_trello_key
TRELLO_TOKEN=your_trello_token
TRELLO_BOARD_ID=your_board_id

# Optional configuration
PROJECT_ROOT=./
MD_INPUT_DIR=./stories
MD_OUTPUT_DIR=./output
CHECKLIST_NAME=Tasks
LOG_LEVEL=info

# Advanced mappings (JSON format)
TRELLO_LIST_MAP_JSON={"backlog":"Backlog","doing":"In Progress","done":"Done"}
PRIORITY_LABEL_MAP_JSON={"high":"Priority: High","medium":"Priority: Medium","low":"Priority: Low"}
MEMBER_ALIAS_MAP_JSON={"john":"john.doe","jane":"jane.smith"}
```

3. Validate your configuration:

```bash
npm run validate
```

4. Run the CLI commands or consume the TypeScript API as described below.

## Usage

### CLI

| Command | Purpose | Key options |
| --- | --- | --- |
| `npm run md -- <path>` | Import Multi-Story Markdown into a Trello board (create-only) | `--dry-run` to print the plan without calling the API |
| `npm run trello [-- <Story-ID>] [<outputDir>]` | Export all stories or a single story into Markdown files | Positional `Story-ID` selects a single story, positional `outputDir` overrides the destination |
| `npm run trello:story -- [Story-ID] [outputDir]` | Convenience wrapper for single-story export | Accepts `Story-ID` and `outputDir` as positional args or via `--story`, `--output` |
| `npx ts-node src/trello-to-md.ts [Story-ID] [outputDir]` | Low-level script that powers the exports | Requires `TRELLO_KEY`, `TRELLO_TOKEN`, and `TRELLO_BOARD_ID` env vars; positional arguments follow the same rules |

- Import Multi-Story Markdown to a Trello board (create-only):
```bash
npm run md -- stories/test-multi-stories-0.1.0.md
```
- Optional dry-run plan: simulates the sync and prints the intended Trello mutations without executing API writes:
```bash
npm run md -- stories/test-multi-stories-0.1.0.md --dry-run
```
- Export Trello board items to Single-Story Markdown files:
```bash
npm run trello
npm run trello -- <Story-ID>
```

### As a Library

```typescript
import {
  mdToTrello,
  trelloToMdWithOptions,
  trelloToMdSingleStory
} from "trello-md-sync";

const trelloKey = process.env.TRELLO_KEY!;
const trelloToken = process.env.TRELLO_TOKEN!;
const boardId = process.env.TRELLO_BOARD_ID!;

const mdResult = await mdToTrello(trelloKey, trelloToken, boardId, "./markdown-files");
const exportAllResult = await trelloToMdWithOptions({
  trelloKey,
  trelloToken,
  boardId,
  outputPath: "./output-dir",
  logLevel: "info"
});
const exportSingleResult = await trelloToMdSingleStory(
  trelloKey,
  trelloToken,
  boardId,
  "Story-1234",
  "./single-story"
);

mdResult.logs.forEach((entry) => {
  console.log(`[${entry.level.toUpperCase()}] ${entry.message}`, ...entry.args);
});

if (!mdResult.result.success) {
  console.error("Import run failed", mdResult.result.errors);
}

if (exportAllResult.result.success) {
  console.log(`Exported ${exportAllResult.result.files.length} files to ${exportAllResult.result.outputDir}`);
} else {
  console.error("Bulk export failed", exportAllResult.result.errors);
}

if (!exportSingleResult.result.success) {
  console.error("Single story export failed", exportSingleResult.result.errors);
}
```

## Configuration Validation

The package includes comprehensive configuration validation to help you catch issues early:

### Validate Configuration Command

```bash
# Validate your current configuration
npm run validate

# Or use the CLI directly
validate-config --verbose
```

### Configuration Validation in Code

```typescript
import { validateTrelloConfig } from "trello-md-sync";

const validation = validateTrelloConfig({
  trelloKey: process.env.TRELLO_KEY,
  trelloToken: process.env.TRELLO_TOKEN,
  trelloBoardId: process.env.TRELLO_BOARD_ID
});

if (!validation.isValid) {
  console.error("Configuration errors:");
  validation.errors.forEach(error => {
    console.error(`- ${error.field}: ${error.message}`);
    if (error.suggestion) {
      console.error(`  💡 ${error.suggestion}`);
    }
  });
  process.exit(1);
}
```

### Enhanced Error Handling

```typescript
import { mdToTrello, handleCommonErrors, formatErrorForUser } from "trello-md-sync";

try {
  const result = await mdToTrello(config);
  console.log("Sync completed successfully");
} catch (error) {
  const syncError = handleCommonErrors(error);
  console.error(formatErrorForUser(syncError));
  
  // Get recovery suggestions
  const actions = getRecoveryActions(syncError);
  console.log("Suggested actions:");
  actions.forEach(action => console.log(`- ${action}`));
}
```

## Troubleshooting

### Common Configuration Issues

1. **Invalid API Key Format**
   ```
   Error: Trello API key format is invalid
   Solution: API key should be a 32-character hexadecimal string
   ```

2. **Permission Denied**
   ```
   Error: Output directory validation failed: Permission denied
   Solution: Check file/directory permissions and ensure you have read/write access
   ```

3. **Board Not Found**
   ```
   Error: Trello board not found or inaccessible
   Solution: Check that the board ID is correct and you have access to the board
   ```

### Getting Help

- Run `npm run validate` to check your configuration
- Use `--help` flag with CLI commands for usage information
- Check the `examples/validation-examples.md` for detailed examples
- Review error messages for specific suggestions and recovery actions

### Examples

The `examples/` workspace demonstrates end-to-end usage with ready-made scripts:

- `examples/md-to-trello.ts` — imports markdown from `examples/md/` into a Trello board.
- `examples/validation-examples.md` — configuration validation examples and troubleshooting
- `examples/config-example.json` — sample configuration file with all options
- `examples/trello-to-md.ts` — exports Trello board items into `examples/items/`.
- `examples/tests/` — Mocha scenarios that validate the flows.

Sample `package.json` scripts (from `examples/package.json`):

```json
{
  "scripts": {
    "md": "ts-node ./md-to-trello.ts",
    "trello": "ts-node ./trello-to-md.ts",
    "trello:story": "ts-node ./trello-to-md.ts --story"
  }
}
```

Run them from the `examples/` directory once `.env` is configured:

```bash
npm run md            # imports multi-story markdown from examples/md/
npm run trello        # exports all stories to examples/items/
npm run trello:story  # exports a single story, prompting when IDs are missing
```

### Using trello:story

```bash
npm run trello:story -- Story-1234
```

- Prompts for Trello key, token and board ID if env vars `TRELLO_KEY`, `TRELLO_TOKEN` and `TRELLO_BOARD_ID` are not set
- Generates markdown for the specified story ID under `stories/` by default
- Accepts `Story-XXXX` via positional arg or `--story Story-XXXX`
- Overrides the output directory via positional path or `--output ./custom-dir`

Parameter rules:

- `Story-ID` positional detection checks for values that match `/^Story-/i`. If omitted, all stories are exported.
- The first remaining positional argument is treated as the output directory. Without it, files are written to `./stories`.
- Flags `--story=value` / `--output=value` are equivalent to their spaced counterparts.

Examples:

```bash
npm run trello -- Story-0456
npm run trello ./stories/out-story -- Story-0112
npm run trello:story -- Story-0112 ./stories/single
npm run trello:story -- --story Story-0112 --output ./stories/single
```

## How to get TRELLO_BOARD_ID

- Go to your Trello board in a web browser
- The board ID is in the URL: `https://trello.com/b/BOARD_ID/board-name`
- Or use the Trello API to list your boards:

PowerShell to query TRELLO_BOARD_ID:

```powershell
$key = "your_trello_key"
$token = "your_trello_token"

$response = Invoke-RestMethod `
    -Uri "https://api.trello.com/1/members/me/boards?key=$key&token=$token" `
    -Method GET

$response | Select-Object id, name
```

## API Reference

### mdToTrello(trelloKey: string, trelloToken: string, boardId: string, sourcePath: string)

Import Multi-Story markdown files from a directory into a Trello board. Create-only and idempotent by Story ID.

- trelloKey: Trello API key
- trelloToken: Trello API token
- boardId: Trello board ID
- sourcePath: Path to directory containing markdown files

### trelloToMd(trelloKey: string, trelloToken: string, boardId: string, outputPath?: string)

Export Trello board items to Single-Story markdown files. Defaults to writing into `./stories` when no output path is provided.

- trelloKey: Trello API key
- trelloToken: Trello API token
- boardId: Trello board ID
- outputPath (optional): Output directory path. Defaults to './stories'

## Story File Formats

Two complementary formats are supported:

- Multi-Story files (for `mdToTrello()` import)
- Single-Story files (for `trelloToMd()` export)

### Multi-Story format (md→Trello)

Sections represent status. Each story must include `- Story:` with Story ID and description. Optional fields include acceptance criteria, priority, labels, and assignees.

```
## Backlog

- Story: STORY-1101 Refine Trello Markdown Parser for Multi-Story Imports
  Description: Update parseBlockStory() and related utilities to fully support the revised Todo-list standard, capture source locations, and ensure status normalization integrates with the extended list map.
  Acceptance_Criteria:
    - [ ] Parser extracts Story ID, labels, assignees, priority, and acceptance criteria for every block story
    - [ ] Missing Story ID entries trigger structured errors containing file and line metadata
    - [ ] Normalized statuses resolve via TRELLO_LIST_MAP_JSON with strictStatus guardrails
    - [ ] Unit tests cover mixed H2 and - Story: inputs with ≥90% branch coverage
  Priority: High
  Labels: [sync, trello, parser]
  Assignees: [backend]

## Ready

- Story: STORY-1102 Enhance TrelloProvider for Checklist, Label, and Member Sync
  Description: Extend TrelloProvider to ensure checklist creation, label alignment, and member assignment comply with the new import pipeline, including retries and detailed logging.
  Acceptance_Criteria:
    - [ ] Checklist synchronization recreates Todos checklist when acceptance criteria change
    - [ ] Label and member lookups cache Trello IDs and log unresolved entries as warnings
    - [ ] findItemByStoryIdOrTitle() prefers custom field matches and only warns on title fallbacks
    - [ ] Provider unit tests mock Trello REST endpoints covering success, retry, and failure paths
  Priority: High
  Labels: [sync, trello, provider]
  Assignees: [backend]

## In review

- Story: STORY-1103 Upgrade mdToTrello Import Flow with Differential Updates
  Description: Refactor mdToTrello() to separate create/update/move/checklist flows, respect dry-run planning output, and honor strict status validation before API calls.
  Acceptance_Criteria:
    - [ ] Dry-run emits created/updated/moved/checklistChanges summaries without mutating Trello
    - [ ] Live execution updates card name, desc, list, checklist, labels, and members atomically per story
    - [ ] writeLocal option renders single-story markdown snapshots for each processed story
    - [ ] Integration tests confirm idempotent runs on examples/md/test-todo-list.md
  Priority: High
  Labels: [sync, trello, importer]
  Assignees: [backend]
```

Rules:
- Allowed headings: Backlog, Ready, In progress, In review, Done, Design, To-Do, Doing, Code Review, Testing
- Aliases: `To do → Ready`, `In Progress/in progress → In progress`
- Unrecognised headings map to Backlog
- Story ID must be unique and embedded in the story title (format: `STORY-XXXX Title`)
- Existing IDs in Trello board are skipped (no update, no delete)
- Within a file, duplicate IDs: only the first entry is honoured; later duplicates are skipped
- `Description:` content is free-form Markdown and preserved verbatim
- `Acceptance_Criteria:` uses checkbox format for tracking completion status
- `Priority:`, `Labels:`, and `Assignees:` are optional metadata fields
- Labels should be formatted as arrays: `[label1, label2, label3]`
- Assignees should be formatted as arrays: `[user1, user2, user3]`

### Single-Story format (Trello→md, read-only)

Each file contains exactly one story and includes structured sections for all story metadata.

```
## Story: STORY-1101 Refine Trello Markdown Parser for Multi-Story Imports

### Story ID
STORY-1101

### Status
Backlog

### Description
Update parseBlockStory() and related utilities to fully support the revised Todo-list standard, capture source locations, and ensure status normalization integrates with the extended list map.

### Acceptance Criteria
- [ ] Parser extracts Story ID, labels, assignees, priority, and acceptance criteria for every block story
- [ ] Missing Story ID entries trigger structured errors containing file and line metadata
- [ ] Normalized statuses resolve via TRELLO_LIST_MAP_JSON with strictStatus guardrails
- [ ] Unit tests cover mixed H2 and - Story: inputs with ≥90% branch coverage

### Priority
Priority: High

### Labels
sync, trello, parser
```

This format is generated by export and must not be used for import. The exported files include all available metadata from the Trello card, including acceptance criteria as checkboxes, priority level, and associated labels.

### Status mapping

`mdToTrello()` normalises headings/status strings using the logic in `src/markdown-to-trello.ts`:

| Input heading / status | Stored status |
| --- | --- |
| `Backlog` | `Backlog` |
| `Ready`, `To do`, `Todo` | `Ready` |
| `In progress`, `In Progress` | `In Progress` |
| `In review` | `In review` |
| `Done` | `Done` |
| Any other heading | Treated as `Backlog` |

## Import and Export Behaviour

- md→Trello (import)
  - Input: Multi-Story files only
  - Action: Create new items when `story id` does not exist in Trello board; skip otherwise
  - No updates or deletes from Markdown
- Trello→md (export)
  - Output: Multiple Single-Story files, each with `### Story ID`
  - Read-only: do not feed these files back into import

## Limitations and caveats

- The importer is create-only. Updating or deleting existing Trello cards must be done in Trello.
- Exporters overwrite files with the same name inside the target directory.
- All commands expect `TRELLO_KEY`, `TRELLO_TOKEN` and `TRELLO_BOARD_ID` to be available; the Trello token must allow board read/write access.
- Large exports/imports may trigger Trello API rate limits. Use `--dry-run` to validate before executing.
- `story id` matching is case-insensitive, but duplicates in the same markdown file keep only the first occurrence.

## Story ID

- Matching uses Story ID only; titles never overwrite existing items
- If an item with the same ID exists in Trello board: skip
- Missing `story id`: strictly skipped and logged with file name, start line, and title
- Missing ID plus exact title match triggers an additional "Possible title duplicate" warning

## Dry-run and Diagnostics

Use dry-run to preview planned operations, with logs covering create plans, skip reasons, missing IDs, duplicates, and unknown keys. Ideal for CI gates and author feedback.

## Deprecated

- `src/story-to-trello-item.ts` is deprecated as an import entry. Use `src/markdown-to-trello.ts` via the CLI or library.


## Notes

- Requires Node.js 18+
- Runs in Node.js/server environments, not in the browser

## Feedback

If you encounter any problems during use, or have suggestions for improvement, feel free to contact me:

- 🌐 Personal Website: [https://nzlouis.com](https://nzlouis.com)
- 📝 Blog: [https://blog.nzlouis.com](https://blog.nzlouis.com)
- 💼 LinkedIn: [https://www.linkedin.com/in/ailouis](https://www.linkedin.com/in/ailouis)
- 📧 Email: nzlouis.com@gmail.com

You are also welcome to submit feedback directly in [GitHub Issues](https://github.com/nzlouislu/trello-md-sync/issues) 🙌

---

If you find this tool helpful, please consider giving it a ⭐️ Star on [GitHub](https://github.com/nzlouislu/trello-md-sync) to support the project, or connect with me on [LinkedIn](https://www.linkedin.com/in/ailouis).
