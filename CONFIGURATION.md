# Configuration Guide - Trello MD Sync

## Environment Variables

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

## Complete .env Template

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
```# Configuration Guide

## Environment Variables

### Basic Configuration

```bash
TRELLO_KEY=your_trello_api_key
TRELLO_TOKEN=your_trello_token
TRELLO_BOARD_ID=your_board_id
```

### Directory Configuration

```bash
MD_INPUT_DIR=examples/md
MD_OUTPUT_DIR=examples/items
CHECKLIST_NAME=Todos
```

### List Mapping

Map markdown status names to Trello list names:

```bash
TRELLO_LIST_MAP_JSON={"backlog":"Backlog","ready":"Ready","doing":"Doing","done":"Done"}
```

### Label Management

#### Auto-create Missing Labels

Enable automatic label creation:

```bash
MDSYNC_ENSURE_LABELS=1
```

#### Required Labels

Comma-separated list of labels to ensure exist on the board:

```bash
REQUIRED_LABELS=sync,trello,parser,provider,importer,exporter,tests,ci,docs,cli,examples
```

#### Priority Label Mapping

Map priority values in markdown to Trello label names:

```bash
PRIORITY_LABEL_MAP_JSON={"p1":"Priority: High","p2":"Priority: Medium","p3":"Priority: Low"}
```

**How it works:**
- In markdown: `Priority: p1`
- Syncs to Trello as label: `Priority: High`
- When exporting from Trello, `Priority: High` label converts back to `Priority: p1` in markdown

**Setup Steps:**
1. Create labels in Trello: "Priority: High", "Priority: Medium", "Priority: Low"
2. Set the mapping in `.env`
3. Use `Priority: p1` in your markdown files
4. Run `npm run md` to sync

### Member Alias Mapping

Map markdown assignee aliases to actual Trello usernames:

```bash
MEMBER_ALIAS_MAP_JSON={"backend":"john_doe","qa":"jane_smith","devops":"bob_wilson","docs":"alice_brown"}
```

**How it works:**
- In markdown: `Assignees: [backend, qa]`
- Syncs to Trello as members: `john_doe`, `jane_smith`
- When exporting from Trello, members convert back to aliases in markdown

**Setup Steps:**
1. Find your Trello usernames (visible in member profile URLs)
2. Create alias mappings in `.env`
3. Use aliases in your markdown files
4. Run `npm run md` to sync

### Other Options

```bash
LOG_LEVEL=info
MDSYNC_DRY_RUN=0
MDSYNC_STRICT_STATUS=0
MDSYNC_WRITE_LOCAL=0
```

## Complete Example

Create a `.env` file in the project root:

```bash
TRELLO_KEY=abc123def456
TRELLO_TOKEN=xyz789uvw012
TRELLO_BOARD_ID=5f8a1b2c3d4e5f6g
TRELLO_LIST_MAP_JSON={"backlog":"Backlog","ready":"Ready","doing":"Doing","review":"Code Review","done":"Done"}

MD_INPUT_DIR=examples/md
MD_OUTPUT_DIR=examples/items
CHECKLIST_NAME=Todos

MDSYNC_ENSURE_LABELS=1
REQUIRED_LABELS=sync,trello,parser,provider,importer,exporter,tests,ci,docs,cli,examples

PRIORITY_LABEL_MAP_JSON={"p1":"Priority: High","p2":"Priority: Medium","p3":"Priority: Low"}

MEMBER_ALIAS_MAP_JSON={"backend":"john_doe","qa":"jane_smith","devops":"bob_wilson","docs":"alice_brown"}

LOG_LEVEL=info
MDSYNC_DRY_RUN=0
```

## Markdown Format

### Story with Priority, Labels, and Assignees

```markdown
## Backlog

- Story: STORY-1101 Refine Parser
  description: Improve markdown parsing
  priority: p1
  labels: sync, trello, parser
  assignees: backend, qa
  acceptance_criteria:
  - [ ] Parse multi-story files
  - [ ] Handle edge cases
```

This will sync to Trello with:
- Label: "Priority: High" (from p1 mapping)
- Labels: "sync", "trello", "parser"
- Members: john_doe, jane_smith (from backend, qa aliases)

## Troubleshooting

### Labels not syncing to Trello

**Problem:** Warnings like `[warn] missing labels for STORY-1101: sync, trello, parser`

**Solution:**
1. Set `MDSYNC_ENSURE_LABELS=1` in `.env`
2. Add labels to `REQUIRED_LABELS`
3. Run `npm run md` again

### Members not syncing to Trello

**Problem:** Warnings like `[warn] missing members for STORY-1101: backend`

**Solution:**
1. Find actual Trello usernames (check member profile URLs)
2. Add mappings to `MEMBER_ALIAS_MAP_JSON`
3. Example: `{"backend":"john_doe"}`
4. Run `npm run md` again

### Priority not showing in Trello

**Problem:** Priority field in markdown doesn't create labels in Trello

**Solution:**
1. Create priority labels in Trello manually first: "Priority: High", "Priority: Medium", "Priority: Low"
2. Set `PRIORITY_LABEL_MAP_JSON` in `.env`
3. Set `MDSYNC_ENSURE_LABELS=1`
4. Run `npm run md` again

### Members/Labels not exporting from Trello

**Problem:** Trello cards have members and labels, but they don't appear in exported markdown

**Solution:**
1. Ensure `PRIORITY_LABEL_MAP_JSON` and `MEMBER_ALIAS_MAP_JSON` are set in `.env`
2. Run `npm run trello` to re-export
3. Check the exported markdown files in `examples/items/`

## Testing Configuration

Test your configuration with dry-run mode:

```bash
MDSYNC_DRY_RUN=1 npm run md
```

This will show what would be synced without making actual changes.
