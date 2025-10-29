## Backlog

- Story: STORY-1101 Refine Trello Markdown Parser for Multi-Story Imports
  Description: Update parseBlockStory() and related utilities to fully support the revised Todo-list standard, capture source locations, and ensure status normalization integrates with the extended list map.
  Acceptance_Criteria:
    - [ ] Parser extracts Story ID, labels, assignees, priority, and acceptance criteria for every block story
    - [ ] Missing Story ID entries trigger structured errors containing file and line metadata
    - [ ] Normalized statuses resolve via TRELLO_LIST_MAP_JSON with strictStatus guardrails
    - [ ] Unit tests cover mixed H2 and - Story: inputs with ≥90% branch coverage
  Priority: p1
  Labels: [sync, trello, parser]
  Assignees: [backend]

- Story: STORY-1107 Standardize Story Title Conventions and Parsing Workflow
  Description: Refactor markdown-parser, renderer, md-to-trello, and trello-to-md naming and matching logic per the "story id + title upgrade plan" to remove the hard dependency on Trello custom fields while staying compatible with legacy data.
  Acceptance_Criteria:
    - [ ] `parseStorySection()` and `parseBlockStory()` support both `STORY-XXXX` and legacy `ID:` prefixes, prioritizing the new format
    - [ ] `renderSingleStoryMarkdown()`, `buildStoryPlan()`, and `mapCardToStory()` consistently emit and parse `STORY-XXXX <title>` names
    - [ ] `TrelloProvider.findItemByStoryIdOrTitle()` and `createCardLookup()` uniquely locate cards without relying on custom fields
    - [ ] `examples/md/test-todo-list.md`, `stories/trello-upgrade-stories.md`, and related samples align with the new format and remain round-trip safe
  Priority: p1
  Labels: [sync, trello, parser]
  Assignees: [backend]

- Story: STORY-1108 Expand Test Suites and Coverage
  Description: Update unit, integration, and end-to-end tests to cover the new title convention, keep legacy inputs compatible, and ensure overall coverage remains ≥90%.
  Acceptance_Criteria:
    - [ ] Tests for markdown-parser, renderer, trello-to-md, and md-to-trello include `STORY-XXXX` scenarios with legacy fallback assertions
    - [ ] Round-trip and examples dry-run flows simulate Trello boards without custom fields to verify sync accuracy
    - [ ] Test runs complete without warnings and coverage reports show ≥90% on critical modules
    - [ ] CI configurations or snapshots are refreshed to reflect the new expected outputs
  Priority: p1
  Labels: [sync, trello, tests]
  Assignees: [qa]

- Story: STORY-1109 Solidify Build and Quality Verification Workflow
  Description: Codify npm t and npm run build validation across scripts, documentation, and CI to guarantee zero warnings and publish the upgrade guidance.
  Acceptance_Criteria:
    - [ ] `package.json`, task documents, and README highlight the standardized title format and verification commands
    - [ ] `npm t` and `npm run build` pass locally and in CI without warnings or errors
    - [ ] Migration documentation or scripts guide converting legacy `ID:` card names to `STORY-XXXX`
    - [ ] `tasks/test planning story.md` and related planning docs incorporate the new verification checklist
  Priority: p1
  Labels: [sync, trello, ci]
  Assignees: [devops]

- Story: STORY-1110 Example CLI Verification and Sample Alignment
  Description: Complete md and trello CLI validation and sample updates under the `examples/` directory to guarantee round-trip sync without custom fields and repair related tests.
  Acceptance_Criteria:
    - [ ] `examples/md/*.md`, `examples/stories/*.md`, and CLI outputs conform to the `STORY-XXXX` convention
    - [ ] `npm run md -- --projectRoot examples` and `npm run trello -- --projectRoot examples --dry-run` run inside `examples/` without warnings or errors
    - [ ] Fixtures, snapshots, and mock data in `examples/__tests__` align with the new format and pass
    - [ ] README or task documents include an example runbook describing no-custom-field usage and verification steps
  Priority: p1
  Labels: [sync, trello, examples]
  Assignees: [devops]

