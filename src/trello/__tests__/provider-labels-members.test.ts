import { strict as assert } from "assert";

describe("Provider Label Operations", () => {
  it("should resolve label IDs from names", async () => {
    const mockProvider = {
      async resolveLabelIds(_boardId: string, names: string[]) {
        const labelMap: Record<string, string> = {
          "bug": "label-1",
          "feature": "label-2",
          "priority: high": "label-3"
        };
        const ids: string[] = [];
        const missing: string[] = [];
        for (const name of names) {
          const id = labelMap[name.toLowerCase()];
          if (id) {
            ids.push(id);
          } else {
            missing.push(name);
          }
        }
        return { ids, missing };
      }
    };

    const result = await mockProvider.resolveLabelIds("board-1", ["bug", "feature", "unknown"]);
    assert.deepEqual(result.ids, ["label-1", "label-2"]);
    assert.deepEqual(result.missing, ["unknown"]);
  });

  it("should ensure labels exist or create them", async () => {
    const mockProvider = {
      async ensureLabels(_boardId: string, labels: { name: string; color?: string }[], options?: { create?: boolean }) {
        const existingLabels = ["bug", "feature"];
        const created: string[] = [];
        const existing: string[] = [];
        const missing: string[] = [];

        for (const label of labels) {
          if (existingLabels.includes(label.name.toLowerCase())) {
            existing.push(`label-${label.name}`);
          } else if (options?.create !== false) {
            created.push(`label-${label.name}`);
          } else {
            missing.push(label.name);
          }
        }
        return { created, existing, missing };
      }
    };

    const result = await mockProvider.ensureLabels(
      "board-1",
      [{ name: "bug" }, { name: "Priority: High" }],
      { create: true }
    );
    assert.deepEqual(result.existing, ["label-bug"]);
    assert.deepEqual(result.created, ["label-Priority: High"]);
    assert.deepEqual(result.missing, []);
  });

  it("should not create labels when create option is false", async () => {
    const mockProvider = {
      async ensureLabels(_boardId: string, labels: { name: string }[], options?: { create?: boolean }) {
        const existingLabels = ["bug"];
        const created: string[] = [];
        const existing: string[] = [];
        const missing: string[] = [];

        for (const label of labels) {
          if (existingLabels.includes(label.name.toLowerCase())) {
            existing.push(`label-${label.name}`);
          } else if (options?.create !== false) {
            created.push(`label-${label.name}`);
          } else {
            missing.push(label.name);
          }
        }
        return { created, existing, missing };
      }
    };

    const result = await mockProvider.ensureLabels(
      "board-1",
      [{ name: "bug" }, { name: "Priority: High" }],
      { create: false }
    );
    assert.deepEqual(result.existing, ["label-bug"]);
    assert.deepEqual(result.created, []);
    assert.deepEqual(result.missing, ["Priority: High"]);
  });
});

describe("Provider Member Operations", () => {
  it("should resolve member IDs from names", async () => {
    const mockProvider = {
      async resolveMemberIds(_boardId: string, names: string[]) {
        const memberMap: Record<string, string> = {
          "john_doe": "member-1",
          "jane_smith": "member-2"
        };
        const ids: string[] = [];
        const missing: string[] = [];
        for (const name of names) {
          const id = memberMap[name.toLowerCase()];
          if (id) {
            ids.push(id);
          } else {
            missing.push(name);
          }
        }
        return { ids, missing };
      }
    };

    const result = await mockProvider.resolveMemberIds("board-1", ["john_doe", "jane_smith", "unknown"]);
    assert.deepEqual(result.ids, ["member-1", "member-2"]);
    assert.deepEqual(result.missing, ["unknown"]);
  });

  it("should ensure member aliases are mapped", async () => {
    const mockProvider = {
      async ensureMembers(_boardId: string, aliases: Record<string, string>) {
        const boardMembers = ["john_doe", "jane_smith"];
        const mapped: Record<string, string> = {};
        const missing: string[] = [];

        for (const [alias, trelloName] of Object.entries(aliases)) {
          if (boardMembers.includes(trelloName.toLowerCase())) {
            mapped[alias] = `member-${trelloName}`;
          } else {
            missing.push(alias);
          }
        }
        return { mapped, missing };
      }
    };

    const result = await mockProvider.ensureMembers("board-1", {
      dev1: "john_doe",
      dev2: "jane_smith",
      dev3: "unknown_user"
    });
    assert.deepEqual(result.mapped, { dev1: "member-john_doe", dev2: "member-jane_smith" });
    assert.deepEqual(result.missing, ["dev3"]);
  });

  it("should set card members", async () => {
    const mockProvider = {
      async setCardMembers(cardId: string, memberIds: string[]) {
        assert.equal(cardId, "card-1");
        assert.deepEqual(memberIds, ["member-1", "member-2"]);
      }
    };

    await mockProvider.setCardMembers("card-1", ["member-1", "member-2"]);
  });
});

describe("Provider Label and Member Integration", () => {
  it("should handle both labels and members in a single operation", async () => {
    const mockProvider = {
      async resolveLabelIds(_boardId: string, names: string[]) {
        const labelMap: Record<string, string> = { "bug": "label-1", "priority: high": "label-2" };
        const ids: string[] = [];
        const missing: string[] = [];
        for (const name of names) {
          const id = labelMap[name.toLowerCase()];
          if (id) ids.push(id);
          else missing.push(name);
        }
        return { ids, missing };
      },
      async resolveMemberIds(_boardId: string, names: string[]) {
        const memberMap: Record<string, string> = { "john_doe": "member-1" };
        const ids: string[] = [];
        const missing: string[] = [];
        for (const name of names) {
          const id = memberMap[name.toLowerCase()];
          if (id) ids.push(id);
          else missing.push(name);
        }
        return { ids, missing };
      }
    };

    const labelResult = await mockProvider.resolveLabelIds("board-1", ["bug", "Priority: High"]);
    const memberResult = await mockProvider.resolveMemberIds("board-1", ["john_doe"]);

    assert.deepEqual(labelResult.ids, ["label-1", "label-2"]);
    assert.deepEqual(labelResult.missing, []);
    assert.deepEqual(memberResult.ids, ["member-1"]);
    assert.deepEqual(memberResult.missing, []);
  });
});
