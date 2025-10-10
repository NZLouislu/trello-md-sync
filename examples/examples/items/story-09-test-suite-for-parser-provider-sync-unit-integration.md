## Story: Test suite for parser/provider/sync (unit + integration)

### Story ID
STORY-09

### Status
Backlog

### Description
As a QA engineer, I want comprehensive tests to ensure reliability and prevent regressions.

### Acceptance Criteria
- [ ] Unit: parser (sections + blocks), renderer, normalizeStatus, id extraction, naming
- [ ] Integration: mock Trello REST for md→Trello (batch+idempotency) and trello→md (single template)
- [ ] Coverage ≥ 80% on core paths; CI runs on PRs
