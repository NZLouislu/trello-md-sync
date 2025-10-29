import { strict as assert } from "assert";
import { parseMarkdownToStories } from "../trello/markdown-parser";
import { preferredStoryFileName } from "../trello/renderer";

describe("parser branches more", () => {
  it("section-based parses Todos header as acceptance list", () => {
    const md = [
      "## Story: With Todos Header",
      "",
      "### Story ID",
      "SID-TODOS",
      "",
      "### Status",
      "ready",
      "",
      "### Description",
      "D",
      "",
      "### Todos",
      "- [ ] a",
      "- [x] b"
    ].join("\n");
    const stories = parseMarkdownToStories(md, { statusMap: { ready: "Ready" } });
    const s = stories[0];
    assert.equal(s.storyId, "SID-TODOS");
    assert.equal(s.status, "Ready");
    assert.equal(s.todos.length, 2);
    assert.equal(s.todos[1].done, true);
  });

  it("block-based parses todos: key and desc/body variants", () => {
    const md = [
      "## In review",
      "- Story: Block Todos Variant",
      "  story_id: SID-TODO-K",
      "  body:",
      "  B1",
      "  todos:",
      "  - [ ] x",
      "  - [x] y"
    ].join("\n");
    const stories = parseMarkdownToStories(md, { statusMap: { "in review": "In review" } });
    const s = stories.find(t => t.storyId === "SID-TODO-K")!;
    assert.ok(!!s);
    assert.equal(s.status, "In review");
    assert.ok(s.body.includes("B1"));
    assert.equal(s.todos.length, 2);
    assert.equal(s.todos[1].done, true);
  });

  it("slugId fallback when no Story ID and empty title produces mdsync-untitled", () => {
    const md = [
      "## Story:   ",
      "",
      "### Status",
      "backlog",
      "",
      "### Description",
      "Z"
    ].join("\n");
    const s = parseMarkdownToStories(md, { statusMap: { backlog: "Backlog" } })[0];
    assert.equal(s.storyId, "");
    const f = preferredStoryFileName({ ...s, storyId: "", title: "" } as any);
    assert.equal(f, "untitled.md");
  });
});