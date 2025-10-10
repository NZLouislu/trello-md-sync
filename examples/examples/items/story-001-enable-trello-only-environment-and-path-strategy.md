## Story: Enable Trello-only environment and path strategy

### Story ID
STORY-001

### Status
Backlog

### Description
As a maintainer, I want a Trello-only environment configuration and a unified path strategy so that the tool runs reliably across machines and avoids hard-coded drive letters.

### Acceptance Criteria
- [ ] Provide .env.example with TRELLO_KEY, TRELLO_TOKEN, TRELLO_BOARD_ID, TRELLO_LIST_MAP_JSON, TRELLO_STORY_ID_CUSTOM_FIELD_ID, MD_INPUT_DIR, MD_OUTPUT_DIR, CHECKLIST_NAME
- [ ] Use path.resolve(__dirname, '../../examples/...') for all defaults
- [ ] README mentions Trello-only positioning and environment variables
