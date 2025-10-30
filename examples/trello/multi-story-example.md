## Backlog

- Story: STORY-01 Establish Trello-only environment and path strategy
id: STORY-01
description: As a maintainer, I want a Trello-only environment configuration and unified path strategy so that runs are reliable and portable across machines.
acceptance_criteria:
  - [x] Use path.resolve(__dirname, '../../examples/...') defaults; remove drive-letter hardcoding
  - [x] README updated with Trello-only positioning and env table
priority: p1
labels: [trello-md-sync, env, docs]
assignees: []

- Story: STORY-02 Define unified Story/Todo model and types
id: STORY-02
description: As a developer, I need a unified Story/Todo model so parsing and syncing share one contract.
acceptance_criteria:
  - [x] Define Story {storyId, title, status, body, todos[], assignees[], labels[], meta}
  - [x] Define Todo {text, done, assignee?, due?}
  - [x] Document field mapping to Trello (name/desc/checklist/list)
priority: p1
labels: [trello-md-sync, core, types]
assignees: []

- Story: STORY-03 Implement Markdown parser (sections + todo-list blocks)
id: STORY-03
description: As a developer, I can parse both single-story sections and multi-story todo-list blocks into Story[] with tolerant fallbacks.
acceptance_criteria:
  - [x] Detect "## Story: {title}" sections; extract Story ID/Status/Description/Acceptance Criteria/Priority/Labels/Assignees
  - [x] Under Backlog/Ready/Doing/Done, detect "- Story: {title}" with block fields (id/description/acceptance_criteria/status/priority/labels/assignees)
  - [x] Fallbacks: generate mdsync-{slug} id if missing; infer status from column; normalize status via mapping
  - [x] Unit tests cover single/multiple stories and edge cases
priority: p1
labels: [trello-md-sync, parsing]
assignees: []

- Story: STORY-04 Implement Markdown renderer for single-story template
id: STORY-04
description: As a developer, I want a consistent renderer for single-story Markdown to ensure stable round-trip with minimal diff.
acceptance_criteria:
  - [x] Render sections: Title, Story ID, Status, Description, Acceptance Criteria (GFM)
  - [x] Naming: prefers {storyId}.md; fallback mdsync-{slug(title)}.md
  - [x] Idempotent formatting validated by tests
priority: p2
labels: [trello-md-sync, rendering]
assignees: []

- Story: STORY-05 Build TrelloProvider with REST integration and retries
id: STORY-05
description: As a developer, I can create/update/move cards, manage checklists and custom fields with robust retry and error handling.
acceptance_criteria:
  - [x] Methods: findItemByStoryIdOrTitle, createItem, updateItem, moveItemToStatus, listItems, getItemBody, setStoryId
  - [x] Auth via key/token; retry on 429/5xx with exponential backoff
  - [x] Status↔List mapping via TRELLO_LIST_MAP_JSON
  - [ ] Contract tests with mocked endpoints
priority: p1
labels: [trello-md-sync, provider, api]
assignees: []

- Story: STORY-06 Implement md-to-trello sync (batch, concurrency, dry-run)
id: STORY-06
description: As a PO, I can import multiple Stories from Markdown into Trello with concurrency control and a dry-run mode.
acceptance_criteria:
  - [x] Scan MD_INPUT_DIR, parse to Story[], upsert by storyId (title fallback)
  - [x] Update name/desc, align checklist "Todos" (full replace), move to mapped list
  - [x] Write storyId (custom field or desc frontmatter)
  - [x] Flags: --concurrency, --dry-run, --checklist-name, --strict-status; summary report created/updated/skipped/failed
priority: p1
labels: [trello-md-sync, sync, cli]
assignees: []

- Story: STORY-07 Implement trello-to-md export (single-story files)
id: STORY-07
description: As a developer, I can export Trello cards to single-story Markdown files for focused development and reviews.
acceptance_criteria:
  - [ ] Fetch cards with customFieldItems and checklists; filter by --list/--query
  - [ ] Map to Story and render to MD_OUTPUT_DIR; overwrite policy favors Trello
  - [ ] Round-trip test: exported files parse back to same Story data
priority: p1
labels: [trello-md-sync, export, cli]
assignees: []

- Story: STORY-08 Add structured logging and error aggregation
id: STORY-08
description: As an operator, I need structured logs and optional JSON output to integrate with pipelines and auditing.
acceptance_criteria:
  - [ ] Log levels and JSON mode for both CLIs
  - [ ] Aggregated errors with actionable messages; exit codes reflect partial failures
  - [ ] Tests assert JSON schema in log output
priority: p2
labels: [trello-md-sync, logging, ops]
assignees: []

- Story: STORY-09 Test suite for parser/provider/sync (unit + integration)
id: STORY-09
description: As a QA engineer, I want comprehensive tests to ensure reliability and prevent regressions.
acceptance_criteria:
  - [ ] Unit: parser (sections + blocks), renderer, normalizeStatus, id extraction, naming
  - [ ] Integration: mock Trello REST for md→Trello (batch+idempotency) and trello→md (single template)
  - [ ] Coverage ≥ 80% on core paths; CI runs on PRs
priority: p1
labels: [trello-md-sync, testing, ci]
assignees: []

- Story: STORY-10 Prepare docs, examples and release 0.1.0
id: STORY-10
description: As a maintainer, I want a documented release process and examples so users can start within 15 minutes and we can publish safely.
acceptance_criteria:
  - [ ] README: install, .env, CLI examples, common errors
  - [ ] examples/trello include sections and block formats; examples/items shows exports
  - [ ] Build to dist, CHANGELOG, npm publish --access public; rollback via npm deprecate + patch
priority: p2
labels: [trello-md-sync, docs, release]
assignees: []