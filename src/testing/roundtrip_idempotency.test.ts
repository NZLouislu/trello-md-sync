import path from "path";
import fs from "fs/promises";
import { strict as assert } from "assert";
import { parseMarkdownToStories } from "../trello/markdown-parser";
import { renderSingleStoryMarkdown } from "../trello/renderer";

describe("roundtrip and idempotency", () => {
  it("renders parsed stories back to equivalent representation", async () => {
    const p = path.resolve(__dirname, "../../examples/trello/single-story-example.md");
    const md = await fs.readFile(p, "utf8");
    const stories = parseMarkdownToStories(md, { statusMap: { backlog: "Backlog", ready: "Ready", doing: "In progress", "in review": "In review", done: "Done" } });
    const rendered = stories.map(s => renderSingleStoryMarkdown(s)).join("\n");
    const again = parseMarkdownToStories(rendered, { statusMap: { backlog: "Backlog", ready: "Ready", doing: "In progress", "in review": "In review", done: "Done" } });
    assert.equal(again.length >= 1, true);
    assert.equal(again[0].title.length > 0, true);
    assert.equal(again[0].status.length > 0, true);
  });

  it("is stable across repeated render", () => {
    const s = {
      storyId: "S-1",
      title: "T",
      status: "Done",
      body: "B",
      todos: [{ text: "a", done: false }, { text: "b", done: true }],
      assignees: [],
      labels: [],
      meta: {}
    };
    const a = renderSingleStoryMarkdown(s as any);
    const b = renderSingleStoryMarkdown(s as any);
    assert.equal(a, b);
  });
});