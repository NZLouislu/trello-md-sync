# Troubleshooting Guide - Trello MD Sync

## Configuration Validation

Before running sync operations, validate your configuration:

```bash
npm run validate
```

Or with verbose output to see performance metrics:

```bash
npm run validate --verbose
```

## Common Configuration Issues

### 1. Missing Required Parameters

**Error:**
```
❌ Configuration validation failed:
  trelloKey: Trello API key is required (Get your API key from https://trello.com/app-key)
```

**Solution:**
- Ensure all three required parameters are set in your `.env` file
- Get your API key from [https://trello.com/app-key](https://trello.com/app-key)
- Generate a token by clicking the "Token" link on the API key page

### 2. Invalid API Key Format

**Error:**
```
❌ trelloKey: Trello API key format is invalid
```

**Solution:**
- API key should be a 32-character hexadecimal string
- Example: `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6`
- Verify you copied the entire key from the Trello API page

### 3. Invalid Token Format

**Error:**
```
❌ trelloToken: Trello token format is invalid
```

**Solution:**
- Token should be a 64-character hexadecimal string or start with `ATTA-`
- Example: `ATTA1234567890abcdef1234567890abcdef1234567890abcdef1234567890ab`
- Generate a new token if the current one is invalid

### 4. Board Not Found

**Error:**
```
❌ Trello board not found or inaccessible
```

**Solution:**
- Verify the board ID is correct (check your board URL)
- Ensure you have access to the board
- Confirm the token has read/write permissions for the board

### 5. Permission Denied

**Error:**
```
❌ Output directory validation failed: Permission denied
```

**Solution:**
- Check file/directory permissions
- Ensure you have read/write access to the specified directories
- Try running with appropriate permissions or change the directory

### 6. Missing Labels

**Warning:**
```
⚠️  missing labels for STORY-1234: Priority: High, Type: Bug
```

**Solution:**
- Set `MDSYNC_ENSURE_LABELS=1` to automatically create missing labels
- Or manually create the labels in your Trello board
- Configure `PRIORITY_LABEL_MAP_JSON` to map priority values to existing labels

### 7. Missing Members

**Warning:**
```
⚠️  missing members for STORY-1234: john, jane
```

**Solution:**
- Configure `MEMBER_ALIAS_MAP_JSON` to map aliases to actual Trello usernames
- Example: `{"john":"john.doe","jane":"jane.smith"}`
- Ensure the Trello usernames exist and have access to the board

## Getting Help

- **Validate configuration:** Run `npm run validate` to check your setup
- **CLI help:** Use `--help` flag with any command for usage information
- **Verbose mode:** Add `--verbose` or set `LOG_LEVEL=debug` for detailed logs
- **Dry run:** Use `--dry-run` to preview changes without making them
- **Error messages:** Review error messages for specific suggestions and recovery actions

## Debug Mode

Enable debug logging to see detailed information:

```bash
# Via environment variable
LOG_LEVEL=debug npm run md

# Via CLI flag
npm run md -- --debug

# Via .env file
LOG_LEVEL=debug
```

## API Connection Testing

Test your Trello API connection:

```bash
# Test API credentials
curl "https://api.trello.com/1/members/me?key=${TRELLO_KEY}&token=${TRELLO_TOKEN}"

# Test board access
curl "https://api.trello.com/1/boards/${TRELLO_BOARD_ID}?key=${TRELLO_KEY}&token=${TRELLO_TOKEN}"
```

## Rate Limiting Issues

If you encounter HTTP 429 errors:

- The tool automatically retries with exponential backoff
- Reduce `MDSYNC_CONCURRENCY` for lower request rate
- Check Trello API limits: https://developer.atlassian.com/cloud/trello/guides/rest-api/rate-limits/

## File Path Issues

```bash
# Use absolute paths for clarity
MD_INPUT_DIR=/full/path/to/markdown npm run md

# Check current working directory
PROJECT_ROOT=$(pwd) npm run md
```