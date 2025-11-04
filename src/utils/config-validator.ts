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
  }

  // Remove strict length warnings - just validate that values exist

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}