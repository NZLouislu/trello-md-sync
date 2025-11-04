export interface ValidationError {
  field: string;
  message: string;
  code: string;
  suggestion?: string;
}

export interface ValidationWarning {
  field: string;
  message: string;
  suggestion?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface TrelloConfigInput {
  trelloKey?: string;
  trelloToken?: string;
  trelloBoardId?: string;
  [key: string]: any;
}

const TRELLO_API_DOCS = "https://developer.atlassian.com/cloud/trello/guides/rest-api/api-introduction/";

function validateApiKeyFormat(key: string): boolean {
  // Trello API keys are typically 32 character hex strings
  return key.length >= 32 && /^[a-fA-F0-9]+$/.test(key);
}

function validateTokenFormat(token: string): boolean {
  // Trello tokens are typically 64 character hex strings or ATTA- prefixed
  return (token.length >= 64 && /^[a-fA-F0-9]+$/.test(token)) || token.startsWith('ATTA-');
}

function validateBoardIdFormat(boardId: string): boolean {
  // Trello board IDs are typically 24 character alphanumeric strings
  return boardId.length >= 20 && /^[a-zA-Z0-9]+$/.test(boardId);
}

export function validateTrelloConfig(config: TrelloConfigInput): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  if (config.trelloKey === undefined || config.trelloKey === null) {
    errors.push({
      field: 'trelloKey',
      message: 'Trello API key is required',
      code: 'MISSING_REQUIRED_FIELD',
      suggestion: `Get your API key from ${TRELLO_API_DOCS}`
    });
  } else if (typeof config.trelloKey !== 'string') {
    errors.push({
      field: 'trelloKey',
      message: 'Trello API key must be a string',
      code: 'INVALID_TYPE',
      suggestion: 'Ensure the API key is provided as a string value'
    });
  } else if (!config.trelloKey.trim()) {
    errors.push({
      field: 'trelloKey',
      message: 'Trello API key cannot be empty',
      code: 'EMPTY_VALUE',
      suggestion: `Get your API key from ${TRELLO_API_DOCS}`
    });
  } else if (!validateApiKeyFormat(config.trelloKey.trim())) {
    errors.push({
      field: 'trelloKey',
      message: 'Trello API key format is invalid',
      code: 'INVALID_FORMAT',
      suggestion: 'API key should be a 32-character hexadecimal string'
    });
    if (config.trelloKey.trim().length < 32) {
      warnings.push({
        field: 'trelloKey',
        message: 'Trello API key appears to be too short',
        suggestion: 'Typical API keys are 32 characters long'
      });
    }
  }

  if (config.trelloToken === undefined || config.trelloToken === null) {
    errors.push({
      field: 'trelloToken',
      message: 'Trello token is required',
      code: 'MISSING_REQUIRED_FIELD',
      suggestion: `Generate a token from ${TRELLO_API_DOCS}`
    });
  } else if (typeof config.trelloToken !== 'string') {
    errors.push({
      field: 'trelloToken',
      message: 'Trello token must be a string',
      code: 'INVALID_TYPE',
      suggestion: 'Ensure the token is provided as a string value'
    });
  } else if (!config.trelloToken.trim()) {
    errors.push({
      field: 'trelloToken',
      message: 'Trello token cannot be empty',
      code: 'EMPTY_VALUE',
      suggestion: `Generate a token from ${TRELLO_API_DOCS}`
    });
  } else if (!validateTokenFormat(config.trelloToken.trim())) {
    errors.push({
      field: 'trelloToken',
      message: 'Trello token format is invalid',
      code: 'INVALID_FORMAT',
      suggestion: 'Token should be a 64-character hexadecimal string or ATTA- prefixed token'
    });
    if (config.trelloToken.trim().length < 64 && !config.trelloToken.trim().startsWith('ATTA-')) {
      warnings.push({
        field: 'trelloToken',
        message: 'Trello token length is unusual',
        suggestion: 'Typical tokens are 64 characters long'
      });
    }
  }

  if (config.trelloBoardId === undefined || config.trelloBoardId === null) {
    errors.push({
      field: 'trelloBoardId',
      message: 'Trello board ID is required',
      code: 'MISSING_REQUIRED_FIELD',
      suggestion: 'Find your board ID in the Trello board URL'
    });
  } else if (typeof config.trelloBoardId !== 'string') {
    errors.push({
      field: 'trelloBoardId',
      message: 'Trello board ID must be a string',
      code: 'INVALID_TYPE',
      suggestion: 'Ensure the board ID is provided as a string value'
    });
  } else if (!config.trelloBoardId.trim()) {
    errors.push({
      field: 'trelloBoardId',
      message: 'Trello board ID cannot be empty',
      code: 'EMPTY_VALUE',
      suggestion: 'Find your board ID in the Trello board URL'
    });
  } else if (!validateBoardIdFormat(config.trelloBoardId.trim())) {
    errors.push({
      field: 'trelloBoardId',
      message: 'Trello board ID format is invalid',
      code: 'INVALID_FORMAT',
      suggestion: 'Board ID should be a 24-character alphanumeric string'
    });
    if (config.trelloBoardId.trim().length < 24) {
      warnings.push({
        field: 'trelloBoardId',
        message: 'Trello board ID appears to be too short',
        suggestion: 'Typical board IDs are 24 characters long'
      });
    }
  } else if (config.trelloBoardId.trim().length !== 24) {
    warnings.push({
      field: 'trelloBoardId',
      message: 'Trello board ID length is unusual',
      suggestion: 'Typical board IDs are exactly 24 characters long'
    });
  }

  // Remove strict length warnings - just validate that values exist

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}