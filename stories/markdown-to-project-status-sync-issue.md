## Story: Fix Status Mapping Issue in markdown-to-project.ts

### Story ID
nzlouis-property-ai-property-fix-status-mapping

### Status
Backlog

### Description
When syncing a Markdown file with multiple status sections (To Do, In Progress, Done) to GitHub Project, all items are being created with "No status" instead of the correct status from the Markdown document.

The current implementation does not properly map the Markdown section headers to the corresponding status field in GitHub Project. This creates a poor user experience as users cannot easily identify the status of each task.

### Acceptance Criteria

#### Scenario 1: Basic Status Mapping
1. Create a Markdown file with three sections: To Do, In Progress, and Done
2. Add tasks to each section with different states
3. Sync the Markdown file to GitHub Project
4. Verify that tasks in "To Do" section have status "To Do"
5. Verify that tasks in "In Progress" section have status "In Progress"
6. Verify that tasks in "Done" section have status "Done"

#### Scenario 2: Status Field Configuration
1. Ensure the GitHub Project has a "Status" field configured with options: "To Do", "In Progress", "Done"
2. Verify that the sync process correctly maps Markdown section headers to these status options
3. Verify that the mapping is case-insensitive

#### Scenario 3: Edge Cases
1. Test with different section header names (e.g., "TODO", "In progress")
2. Test with mixed case headers
3. Verify that unknown section headers are handled gracefully
4. Test with empty sections

### Scope
This story focuses on fixing the status mapping issue specifically for the markdown-to-project.ts module. It does not include changes to other modules or components.

The solution should:
- Correctly map Markdown section headers to GitHub Project status field values
- Handle case variations in section headers
- Gracefully handle unknown section headers
- Be implemented in a way that is maintainable and testable

### Technical Notes
- The solution should use the project's status field configuration to determine the correct status option IDs
- Consider using a mapping table to handle common variations in section header names
- Implement proper error handling for cases where the status field is not found
- Ensure the solution is efficient and follows best practices

### AI Prompt
Fix the status mapping issue in markdown-to-project.ts by:
1. Reading the section headers from the Markdown document
2. Mapping them to the corresponding status field values in GitHub Project
3. Using the project's status field configuration to determine the correct status option IDs
4. Handling case variations in section headers
5. Implementing proper error handling for cases where the status field is not found
6. Ensuring the solution is efficient and follows best practices
7. Testing with various section header names and edge cases
8. Verifying that the mapping is case-insensitive
9. Handling unknown section headers gracefully
10. Ensuring the solution is maintainable and testable