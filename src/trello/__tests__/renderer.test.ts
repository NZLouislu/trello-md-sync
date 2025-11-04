import { strict as assert } from "assert";
import { renderSingleStoryMarkdown, preferredStoryFileName } from "../renderer";
import type { Story } from "../types";
describe("renderer", () => {
  it("renders sections and naming by id", () => {
    const s: Story = { storyId: "STORY-123", title: "Test Title", status: "Ready", body: "Body", todos: [{ text: "a", done: false }], assignees: [], labels: [], meta: {} };
    const md = renderSingleStoryMarkdown(s);
    assert.ok(md.includes("## Story: STORY-123 Test Title"));
    assert.ok(md.includes("### Story ID"));
    assert.ok(md.includes("STORY-123"));
    assert.ok(md.includes("### Status"));
    assert.ok(md.includes("Ready"));
    assert.ok(md.includes("### Description"));
    assert.ok(md.includes("Body"));
    assert.ok(md.includes("- [ ] a"));
    assert.equal(preferredStoryFileName(s), "STORY-123-test-title.md");
  });
  it("renders priority label and omits duplicate in labels list", () => {
    const s: Story = {
      storyId: "STORY-456",
      title: "Priority Story",
      status: "Backlog",
      body: "",
      todos: [],
      assignees: [],
      labels: ["sync", "Priority: High"],
      meta: { priority: "p1", priorityLabel: "Priority: High" }
    };
    const md = renderSingleStoryMarkdown(s);
    assert.ok(md.includes("### Priority\nPriority: High"));
    assert.ok(md.includes("### Labels\nsync"));
    assert.ok(!md.includes("### Labels\nsync, Priority: High"));
  });
  it("fallback file name when no id", () => {
    const s: Story = { storyId: "", title: "Hello World!", status: "Backlog", body: "", todos: [], assignees: [], labels: [], meta: {} };
    assert.equal(preferredStoryFileName(s), "hello-world.md");
  });
  it("renders assignees section", () => {
    const s: Story = { 
      storyId: "STORY-789", 
      title: "Assignees Test", 
      status: "Backlog", 
      body: "Test body", 
      todos: [], 
      assignees: ["dev1", "dev2"], 
      labels: [], 
      meta: {} 
    };
    const md = renderSingleStoryMarkdown(s);
    assert.ok(md.includes("### Assignees"));
    assert.ok(md.includes("dev1, dev2"));
  });
  it("does not render assignees section when empty", () => {
    const s: Story = { 
      storyId: "STORY-790", 
      title: "No Assignees Test", 
      status: "Backlog", 
      body: "Test body", 
      todos: [], 
      assignees: [], 
      labels: [], 
      meta: {} 
    };
    const md = renderSingleStoryMarkdown(s);
    assert.ok(!md.includes("### Assignees"));
  });
});