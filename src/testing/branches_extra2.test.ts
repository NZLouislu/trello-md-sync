import { strict as assert } from "assert";
import { parseMarkdownToStories } from "../trello/markdown-parser";

describe("extra branch coverage 2", () => {
  it("block story description inline value only", () => {
    const md = [
      "## Ready",
      "- Story: Inline Desc",
      "  id: SID-INLINE",
      "  description: First",
      "  acceptance_criteria:",
      "  - [ ] a"
    ].join("\n");
    const stories = parseMarkdownToStories(md, { statusMap: { ready: "Ready" } });
    const s = stories.find(t => t.storyId === "SID-INLINE")!;
    assert.ok(!!s);
    assert.equal(s.body.trim(), "First");
  });

  it("status map case-insensitive key match via normalized loop", () => {
    const md = [
      "## Story: Case Map",
      "",
      "### Story ID",
      "SID-MAP",
      "",
      "### Status",
      "in REVIEW",
      "",
      "### Description",
      "D"
    ].join("\n");
    const stories = parseMarkdownToStories(md, { statusMap: { "In Review": "In review" } });
    assert.equal(stories[0].status, "In review");
  });
});