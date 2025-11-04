# Trello MD Sync

[![npm version](https://img.shields.io/badge/npm-v0.1.0-orange.svg)](https://www.npmjs.com/package/trello-md-sync)
![MD Sync Series](https://img.shields.io/badge/MD%20Sync%20Series-NZLouis-2EA44F?logo=githubactions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Sync Trello boards with Markdown stories. Licensed under the MIT License.

![Markdown Example](https://cdn.jsdelivr.net/gh/NZLouislu/trello-md-sync@main/images/trello-md-sync.png)

## Overview

The latest release introduces a safer, clearer sync model:
- Single entry for md→Trello with create-only enforcement
- Separated formats: Multi-Story for import, Single-Story for export
- Dry-run diagnostics for CI and previewing plans

This tool synchronises Markdown documents and Trello boards so teams can manage work in text while keeping the board current.

## Features

### Core Functionality
- ✅ **Create-only import:** Multi-Story Markdown → Trello board items by Story ID
- ✅ **Read-only export:** Trello board → Single-Story Markdown files
- ✅ **Status mapping:** Backlog, Ready, In progress, In review, Done (with aliases)
- ✅ **Deterministic behavior:** Idempotent operations keyed by Story ID
- ✅ **Dry-run mode:** Preview changes with structured logs for CI gates

### Configuration & Validation
- ✅ **Configuration validation:** Comprehensive validation with clear error messages
- ✅ **Format validation:** Automatic validation of API keys, tokens, and board IDs
- ✅ **Connection testing:** Verify Trello API connectivity before sync operations
- ✅ **Directory management:** Automatic creation and permission validation
- ✅ **CLI validation command:** Test configuration with `npm run validate`

### Advanced Features
- ✅ **Enhanced error handling:** Detailed error messages with recovery recommendations
- ✅ **Performance optimization:** Validation caching and concurrent operations
- ✅ **Label management:** Automatic label creation and priority mapping
- ✅ **Member mapping:** Alias support for team member assignments
- ✅ **Flexible filtering:** Filter by list, label, or story ID
- ✅ **TypeScript API:** Full TypeScript support with type definitions
- ✅ **Runnable examples:** Complete examples in the `examples/` directory

## Requirements

- Node.js 18 or newer

## Quick Start

### 1. Install

```bash
npm install trello-md-sync
```

### 2. Get Trello Credentials

You need three pieces of information from Trello:

1. **API Key:** Visit [https://trello.com/app-key](https://trello.com/app-key) and copy your key
2. **API Token:** Click "Token" on the same page and authorize the app
3. **Board ID:** Open your board in browser, find it in the URL: `trello.com/b/BOARD_ID/board-name`

### 3. Configure Environment

Create a `.env` file in your project root with the **required** parameters:

```env
# ====================================
# REQUIRED: Trello API Configuration
# ====================================
# Get your API key and token from https://trello.com/app-key
TRELLO_KEY=your_trello_api_key_here
TRELLO_TOKEN=your_trello_token_here
TRELLO_BOARD_ID=your_board_id_here

# ====================================
# OPTIONAL: Directory Configuration
# ====================================
PROJECT_ROOT=./
MD_INPUT_DIR=./stories
MD_OUTPUT_DIR=./output

# ====================================
# OPTIONAL: Trello List Mapping
# ====================================
# Map your workflow states to Trello list names
TRELLO_LIST_MAP_JSON={"backlog":"Backlog","ready":"Ready","doing":"In Progress","review":"Code Review","done":"Done"}

# ====================================
# OPTIONAL: Checklist Configuration
# ====================================
CHECKLIST_NAME=Tasks

# ====================================
# OPTIONAL: Label Configuration
# ====================================
# Automatically create missing labels
MDSYNC_ENSURE_LABELS=1
# Required labels (comma-separated)
REQUIRED_LABELS=bug,feature,enhancement
# Map priority values to label names
PRIORITY_LABEL_MAP_JSON={"high":"Priority: High","medium":"Priority: Medium","low":"Priority: Low"}
# Map tokens to label names
LABEL_TOKEN_MAP_JSON={"bug":"Type: Bug","feat":"Type: Feature"}

# ====================================
# OPTIONAL: Member Configuration
# ====================================
# Map team member aliases to Trello usernames
MEMBER_ALIAS_MAP_JSON={"john":"john.doe","jane":"jane.smith"}

# ====================================
# OPTIONAL: Filtering Options
# ====================================
TRELLO_FILTER_LIST=
TRELLO_FILTER_LABEL=
TRELLO_FILTER_STORYID=

# ====================================
# OPTIONAL: Logging & Debugging
# ====================================
LOG_LEVEL=info
LOG_JSON=0
VERBOSE=0

# ====================================
# OPTIONAL: Runtime Behavior
# ====================================
MDSYNC_DRY_RUN=0
MDSYNC_STRICT_STATUS=0
MDSYNC_WRITE_LOCAL=0
```

### 4. Validate Configuration

**Always validate before your first sync:**

```bash
npm run validate
```

This command checks:
- ✅ Required parameters are present and valid
- ✅ API credentials format is correct
- ✅ Trello API connection is working
- ✅ Directory permissions are adequate

**Expected output:**
```
✅ Configuration validation passed!
All required parameters are valid and Trello API is accessible.
🚀 Validation completed in 45.23ms
```

### 5. Start Syncing

**Import markdown to Trello:**
```bash
npm run md -- stories/my-stories.md
```

**Export Trello to markdown:**
```bash
npm run trello
```

**Preview changes (dry-run):**
```bash
npm run md -- stories/my-stories.md --dry-run
```

## Configuration Parameters

### Quick Reference

| Category | Required? | Parameters |
|----------|-----------|------------|
| **Trello API** | ✅ **Required** | `TRELLO_KEY`, `TRELLO_TOKEN`, `TRELLO_BOARD_ID` |
| **Directories** | Optional | `PROJECT_ROOT`, `MD_INPUT_DIR`, `MD_OUTPUT_DIR` |
| **List Mapping** | Optional | `TRELLO_LIST_MAP_JSON` |
| **Labels** | Optional | `MDSYNC_ENSURE_LABELS`, `REQUIRED_LABELS`, `PRIORITY_LABEL_MAP_JSON`, `LABEL_TOKEN_MAP_JSON` |
| **Members** | Optional | `MEMBER_ALIAS_MAP_JSON` |
| **Filtering** | Optional | `TRELLO_FILTER_LIST`, `TRELLO_FILTER_LABEL`, `TRELLO_FILTER_STORYID` |
| **Logging** | Optional | `LOG_LEVEL`, `LOG_JSON`, `VERBOSE` |
| **Runtime** | Optional | `MDSYNC_DRY_RUN`, `MDSYNC_STRICT_STATUS`, `MDSYNC_WRITE_LOCAL`, `CHECKLIST_NAME` |

### Required Parameters

These three parameters are **mandatory** for the tool to work:

| Parameter | Description | How to Get |
|-----------|-------------|------------|
| `TRELLO_KEY` | Your Trello API key (32-character hex string) | Visit [https://trello.com/app-key](https://trello.com/app-key) |
| `TRELLO_TOKEN` | Your Trello API token (64-character hex string or ATTA- prefixed) | Click "Token" link on the API key page |
| `TRELLO_BOARD_ID` | Target Trello board ID (24-character alphanumeric) | Found in your board URL: `trello.com/b/BOARD_ID/board-name` |

**Example:**
```env
TRELLO_KEY=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
TRELLO_TOKEN=ATTA1234567890abcdef1234567890abcdef1234567890abcdef1234567890ab
TRELLO_BOARD_ID=5f4e3d2c1b0a9f8e7d6c5b4a
```

### Optional Parameters

#### Directory Configuration

| Parameter | Default | Description |
|-----------|---------|-------------|
| `PROJECT_ROOT` | Current directory | Base directory for resolving relative paths |
| `MD_INPUT_DIR` | `trello` | Input directory for markdown files (relative to PROJECT_ROOT) |
| `MD_OUTPUT_DIR` | `trello` | Output directory for generated files (relative to PROJECT_ROOT) |

#### Trello List Mapping

| Parameter | Default | Description |
|-----------|---------|-------------|
| `TRELLO_LIST_MAP_JSON` | Built-in mapping | JSON object mapping status names to Trello list names |

**Default mapping:**
```json
{
  "backlog": "Backlog",
  "ready": "Ready",
  "doing": "Doing",
  "in progress": "Doing",
  "in review": "In review",
  "review": "In review",
  "done": "Done",
  "todo": "Backlog"
}
```

**Custom mapping example:**
```env
TRELLO_LIST_MAP_JSON={"backlog":"📋 Backlog","doing":"🚀 In Progress","done":"✅ Done"}
```

#### Label Configuration

| Parameter | Default | Description |
|-----------|---------|-------------|
| `MDSYNC_ENSURE_LABELS` | `0` (false) | Automatically create missing labels in Trello |
| `REQUIRED_LABELS` | None | Comma-separated list of labels to pre-create |
| `PRIORITY_LABEL_MAP_JSON` | None | Map priority values to label names |
| `LABEL_TOKEN_MAP_JSON` | None | Map tokens in content to label names |

**Example:**
```env
MDSYNC_ENSURE_LABELS=1
REQUIRED_LABELS=bug,feature,enhancement,documentation
PRIORITY_LABEL_MAP_JSON={"p1":"Priority: High","p2":"Priority: Medium","p3":"Priority: Low"}
LABEL_TOKEN_MAP_JSON={"bug":"Type: Bug","feat":"Type: Feature","chore":"Type: Chore"}
```

#### Member Configuration

| Parameter | Default | Description |
|-----------|---------|-------------|
| `MEMBER_ALIAS_MAP_JSON` | None | Map friendly names to Trello usernames |

**Example:**
```env
MEMBER_ALIAS_MAP_JSON={"backend":"john.doe","frontend":"jane.smith","qa":"bob.tester"}
```

#### Filtering Options

| Parameter | Default | Description |
|-----------|---------|-------------|
| `TRELLO_FILTER_LIST` | None | Filter cards by list name (exact match) |
| `TRELLO_FILTER_LABEL` | None | Filter cards by label (exact match) |
| `TRELLO_FILTER_STORYID` | None | Filter by specific story ID |

#### Logging & Debugging

| Parameter | Default | Description |
|-----------|---------|-------------|
| `LOG_LEVEL` | `info` | Log level: `info` or `debug` |
| `LOG_JSON` | `0` (false) | Output logs in JSON format |
| `VERBOSE` | `0` (false) | Enable verbose output |

#### Runtime Behavior

| Parameter | Default | Description |
|-----------|---------|-------------|
| `MDSYNC_DRY_RUN` | `0` (false) | Preview changes without making them |
| `MDSYNC_STRICT_STATUS` | `0` (false) | Fail if status doesn't match list mapping |
| `MDSYNC_WRITE_LOCAL` | `0` (false) | Write changes back to local markdown files |
| `CHECKLIST_NAME` | `Todos` | Name for Trello checklists |

## Common Use Cases

### Basic Workflow

```bash
# 1. Validate your configuration
npm run validate

# 2. Preview what will be created (dry-run)
npm run md -- stories/sprint-1.md --dry-run

# 3. Import stories to Trello
npm run md -- stories/sprint-1.md

# 4. Export updated stories from Trello
npm run trello
```

### Team Collaboration

```env
# Configure team member aliases
MEMBER_ALIAS_MAP_JSON={"john":"john.doe","jane":"jane.smith","bob":"bob.wilson"}

# Automatically create labels
MDSYNC_ENSURE_LABELS=1
REQUIRED_LABELS=bug,feature,enhancement,documentation

# Map priorities to labels
PRIORITY_LABEL_MAP_JSON={"high":"Priority: High","medium":"Priority: Medium","low":"Priority: Low"}
```

### CI/CD Integration

```bash
# Validate configuration in CI
npm run validate || exit 1

# Dry-run to check for issues
npm run md -- stories/*.md --dry-run

# Import with strict status checking
MDSYNC_STRICT_STATUS=1 npm run md -- stories/*.md
```

### Filtering Exports

```bash
# Export only stories from specific list
TRELLO_FILTER_LIST="In Progress" npm run trello

# Export only stories with specific label
TRELLO_FILTER_LABEL="bug" npm run trello

# Export single story
npm run trello -- Story-1234
```

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

### Configuration Validation

Before running sync operations, validate your configuration:

```bash
npm run validate
```

Or with verbose output to see performance metrics:

```bash
npm run validate --verbose
```

### Common Configuration Issues

#### 1. Missing Required Parameters

**Error:**
```
❌ Configuration validation failed:
  trelloKey: Trello API key is required (Get your API key from https://trello.com/app-key)
```

**Solution:**
- Ensure all three required parameters are set in your `.env` file
- Get your API key from [https://trello.com/app-key](https://trello.com/app-key)
- Generate a token by clicking the "Token" link on the API key page

#### 2. Invalid API Key Format

**Error:**
```
❌ trelloKey: Trello API key format is invalid
```

**Solution:**
- API key should be a 32-character hexadecimal string
- Example: `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6`
- Verify you copied the entire key from the Trello API page

#### 3. Invalid Token Format

**Error:**
```
❌ trelloToken: Trello token format is invalid
```

**Solution:**
- Token should be a 64-character hexadecimal string or start with `ATTA-`
- Example: `ATTA1234567890abcdef1234567890abcdef1234567890abcdef1234567890ab`
- Generate a new token if the current one is invalid

#### 4. Board Not Found

**Error:**
```
❌ Trello board not found or inaccessible
```

**Solution:**
- Verify the board ID is correct (check your board URL)
- Ensure you have access to the board
- Confirm the token has read/write permissions for the board

#### 5. Permission Denied

**Error:**
```
❌ Output directory validation failed: Permission denied
```

**Solution:**
- Check file/directory permissions
- Ensure you have read/write access to the specified directories
- Try running with appropriate permissions or change the directory

#### 6. Missing Labels

**Warning:**
```
⚠️  missing labels for STORY-1234: Priority: High, Type: Bug
```

**Solution:**
- Set `MDSYNC_ENSURE_LABELS=1` to automatically create missing labels
- Or manually create the labels in your Trello board
- Configure `PRIORITY_LABEL_MAP_JSON` to map priority values to existing labels

#### 7. Missing Members

**Warning:**
```
⚠️  missing members for STORY-1234: john, jane
```

**Solution:**
- Configure `MEMBER_ALIAS_MAP_JSON` to map aliases to actual Trello usernames
- Example: `{"john":"john.doe","jane":"jane.smith"}`
- Ensure the Trello usernames exist and have access to the board

### Getting Help

- **Validate configuration:** Run `npm run validate` to check your setup
- **CLI help:** Use `--help` flag with any command for usage information
- **Verbose mode:** Add `--verbose` or set `LOG_LEVEL=debug` for detailed logs
- **Dry run:** Use `--dry-run` to preview changes without making them
- **Error messages:** Review error messages for specific suggestions and recovery actions

### Debug Mode

Enable debug logging to see detailed information:

```bash
# Via environment variable
LOG_LEVEL=debug npm run md

# Via CLI flag
npm run md -- --debug

# Via .env file
LOG_LEVEL=debug
```

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

## How to Get Trello Credentials

### Getting Your API Key and Token

1. **Get API Key:**
   - Visit [https://trello.com/app-key](https://trello.com/app-key)
   - Copy the "Key" shown at the top (32-character hex string)
   - This is your `TRELLO_KEY`

2. **Generate Token:**
   - On the same page, click the "Token" link
   - Authorize the application
   - Copy the generated token (64-character hex string or ATTA- prefixed)
   - This is your `TRELLO_TOKEN`

### Getting Your Board ID

**Method 1: From Browser URL**
- Open your Trello board in a web browser
- Look at the URL: `https://trello.com/b/BOARD_ID/board-name`
- The `BOARD_ID` is the alphanumeric string between `/b/` and the board name
- Example: In `https://trello.com/b/5f4e3d2c1b0a9f8e7d6c5b4a/my-project`, the board ID is `5f4e3d2c1b0a9f8e7d6c5b4a`

**Method 2: Using Trello API**

List all your boards to find the correct ID:

```bash
# Using curl (Linux/Mac)
curl "https://api.trello.com/1/members/me/boards?key=YOUR_KEY&token=YOUR_TOKEN"

# Using PowerShell (Windows)
$key = "your_trello_key"
$token = "your_trello_token"

$response = Invoke-RestMethod `
    -Uri "https://api.trello.com/1/members/me/boards?key=$key&token=$token" `
    -Method GET

$response | Select-Object id, name | Format-Table
```

**Method 3: Using the Validation Command**

After setting up your `.env` file with `TRELLO_KEY` and `TRELLO_TOKEN`, you can use the validation command to test different board IDs:

```bash
# Test a specific board ID
TRELLO_BOARD_ID=your_board_id npm run validate
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
