import { strict as assert } from "assert";
import { mapCardToStory } from "../trello/trello-to-md";

describe("trello card mapping", () => {
  it("maps card fields and checklist items to story", () => {
    const card = {
      name: "Card Name",
      desc: "Desc",
      idListName: "Ready",
      checklists: [
        { name: "Todos", checkItems: [{ name: "A", state: "incomplete" }, { name: "B", state: "complete" }] }
      ],
      customFieldItems: [{ value: { text: "SID-123" } }]
    };
    const s = mapCardToStory(card, "Todos");
    assert.equal(s.storyId, "SID-123");
    assert.equal(s.title, "Card Name");
    assert.equal(s.status, "Ready");
    assert.equal(s.body, "Desc");
    assert.equal(s.todos.length, 2);
    assert.equal(s.todos[1].done, true);
  });

  it("falls back to slug id when no custom field present", () => {
    const card = { name: "Hello World", desc: "", idListName: "Backlog" };
    const s = mapCardToStory(card as any, "Todos");
    assert.ok(s.storyId.startsWith("mdsync-hello-world"));
  });
});