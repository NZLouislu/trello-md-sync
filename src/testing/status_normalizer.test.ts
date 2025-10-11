import { strict as assert } from "assert";
import { normalizeStatus } from "../trello/status-normalizer";

describe("status normalizer", () => {
  it("maps aliases to canonical values", () => {
    const map: Record<string, string> = { backlog: "Backlog", ready: "Ready", "in progress": "In progress", "in review": "In review", done: "Done" };
    assert.equal(normalizeStatus("backlog", map), "Backlog");
    assert.equal(normalizeStatus("todo", map), "Backlog");
    assert.equal(normalizeStatus("ready", map), "Ready");
    assert.equal(normalizeStatus("doing", map), "In progress");
    assert.equal(normalizeStatus("in PROGRESS", map), "In progress");
    assert.equal(normalizeStatus("review", map), "In review");
    assert.equal(normalizeStatus("Completed", map), "Done");
  });

  it("returns input when unknown", () => {
    const m: Record<string, string> = {};
    assert.equal(normalizeStatus("Custom", m), "Custom");
  });
});