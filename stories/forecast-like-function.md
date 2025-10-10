## Story: Implement Like Functionality on Forecast Card

### Story ID

nzlouis-property-ai-forecast-like-functions

### Status

To do

### Description

As a user, I want to be able to like property cards on the forecast page so that I can save interesting properties for later review and analysis.

<img width="395" height="480" alt="Image" src="https://images.corelogic.asia/768x512/filters:stretch()/assets/nz/perm/ergavsop3mi6pdppk636t3qs44?signature=3a23d04836c05217b7512bb2ba9239e21f3e7949d52ffa1b9ac25a33086b5dff" />

### Acceptance Criteria

#### Scenario 1: Like Property

1. Navigate to the forecast page
2. Locate a property card with a like button/icon
3. Click the like button/icon
4. Verify that the like is recorded and visually indicated

#### Scenario 2: View Liked Properties

1. Like several properties on the forecast page
2. Navigate to the Favorites section/page
3. Verify that all liked properties are displayed
4. Confirm that the like count is accurate

#### Scenario 3: Unlike Property

1. Navigate to the Favorites section/page
2. Locate a previously liked property
3. Click the like button/icon to unlike
4. Verify that the property is removed from favorites

### Technical Implementation

- Create a new API endpoint for managing likes (`/api/likes`)
- Add a likes table to the database with fields for user_id, property_id, and timestamp
- Implement frontend components for displaying and managing likes
- Add necessary service layer logic to handle like operations
- Update property card components to include like functionality
- Create a dedicated Favorites page/component to display liked properties
- Implement visual feedback for liked/unliked states
- Update the forecast page to display the number of likes for each property
