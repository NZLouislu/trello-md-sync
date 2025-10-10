import fs from "fs/promises";
import path from "path";
import { parseMarkdownToStories } from "../markdown-parser";

describe("Trello Markdown parser", () => {
  it("parses single-story section", async () => {
    const p = path.resolve(__dirname, "../../../examples/trello/single-story-example.md");
    const md = await fs.readFile(p, "utf8");
    const stories = parseMarkdownToStories(md);
    if (stories.length !== 1) throw new Error(`Expected 1 story, got ${stories.length}`);
    const s = stories[0];
    if (s.storyId !== "STORY-001") throw new Error(`Expected STORY-001, got ${s.storyId}`);
    if (!/trello-only environment/i.test(s.title)) throw new Error(`Unexpected title: ${s.title}`);
    if (s.status.toLowerCase() !== "backlog") throw new Error(`Expected Backlog, got ${s.status}`);
    if (!/As a maintainer/i.test(s.body)) throw new Error("Body not parsed");
    if (!Array.isArray(s.todos)) throw new Error("Todos not parsed");
    if (s.todos.length < 1) throw new Error("Expected acceptance criteria todos");
  });

  it("parses multi-story blocks with column inference", async () => {
    const p = path.resolve(__dirname, "../../../examples/trello/multi-story-example.md");
    const md = await fs.readFile(p, "utf8");
    const stories = parseMarkdownToStories(md, { statusMap: { backlog: "Backlog", ready: "Ready", doing: "Doing", done: "Done" } });
    if (stories.length < 3) throw new Error(`Expected >=3 stories, got ${stories.length}`);
    const s1 = stories.find(s => s.storyId === "STORY-01");
    if (!s1) throw new Error("STORY-001 not found");
    const st = s1.status.toLowerCase();
    if (!["backlog","todo","doing","ready","done"].includes(st)) throw new Error(`Unexpected status: ${s1.status}`);
  });

  it("generates fallback id and normalizes status", () => {
    const md = [
      "## Backlog",
      "",
      "- Story: A New Feature",
      "description: x",
      ""
    ].join("\n");
    const stories = parseMarkdownToStories(md, { statusMap: { backlog: "Backlog" } });
    const s = stories[0];
    if (!s.storyId.startsWith("mdsync-")) throw new Error(`Expected fallback id, got ${s.storyId}`);
    if (s.status !== "Backlog") throw new Error(`Expected mapped Backlog, got ${s.status}`);
  });
});