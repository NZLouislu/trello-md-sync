import { strict as assert } from "assert";
import { mapCardToStory } from "../trello-to-md";

describe("Field Parity - Export", () => {
  it("should export priority from labels", () => {
    const card = {
      name: "STORY-1001 Test Story",
      desc: "Test description",
      idListName: "Backlog",
      labels: [{ name: "bug" }, { name: "Priority: High" }],
      checklists: [],
      members: []
    };
    const priorityLabelMap = { p1: "Priority: High", p2: "Priority: Medium" };
    const story = mapCardToStory(card, "Todos", { priorityLabelMap });
    assert.equal(story.meta.priority, "p1");
  });

  it("should export assignees from members", () => {
    const card = {
      name: "STORY-1002 Test Story",
      desc: "Test description",
      idListName: "Backlog",
      labels: [],
      checklists: [],
      members: [{ username: "john_doe" }, { username: "jane_smith" }]
    };
    const story = mapCardToStory(card, "Todos");
    assert.deepEqual(story.assignees, ["john_doe", "jane_smith"]);
  });

  it("should apply member alias reverse mapping on export", () => {
    const card = {
      name: "STORY-1003 Test Story",
      desc: "Test description",
      idListName: "Backlog",
      labels: [],
      checklists: [],
      members: [{ username: "john_doe" }, { username: "jane_smith" }]
    };
    const memberAliasMap = { dev1: "john_doe", dev2: "jane_smith" };
    const story = mapCardToStory(card, "Todos", { memberAliasMap });
    assert.deepEqual(story.assignees, ["dev1", "dev2"]);
  });

  it("should export both priority and assignees", () => {
    const card = {
      name: "STORY-1004 Test Story",
      desc: "Test description",
      idListName: "Backlog",
      labels: [{ name: "Priority: High" }],
      checklists: [],
      members: [{ username: "john_doe" }]
    };
    const priorityLabelMap = { p1: "Priority: High" };
    const memberAliasMap = { dev1: "john_doe" };
    const story = mapCardToStory(card, "Todos", { priorityLabelMap, memberAliasMap });
    assert.equal(story.meta.priority, "p1");
    assert.deepEqual(story.assignees, ["dev1"]);
  });

  it("should handle cards without priority labels", () => {
    const card = {
      name: "STORY-1005 Test Story",
      desc: "Test description",
      idListName: "Backlog",
      labels: [{ name: "bug" }],
      checklists: [],
      members: []
    };
    const priorityLabelMap = { p1: "Priority: High" };
    const story = mapCardToStory(card, "Todos", { priorityLabelMap });
    assert.equal(story.meta.priority, undefined);
  });

  it("should handle cards without members", () => {
    const card = {
      name: "STORY-1006 Test Story",
      desc: "Test description",
      idListName: "Backlog",
      labels: [],
      checklists: [],
      members: []
    };
    const story = mapCardToStory(card, "Todos");
    assert.deepEqual(story.assignees, []);
  });

  it("should preserve unmapped members", () => {
    const card = {
      name: "STORY-1007 Test Story",
      desc: "Test description",
      idListName: "Backlog",
      labels: [],
      checklists: [],
      members: [{ username: "john_doe" }, { username: "unknown_user" }]
    };
    const memberAliasMap = { dev1: "john_doe" };
    const story = mapCardToStory(card, "Todos", { memberAliasMap });
    assert.deepEqual(story.assignees, ["dev1", "unknown_user"]);
  });

  it("should use fullName if username is not available", () => {
    const card = {
      name: "STORY-1008 Test Story",
      desc: "Test description",
      idListName: "Backlog",
      labels: [],
      checklists: [],
      members: [{ fullName: "John Doe" }]
    };
    const story = mapCardToStory(card, "Todos");
    assert.deepEqual(story.assignees, ["John Doe"]);
  });

  it("should handle idMembers array fallback", () => {
    const card = {
      name: "STORY-1009 Test Story",
      desc: "Test description",
      idListName: "Backlog",
      labels: [],
      checklists: [],
      idMembers: ["member1", "member2"]
    };
    const story = mapCardToStory(card, "Todos");
    assert.deepEqual(story.assignees, ["member1", "member2"]);
  });
});

describe("Field Parity - Round Trip", () => {
  it("should maintain priority through round trip", () => {
    const originalStory = {
      storyId: "STORY-1010",
      title: "Test Story",
      status: "Backlog",
      body: "Test description",
      todos: [],
      assignees: [],
      labels: ["bug"],
      meta: { priority: "p1" }
    };

    const priorityLabelMap: Record<string, string> = { p1: "Priority: High" };
    const priorityLabel = priorityLabelMap[originalStory.meta.priority];
    const cardLabels = [...originalStory.labels];
    if (priorityLabel && !cardLabels.includes(priorityLabel)) {
      cardLabels.push(priorityLabel);
    }

    const card = {
      name: `${originalStory.storyId} ${originalStory.title}`,
      desc: originalStory.body,
      idListName: originalStory.status,
      labels: cardLabels.map(name => ({ name })),
      checklists: [],
      members: []
    };

    const exportedStory = mapCardToStory(card, "Todos", { priorityLabelMap });
    assert.equal(exportedStory.meta.priority, originalStory.meta.priority);
  });

  it("should maintain assignees through round trip", () => {
    const originalStory = {
      storyId: "STORY-1011",
      title: "Test Story",
      status: "Backlog",
      body: "Test description",
      todos: [],
      assignees: ["dev1", "dev2"],
      labels: [],
      meta: {}
    };

    const memberAliasMap: Record<string, string> = { dev1: "john_doe", dev2: "jane_smith" };
    const trelloMembers = originalStory.assignees.map(alias => memberAliasMap[alias] || alias);

    const card = {
      name: `${originalStory.storyId} ${originalStory.title}`,
      desc: originalStory.body,
      idListName: originalStory.status,
      labels: [],
      checklists: [],
      members: trelloMembers.map(username => ({ username }))
    };

    const exportedStory = mapCardToStory(card, "Todos", { memberAliasMap });
    assert.deepEqual(exportedStory.assignees, originalStory.assignees);
  });
});
