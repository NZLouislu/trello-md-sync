export class TrelloSyncError extends Error {
  public readonly code: string;
  public readonly suggestion?: string;
  public readonly originalError?: Error;

  constructor(message: string, code: string, suggestion?: string, originalError?: Error) {
    super(message);
    this.name = 'TrelloSyncError';
    this.code = code;
    this.suggestion = suggestion;
    this.originalError = originalError;
    
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, TrelloSyncError);
    }
  }

  toString(): string {
    let result = `${this.name} [${this.code}]: ${this.message}`;
    if (this.suggestion) {
      result += `\nSuggestion: ${this.suggestion}`;
    }
    return result;
  }
}

export class ConfigurationError extends TrelloSyncError {
  constructor(message: string, suggestion?: string, originalError?: Error) {
    super(message, 'CONFIGURATION_ERROR', suggestion, originalError);
    this.name = 'ConfigurationError';
  }
}

export class AuthenticationError extends TrelloSyncError {
  constructor(message: string, suggestion?: string, originalError?: Error) {
    super(message, 'AUTHENTICATION_ERROR', suggestion, originalError);
    this.name = 'AuthenticationError';
  }
}

export class NetworkError extends TrelloSyncError {
  constructor(message: string, suggestion?: string, originalError?: Error) {
    super(message, 'NETWORK_ERROR', suggestion, originalError);
    this.name = 'NetworkError';
  }
}

export class ValidationError extends TrelloSyncError {
  constructor(message: string, suggestion?: string, originalError?: Error) {
    super(message, 'VALIDATION_ERROR', suggestion, originalError);
    this.name = 'ValidationError';
  }
}

export class FileSystemError extends TrelloSyncError {
  constructor(message: string, suggestion?: string, originalError?: Error) {
    super(message, 'FILESYSTEM_ERROR', suggestion, originalError);
    this.name = 'FileSystemError';
  }
}

export function handleCommonErrors(error: any): TrelloSyncError {
  if (error instanceof TrelloSyncError) {
    return error;
  }

  const message = error?.message || String(error);
  const lowerMessage = message.toLowerCase();

  if (error?.code === 'ENOENT') {
    return new FileSystemError(
      `File or directory not found: ${error.path || 'unknown'}`,
      'Check that the file path exists and is accessible',
      error
    );
  }

  if (error?.code === 'EACCES' || error?.code === 'EPERM') {
    return new FileSystemError(
      `Permission denied: ${error.path || 'unknown'}`,
      'Check file/directory permissions and ensure you have read/write access',
      error
    );
  }

  if (error?.code === 'ENOTDIR') {
    return new FileSystemError(
      `Expected directory but found file: ${error.path || 'unknown'}`,
      'Ensure the path points to a directory, not a file',
      error
    );
  }

  if (lowerMessage.includes('unauthorized') || lowerMessage.includes('invalid key') || lowerMessage.includes('invalid token')) {
    return new AuthenticationError(
      'Trello authentication failed',
      'Verify your API key and token are correct and have not expired',
      error
    );
  }

  if (lowerMessage.includes('board not found') || lowerMessage.includes('invalid board')) {
    return new ConfigurationError(
      'Trello board not found or inaccessible',
      'Check that the board ID is correct and you have access to the board',
      error
    );
  }

  if (lowerMessage.includes('list not found') || lowerMessage.includes('invalid list')) {
    return new ConfigurationError(
      'Trello list not found',
      'Check your list mapping configuration and ensure the lists exist on the board',
      error
    );
  }

  if (lowerMessage.includes('network') || lowerMessage.includes('timeout') || lowerMessage.includes('connection')) {
    return new NetworkError(
      'Network connection failed',
      'Check your internet connection and try again',
      error
    );
  }

  if (lowerMessage.includes('rate limit') || lowerMessage.includes('too many requests')) {
    return new NetworkError(
      'API rate limit exceeded',
      'Wait a few minutes before retrying, or reduce concurrency settings',
      error
    );
  }

  if (lowerMessage.includes('json') || lowerMessage.includes('parse')) {
    return new ValidationError(
      'Invalid JSON configuration',
      'Check your configuration files for valid JSON syntax',
      error
    );
  }

  return new TrelloSyncError(
    message,
    'UNKNOWN_ERROR',
    'Check the error details and try again',
    error
  );
}

export function formatErrorForUser(error: TrelloSyncError): string {
  let output = `❌ ${error.name}: ${error.message}`;
  
  if (error.suggestion) {
    output += `\n💡 Suggestion: ${error.suggestion}`;
  }
  
  if (error.code) {
    output += `\n🔍 Error Code: ${error.code}`;
  }
  
  return output;
}

export function isRecoverableError(error: TrelloSyncError): boolean {
  const recoverableCodes = [
    'NETWORK_ERROR',
    'FILESYSTEM_ERROR'
  ];
  
  return recoverableCodes.includes(error.code);
}

export function getRecoveryActions(error: TrelloSyncError): string[] {
  const actions: string[] = [];
  
  switch (error.code) {
    case 'CONFIGURATION_ERROR':
      actions.push('Review and update your configuration');
      actions.push('Run "npm run validate" to check your setup');
      break;
      
    case 'AUTHENTICATION_ERROR':
      actions.push('Verify your Trello API key and token');
      actions.push('Check that your credentials have not expired');
      actions.push('Ensure you have access to the specified board');
      break;
      
    case 'NETWORK_ERROR':
      actions.push('Check your internet connection');
      actions.push('Try again in a few minutes');
      actions.push('Consider reducing concurrency if rate limited');
      break;
      
    case 'FILESYSTEM_ERROR':
      actions.push('Check file and directory permissions');
      actions.push('Ensure the path exists and is accessible');
      actions.push('Verify you have read/write access');
      break;
      
    case 'VALIDATION_ERROR':
      actions.push('Review your input data for errors');
      actions.push('Check JSON syntax in configuration files');
      actions.push('Validate required fields are present');
      break;
      
    default:
      actions.push('Review the error message for specific details');
      actions.push('Check the documentation for troubleshooting tips');
      break;
  }
  
  return actions;
}