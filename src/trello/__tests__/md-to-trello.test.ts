import { strict as assert } from "assert";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { mdToTrello } from "../md-to-trello";

describe("md-to-trello matching", () => {
  it("matches cards via STORY naming without custom fields", async () => {
    const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), "mdsync-mdt-"));
    try {
      const inputDir = path.join(tmpRoot, "md");
      await fs.mkdir(inputDir, { recursive: true });

      const storyMarkdown = [
        "## Ready",
        "- Story: STORY-2001 Clean Parser",
        "  description: Body text",
        "  labels: alpha, beta",
        "  assignees: user@example.com",
        "  acceptance_criteria:",
        "  - [ ] Step one",
      ].join("\n");
      await fs.writeFile(
        path.join(inputDir, "story.md"),
        storyMarkdown,
        "utf8",
      );

      const lists = [
        { id: "list-ready", name: "Ready" },
        { id: "list-backlog", name: "Backlog" },
      ];
      const cards = [
        {
          id: "card-2001",
          name: "ID: STORY-2001 Clean Parser",
          desc: "Body text",
          idList: "list-ready",
          labels: [],
          idMembers: [],
          customFieldItems: [],
          checklists: [],
        },
      ];

      const provider = {
        async getLists() {
          return lists;
        },
        async listItems() {
          return cards;
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
        async ensureChecklist(_: string, __: any) {
          throw new Error("should not ensure checklist in dry-run");
        },
        async resolveLabelIds(_: string, names: string[]) {
          return { ids: names.map((_, idx) => `L${idx}`), missing: [] };
        },
        async setCardLabels(_: string, __: string[]) {
          throw new Error("should not set labels in dry-run");
        },
        async resolveMemberIds(_: string, names: string[]) {
          return { ids: names.map((_, idx) => `M${idx}`), missing: [] };
        },
        async setCardMembers(_: string, __: string[]) {
          throw new Error("should not set members in dry-run");
        },
      } as any;

      const result = await mdToTrello({
        trelloKey: "test",
        trelloToken: "test",
        trelloBoardId: "board",
        mdInputDir: "md",
        mdOutputDir: "out",
        checklistName: "Todos",
        projectRoot: tmpRoot,
        dryRun: true,
        trelloListMapJson: { ready: "Ready", backlog: "Backlog" },
        provider,
      });

      assert.equal(result.result.created, 0);
      assert.equal(result.result.failed, 0);
      const summary = result.dryRunSummary!;
      assert.deepEqual(summary.updated, ["STORY-2001"]);
      assert.deepEqual(summary.created, []);
      assert.deepEqual(summary.moved, []);
      assert.deepEqual(summary.checklistChanges, []);
      assert.ok(result.logs.some((line) => line.includes("[dry-run]")));
    } finally {
      await fs.rm(tmpRoot, { recursive: true, force: true });
    }
  });

  it("renders writeLocal snapshots and returns file list", async () => {
    const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), "mdsync-mdt-write-"));
    try {
      const inputDir = path.join(tmpRoot, "md");
      await fs.mkdir(inputDir, { recursive: true });
      const storyMarkdown = [
        "## Ready",
        "- Story: STORY-3000 Snapshot",
        "  description: Snapshot body",
        "  acceptance_criteria:",
        "  - [ ] item"
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
        async resolveLabelIds() {
          return { ids: [], missing: [] };
        },
        async setCardLabels() {
          throw new Error("should not set labels in dry-run");
        },
        async resolveMemberIds() {
          return { ids: [], missing: [] };
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
        mdOutputDir: "items",
        projectRoot: tmpRoot,
        dryRun: true,
        writeLocal: true,
        trelloListMapJson: { ready: "Ready" },
        provider
      });

      assert.ok(result.writeLocalFiles && result.writeLocalFiles.length > 0);
      for (const file of result.writeLocalFiles || []) {
        const content = await fs.readFile(file, "utf8");
        assert.ok(content.includes("## Story: STORY-3000 Snapshot"));
      }
      assert.ok(result.dryRunSummary);
      assert.equal(result.dryRunSummary?.created.length, 1);
    } finally {
      await fs.rm(tmpRoot, { recursive: true, force: true });
    }
  });

  it("throws when strictStatus enabled and status unmapped", async () => {
    const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), "mdsync-mdt-strict-"));
    try {
      const inputDir = path.join(tmpRoot, "md");
      await fs.mkdir(inputDir, { recursive: true });
      const md = [
        "## Custom",
        "- Story: STORY-4000 Strict Status",
        "  description: Missing mapping"
      ].join("\n");
      await fs.writeFile(path.join(inputDir, "story.md"), md, "utf8");

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
        async resolveLabelIds() {
          return { ids: [], missing: [] };
        },
        async setCardLabels() {
          throw new Error("should not set labels in dry-run");
        },
        async resolveMemberIds() {
          return { ids: [], missing: [] };
        },
        async setCardMembers() {
          throw new Error("should not set members in dry-run");
        }
      } as any;

      await assert.rejects(() => mdToTrello({
        trelloKey: "test",
        trelloToken: "test",
        trelloBoardId: "board",
        mdInputDir: "md",
        projectRoot: tmpRoot,
        dryRun: true,
        strictStatus: true,
        trelloListMapJson: { ready: "Ready" },
        provider
      }), /Status "Custom" is not mapped/);
    } finally {
      await fs.rm(tmpRoot, { recursive: true, force: true });
    }
  });

  it("seeds required labels when ensureLabels enabled", async () => {
    const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), "mdsync-mdt-labels-"));
    try {
      const inputDir = path.join(tmpRoot, "md");
      await fs.mkdir(inputDir, { recursive: true });
      const storyMarkdown = [
        "## Ready",
        "- Story: STORY-5100 Ensure Labels",
        "  description: Label seeding",
        "  labels: alpha"
      ].join("\n");
      await fs.writeFile(path.join(inputDir, "story.md"), storyMarkdown, "utf8");

      const ensureCalls: string[][] = [];
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
          return { ids: names.map((_, idx) => `L${idx}`), missing: [] };
        },
        async setCardLabels() {
          throw new Error("should not set labels in dry-run");
        },
        async resolveMemberIds(_: string, names: string[]) {
          return { ids: names.map((_, idx) => `M${idx}`), missing: [] };
        },
        async setCardMembers() {
          throw new Error("should not set members in dry-run");
        },
        async ensureLabels(_: string, labels: { name: string }[]) {
          ensureCalls.push(labels.map((l) => l.name).sort());
          return { created: [], existing: [], missing: [] };
        }
      } as any;

      await mdToTrello({
        trelloKey: "test",
        trelloToken: "test",
        trelloBoardId: "board",
        mdInputDir: "md",
        projectRoot: tmpRoot,
        dryRun: true,
        ensureLabels: true,
        requiredLabels: ["beta"],
        trelloListMapJson: { ready: "Ready" },
        provider
      });

      assert.equal(ensureCalls.length, 1);
      assert.deepEqual(ensureCalls[0], ["alpha", "beta"]);
    } finally {
      await fs.rm(tmpRoot, { recursive: true, force: true });
    }
  });

  it("suggests ensure-labels when missing labels detected", async () => {
    const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), "mdsync-mdt-label-warn-"));
    try {
      const inputDir = path.join(tmpRoot, "md");
      await fs.mkdir(inputDir, { recursive: true });
      const storyMarkdown = [
        "## Ready",
        "- Story: STORY-5200 Missing Label",
        "  description: Needs missing label",
        "  labels: gamma"
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
        async resolveLabelIds() {
          return { ids: [], missing: ["gamma"] };
        },
        async setCardLabels() {
          throw new Error("should not set labels in dry-run");
        },
        async resolveMemberIds() {
          return { ids: [], missing: [] };
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
        trelloListMapJson: { ready: "Ready" },
        provider
      });

      const warning = result.logs.find((line) => line.includes("run with --ensure-labels"));
      assert.ok(warning, "expected missing label guidance");
    } finally {
      await fs.rm(tmpRoot, { recursive: true, force: true });
    }
  });

  it("resolves member aliases via alias map", async () => {
    const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), "mdsync-mdt-alias-ok-"));
    try {
      const inputDir = path.join(tmpRoot, "md");
      await fs.mkdir(inputDir, { recursive: true });
      const storyMarkdown = [
        "## Ready",
        "- Story: STORY-5300 Alias Success",
        "  description: Alias resolves",
        "  assignees: qa"
      ].join("\n");
      await fs.writeFile(path.join(inputDir, "story.md"), storyMarkdown, "utf8");

      const capturedNames: string[][] = [];
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
        async resolveLabelIds() {
          return { ids: [], missing: [] };
        },
        async setCardLabels() {
          throw new Error("should not set labels in dry-run");
        },
        async resolveMemberIds(_: string, names: string[]) {
          capturedNames.push(names.slice().sort());
          return { ids: names.map((name, idx) => `${name}-${idx}`), missing: [] };
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
        memberAliasMap: { qa: "user@example.com" },
        trelloListMapJson: { ready: "Ready" },
        provider
      });

      assert.equal(capturedNames.length, 1);
      assert.deepEqual(capturedNames[0], ["user@example.com"]);
      const aliasWarnings = result.logs.filter((line) => line.includes("member aliases"));
      assert.equal(aliasWarnings.length, 0, "did not expect alias warnings");
    } finally {
      await fs.rm(tmpRoot, { recursive: true, force: true });
    }
  });

  it("warns when member aliases missing mappings", async () => {
    const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), "mdsync-mdt-alias-warn-"));
    try {
      const inputDir = path.join(tmpRoot, "md");
      await fs.mkdir(inputDir, { recursive: true });
      const storyMarkdown = [
        "## Ready",
        "- Story: STORY-5400 Alias Warn",
        "  description: Alias missing",
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
        async resolveLabelIds() {
          return { ids: [], missing: [] };
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
        trelloListMapJson: { ready: "Ready" },
        provider
      });

      const aliasWarning = result.logs.find((line) => line.includes("member-alias-map"));
      assert.ok(aliasWarning, "expected alias warning guidance");
    } finally {
      await fs.rm(tmpRoot, { recursive: true, force: true });
    }
  });

  it("collects dry-run stats for priority, labels, and aliases", async () => {
    const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), "mdsync-mdt-stats-"));
    try {
      const inputDir = path.join(tmpRoot, "md");
      await fs.mkdir(inputDir, { recursive: true });
      const storyMarkdown = [
        "## Ready",
        "- Story: STORY-5500 Summary Stats",
        "  description: Compute dry-run stats",
        "  priority: p1",
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
        priorityLabelMap: { p1: "Critical" },
        trelloListMapJson: { ready: "Ready" },
        provider
      });

      const summary = result.dryRunSummary;
      assert.ok(summary, "expected dry-run summary");
      assert.equal(summary?.priorityWarnings.length, 1);
      assert.equal(summary?.missingLabels.length, 1);
      assert.equal(summary?.aliasWarnings.length, 1);
      assert.deepEqual(summary?.stats, {
        prioritiesWithMappings: 1,
        prioritiesMissingLabels: 1,
        storiesWithMissingLabels: 1,
        storiesWithAliasIssues: 1
      });
    } finally {
      await fs.rm(tmpRoot, { recursive: true, force: true });
    }
  });

  it("throws when multiple cards share the same STORY id", async () => {
    const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), "mdsync-mdt-dup-"));
    try {
      const inputDir = path.join(tmpRoot, "md");
      await fs.mkdir(inputDir, { recursive: true });
      const storyMarkdown = [
        "## Ready",
        "- Story: STORY-6000 Duplicate Guard",
        "  description: Body"
      ].join("\n");
      await fs.writeFile(path.join(inputDir, "story.md"), storyMarkdown, "utf8");

      const lists = [{ id: "list-ready", name: "Ready" }];
      const cards = [
        {
          id: "card-dup-1",
          name: "STORY-6000 Duplicate Guard",
          desc: "Body",
          idList: "list-ready",
          labels: [],
          idMembers: [],
          customFieldItems: [],
          checklists: []
        },
        {
          id: "card-dup-2",
          name: "ID: STORY-6000 Legacy Duplicate",
          desc: "Body",
          idList: "list-ready",
          labels: [],
          idMembers: [],
          customFieldItems: [],
          checklists: []
        }
      ];

      const provider = {
        async getLists() {
          return lists;
        },
        async listItems() {
          return cards;
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
        async setStoryId() {
          throw new Error("should not set custom field in dry-run");
        },
        async ensureChecklist() {
          throw new Error("should not ensure checklist in dry-run");
        },
        async resolveLabelIds() {
          return { ids: [], missing: [] };
        },
        async setCardLabels() {
          throw new Error("should not set labels in dry-run");
        },
        async resolveMemberIds() {
          return { ids: [], missing: [] };
        },
        async setCardMembers() {
          throw new Error("should not set members in dry-run");
        }
      } as any;

      await assert.rejects(() => mdToTrello({
        trelloKey: "test",
        trelloToken: "test",
        trelloBoardId: "board",
        mdInputDir: "md",
        projectRoot: tmpRoot,
        dryRun: true,
        trelloListMapJson: { ready: "Ready" },
        provider
      }), /Multiple cards share story id STORY-6000/);
    } finally {
      await fs.rm(tmpRoot, { recursive: true, force: true });
    }
  });
});
