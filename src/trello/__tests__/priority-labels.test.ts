import { strict as assert } from "assert";

describe("Priority Label Mapping", () => {
  it("should map priority to label name", () => {
    const priorityLabelMap = { p1: "Priority: High", p2: "Priority: Medium", p3: "Priority: Low" };
    const priority = "p1";
    const labelName = priorityLabelMap[priority];
    assert.equal(labelName, "Priority: High");
  });

  it("should handle missing priority mapping", () => {
    const priorityLabelMap: Record<string, string> = { p1: "Priority: High" };
    const priority = "p4";
    const labelName = priorityLabelMap[priority];
    assert.equal(labelName, undefined);
  });

  it("should reverse map label to priority", () => {
    const priorityLabelMap = { p1: "Priority: High", p2: "Priority: Medium" };
    const reverseMap: Record<string, string> = {};
    for (const [priority, labelName] of Object.entries(priorityLabelMap)) {
      reverseMap[labelName.toLowerCase()] = priority;
    }
    assert.equal(reverseMap["priority: high"], "p1");
    assert.equal(reverseMap["priority: medium"], "p2");
  });

  it("should extract priority from labels", () => {
    const labels = ["bug", "Priority: High", "feature"];
    const priorityLabelMap = { p1: "Priority: High", p2: "Priority: Medium" };
    const reverseMap: Record<string, string> = {};
    for (const [priority, labelName] of Object.entries(priorityLabelMap)) {
      reverseMap[labelName.toLowerCase()] = priority;
    }
    let foundPriority = "";
    for (const label of labels) {
      const priority = reverseMap[label.toLowerCase()];
      if (priority) {
        foundPriority = priority;
        break;
      }
    }
    assert.equal(foundPriority, "p1");
  });

  it("should add priority label to desired labels", () => {
    const desiredLabels = ["bug", "feature"];
    const priority = "p1";
    const priorityLabelMap = { p1: "Priority: High" };
    const priorityLabel = priorityLabelMap[priority];
    if (priorityLabel && !desiredLabels.includes(priorityLabel)) {
      desiredLabels.push(priorityLabel);
    }
    assert.deepEqual(desiredLabels, ["bug", "feature", "Priority: High"]);
  });

  it("should not duplicate priority label if already present", () => {
    const desiredLabels = ["bug", "Priority: High"];
    const priority = "p1";
    const priorityLabelMap = { p1: "Priority: High" };
    const priorityLabel = priorityLabelMap[priority];
    if (priorityLabel && !desiredLabels.includes(priorityLabel)) {
      desiredLabels.push(priorityLabel);
    }
    assert.deepEqual(desiredLabels, ["bug", "Priority: High"]);
  });
});

describe("Label Seeding", () => {
  it("should aggregate labels from stories", () => {
    const stories = [
      { labels: ["bug", "p1"], meta: {} },
      { labels: ["feature", "p2"], meta: {} },
      { labels: ["bug"], meta: {} }
    ];
    const allLabels = new Set<string>();
    for (const story of stories) {
      if (story.labels) {
        for (const label of story.labels) {
          allLabels.add(label);
        }
      }
    }
    assert.deepEqual(Array.from(allLabels).sort(), ["bug", "feature", "p1", "p2"]);
  });

  it("should include priority labels in aggregation", () => {
    const stories = [
      { labels: ["bug"], meta: { priority: "p1" } },
      { labels: ["feature"], meta: { priority: "p2" } }
    ];
    const priorityLabelMap: Record<string, string> = { p1: "Priority: High", p2: "Priority: Medium" };
    const allLabels = new Set<string>();
    for (const story of stories) {
      if (story.labels) {
        for (const label of story.labels) {
          allLabels.add(label);
        }
      }
      if (story.meta?.priority) {
        const priorityLabel = priorityLabelMap[story.meta.priority];
        if (priorityLabel) allLabels.add(priorityLabel);
      }
    }
    assert.deepEqual(Array.from(allLabels).sort(), ["Priority: High", "Priority: Medium", "bug", "feature"]);
  });

  it("should include required labels", () => {
    const allLabels = new Set<string>(["bug", "feature"]);
    const requiredLabels = ["documentation", "test"];
    for (const label of requiredLabels) {
      allLabels.add(label);
    }
    assert.deepEqual(Array.from(allLabels).sort(), ["bug", "documentation", "feature", "test"]);
  });
});

describe("Member Alias Mapping", () => {
  it("should map alias to trello username", () => {
    const memberAliasMap = { dev1: "john_doe", dev2: "jane_smith" };
    const alias = "dev1";
    const trelloName = memberAliasMap[alias];
    assert.equal(trelloName, "john_doe");
  });

  it("should reverse map trello username to alias", () => {
    const memberAliasMap = { dev1: "john_doe", dev2: "jane_smith" };
    const reverseMap: Record<string, string> = {};
    for (const [alias, trelloName] of Object.entries(memberAliasMap)) {
      reverseMap[trelloName.toLowerCase()] = alias;
    }
    assert.equal(reverseMap["john_doe"], "dev1");
    assert.equal(reverseMap["jane_smith"], "dev2");
  });

  it("should apply alias mapping to assignees", () => {
    const assignees = ["dev1", "dev2"];
    const memberAliasMap: Record<string, string> = { dev1: "john_doe", dev2: "jane_smith" };
    const mapped = assignees.map(name => memberAliasMap[name] || name);
    assert.deepEqual(mapped, ["john_doe", "jane_smith"]);
  });

  it("should preserve unmapped assignees", () => {
    const assignees = ["dev1", "unknown_user"];
    const memberAliasMap: Record<string, string> = { dev1: "john_doe" };
    const mapped = assignees.map(name => memberAliasMap[name] || name);
    assert.deepEqual(mapped, ["john_doe", "unknown_user"]);
  });

  it("should reverse map members for export", () => {
    const members = [{ username: "john_doe" }, { username: "jane_smith" }];
    const memberAliasMap = { dev1: "john_doe", dev2: "jane_smith" };
    const reverseMap: Record<string, string> = {};
    for (const [alias, trelloName] of Object.entries(memberAliasMap)) {
      reverseMap[trelloName.toLowerCase()] = alias;
    }
    const assignees = members.map(m => reverseMap[m.username.toLowerCase()] || m.username);
    assert.deepEqual(assignees, ["dev1", "dev2"]);
  });
});
