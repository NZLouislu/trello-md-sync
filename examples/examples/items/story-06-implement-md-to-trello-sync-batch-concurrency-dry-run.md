## Story: Implement md-to-trello sync (batch, concurrency, dry-run)

### Story ID
STORY-06

### Status
Backlog

### Description
As a PO, I can import multiple Stories from Markdown into Trello with concurrency control and a dry-run mode.

### Acceptance Criteria
- [ ] Scan MD_INPUT_DIR, parse to Story[], upsert by storyId (title fallback)
- [ ] Update name/desc, align checklist "Todos" (full replace), move to mapped list
- [ ] Write storyId (custom field or desc frontmatter)
- [ ] Flags: --concurrency, --dry-run, --checklist-name, --strict-status; summary report created/updated/skipped/failed
