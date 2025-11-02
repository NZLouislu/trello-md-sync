## Backlog

- **Prerequisite**: Run `npm install trello` and verify with `node -e "require('trello')"` before invoking APIs such as `getLabelsForBoard()`, `addLabelOnBoard()`, `getBoardMembers()`, and `addMemberToCard()` across the stories below.

- Story: STORY-1111 Priority Label Sync Enhancement
  Description: Extend `md-to-trello` planning to reliably map markdown priorities to Trello labels using native Trello endpoints and surface failures during dry runs.
  Acceptance_Criteria:
    - [ ] `buildStoryPlan()` resolves `story.meta.priority` via `priorityLabelMap` by calling `getLabelsForBoard()` and applies the resulting label IDs through `updateCard()`
    - [ ] Missing priority labels trigger `addLabelOnBoard()` during dry-run or log remediation guidance when creation is disabled
    - [ ] CLI and configuration files document how to declare priority-to-label mappings and surface `addLabelOnBoard()` usage examples
    - [ ] Unit tests verify interactions with `getLabelsForBoard()`, `addLabelOnBoard()`, and `updateCard()` across success and failure paths
  Priority: p1
  Labels: [trello, priority, sync]
  Assignees: [backend]

- Story: STORY-1112 Label Seeding Automation
  Description: Automate label discovery and creation so markdown label tokens are always available during imports.
  Acceptance_Criteria:
    - [ ] Startup flow aggregates labels from markdown stories and configuration defaults before invoking `getLabelsForBoard()`
    - [ ] Missing labels trigger `addLabelOnBoard()` (or a documented fallback) before `resolveLabelIds()` executes
    - [ ] Dry-run output lists seeded labels, including the IDs returned by `addLabelOnBoard()`, and surfaces unresolved tokens
    - [ ] Integration tests mock `getLabelsForBoard()` and `addLabelOnBoard()` to validate seeding and error handling
  Priority: p1
  Labels: [trello, labels, tooling]
  Assignees: [devops]

- Story: STORY-1113 Member Alias Resolution
  Description: Introduce alias mapping to translate markdown assignee tokens into Trello member IDs without manual intervention.
  Acceptance_Criteria:
    - [ ] `mdToTrello` parses `memberAliasMap` from CLI or config and caches Trello members via `getBoardMembers()` on startup
    - [ ] `buildStoryPlan()` replaces markdown assignees with resolved Trello IDs before planning and syncs members through `addMemberToCard()` / `delMemberFromCard()`
    - [ ] Dry-run summary highlights unmapped aliases with file references and suggests running `getBoardMembers()` to refresh cache
    - [ ] Unit tests mock `getBoardMembers()`, `addMemberToCard()`, and `delMemberFromCard()` to verify alias resolution
  Priority: p1
  Labels: [trello, members, sync]
  Assignees: [backend]

## Implementation

- Story: STORY-1114 Markdown Export Field Parity
  Description: Update `trello-to-md` so exported markdown retains priority, labels, and assignees for round-trip fidelity using Trello fetch APIs.
  Acceptance_Criteria:
    - [ ] `mapCardToStory()` populates `story.meta.priority` by interpreting labels returned from `getCardsOnBoard()` or `getCard()` and the configured priority map
    - [ ] `assignees` array reflects Trello member aliases when configured, leveraging cached data from `getBoardMembers()`
    - [ ] Round-trip verification confirms exported markdown re-imports with identical metadata via `getCardsOnBoard()` snapshots
    - [ ] Integration tests cover cards with mixed labels, multiple members, and missing priority mapping using mocked `getCardsOnBoard()` responses
  Priority: p1
  Labels: [trello, exporter, sync]
  Assignees: [qa]

## Testing

- Story: STORY-1115 Comprehensive Visibility Test Suite
  Description: Deliver automated coverage proving priority, label, and member visibility across unit, integration, and end-to-end flows.
  Acceptance_Criteria:
    - [ ] Unit tests assert helpers invoking `getLabelsForBoard()`, `addLabelOnBoard()`, `getBoardMembers()`, and `addMemberToCard()` across success and failure branches
    - [ ] Integration tests simulate markdown→Trello→markdown round trips using mocked `getCardsOnBoard()` and `updateCard()` responses
    - [ ] End-to-end dry-run scenario exercises CLI commands against example markdown with assertions on `getCardsOnBoard()` output and dry-run summaries
    - [ ] Coverage thresholds (≥90% statements, branches) enforced for modified modules in CI
  Priority: p1
  Labels: [trello, testing, ci]
  Assignees: [qa]
