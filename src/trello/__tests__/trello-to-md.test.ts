import { strict as assert } from "assert";
import { mapCardToStory } from "../trello-to-md";
describe("trello-to-md mapping", () => {
  it("maps card with checklist to Story", () => {
    const card = {
      name: "My Card",
      desc: "Desc",
      idListName: "Ready",
      customFieldItems: [{ value: { text: "STORY-777" } }],
      checklists: [
        { name: "Todos", checkItems: [{ name: "a", state: "incomplete" }, { name: "b", state: "complete" }] }
      ]
    };
    const s = mapCardToStory(card as any, "Todos");
    assert.equal(s.storyId, "STORY-777");
    assert.equal(s.title, "My Card");
    assert.equal(s.status, "Ready");
    assert.equal(s.body, "Desc");
    assert.equal(s.todos.length, 2);
    assert.equal(s.todos[0].done, false);
    assert.equal(s.todos[1].done, true);
  });
  it("generates id when missing", () => {
    const card = { name: "Hello World", desc: "", idListName: "Backlog" };
    const s = mapCardToStory(card as any, "Todos");
    assert.ok(s.storyId.startsWith("mdsync-hello-world"));
  });
});