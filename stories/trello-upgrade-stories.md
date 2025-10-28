## Backlog

- Story: Refine Trello Markdown Parser for Multi-Story Imports
  Story ID: STORY-1101
  Description: Update parseBlockStory() and related utilities to fully support the revised Todo-list standard, capture source locations, and ensure status normalization integrates with the extended list map.
  Acceptance_Criteria:
    - [ ] Parser extracts Story ID, labels, assignees, priority, and acceptance criteria for every block story
    - [ ] Missing Story ID entries trigger structured errors containing file and line metadata
    - [ ] Normalized statuses resolve via TRELLO_LIST_MAP_JSON with strictStatus guardrails
    - [ ] Unit tests cover mixed H2 and - Story: inputs with ≥90% branch coverage
  Status: Backlog
  Priority: p1
  Labels: [sync, trello, parser]
  Assignees: [backend]

## Design

- Story: Enhance TrelloProvider for Checklist, Label, and Member Sync
  Story ID: STORY-1102
  Description: Extend TrelloProvider to ensure checklist creation, label alignment, and member assignment comply with the new import pipeline, including retries and detailed logging.
  Acceptance_Criteria:
    - [ ] Checklist synchronization recreates Todos checklist when acceptance criteria change
    - [ ] Label and member lookups cache Trello IDs and log unresolved entries as warnings
    - [ ] findItemByStoryIdOrTitle() prefers custom field matches and only warns on title fallbacks
    - [ ] Provider unit tests mock Trello REST endpoints covering success, retry, and failure paths
  Status: Design
  Priority: p1
  Labels: [sync, trello, provider]
  Assignees: [backend]

## To-Do

- Story: Upgrade mdToTrello Import Flow with Differential Updates
  Story ID: STORY-1103
  Description: Refactor mdToTrello() to separate create/update/move/checklist flows, respect dry-run planning output, and honor strict status validation before API calls.
  Acceptance_Criteria:
    - [ ] Dry-run emits created/updated/moved/checklistChanges summaries without mutating Trello
    - [ ] Live execution updates card name, desc, list, checklist, labels, and members atomically per story
    - [ ] writeLocal option renders single-story markdown snapshots for each processed story
    - [ ] Integration tests confirm idempotent runs on examples/md/test-todo-list.md
  Status: To-Do
  Priority: p1
  Labels: [sync, trello, importer]
  Assignees: [backend]

## Doing

- Story: Extend trelloToMd Exporter with Filtered Outputs
  Story ID: STORY-1104
  Description: Update trelloToMd() to support filtering by list, label, or Story ID, render Todos sections, and ensure filenames remain deterministic.
  Acceptance_Criteria:
    - [ ] CLI options --list, --label, and --storyId filter exported cards as expected
    - [ ] Rendered markdown includes Story ID, Status, Description, and Todos blocks in fixed order
    - [ ] Exported files parse back into identical Story objects via parseMarkdownToStories()
    - [ ] Integration tests cover mixed checklist states and filename truncation logic
    - [ ] Exported filenames follow `<storyId>-<slug(title)>.md`; missing ID falls back to `mdsync-<slug(title)>.md` with warning
  Status: Doing
  Priority: p2
  Labels: [sync, trello, exporter]
  Assignees: [backend]

## Code Review

- Story: Refresh CLI, Documentation, and Environment Templates
  Story ID: STORY-1105
  Description: Align package.json scripts, README, tasks, and .env.example with Trello-first workflows, including parameter descriptions and onboarding guidance.
  Acceptance_Criteria:
    - [ ] npm run md and npm run trello scripts expose dry-run, json, and projectRoot parameters
    - [ ] README documents Trello environment variables, list mapping JSON, and usage examples
    - [ ] tasks/trello 开发计划.md references the new workflows without GitHub terminology
    - [ ] .env.example includes Trello key, token, board, checklist name, and path variables
  Status: Code Review
  Priority: p2
  Labels: [sync, docs, cli]
  Assignees: [docs]

## Testing

- Story: Establish Comprehensive Test Coverage for Trello Sync
  Story ID: STORY-1106
  Description: Implement unit, integration, and end-to-end test suites ensuring parser, importer, exporter, and provider modules meet coverage thresholds and CI gating.
  Acceptance_Criteria:
    - [ ] Unit tests assert parser edge cases, provider retries, and renderer output with ≥90% coverage on critical paths
    - [ ] Integration tests simulate md→Trello and Trello→md flows using mocked REST responses
    - [ ] E2E dry-run scenario validates command outputs for examples directory
    - [ ] CI pipeline blocks on coverage <85% or parsing errors and publishes summary artifacts
  Status: Testing
  Priority: p1
  Labels: [sync, tests, ci]
  Assignees: [qa]
