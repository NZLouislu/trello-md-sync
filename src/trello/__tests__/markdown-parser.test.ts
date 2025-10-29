import fs from "fs/promises";
import path from "path";
import { strict as assert } from "assert";
import { parseMarkdownToStories, MarkdownParseError } from "../markdown-parser";

describe("Trello Markdown parser", () => {
  it("parses single-story section", async () => {
    const p = path.resolve(__dirname, "../../../examples/trello/single-story-example.md");
    const md = await fs.readFile(p, "utf8");
    const stories = parseMarkdownToStories(md, { filePath: p });
    if (stories.length !== 1) throw new Error(`Expected 1 story, got ${stories.length}`);
    const s = stories[0];
    if (s.storyId !== "STORY-001") throw new Error(`Expected STORY-001, got ${s.storyId}`);
    if (!/trello-only environment/i.test(s.title)) throw new Error(`Unexpected title: ${s.title}`);
    if (s.status.toLowerCase() !== "backlog") throw new Error(`Expected Backlog, got ${s.status}`);
    if (!/As a maintainer/i.test(s.body)) throw new Error("Body not parsed");
    if (!Array.isArray(s.todos)) throw new Error("Todos not parsed");
    if (s.todos.length < 1) throw new Error("Expected acceptance criteria todos");
    assert.equal((s.meta as any).source.file, p);
    assert.ok((s.meta as any).source.line > 0);
  });

  it("parses multi-story blocks with column inference", async () => {
    const p = path.resolve(__dirname, "../../../examples/trello/multi-story-example.md");
    const md = await fs.readFile(p, "utf8");
    const stories = parseMarkdownToStories(md, { statusMap: { backlog: "Backlog", ready: "Ready", doing: "Doing", done: "Done" }, filePath: p });
    if (stories.length < 3) throw new Error(`Expected >=3 stories, got ${stories.length}`);
    const s1 = stories.find(s => s.storyId === "STORY-01");
    if (!s1) throw new Error("STORY-001 not found");
    const st = s1.status.toLowerCase();
    if (!["backlog","todo","doing","ready","done"].includes(st)) throw new Error(`Unexpected status: ${s1.status}`);
    assert.equal((s1.meta as any).source.file, p);
    assert.ok((s1.meta as any).source.line > 0);
  });

  it("generates fallback id and normalizes status", () => {
    const md = [
      "## Backlog",
      "",
      "- Story: A New Feature",
      "description: x",
      ""
    ].join("\n");
    const stories = parseMarkdownToStories(md, { statusMap: { backlog: "Backlog" }, filePath: "fallback.md" });
    const s = stories[0];
    if (s.storyId !== "") throw new Error(`Expected empty id, got ${s.storyId}`);
    if (s.status !== "Backlog") throw new Error(`Expected mapped Backlog, got ${s.status}`);
    assert.equal((s.meta as any).source.file, "fallback.md");
  });

  it("throws structured error when Story ID missing under strict requirement", () => {
    const md = [
      "## Story: Missing ID",
      "",
      "### Status",
      "Backlog"
    ].join("\n");
    try {
      parseMarkdownToStories(md, { requireStoryId: true, filePath: "missing.md" });
      throw new Error("Expected error");
    } catch (err) {
      if (!(err instanceof MarkdownParseError) && (err as any)?.name !== "MarkdownParseError") throw err;
      const info = err as MarkdownParseError & { name?: string };
      assert.equal(info.code, "STORY_ID_MISSING");
      assert.equal(info.location.file, "missing.md");
      assert.ok(info.location.line > 0);
      assert.equal(info.details?.title, "Missing ID");
    }
  });

  it("parses STORY prefixed section title", () => {
    const md = [
      "## Story: STORY-321 Improve Sync",
      "",
      "### Status",
      "Ready"
    ].join("\n");
    const stories = parseMarkdownToStories(md);
    assert.equal(stories[0].storyId, "STORY-321");
    assert.equal(stories[0].title, "Improve Sync");
  });

  it("parses STORY prefixed block title", () => {
    const md = [
      "## Backlog",
      "- Story: STORY-654 New Flow"
    ].join("\n");
    const stories = parseMarkdownToStories(md, { statusMap: { backlog: "Backlog" } });
    assert.equal(stories[0].storyId, "STORY-654");
    assert.equal(stories[0].title, "New Flow");
  });

  it("keeps compatibility with legacy ID section", () => {
    const md = [
      "## Story: ID: LEG-1 Old Flow",
      "",
      "### Status",
      "Doing"
    ].join("\n");
    const stories = parseMarkdownToStories(md, { statusMap: { doing: "Doing" } });
    assert.equal(stories[0].storyId, "LEG-1");
    assert.equal(stories[0].title, "Old Flow");
  });

  it("keeps compatibility with legacy ID block", () => {
    const md = [
      "## Ready",
      "- Story: ID: LEG-2 Another Flow"
    ].join("\n");
    const stories = parseMarkdownToStories(md, { statusMap: { ready: "Ready" } });
    assert.equal(stories[0].storyId, "LEG-2");
    assert.equal(stories[0].title, "Another Flow");
  });

  it("throws when status not mapped and strict enabled", () => {
    const md = [
      "## Backlog",
      "",
      "- Story: Unknown Status"
    ].join("\n");
    try {
      parseMarkdownToStories(md, { statusMap: { ready: "Ready" }, strictStatus: true, filePath: "status.md" });
      throw new Error("Expected error");
    } catch (err) {
      if (!(err instanceof MarkdownParseError) && (err as any)?.name !== "MarkdownParseError") throw err;
      const info = err as MarkdownParseError & { name?: string };
      assert.equal(info.code, "STATUS_UNKNOWN");
      assert.equal(info.location.file, "status.md");
      assert.ok(info.location.line > 0);
      assert.equal(info.details?.status, "Backlog");
    }
  });

  it("handles mixed STORY and legacy titles in single document", () => {
    const md = [
      "## Story: STORY-900 Modern",
      "",
      "### Status",
      "Doing",
      "",
      "## Ready",
      "- Story: ID: LEG-3 Legacy Story"
    ].join("\n");
    const stories = parseMarkdownToStories(md, { statusMap: { doing: "Doing", ready: "Ready" } });
    const modern = stories.find((s) => s.storyId === "STORY-900")!;
    const legacy = stories.find((s) => s.storyId === "LEG-3")!;
    assert.equal(modern.title, "Modern");
    assert.equal(legacy.title, "Legacy Story");
  });
});