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

### Assignees
backend
