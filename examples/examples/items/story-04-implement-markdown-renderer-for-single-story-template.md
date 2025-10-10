## Story: Implement Markdown renderer for single-story template

### Story ID
STORY-04

### Status
Backlog

### Description
As a developer, I want a consistent renderer for single-story Markdown to ensure stable round-trip with minimal diff.

### Acceptance Criteria
- [ ] Render sections: Title, Story ID, Status, Description, Acceptance Criteria (GFM)
- [ ] Naming: prefers {storyId}.md; fallback mdsync-{slug(title)}.md
- [ ] Idempotent formatting validated by tests
