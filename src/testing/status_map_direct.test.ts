import { strict as assert } from "assert";
import { normalizeStatus } from "../trello/status-normalizer";

describe("status normalizer direct map hit", () => {
  it("returns mapped value when key exists in map", () => {
    const out = normalizeStatus("backlog", { backlog: "Backlog*" });
    assert.equal(out, "Backlog*");
  });
});