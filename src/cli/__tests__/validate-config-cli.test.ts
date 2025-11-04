import { strict as assert } from "assert";
import { validateConfig } from "../../cli/validate-config-cli";

describe("Validate Config CLI", () => {
  describe("validateConfig", () => {
    it("should fail validation with missing environment variables", async () => {
      const result = await validateConfig({
        trelloKey: "",
        trelloToken: "",
        trelloBoardId: ""
      });

      assert.equal(result.success, false);
      assert(result.errors.length > 0);
      assert(result.errors.some((e: string) => e.includes("trelloKey")), `Expected error about trelloKey, got: ${JSON.stringify(result.errors)}`);
      assert(result.errors.some((e: string) => e.includes("trelloToken")), `Expected error about trelloToken, got: ${JSON.stringify(result.errors)}`);
      assert(result.errors.some((e: string) => e.includes("trelloBoardId")), `Expected error about trelloBoardId, got: ${JSON.stringify(result.errors)}`);
    });

    it("should pass basic validation with valid config", async () => {
      const result = await validateConfig({
        trelloKey: "abcdef1234567890abcdef1234567890",
        trelloToken: "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
        trelloBoardId: "abcdef1234567890abcdef12"
      });

      assert.equal(result.errors.filter((e: string) => !e.includes("connectivity test failed")).length, 0);
    });

    it("should validate directory creation", async () => {
      // Clean up directories first
      const fs = await import("fs/promises");
      try {
        await fs.rm("test-input-dir", { recursive: true, force: true });
        await fs.rm("test-output-dir", { recursive: true, force: true });
      } catch {
        // Ignore cleanup errors
      }

      const result = await validateConfig({
        trelloKey: "abcdef1234567890abcdef1234567890",
        trelloToken: "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
        trelloBoardId: "abcdef1234567890abcdef12",
        mdInputDir: "test-input-dir",
        mdOutputDir: "test-output-dir"
      });

      assert(result.warnings.some((w: string) => w.includes("Created input directory") || w.includes("Created output directory")), `Expected warning about directory creation, got: ${JSON.stringify(result.warnings)}`);

      // Clean up after test
      try {
        await fs.rm("test-input-dir", { recursive: true, force: true });
        await fs.rm("test-output-dir", { recursive: true, force: true });
      } catch {
        // Ignore cleanup errors
      }
    });

    it("should handle invalid API credentials format", async () => {
      const result = await validateConfig({
        trelloKey: "invalid-key",
        trelloToken: "invalid-token",
        trelloBoardId: "invalid-board-id"
      });

      assert.equal(result.success, false);
      assert(result.errors.length > 0);
      assert.equal(result.errors.some((e: string) => e.includes("format is invalid")), true);
    });

    it("should provide helpful suggestions in error messages", async () => {
      // Temporarily clear environment variables
      const originalKey = process.env.TRELLO_KEY;
      const originalToken = process.env.TRELLO_TOKEN;
      const originalBoardId = process.env.TRELLO_BOARD_ID;

      delete process.env.TRELLO_KEY;
      delete process.env.TRELLO_TOKEN;
      delete process.env.TRELLO_BOARD_ID;

      try {
        const result = await validateConfig({});

        assert.equal(result.success, false);
        assert(result.errors.some((e: string) => e.includes("Get your API key from")), `Expected suggestion about API key, got: ${JSON.stringify(result.errors)}`);
        assert(result.errors.some((e: string) => e.includes("Generate a token from")), `Expected suggestion about token, got: ${JSON.stringify(result.errors)}`);
        assert(result.errors.some((e: string) => e.includes("Find your board ID")), `Expected suggestion about board ID, got: ${JSON.stringify(result.errors)}`);
      } finally {
        // Restore environment variables
        if (originalKey) process.env.TRELLO_KEY = originalKey;
        if (originalToken) process.env.TRELLO_TOKEN = originalToken;
        if (originalBoardId) process.env.TRELLO_BOARD_ID = originalBoardId;
      }
    });
  });
});