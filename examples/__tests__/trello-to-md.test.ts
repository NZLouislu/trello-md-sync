import assert from "assert";

describe("examples trello-to-md", () => {
  it("runs in info mode and returns object", async () => {
    const mod = await import("../trello-to-md");
    process.env.DRY_RUN = "1";
    process.env.MD_OUTPUT_DIR = "./examples/items";
    delete process.env.LOG_LEVEL;
    delete process.env.LOG_JSON;
    const res = await mod.main();
    assert.ok(res);
    assert.ok(typeof res === "object");
  });

  it("runs in debug mode without throwing", async () => {
    const mod = await import("../trello-to-md");
    process.env.DRY_RUN = "1";
    process.env.MD_OUTPUT_DIR = "./examples/items";
    process.env.LOG_LEVEL = "debug";
    const res = await mod.main();
    assert.ok(res);
  });
});