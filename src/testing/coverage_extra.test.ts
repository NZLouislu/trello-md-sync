import { strict as assert } from "assert";
import { renderSingleStoryMarkdown } from "../trello/renderer";
import { parseMarkdownToStories } from "../trello/markdown-parser";

describe("extra coverage branches", () => {
  it("renderer without todos branch", () => {
    const s = { storyId: "X", title: "No Todos", status: "Backlog", body: "B", todos: [], assignees: [], labels: [], meta: {} };
    const md = renderSingleStoryMarkdown(s as any);
    assert.ok(md.includes("### Acceptance Criteria"));
    assert.ok(!md.includes("- [ ]"));
  });

  it("parseTodoLine negative and splitCsvLine empty", () => {
    const md = [
      "## Story: S",
      "",
      "### Story ID",
      "SID-1",
      "",
      "### Status",
      "ready",
      "",
      "### Description",
      "",
      "### Labels",
      "",
      "### Acceptance Criteria",
      "not a todo line"
    ].join("\n");
    const stories = parseMarkdownToStories(md, { statusMap: { ready: "Ready" } });
    assert.equal(stories.length, 1);
    const s = stories[0];
    assert.equal(s.status, "Ready");
    assert.equal(s.todos.length, 0);
    assert.equal(s.labels.length, 0);
  });

  it("status map matching via normalized keys and map fallback", () => {
    const md = [
      "## Story: A",
      "",
      "### Story ID",
      "ID-A",
      "",
      "### Status",
      "In PROGRESS",
      "",
      "### Description",
      "D"
    ].join("\n");
    const stories = parseMarkdownToStories(md, { statusMap: { "in progress": "Doing", doing: "Doing" } });
    assert.equal(stories[0].status, "Doing");
  });

  it("trim body newlines", () => {
    const md = [
      "## Story: T",
      "",
      "### Story ID",
      "ID-T",
      "",
      "### Status",
      "done",
      "",
      "### Description",
      "",
      "A",
      "B",
      "",
      "### Acceptance Criteria"
    ].join("\n");
    const stories = parseMarkdownToStories(md, { statusMap: { done: "Done" } });
    assert.equal(stories[0].body, "A\nB");
  });
});