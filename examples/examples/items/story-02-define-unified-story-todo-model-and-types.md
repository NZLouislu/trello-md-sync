## Story: Define unified Story/Todo model and types

### Story ID
STORY-02

### Status
Backlog

### Description
As a developer, I need a unified Story/Todo model so parsing and syncing share one contract.

### Acceptance Criteria
- [ ] Define Story {storyId, title, status, body, todos[], assignees[], labels[], meta}
- [ ] Define Todo {text, done, assignee?, due?}
- [ ] Document field mapping to Trello (name/desc/checklist/list)
