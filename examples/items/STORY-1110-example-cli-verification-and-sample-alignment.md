## Story: STORY-1110 Example CLI Verification and Sample Alignment

### Story ID
STORY-1110

### Status
Backlog

### Description
Complete md and trello CLI validation and sample updates under the `examples/` directory to guarantee round-trip sync without custom fields and repair related tests.

### Acceptance Criteria
- [ ] `examples/md/*.md`, `examples/stories/*.md`, and CLI outputs conform to the `STORY-XXXX` convention
- [ ] `npm run md -- --projectRoot examples` and `npm run trello -- --projectRoot examples --dry-run` run inside `examples/` without warnings or errors
- [ ] Fixtures, snapshots, and mock data in `examples/__tests__` align with the new format and pass
- [ ] README or task documents include an example runbook describing no-custom-field usage and verification steps

### Priority
Priority: High

### Labels
sync, trello, examples

### Assignees
backend
