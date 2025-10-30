import { strict as assert } from "assert";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { mdToTrello } from "../trello/md-to-trello";

describe("dry-run summary integration", () => {
  it("emits stats and json payload", async () => {
    const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), "mdsync-dryrun-"));
    const originalLog = console.log;
    const captured: string[] = [];
    console.log = (...args: unknown[]) => {
      if (args.length) captured.push(String(args[0]));
    };
    try {
      const inputDir = path.join(tmpRoot, "md");
      await fs.mkdir(inputDir, { recursive: true });
      const storyMarkdown = [
        "## Ready",
        "- Story: STORY-6100 Dry Run",
        "  description: dry-run summary coverage",
        "  priority: critical",
        "  labels: alpha",
        "  assignees: qa"
      ].join("\n");
      await fs.writeFile(path.join(inputDir, "story.md"), storyMarkdown, "utf8");

      const provider = {
        async getLists() {
          return [{ id: "list-ready", name: "Ready" }];
        },
        async listItems() {
          return [];
        },
        async getCustomFields() {
          return [];
        },
        async findItemByStoryIdOrTitle() {
          return null;
        },
        async createItem() {
          throw new Error("should not create in dry-run");
        },
        async updateItem() {
          throw new Error("should not update in dry-run");
        },
        async moveItemToStatus() {
          throw new Error("should not move in dry-run");
        },
        async ensureChecklist() {
          throw new Error("should not ensure checklist in dry-run");
        },
        async resolveLabelIds(_: string, names: string[]) {
          return { ids: [], missing: names };
        },
        async setCardLabels() {
          throw new Error("should not set labels in dry-run");
        },
        async resolveMemberIds() {
          return { ids: [], missing: ["qa"] };
        },
        async setCardMembers() {
          throw new Error("should not set members in dry-run");
        }
      } as any;

      const result = await mdToTrello({
        trelloKey: "test",
        trelloToken: "test",
        trelloBoardId: "board",
        mdInputDir: "md",
        projectRoot: tmpRoot,
        dryRun: true,
        json: true,
        priorityLabelMap: { critical: "Critical" },
        trelloListMapJson: { ready: "Ready" },
        provider
      });

      const summary = result.dryRunSummary;
      assert.ok(summary);
      assert.equal(summary?.stats.prioritiesWithMappings, 1);
      assert.equal(summary?.stats.prioritiesMissingLabels, 1);
      assert.equal(summary?.stats.storiesWithMissingLabels, 1);
      assert.equal(summary?.stats.storiesWithAliasIssues, 1);

      const payload = captured.find((line) => line.includes("mdsyncDryRun"));
      assert.ok(payload);
    } finally {
      console.log = originalLog;
      await fs.rm(tmpRoot, { recursive: true, force: true });
    }
  });
});
