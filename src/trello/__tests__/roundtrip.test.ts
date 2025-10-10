import { strict as assert } from "assert";
import { mapCardToStory } from "../trello-to-md";
import { renderSingleStoryMarkdown } from "../renderer";
import { parseMarkdownToStories } from "../markdown-parser";
describe("trello round-trip", () => {
  it("card -> story -> md -> story keeps core fields", () => {
    const card = {
      name: "Export Me",
      desc: "Alpha\n\nBeta",
      idListName: "Doing",
      customFieldItems: [{ value: { text: "STORY-900" } }],
      checklists: [{ name: "Todos", checkItems: [{ name: "a", state: "incomplete" }, { name: "b", state: "complete" }] }]
    };
    const s1 = mapCardToStory(card as any, "Todos");
    const md = renderSingleStoryMarkdown(s1);
    const parsed = parseMarkdownToStories(md, { statusMap: { doing: "Doing" } });
    assert.equal(parsed.length, 1);
    const s2 = parsed[0];
    assert.equal(s2.storyId, "STORY-900");
    assert.equal(s2.title, "Export Me");
    assert.equal(s2.status, "Doing");
    assert.ok(s2.body.includes("Alpha"));
    assert.equal(s2.todos.length, 2);
    assert.equal(s2.todos[0].done, false);
    assert.equal(s2.todos[1].done, true);
  });
});