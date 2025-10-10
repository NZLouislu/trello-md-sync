## Story: Fix Pagination Issue When Returning to All Suburbs Page

### Story ID
nzlouis-property-ai-property-fix-pagination-issue

### Status
In Progress

### Description
Users experience issues with pagination when navigating away from and back to the "All suburbs" page. The pagination state needs to be properly maintained to allow seamless continuation of data loading.

### Acceptance Criteria

#### Scenario 1: Basic Pagination
1. Navigate to the "All suburbs" page
2. Scroll to load multiple pages of data
3. Verify that all pages load correctly without interruption

#### Scenario 2: Navigation and Return
1. Access "All suburbs" page and load 2 pages of data
2. Navigate to a specific suburb page
3. Return to the "All suburbs" page
4. Verify that pagination continues from where it left off, allowing loading of page 3 and subsequent pages

### Technical Notes
- Ensure pagination state is properly preserved during navigation
- Implement proper cleanup of pagination state when needed
- Test with various network conditions to ensure robustness
- 

<img width="356" height="153" alt="Image" src="https://github.com/user-attachments/assets/ebb4edca-4e2c-4ac4-9218-d326ede15c38" />

### Technical Implementation

- Implementation details