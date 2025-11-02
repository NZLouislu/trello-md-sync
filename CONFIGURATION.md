# Configuration Guide

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
