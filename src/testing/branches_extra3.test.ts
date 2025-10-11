import { strict as assert } from "assert";
import { parseMarkdownToStories } from "../trello/markdown-parser";
import { mdLink } from "../utils/markdown";

describe("extra branch coverage 3", () => {
  it("section parses assignees and labels CSV and semicolons", () => {
    const md = [
      "## Story: CSV Fields",
      "",
      "### Story ID",
      "SID-CSV",
      "",
      "### Status",
      "ready",
      "",
      "### Description",
      "B",
      "",
      "### Assignees",
      "alice, bob; charlie",
      "",
      "### Labels",
      "L1;L2, L3"
    ].join("\n");
    const s = parseMarkdownToStories(md, { statusMap: { ready: "Ready" } })[0];
    assert.equal(s.assignees.length, 3);
    assert.equal(s.labels.length, 3);
  });

  it("block parses labels/assignees/priority and unknown key into meta", () => {
    const md = [
      "## Doing",
      "- Story: Block Meta",
      "  story_id: SID-META",
      "  priority: high",
      "  labels: a, b; c",
      "  assignees: u1; u2, u3",
      "  sprint: 12",
      "  todos:",
      "  - [ ] t1"
    ].join("\n");
    const s = parseMarkdownToStories(md, { statusMap: { doing: "In progress" } }).find(t => t.storyId === "SID-META")!;
    assert.equal(s.meta.priority, "high");
    assert.equal(s.meta.sprint, "12");
    assert.equal(s.labels.length, 3);
    assert.equal(s.assignees.length, 3);
    assert.equal(s.status, "In progress");
  });

  it("status map provided but no hit returns plain normalized status", () => {
    const md = [
      "## Story: Custom Status",
      "",
      "### Status",
      "Custom Status",
      "",
      "### Description",
      "B"
    ].join("\n");
    const s = parseMarkdownToStories(md, { statusMap: { backlog: "Backlog", ready: "Ready" } })[0];
    assert.equal(s.status, "Custom Status");
  });

  it("utils markdown escape and link", () => {
    const l = mdLink({ text: "*x*", url: "http://u" });
    assert.equal(l, "[*x*](http://u)");
  });
  it("block description supports inline value plus multi-line body", () => {
    const md = [
      "## Ready",
      "- Story: Block Desc Lines",
      "  story_id: SID-DESC",
      "  body: Intro",
      "  More",
      "  Lines",
      "  todos:",
      "  - [ ] t1"
    ].join("\n");
    const s = parseMarkdownToStories(md, { statusMap: { ready: "Ready" } }).find(t => t.storyId === "SID-DESC")!;
    assert.ok(!!s);
    assert.ok(s.body.includes("Intro"));
    assert.ok(s.body.includes("More"));
    assert.ok(s.body.includes("Lines"));
  });
});