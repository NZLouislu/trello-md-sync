## Story: STORY-1103 Upgrade mdToTrello Import Flow with Differential Updates

### Story ID
STORY-1103

### Status
To Do

### Description
Refactor mdToTrello() to separate create/update/move/checklist flows, respect dry-run planning output, and honor strict status validation before API calls.

### Acceptance Criteria
- [ ] Dry-run emits created/updated/moved/checklistChanges summaries without mutating Trello
- [ ] Live execution updates card name, desc, list, checklist, labels, and members atomically per story
- [ ] writeLocal option renders single-story markdown snapshots for each processed story
- [ ] Integration tests confirm idempotent runs on examples/md/test-todo-list.md

### Priority
Priority: High

### Labels
sync, trello, importer

### Assignees
backend
