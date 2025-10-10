## Story: Implement trello-to-md export (single-story files)

### Story ID
STORY-07

### Status
Backlog

### Description
As a developer, I can export Trello cards to single-story Markdown files for focused development and reviews.

### Acceptance Criteria
- [ ] Fetch cards with customFieldItems and checklists; filter by --list/--query
- [ ] Map to Story and render to MD_OUTPUT_DIR; overwrite policy favors Trello
- [ ] Round-trip test: exported files parse back to same Story data
