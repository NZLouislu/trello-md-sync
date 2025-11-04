import { strict as assert } from "assert";
import fs from "fs/promises";
import path from "path";
import os from "os";
import {
  ensureDirectory,
  validateDirectoryAccess,
  validateAndEnsureDirectory
} from "../../utils/directory-manager";

describe("Directory Manager", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "trello-test-"));
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe("ensureDirectory", () => {
    it("should create directory when it doesn't exist", async () => {
      const testDir = path.join(tempDir, "new-directory");

      const result = await ensureDirectory(testDir);

      assert.equal(result.created, true);
      assert.equal(result.existed, false);
      assert.equal(result.error, undefined);

      const stats = await fs.stat(testDir);
      assert.equal(stats.isDirectory(), true);
    });

    it("should return existed=true when directory already exists", async () => {
      const testDir = path.join(tempDir, "existing-directory");
      await fs.mkdir(testDir);

      const result = await ensureDirectory(testDir);

      assert.equal(result.created, false);
      assert.equal(result.existed, true);
      assert.equal(result.error, undefined);
    });

    it("should create nested directories recursively", async () => {
      const testDir = path.join(tempDir, "level1", "level2", "level3");

      const result = await ensureDirectory(testDir);

      assert.equal(result.created, true);
      assert.equal(result.existed, false);
      assert.equal(result.error, undefined);

      const stats = await fs.stat(testDir);
      assert.equal(stats.isDirectory(), true);
    });

    it("should return error when path exists but is not a directory", async () => {
      const testFile = path.join(tempDir, "test-file.txt");
      await fs.writeFile(testFile, "test content");

      const result = await ensureDirectory(testFile);

      assert.equal(result.created, false);
      assert.equal(result.existed, false);
      assert(result.error?.includes("Path exists but is not a directory"));
    });
  });

  describe("validateDirectoryAccess", () => {
    it("should validate readable and writable directory", async () => {
      const testDir = path.join(tempDir, "test-directory");
      await fs.mkdir(testDir);

      const result = await validateDirectoryAccess(testDir);

      assert.equal(result.exists, true);
      assert.equal(result.readable, true);
      assert.equal(result.writable, true);
      assert.equal(result.error, undefined);
    });

    it("should return error when directory doesn't exist", async () => {
      const testDir = path.join(tempDir, "non-existent");

      const result = await validateDirectoryAccess(testDir);

      assert.equal(result.exists, false);
      assert.equal(result.readable, false);
      assert.equal(result.writable, false);
      assert(result.error?.includes("Directory does not exist"));
    });

    it("should return error when path is not a directory", async () => {
      const testFile = path.join(tempDir, "test-file.txt");
      await fs.writeFile(testFile, "test content");

      const result = await validateDirectoryAccess(testFile);

      assert.equal(result.exists, true);
      assert.equal(result.readable, false);
      assert.equal(result.writable, false);
      assert(result.error?.includes("Path exists but is not a directory"));
    });
  });

  describe("validateAndEnsureDirectory", () => {
    it("should create and validate new directory", async () => {
      const testDir = path.join(tempDir, "new-validated-directory");

      const result = await validateAndEnsureDirectory(testDir);

      assert.equal(result.success, true);
      assert.equal(result.created, true);
      assert.equal(result.validation.exists, true);
      assert.equal(result.validation.readable, true);
      assert.equal(result.validation.writable, true);
      assert.equal(result.error, undefined);
    });

    it("should validate existing directory", async () => {
      const testDir = path.join(tempDir, "existing-validated-directory");
      await fs.mkdir(testDir);

      const result = await validateAndEnsureDirectory(testDir);

      assert.equal(result.success, true);
      assert.equal(result.created, false);
      assert.equal(result.validation.exists, true);
      assert.equal(result.validation.readable, true);
      assert.equal(result.validation.writable, true);
      assert.equal(result.error, undefined);
    });

    it("should handle relative paths", async () => {
      const relativePath = "relative/test/directory";

      // Cleanup first to ensure clean state
      try {
        const fs = await import("fs/promises");
        await fs.rm("relative", { recursive: true, force: true });
      } catch {
        // Ignore cleanup errors
      }

      const result = await validateAndEnsureDirectory(relativePath);

      assert(result.success);
      assert(result.created);

      // Cleanup
      try {
        const fs = await import("fs/promises");
        await fs.rm("relative", { recursive: true, force: true });
      } catch {
        // Ignore cleanup errors
      }
    });

    it("should fail when path exists but is not a directory", async () => {
      const testFile = path.join(tempDir, "test-file.txt");
      await fs.writeFile(testFile, "test content");

      const result = await validateAndEnsureDirectory(testFile);

      assert.equal(result.success, false);
      assert.equal(result.created, false);
      assert(result.error?.includes("Path exists but is not a directory"));
    });
  });
});