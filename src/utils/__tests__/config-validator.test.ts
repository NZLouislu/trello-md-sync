import { strict as assert } from "assert";
import { validateTrelloConfig } from "../../utils/config-validator";

describe("Config Validator", () => {
  describe("validateTrelloConfig", () => {
    it("should pass validation with valid configuration", () => {
      const config = {
        trelloKey: "abcdef1234567890abcdef1234567890",
        trelloToken: "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
        trelloBoardId: "abcdef1234567890abcdef12"
      };

      const result = validateTrelloConfig(config);

      assert.equal(result.isValid, true);
      assert.equal(result.errors.length, 0);
      assert.equal(result.warnings.length, 0);
    });

    it("should fail validation when trelloKey is missing", () => {
      const config = {
        trelloToken: "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
        trelloBoardId: "5f4e3d2c1b0a9f8e7d6c5b4a"
      };

      const result = validateTrelloConfig(config);

      assert.equal(result.isValid, false);
      assert.equal(result.errors.length, 1);
      assert.equal(result.errors[0].field, "trelloKey");
      assert.equal(result.errors[0].code, "MISSING_REQUIRED_FIELD");
    });

    it("should fail validation when trelloToken is missing", () => {
      const config = {
        trelloKey: "abcdef1234567890abcdef1234567890",
        trelloBoardId: "abcdef1234567890abcdef12"
      };

      const result = validateTrelloConfig(config);

      assert.equal(result.isValid, false);
      assert(result.errors.length >= 1);
      assert(result.errors.some((e: any) => e.field === "trelloToken" && e.code === "MISSING_REQUIRED_FIELD"));
    });

    it("should fail validation when trelloBoardId is missing", () => {
      const config = {
        trelloKey: "abcdef1234567890abcdef1234567890",
        trelloToken: "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890"
      };

      const result = validateTrelloConfig(config);

      assert.equal(result.isValid, false);
      assert(result.errors.length >= 1);
      assert(result.errors.some((e: any) => e.field === "trelloBoardId" && e.code === "MISSING_REQUIRED_FIELD"));
    });

    it("should pass validation with any non-empty trelloKey", () => {
      const config = {
        trelloKey: "invalid-key",
        trelloToken: "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
        trelloBoardId: "abcdef1234567890abcdef12"
      };

      const result = validateTrelloConfig(config);

      assert.equal(result.isValid, true);
      assert.equal(result.errors.length, 0);
    });

    it("should pass validation with any non-empty trelloToken", () => {
      const config = {
        trelloKey: "abcdef1234567890abcdef1234567890",
        trelloToken: "invalid-token",
        trelloBoardId: "abcdef1234567890abcdef12"
      };

      const result = validateTrelloConfig(config);

      assert.equal(result.isValid, true);
      assert.equal(result.errors.length, 0);
    });

    it("should pass validation with any non-empty trelloBoardId", () => {
      const config = {
        trelloKey: "abcdef1234567890abcdef1234567890",
        trelloToken: "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
        trelloBoardId: "invalid-board-id"
      };

      const result = validateTrelloConfig(config);

      assert.equal(result.isValid, true);
      assert.equal(result.errors.length, 0);
    });

    it("should fail validation with empty string values", () => {
      const config = {
        trelloKey: "",
        trelloToken: "",
        trelloBoardId: ""
      };

      const result = validateTrelloConfig(config);

      assert.equal(result.isValid, false);
      assert.equal(result.errors.length, 3);
      assert(result.errors.every((e: any) => e.code === "EMPTY_VALUE"));
    });

    it("should fail validation with wrong types", () => {
      const config = {
        trelloKey: 123,
        trelloToken: true,
        trelloBoardId: null
      };

      const result = validateTrelloConfig(config as any);

      assert.equal(result.isValid, false);
      assert.equal(result.errors.length, 3);
      assert.equal(result.errors.every((e: any) => e.code === "INVALID_TYPE" || e.code === "MISSING_REQUIRED_FIELD"), true);
    });

    it("should pass validation for any non-empty values", () => {
      const config = {
        trelloKey: "abcdef1234567890abcdef1234567", // 31 chars
        trelloToken: "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abc", // 63 chars
        trelloBoardId: "abcdef1234567890abcdef1" // 23 chars
      };

      const result = validateTrelloConfig(config);

      assert.equal(result.isValid, true);
      assert.equal(result.errors.length, 0);
    });

    it("should include helpful suggestions in error messages", () => {
      const config = {};

      const result = validateTrelloConfig(config);

      assert.equal(result.isValid, false);
      assert.equal(result.errors.length, 3);
      assert.equal(result.errors.every((e: any) => e.suggestion && e.suggestion.length > 0), true);
    });

    it("should handle whitespace in values", () => {
      const config = {
        trelloKey: "  abcdef1234567890abcdef1234567890  ",
        trelloToken: "  abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890  ",
        trelloBoardId: "  abcdef1234567890abcdef12  "
      };

      const result = validateTrelloConfig(config);

      assert(result.isValid);
      assert.equal(result.errors.length, 0);
    });
  });
});