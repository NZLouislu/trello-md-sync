## Story: STORY-1107 Standardize Story Title Conventions and Parsing Workflow

### Story ID
STORY-1107

### Status
Backlog

### Description
Refactor markdown-parser, renderer, md-to-trello, and trello-to-md naming and matching logic per the "story id + title upgrade plan" to remove the hard dependency on Trello custom fields while staying compatible with legacy data.

### Acceptance Criteria
- [ ] `parseStorySection()` and `parseBlockStory()` support both `STORY-XXXX` and legacy `ID:` prefixes, prioritizing the new format
- [ ] `renderSingleStoryMarkdown()`, `buildStoryPlan()`, and `mapCardToStory()` consistently emit and parse `STORY-XXXX <title>` names
- [ ] `TrelloProvider.findItemByStoryIdOrTitle()` and `createCardLookup()` uniquely locate cards without relying on custom fields
- [ ] `examples/md/test-todo-list.md`, `stories/trello-upgrade-stories.md`, and related samples align with the new format and remain round-trip safe

### Priority
Priority: High

### Labels
sync, trello, parser

### Assignees
backend
