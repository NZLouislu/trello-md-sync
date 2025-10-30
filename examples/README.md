# Examples Directory

This directory contains example markdown files and test fixtures demonstrating the Trello MD Sync tool.

## Directory Structure

```
examples/
├── md/                    # Input markdown files
│   └── test-todo-list.md  # Multi-story todo list format
├── trello/                # Example story formats
│   ├── single-story-example.md
│   └── multi-story-example.md
├── items/                 # Output directory for exported stories
└── __tests__/             # Test fixtures
```

## Story Format

All examples use the standardized `STORY-XXXX` format:

**Single-story format:**
```markdown
## Story: STORY-001 Enable Trello-only environment

### Story ID
STORY-001

### Status
Backlog

### Description
Story description here...

### Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2
```

**Multi-story block format:**
```markdown
## Backlog

- Story: STORY-01 Feature Name
  id: STORY-01
  description: Feature description
  acceptance_criteria:
    - [ ] Criterion 1
    - [ ] Criterion 2
  priority: p1
  labels: [tag1, tag2]
  assignees: [user1]
```

## Running Examples

### Import to Trello (md → Trello)

```bash
npm run build
npm run md
```

With dry-run:
```bash
set MDSYNC_DRY_RUN=1&& npm run md
```

### Export from Trello (Trello → md)

```bash
npm run build
npm run trello
```

## Verification

Run tests to verify examples:

```bash
npm test
```

All example files should:
- Use `STORY-XXXX` naming convention
- Parse without errors
- Round-trip successfully (export → import → export produces identical output)

## Custom Field Usage

Examples work **without** requiring Trello custom fields. The story ID is embedded in the card name using the `STORY-XXXX Title` format.


## Legacy Format Support

The parser still reads legacy `ID:` format for backward compatibility:
- `ID: 123 Title` → parsed correctly
- Mixed documents with both formats work

However, all **new** exports use the `STORY-XXXX` format.
