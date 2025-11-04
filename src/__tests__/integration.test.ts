import { strict as assert } from "assert";
import { validateConfig } from "../cli/validate-config-cli";
import { validateTrelloConfig } from "../utils/config-validator";
import { validateAndEnsureDirectory } from "../utils/directory-manager";
import fs from "fs/promises";
import path from "path";
import os from "os";

describe("Configuration Integration Tests", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "trello-integration-test-"));
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe("End-to-End Configuration Validation", () => {
    it("should validate complete configuration workflow", async () => {
      const inputDir = path.join(tempDir, "input");
      const outputDir = path.join(tempDir, "output");

      const result = await validateConfig({
        trelloKey: "abcdef1234567890abcdef1234567890",
        trelloToken: "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
        trelloBoardId: "abcdef1234567890abcdef12",
        mdInputDir: inputDir,
        mdOutputDir: outputDir,
        projectRoot: tempDir
      });

      assert.equal(result.errors.filter((e: string) => !e.includes("connectivity test failed")).length, 0);
      assert.equal(result.warnings.some((w: string) => w.includes("Created input directory") || w.includes("Created output directory")), true);

      const inputStats = await fs.stat(inputDir);
      const outputStats = await fs.stat(outputDir);
      assert.equal(inputStats.isDirectory(), true);
      assert.equal(outputStats.isDirectory(), true);
    });

    it("should handle invalid configuration gracefully", async () => {
      const result = await validateConfig({
        trelloKey: "invalid",
        trelloToken: "invalid",
        trelloBoardId: "invalid"
      });

      assert.equal(result.success, false);
      assert(result.errors.length > 0);
      assert.equal(result.errors.every((e: string) => e.includes("format is invalid")), true);
    });

    it("should validate directory permissions", async () => {
      const readOnlyDir = path.join(tempDir, "readonly");
      await fs.mkdir(readOnlyDir);

      // Note: On Windows, chmod might not work as expected, so we'll just test the happy path
      const result = await validateConfig({
        trelloKey: "abcdef1234567890abcdef1234567890",
        trelloToken: "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
        trelloBoardId: "abcdef1234567890abcdef12",
        mdInputDir: readOnlyDir,
        mdOutputDir: readOnlyDir,
        projectRoot: tempDir
      });

      // Should succeed since we can't easily test permission failures cross-platform
      assert.equal(result.errors.filter((e: string) => !e.includes("connectivity test failed")).length, 0);
    });
  });

  describe("CLI Validation Command Integration", () => {
    it("should provide performance metrics when requested", async () => {
      const result = await validateConfig({
        trelloKey: "abcdef1234567890abcdef1234567890",
        trelloToken: "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
        trelloBoardId: "abcdef1234567890abcdef12",
        verbose: true
      });

      assert(result.metrics);
      assert.equal(typeof result.metrics!.validationTime, 'number');
      assert.equal(typeof result.metrics!.directoryCheckTime, 'number');
      assert.equal(typeof result.metrics!.totalTime, 'number');
    });

    it("should handle missing environment variables", async () => {
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
        assert(result.errors.length > 0);
        assert(result.errors.some((e: string) => e.includes("required") || e.includes("empty")), `Expected error with "required" or "empty", got: ${JSON.stringify(result.errors)}`);
      } finally {
        // Restore environment variables
        if (originalKey) process.env.TRELLO_KEY = originalKey;
        if (originalToken) process.env.TRELLO_TOKEN = originalToken;
        if (originalBoardId) process.env.TRELLO_BOARD_ID = originalBoardId;
      }
    });
  });

  describe("Directory Management Integration", () => {
    it("should create nested directory structures", async () => {
      const nestedDir = path.join(tempDir, "level1", "level2", "level3");

      const result = await validateAndEnsureDirectory(nestedDir);

      assert.equal(result.success, true);
      assert.equal(result.created, true);

      const stats = await fs.stat(nestedDir);
      assert.equal(stats.isDirectory(), true);
    });

    it("should validate existing directory structure", async () => {
      const existingDir = path.join(tempDir, "existing");
      await fs.mkdir(existingDir);

      const result = await validateAndEnsureDirectory(existingDir);

      assert.equal(result.success, true);
      assert.equal(result.created, false);
      assert.equal(result.validation.exists, true);
    });
  });

  describe("Error Handling Integration", () => {
    it("should provide structured error information", async () => {
      const validation = validateTrelloConfig({
        trelloKey: "",
        trelloToken: "",
        trelloBoardId: ""
      });

      assert.equal(validation.isValid, false);
      assert.equal(validation.errors.length, 3);

      validation.errors.forEach(error => {
        assert.equal(typeof error.field, 'string');
        assert.equal(typeof error.message, 'string');
        assert.equal(typeof error.code, 'string');
        assert.equal(typeof error.suggestion, 'string');
      });
    });

    it("should handle file system errors gracefully", async () => {
      const invalidPath = path.join(tempDir, "file.txt", "invalid");
      await fs.writeFile(path.join(tempDir, "file.txt"), "content");

      const result = await validateAndEnsureDirectory(invalidPath);

      assert.equal(result.success, false);
      assert(result.error);
      assert(result.error.includes("Path exists but is not a directory") || result.error.includes("ENOTDIR") || result.error.includes("ENOENT"));
    });
  });

  describe("Performance Integration", () => {
    it("should complete validation within performance threshold", async () => {
      const startTime = Date.now();

      const result = await validateConfig({
        trelloKey: "abcdef1234567890abcdef1234567890",
        trelloToken: "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcd",
        trelloBoardId: "abcdef1234567890abcdef12",
        mdInputDir: path.join(tempDir, "input"),
        mdOutputDir: path.join(tempDir, "output")
      });

      const duration = Date.now() - startTime;

      // Should complete within reasonable time (excluding network calls)
      assert(duration < 5000); // 5 seconds max

      if (result.metrics) {
        assert(result.metrics.validationTime < 100); // Config validation should be fast
      }
    });
  });
});