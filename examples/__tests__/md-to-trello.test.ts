import assert from "assert";

describe("examples md-to-trello", () => {
  it("runs in info mode (dry-run) and returns summary", async () => {
    const mod = await import("../md-to-trello");
    process.env.DRY_RUN = "1";
    process.env.TRELLO_KEY = "test";
    process.env.TRELLO_TOKEN = "test";
    process.env.TRELLO_BOARD_ID = "test";
    process.env.TRELLO_STORY_ID_CUSTOM_FIELD_ID = "68e86313aa11a1da92aaa998";
    process.env.MD_INPUT_DIR = "./md";
    process.env.MD_OUTPUT_DIR = "./items";
    delete process.env.LOG_LEVEL;
    delete process.env.LOG_JSON;
    const res = await mod.main();
    assert.ok(res);
    assert.ok(typeof res.result.created === "number");
    assert.ok(typeof res.result.updated === "number");
    assert.ok(typeof res.result.failed === "number");
  });

  it("runs in debug mode (dry-run) without throwing", async () => {
    const mod = await import("../md-to-trello");
    process.env.DRY_RUN = "1";
    process.env.TRELLO_KEY = "test";
    process.env.TRELLO_TOKEN = "test";
    process.env.TRELLO_BOARD_ID = "test";
    process.env.TRELLO_STORY_ID_CUSTOM_FIELD_ID = "68e86313aa11a1da92aaa998";
    process.env.LOG_LEVEL = "debug";
    const res = await mod.main();
    assert.ok(res);
    assert.ok(typeof res.result.created === "number");
  });
});