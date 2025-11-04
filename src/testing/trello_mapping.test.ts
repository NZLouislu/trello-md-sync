import { strict as assert } from "assert";
import { mapCardToStory } from "../trello/trello-to-md";
import { validateTrelloConfig } from "../utils/config-validator";
import { handleCommonErrors } from "../utils/error-handler";

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

  it("falls back to empty storyId when no custom field present", () => {
    const card = { name: "Hello World", desc: "", idListName: "Backlog" };
    const s = mapCardToStory(card as any, "Todos");
    assert.equal(s.storyId, "");
  });

  it("validates configuration before processing", () => {
    const validation = validateTrelloConfig({
      trelloKey: "abcdef1234567890abcdef1234567890",
      trelloToken: "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
      trelloBoardId: "abcdef1234567890abcdef12"
    });

    assert(validation.isValid);
    assert.equal(validation.errors.length, 0);
  });

  it("handles validation errors appropriately", () => {
    const validation = validateTrelloConfig({
      trelloKey: "invalid",
      trelloToken: "invalid",
      trelloBoardId: "invalid"
    });

    assert.equal(validation.isValid, false);
    assert.equal(validation.errors.length, 3);
    assert.equal(validation.errors[0].code, "INVALID_FORMAT");
  });

  it("handles common errors with enhanced error handling", () => {
    const networkError = new Error("Network timeout");
    const syncError = handleCommonErrors(networkError);

    assert.equal(syncError.code, "NETWORK_ERROR");
    assert.equal(syncError.name, "NetworkError");
    assert(syncError.suggestion?.includes("internet connection"));
  });
});