## Design

- Story: STORY-1102 Enhance TrelloProvider for Checklist, Label, and Member Sync
  Description: Extend TrelloProvider to ensure checklist creation, label alignment, and member assignment comply with the new import pipeline, including retries and detailed logging.
  Acceptance_Criteria:
    - [ ] Checklist synchronization recreates Todos checklist when acceptance criteria change
    - [ ] Label and member lookups cache Trello IDs and log unresolved entries as warnings
    - [ ] findItemByStoryIdOrTitle() prefers custom field matches and only warns on title fallbacks
    - [ ] Provider unit tests mock Trello REST endpoints covering success, retry, and failure paths
  Priority: p1
  Labels: [sync, trello, provider]
  Assignees: [backend]

## To-Do

- Story: STORY-1103 Upgrade mdToTrello Import Flow with Differential Updates
  Description: Refactor mdToTrello() to separate create/update/move/checklist flows, respect dry-run planning output, and honor strict status validation before API calls.
  Acceptance_Criteria:
    - [ ] Dry-run emits created/updated/moved/checklistChanges summaries without mutating Trello
    - [ ] Live execution updates card name, desc, list, checklist, labels, and members atomically per story
    - [ ] writeLocal option renders single-story markdown snapshots for each processed story
    - [ ] Integration tests confirm idempotent runs on examples/md/test-todo-list.md
  Priority: p1
  Labels: [sync, trello, importer]
  Assignees: [backend]

## Doing

- Story: STORY-1104 Extend trelloToMd Exporter with Filtered Outputs
  Description: Update trelloToMd() to support filtering by list, label, or Story ID, render Todos sections, and ensure filenames remain deterministic.
  Acceptance_Criteria:
    - [ ] CLI options --list, --label, and --storyId filter exported cards as expected
    - [ ] Rendered markdown includes Story ID, Status, Description, and Todos blocks in fixed order
    - [ ] Exported files parse back into identical Story objects via parseMarkdownToStories()
    - [ ] Integration tests cover mixed checklist states and filename truncation logic
    - [ ] Exported filenames follow `<storyId>-<slug(title)>.md`; missing ID falls back to `mdsync-<slug(title)>.md` with warning
  Priority: p2
  Labels: [sync, trello, exporter]
  Assignees: [backend]

## Code Review

- Story: STORY-1105 Refresh CLI, Documentation, and Environment Templates
  Description: Align package.json scripts, README, tasks, and .env.example with Trello-first workflows, including parameter descriptions and onboarding guidance.
  Acceptance_Criteria:
    - [ ] npm run md and npm run trello scripts expose dry-run, json, and projectRoot parameters
    - [ ] README documents Trello environment variables, list mapping JSON, and usage examples
    - [ ] tasks/trello 开发计划.md references the new workflows without GitHub terminology
    - [ ] .env.example includes Trello key, token, board, checklist name, and path variables
  Priority: p2
  Labels: [sync, docs, cli]
  Assignees: [docs]

## Testing

- Story: STORY-1106 Establish Comprehensive Test Coverage for Trello Sync
  Description: Implement unit, integration, and end-to-end test suites ensuring parser, importer, exporter, and provider modules meet coverage thresholds and CI gating.
  Acceptance_Criteria:
    - [ ] Unit tests assert parser edge cases, provider retries, and renderer output with ≥90% coverage on critical paths
    - [ ] Integration tests simulate md→Trello and Trello→md flows using mocked REST responses
    - [ ] E2E dry-run scenario validates command outputs for examples directory
    - [ ] CI pipeline blocks on coverage <85% or parsing errors and publishes summary artifacts
  Priority: p1
  Labels: [sync, tests, ci]
  Assignees: [qa]
