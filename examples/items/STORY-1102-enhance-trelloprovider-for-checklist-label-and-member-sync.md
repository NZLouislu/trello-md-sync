## Story: STORY-1102 Enhance TrelloProvider for Checklist, Label, and Member Sync

### Story ID
STORY-1102

### Status
Design

### Description
Extend TrelloProvider to ensure checklist creation, label alignment, and member assignment comply with the new import pipeline, including retries and detailed logging.

### Acceptance Criteria
- [ ] Checklist synchronization recreates Todos checklist when acceptance criteria change
- [ ] Label and member lookups cache Trello IDs and log unresolved entries as warnings
- [ ] findItemByStoryIdOrTitle() prefers custom field matches and only warns on title fallbacks
- [ ] Provider unit tests mock Trello REST endpoints covering success, retry, and failure paths

### Priority
Priority: High

### Labels
sync, trello, provider

### Assignees
backend
