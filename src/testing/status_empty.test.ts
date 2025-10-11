import { strict as assert } from "assert";
import { normalizeStatus } from "../trello/status-normalizer";

describe("status normalizer empty input", () => {
  it("returns empty when input is empty", () => {
    const out = normalizeStatus("", {});
    assert.equal(out, "");
  });
});