import { strict as assert } from "assert";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { mapCardToStory, trelloToMd } from "../trello-to-md";

describe("trello-to-md", () => {
  describe("mapCardToStory", () => {
    it("maps card with checklist to Story", () => {
      const card = {
        name: "STORY-777 My Card",
        desc: "Desc",
        idListName: "Ready",
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

    it("parses legacy ID prefix from card name", () => {
      const card = { name: "ID: STORY-889 Legacy", desc: "", idListName: "Ready" };
      const s = mapCardToStory(card as any, "Todos");
      assert.equal(s.storyId, "STORY-889");
      assert.equal(s.title, "Legacy");
    });
  });

  describe("trelloToMd", () => {
    it("filters by list, label, and storyId while keeping deterministic order", async () => {
      const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), "mdsync-ttm-"));
      try {
        const cards = [
          {
            id: "c1",
            name: "STORY-500 Zebra",
            desc: "Zebra desc",
            idList: "list-ready",
            labels: [{ name: "Blue" }],
            customFieldItems: [{ value: { text: "STORY-500" } }],
            checklists: []
          },
          {
            id: "c2",
            name: "STORY-100 Alpha",
            desc: "Alpha desc",
            idList: "list-ready",
            labels: [{ name: "Blue" }],
            customFieldItems: [{ value: { text: "STORY-100" } }],
            checklists: []
          },
          {
            id: "c3",
            name: "Legacy Card",
            desc: "Legacy desc",
            idList: "list-ready",
            labels: [{ name: "Red" }],
            customFieldItems: [],
            checklists: []
          },
          {
            id: "c4",
            name: "STORY-200 Beta",
            desc: "Beta desc",
            idList: "list-backlog",
            labels: [{ name: "Blue" }],
            customFieldItems: [{ value: { text: "STORY-200" } }],
            checklists: []
          }
        ];
        const lists = [
          { id: "list-ready", name: "Ready" },
          { id: "list-backlog", name: "Backlog" }
        ];
        const provider = {
          async listItems() {
            return cards;
          },
          async getLists() {
            return lists;
          }
        };

        const result = await trelloToMd({
          trelloKey: "key",
          trelloToken: "token",
          trelloBoardId: "board",
          mdOutputDir: "out",
          list: "Ready",
          label: "Blue",
          storyId: "STORY-500,STORY-100",
          provider
        }, { projectRoot: tmpRoot });

        const writtenBasenames = result.files.map((f) => path.basename(f.file));
        assert.deepEqual(writtenBasenames, ["STORY-100-alpha.md", "STORY-500-zebra.md"]);
        for (const file of result.files) {
          const contents = await fs.readFile(file.file, "utf8");
          assert.ok(contents.includes(`## Story: ${file.storyId} ${file.title}`));
        }
      } finally {
        await fs.rm(tmpRoot, { recursive: true, force: true });
      }
    });

    it("resolves filter lists from env strings and produces json summary", async () => {
      const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), "mdsync-ttm-env-"));
      try {
        const cards = [
          {
            id: "c1",
            name: "STORY-900 Gamma",
            desc: "Gamma",
            idList: "list-ready",
            labels: [{ name: "Green" }],
            customFieldItems: [{ value: { text: "STORY-900" } }],
            checklists: []
          },
          {
            id: "c2",
            name: "STORY-901 Delta",
            desc: "Delta",
            idList: "list-done",
            labels: [{ name: "Red" }],
            customFieldItems: [{ value: { text: "STORY-901" } }],
            checklists: []
          }
        ];
        const lists = [
          { id: "list-ready", name: "Ready" },
          { id: "list-done", name: "Done" }
        ];
        const provider = {
          async listItems() {
            return cards;
          },
          async getLists() {
            return lists;
          }
        };

        process.env.TRELLO_FILTER_LIST = "Ready";
        process.env.TRELLO_FILTER_LABEL = "Green";
        process.env.TRELLO_FILTER_STORYID = "STORY-900";

        const result = await trelloToMd({
          trelloKey: "key",
          trelloToken: "token",
          trelloBoardId: "board",
          mdOutputDir: "out",
          provider
        }, { projectRoot: tmpRoot, json: true });

        assert.equal(result.written, 1);
        const writtenBasenames = result.files.map((f) => path.basename(f.file));
        assert.deepEqual(writtenBasenames, ["STORY-900-gamma.md"]);
      } finally {
        delete process.env.TRELLO_FILTER_LIST;
        delete process.env.TRELLO_FILTER_LABEL;
        delete process.env.TRELLO_FILTER_STORYID;
        await fs.rm(tmpRoot, { recursive: true, force: true });
      }
    });
  });
});