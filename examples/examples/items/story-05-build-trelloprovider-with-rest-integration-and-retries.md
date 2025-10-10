## Story: Build TrelloProvider with REST integration and retries

### Story ID
STORY-05

### Status
Backlog

### Description
As a developer, I can create/update/move cards, manage checklists and custom fields with robust retry and error handling.

### Acceptance Criteria
- [ ] Methods: findItemByStoryIdOrTitle, createItem, updateItem, moveItemToStatus, listItems, getItemBody, setStoryId
- [ ] Auth via key/token; retry on 429/5xx with exponential backoff
- [ ] Status↔List mapping via TRELLO_LIST_MAP_JSON
- [ ] Contract tests with mocked endpoints
