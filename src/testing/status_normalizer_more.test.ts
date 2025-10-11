import { strict as assert } from "assert";
import { normalizeStatus } from "../trello/status-normalizer";

describe("status normalizer more aliases and map paths", () => {
  it("maps extended aliases and direct map hit", () => {
    const map: Record<string,string> = { backlog: "Backlog", ready: "Ready", "in progress": "In progress", "in review": "In review", done: "Done" };
    assert.equal(normalizeStatus("todo", map), "Backlog");
    assert.equal(normalizeStatus("ready to start", map), "Ready");
    assert.equal(normalizeStatus("ready for development", map), "Ready");
    assert.equal(normalizeStatus("doing", map), "In progress");
    assert.equal(normalizeStatus("progress", map), "In progress");
    assert.equal(normalizeStatus("review", map), "In review");
    assert.equal(normalizeStatus("completed", map), "Done");
    assert.equal(normalizeStatus("complete", map), "Done");
    assert.equal(normalizeStatus("backlog", map), "Backlog");
  });

  it("returns input on empty and non-mapped with map provided", () => {
    const map: Record<string,string> = { ready: "Ready" };
    assert.equal(normalizeStatus("", map), "");
    assert.equal(normalizeStatus("custom-x", map), "custom-x");
  });
});