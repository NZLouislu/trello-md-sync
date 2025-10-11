import { strict as assert } from "assert";
import { normalizeStatus } from "../trello/status-normalizer";

describe("status normalizer alias map paths", () => {
  it("maps 'todo' via map.backlog", () => {
    const out = normalizeStatus("todo", { backlog: "Queue" } as any);
    assert.equal(out, "Queue");
  });
  it("maps 'doing' via map['in progress']", () => {
    const out = normalizeStatus("doing", { "in progress": "Doing*" } as any);
    assert.equal(out, "Doing*");
  });
});