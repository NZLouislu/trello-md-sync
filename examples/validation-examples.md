# Configuration Validation Examples

This directory contains examples demonstrating the new configuration validation features.

## Basic Configuration Example

```typescript
import { validateTrelloConfig } from 'trello-md-sync';

const config = {
  trelloKey: "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
  trelloToken: "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2g3h4",
  trelloBoardId: "5f4e3d2c1b0a9f8e7d6c5b4a"
};

const validation = validateTrelloConfig(config);

if (!validation.isValid) {
  console.error("Configuration errors:");
  validation.errors.forEach(error => {
    console.error(`- ${error.field}: ${error.message}`);
    if (error.suggestion) {
      console.error(`  Suggestion: ${error.suggestion}`);
    }
  });
}

if (validation.warnings.length > 0) {
  console.warn("Configuration warnings:");
  validation.warnings.forEach(warning => {
    console.warn(`- ${warning.field}: ${warning.message}`);
  });
}
```

## Directory Management Example

```typescript
import { validateAndEnsureDirectory } from 'trello-md-sync';

async function setupDirectories() {
  const inputResult = await validateAndEnsureDirectory('./input');
  const outputResult = await validateAndEnsureDirectory('./output');
  
  if (!inputResult.success) {
    throw new Error(`Input directory setup failed: ${inputResult.error}`);
  }
  
  if (!outputResult.success) {
    throw new Error(`Output directory setup failed: ${outputResult.error}`);
  }
  
  console.log('Directories ready for sync operations');
}
```

## Enhanced Error Handling Example

```typescript
import { mdToTrello, handleCommonErrors, formatErrorForUser } from 'trello-md-sync';

async function syncWithErrorHandling() {
  try {
    const result = await mdToTrello({
      trelloKey: process.env.TRELLO_KEY!,
      trelloToken: process.env.TRELLO_TOKEN!,
      trelloBoardId: process.env.TRELLO_BOARD_ID!,
      projectRoot: './project'
    });
    
    console.log('Sync completed successfully:', result);
  } catch (error) {
    const syncError = handleCommonErrors(error);
    console.error(formatErrorForUser(syncError));
    
    if (syncError.suggestion) {
      console.log('\nRecommended action:', syncError.suggestion);
    }
  }
}
```

## CLI Validation Example

```bash
# Validate configuration before running sync
npm run validate

# Run sync with enhanced validation
md-to-trello --input ./stories --output ./processed --debug

# Export with validation
trello-to-md --output ./exported --list "Backlog,In Progress"
```

## Environment Configuration Example

Create a `.env` file with your configuration:

```env
# Required Trello API credentials
TRELLO_KEY=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
TRELLO_TOKEN=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2g3h4
TRELLO_BOARD_ID=5f4e3d2c1b0a9f8e7d6c5b4a

# Optional configuration
PROJECT_ROOT=./
MD_INPUT_DIR=./stories
MD_OUTPUT_DIR=./output
CHECKLIST_NAME=Tasks
LOG_LEVEL=info

# List mapping (JSON format)
TRELLO_LIST_MAP_JSON={"backlog":"Backlog","doing":"In Progress","done":"Done"}

# Priority label mapping
PRIORITY_LABEL_MAP_JSON={"high":"Priority: High","medium":"Priority: Medium","low":"Priority: Low"}

# Member alias mapping
MEMBER_ALIAS_MAP_JSON={"john":"john.doe","jane":"jane.smith"}
```

## Troubleshooting Common Issues

### Invalid API Key Format
```
Error: trelloKey: Trello API key format is invalid
Suggestion: API key should be a 32-character hexadecimal string
```
**Solution**: Get your API key from https://developer.atlassian.com/cloud/trello/guides/rest-api/api-introduction/

### Permission Denied
```
Error: Output directory validation failed: Permission denied: /path/to/output
Suggestion: Check file/directory permissions and ensure you have read/write access
```
**Solution**: Run `chmod 755 /path/to/output` or choose a different directory

### Board Not Found
```
Error: Trello board not found or inaccessible
Suggestion: Check that the board ID is correct and you have access to the board
```
**Solution**: Verify the board ID in your Trello board URL and ensure your API token has access

### Network Connection Issues
```
Error: Network connection failed
Suggestion: Check your internet connection and try again
```
**Solution**: Verify internet connectivity and check if Trello API is accessible