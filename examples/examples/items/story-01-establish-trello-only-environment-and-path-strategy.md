## Story: Establish Trello-only environment and path strategy

### Story ID
STORY-01

### Status
Backlog

### Description
As a maintainer, I want a Trello-only environment configuration and unified path strategy so that runs are reliable and portable across machines.

### Acceptance Criteria
- [ ] Provide .env.example (TRELLO_KEY, TRELLO_TOKEN, TRELLO_BOARD_ID, TRELLO_LIST_MAP_JSON, TRELLO_STORY_ID_CUSTOM_FIELD_ID, MD_INPUT_DIR, MD_OUTPUT_DIR, CHECKLIST_NAME)
- [ ] Use path.resolve(__dirname, '../../examples/...') defaults; remove drive-letter hardcoding
- [ ] README updated with Trello-only positioning and env table
