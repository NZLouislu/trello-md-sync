## Story: Implement Markdown parser (sections + todo-list blocks)

### Story ID
STORY-03

### Status
Backlog

### Description
As a developer, I can parse both single-story sections and multi-story todo-list blocks into Story[] with tolerant fallbacks.

### Acceptance Criteria
- [ ] Detect "## Story: {title}" sections; extract Story ID/Status/Description/Acceptance Criteria/Priority/Labels/Assignees
- [ ] Under Backlog/Ready/Doing/Done, detect "- Story: {title}" with block fields (id/description/acceptance_criteria/status/priority/labels/assignees)
- [ ] Fallbacks: generate mdsync-{slug} id if missing; infer status from column; normalize status via mapping
- [ ] Unit tests cover single/multiple stories and edge cases
