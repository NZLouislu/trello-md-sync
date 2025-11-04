## Story: STORY-1104 Extend trelloToMd Exporter with Filtered Outputs

### Story ID
STORY-1104

### Status
Doing

### Description
Update trelloToMd() to support filtering by list, label, or Story ID, render Todos sections, and ensure filenames remain deterministic.

### Acceptance Criteria
- [ ] CLI options --list, --label, and --storyId filter exported cards as expected
- [ ] Rendered markdown includes Story ID, Status, Description, and Todos blocks in fixed order
- [ ] Exported files parse back into identical Story objects via parseMarkdownToStories()
- [ ] Integration tests cover mixed checklist states and filename truncation logic
- [ ] Exported filenames follow `<storyId>-<slug(title)>.md`; missing ID falls back to `mdsync-<slug(title)>.md` with warning

### Priority
Priority: Medium

### Labels
sync, trello, exporter

### Assignees
backend
