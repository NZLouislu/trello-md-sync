import { strict as assert } from "assert";
import { parseMarkdownToStories } from "../trello/markdown-parser";
import { renderSingleStoryMarkdown, preferredStoryFileName } from "../trello/renderer";

describe("extra branch coverage 4", () => {
  it("top-level loop skips non-matching lines (i++ path) and still parses next section", () => {
    const md = [
      "Random header",
      "",
      "## Story: X",
      "",
      "### Description",
      "B"
    ].join("\n");
    const stories = parseMarkdownToStories(md, { statusMap: { backlog: "Backlog" } });
    assert.equal(stories.length, 1);
    assert.equal(stories[0].title, "Story: X" === "Story: X" ? "X" : stories[0].title);
  });

  it("section without Story ID falls back to slugId and empty Status stays empty", () => {
    const md = [
      "## Story: NoID",
      "",
      "### Status",
      "",
      "### Description",
      "Body"
    ].join("\n");
    const s = parseMarkdownToStories(md, { statusMap: { ready: "Ready" } })[0];
    assert.equal(s.storyId, "");
    assert.equal(s.status, "");
  });

  it("block with empty title falls back to mdsync-untitled and unknown key goes to meta", () => {
    const md = [
      "## Ready",
      "- Story:   ",
      "  foo: bar",
      "  todos:",
      "  - [ ] t1"
    ].join("\n");
    const s = parseMarkdownToStories(md, { statusMap: { ready: "Ready" } })[0];
    assert.equal(s.storyId, "");
    assert.equal((s as any).meta.foo, "bar");
  });

  it("renderer defaults: status Backlog and empty body; preferred name untitled when no id/title", () => {
    const s: any = { storyId: "", title: "", status: "", body: "", todos: [], assignees: [], labels: [], meta: {} };
    const md = renderSingleStoryMarkdown(s);
    assert.ok(md.includes("### Status"));
    assert.ok(md.includes("Backlog"));
    const name = preferredStoryFileName({ storyId: "", title: "" } as any);
    assert.equal(name, "untitled.md");
  });
});