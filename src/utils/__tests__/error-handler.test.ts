import { strict as assert } from "assert";
import {
  TrelloSyncError,
  ConfigurationError,
  AuthenticationError,
  NetworkError,
  ValidationError,
  FileSystemError,
  handleCommonErrors,
  formatErrorForUser,
  isRecoverableError,
  getRecoveryActions
} from "../../utils/error-handler";

describe("Error Handler", () => {
  describe("TrelloSyncError", () => {
    it("should create error with code and suggestion", () => {
      const error = new TrelloSyncError("Test message", "TEST_CODE", "Test suggestion");

      assert.equal(error.message, "Test message");
      assert.equal(error.code, "TEST_CODE");
      assert.equal(error.suggestion, "Test suggestion");
      assert.equal(error.name, "TrelloSyncError");
    });

    it("should format error message with toString", () => {
      const error = new TrelloSyncError("Test message", "TEST_CODE", "Test suggestion");
      const formatted = error.toString();

      assert(formatted.includes("TrelloSyncError [TEST_CODE]: Test message"));
      assert(formatted.includes("Suggestion: Test suggestion"));
    });
  });

  describe("Specific Error Types", () => {
    it("should create ConfigurationError", () => {
      const error = new ConfigurationError("Config error", "Fix config");

      assert.equal(error.name, "ConfigurationError");
      assert.equal(error.code, "CONFIGURATION_ERROR");
      assert.equal(error.suggestion, "Fix config");
    });

    it("should create AuthenticationError", () => {
      const error = new AuthenticationError("Auth error", "Check credentials");

      assert.equal(error.name, "AuthenticationError");
      assert.equal(error.code, "AUTHENTICATION_ERROR");
      assert.equal(error.suggestion, "Check credentials");
    });

    it("should create NetworkError", () => {
      const error = new NetworkError("Network error", "Check connection");

      assert.equal(error.name, "NetworkError");
      assert.equal(error.code, "NETWORK_ERROR");
      assert.equal(error.suggestion, "Check connection");
    });

    it("should create ValidationError", () => {
      const error = new ValidationError("Validation error", "Check input");

      assert.equal(error.name, "ValidationError");
      assert.equal(error.code, "VALIDATION_ERROR");
      assert.equal(error.suggestion, "Check input");
    });

    it("should create FileSystemError", () => {
      const error = new FileSystemError("File error", "Check permissions");

      assert.equal(error.name, "FileSystemError");
      assert.equal(error.code, "FILESYSTEM_ERROR");
      assert.equal(error.suggestion, "Check permissions");
    });
  });

  describe("handleCommonErrors", () => {
    it("should return TrelloSyncError as-is", () => {
      const originalError = new TrelloSyncError("Original", "ORIGINAL_CODE");
      const result = handleCommonErrors(originalError);

      assert.equal(result, originalError);
    });

    it("should handle ENOENT file system error", () => {
      const fsError = { code: "ENOENT", path: "/test/path", message: "File not found" };
      const result = handleCommonErrors(fsError);

      assert(result instanceof FileSystemError);
      assert.equal(result.code, "FILESYSTEM_ERROR");
      assert(result.message.includes("File or directory not found"));
    });

    it("should handle EACCES permission error", () => {
      const fsError = { code: "EACCES", path: "/test/path", message: "Permission denied" };
      const result = handleCommonErrors(fsError);

      assert(result instanceof FileSystemError);
      assert.equal(result.code, "FILESYSTEM_ERROR");
      assert(result.message.includes("Permission denied"));
    });

    it("should handle unauthorized authentication error", () => {
      const authError = { message: "Unauthorized access" };
      const result = handleCommonErrors(authError);

      assert(result instanceof AuthenticationError);
      assert.equal(result.code, "AUTHENTICATION_ERROR");
      assert(result.suggestion?.includes("API key and token"));
    });

    it("should handle board not found error", () => {
      const boardError = { message: "Board not found" };
      const result = handleCommonErrors(boardError);

      assert(result instanceof ConfigurationError);
      assert.equal(result.code, "CONFIGURATION_ERROR");
      assert(result.suggestion?.includes("board ID"));
    });

    it("should handle network timeout error", () => {
      const networkError = { message: "Network timeout" };
      const result = handleCommonErrors(networkError);

      assert(result instanceof NetworkError);
      assert.equal(result.code, "NETWORK_ERROR");
      assert(result.suggestion?.includes("internet connection"));
    });

    it("should handle rate limit error", () => {
      const rateLimitError = { message: "Rate limit exceeded" };
      const result = handleCommonErrors(rateLimitError);

      assert(result instanceof NetworkError);
      assert.equal(result.code, "NETWORK_ERROR");
      assert(result.suggestion && (result.suggestion.includes("Wait") || result.suggestion.includes("retry")));
    });

    it("should handle JSON parse error", () => {
      const jsonError = { message: "Invalid JSON syntax" };
      const result = handleCommonErrors(jsonError);

      assert(result instanceof ValidationError);
      assert.equal(result.code, "VALIDATION_ERROR");
      assert(result.suggestion?.includes("JSON"));
    });

    it("should handle unknown error", () => {
      const unknownError = { message: "Something went wrong" };
      const result = handleCommonErrors(unknownError);

      assert(result instanceof TrelloSyncError);
      assert.equal(result.code, "UNKNOWN_ERROR");
    });
  });

  describe("formatErrorForUser", () => {
    it("should format error with all details", () => {
      const error = new TrelloSyncError("Test error", "TEST_CODE", "Test suggestion");
      const formatted = formatErrorForUser(error);

      assert(formatted.includes("❌ TrelloSyncError: Test error"));
      assert(formatted.includes("💡 Suggestion: Test suggestion"));
      assert(formatted.includes("🔍 Error Code: TEST_CODE"));
    });

    it("should format error without suggestion", () => {
      const error = new TrelloSyncError("Test error", "TEST_CODE");
      const formatted = formatErrorForUser(error);

      assert(formatted.includes("❌ TrelloSyncError: Test error"));
      assert(formatted.includes("🔍 Error Code: TEST_CODE"));
      assert(!formatted.includes("💡 Suggestion:"));
    });
  });

  describe("isRecoverableError", () => {
    it("should identify recoverable errors", () => {
      const networkError = new NetworkError("Network issue");
      const fsError = new FileSystemError("File issue");

      assert.equal(isRecoverableError(networkError), true);
      assert.equal(isRecoverableError(fsError), true);
    });

    it("should identify non-recoverable errors", () => {
      const configError = new ConfigurationError("Config issue");
      const authError = new AuthenticationError("Auth issue");

      assert.equal(isRecoverableError(configError), false);
      assert.equal(isRecoverableError(authError), false);
    });
  });

  describe("getRecoveryActions", () => {
    it("should provide configuration error recovery actions", () => {
      const error = new ConfigurationError("Config issue");
      const actions = getRecoveryActions(error);

      assert(actions.includes("Review and update your configuration"));
      assert(actions.includes('Run "npm run validate" to check your setup'));
    });

    it("should provide authentication error recovery actions", () => {
      const error = new AuthenticationError("Auth issue");
      const actions = getRecoveryActions(error);

      assert.equal(actions.some((a: string) => a.includes("API key and token")), true);
      assert.equal(actions.some((a: string) => a.includes("credentials have not expired")), true);
    });

    it("should provide network error recovery actions", () => {
      const error = new NetworkError("Network issue");
      const actions = getRecoveryActions(error);

      assert.equal(actions.some((a: string) => a.includes("internet connection")), true);
      assert.equal(actions.some((a: string) => a.includes("Try again")), true);
    });

    it("should provide default recovery actions for unknown errors", () => {
      const error = new TrelloSyncError("Unknown issue", "UNKNOWN_CODE");
      const actions = getRecoveryActions(error);

      assert.equal(actions.some((a: string) => a.includes("error message")), true);
      assert.equal(actions.some((a: string) => a.includes("documentation")), true);
    });
  });
});