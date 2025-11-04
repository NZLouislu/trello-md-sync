## Story: STORY-1108 Expand Test Suites and Coverage

### Story ID
STORY-1108

### Status
Backlog

### Description
Update unit, integration, and end-to-end tests to cover the new title convention, keep legacy inputs compatible, and ensure overall coverage remains ≥90%.

### Acceptance Criteria
- [ ] Tests for markdown-parser, renderer, trello-to-md, and md-to-trello include `STORY-XXXX` scenarios with legacy fallback assertions
- [ ] Round-trip and examples dry-run flows simulate Trello boards without custom fields to verify sync accuracy
- [ ] Test runs complete without warnings and coverage reports show ≥90% on critical modules
- [ ] CI configurations or snapshots are refreshed to reflect the new expected outputs

### Priority
Priority: High

### Labels
sync, trello, tests

### Assignees
backend
