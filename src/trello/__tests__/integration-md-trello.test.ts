import { strict as assert } from "assert";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { mdToTrello } from "../md-to-trello";
import { trelloToMd } from "../trello-to-md";
import { parseMarkdownToStories } from "../markdown-parser";
import { parseFormattedStoryName } from "../story-format";

type MemoryLabel = { id: string; name: string };
type MemoryMember = { id: string; username: string };
type MemoryChecklistItem = { id: string; name: string; state: string };
type MemoryChecklist = { id: string; name: string; checkItems: MemoryChecklistItem[] };
type MemoryCard = {
  id: string;
  name: string;
  desc: string;
  idList: string;
  labels: MemoryLabel[];
  idMembers: string[];
  customFieldItems: any[];
  checklists: MemoryChecklist[];
};

class MemoryProvider {
  private lists: { id: string; name: string }[];
  private cards: MemoryCard[];
  private checklistName: string;
  private labelByName: Map<string, MemoryLabel>;
  private labelById: Map<string, MemoryLabel>;
  private memberByName: Map<string, MemoryMember>;
  private counter = 0;

  constructor(opts: {
    lists: { id: string; name: string }[];
    checklistName: string;
    labels: MemoryLabel[];
    members: MemoryMember[];
  }) {
    this.lists = opts.lists;
    this.cards = [];
    this.checklistName = opts.checklistName;
    this.labelByName = new Map(opts.labels.map(l => [l.name.toLowerCase(), l]));
    this.labelById = new Map(opts.labels.map(l => [l.id, l]));
    this.memberByName = new Map(opts.members.map(m => [m.username.toLowerCase(), m]));
  }

  async getLists(): Promise<{ id: string; name: string }[]> {
    return this.lists;
  }

  async listItems(): Promise<MemoryCard[]> {
    return this.cards.map(card => ({
      ...card,
      labels: card.labels.map(l => ({ ...l })),
      checklists: card.checklists.map(cl => ({
        ...cl,
        checkItems: cl.checkItems.map(ci => ({ ...ci }))
      }))
    }));
  }

  async getCustomFields(): Promise<any[]> {
    return [];
  }

  async findItemByStoryIdOrTitle(_: string, storyId: string, title: string): Promise<MemoryCard | null> {
    if (storyId) {
      for (const card of this.cards) {
        const parsed = parseFormattedStoryName(card.name || "");
        if (parsed.storyId && parsed.storyId === storyId) return card;
      }
    }
    for (const card of this.cards) {
      if (card.name === title) return card;
    }
    return null;
  }

  async createItem(_: string, name: string, desc: string, status: string): Promise<MemoryCard> {
    const list = this.findListId(status);
    const card: MemoryCard = {
      id: `card-${++this.counter}`,
      name,
      desc,
      idList: list,
      labels: [],
      idMembers: [],
      customFieldItems: [],
      checklists: []
    };
    this.cards.push(card);
    return card;
  }

  async updateItem(cardId: string, name: string, desc: string): Promise<void> {
    const card = this.getCard(cardId);
    card.name = name;
    card.desc = desc;
  }

  async moveItemToStatus(cardId: string, _: string, status: string): Promise<void> {
    const card = this.getCard(cardId);
    card.idList = this.findListId(status);
  }

  async ensureChecklist(cardId: string, items: { text: string; checked: boolean }[]): Promise<void> {
    const card = this.getCard(cardId);
    const checkItems = items.map((item, idx) => ({
      id: `chk-${cardId}-${idx}`,
      name: item.text,
      state: item.checked ? "complete" : "incomplete"
    }));
    card.checklists = [{ id: `cl-${cardId}`, name: this.checklistName, checkItems }];
  }

  async resolveLabelIds(_: string, names: string[]): Promise<{ ids: string[]; missing: string[] }> {
    const ids: string[] = [];
    const missing: string[] = [];
    for (const raw of names) {
      const hit = this.labelByName.get(raw.toLowerCase());
      if (hit) {
        ids.push(hit.id);
      } else {
        missing.push(raw);
      }
    }
    return { ids, missing };
  }

  async setCardLabels(cardId: string, labelIds: string[]): Promise<void> {
    const card = this.getCard(cardId);
    card.labels = labelIds.map(id => {
      const label = this.labelById.get(id);
      return label ? { ...label } : { id, name: id };
    });
  }

  async resolveMemberIds(_: string, names: string[]): Promise<{ ids: string[]; missing: string[] }> {
    const ids: string[] = [];
    const missing: string[] = [];
    for (const raw of names) {
      const hit = this.memberByName.get(raw.toLowerCase());
      if (hit) {
        ids.push(hit.id);
      } else {
        missing.push(raw);
      }
    }
    return { ids, missing };
  }

  async setCardMembers(cardId: string, memberIds: string[]): Promise<void> {
    const card = this.getCard(cardId);
    card.idMembers = memberIds.slice();
  }

  getSnapshot(): MemoryCard[] {
    return this.cards.map(card => ({
      ...card,
      labels: card.labels.map(l => ({ ...l })),
      checklists: card.checklists.map(cl => ({
        ...cl,
        checkItems: cl.checkItems.map(ci => ({ ...ci }))
      }))
    }));
  }

  private getCard(cardId: string): MemoryCard {
    const card = this.cards.find(c => c.id === cardId);
    if (!card) throw new Error(`missing card ${cardId}`);
    return card;
  }

  private findListId(status: string): string {
    const target = (status || "").toLowerCase();
    const found = this.lists.find(l => l.name.toLowerCase() === target);
    if (!found) {
      const fallback = this.lists[0];
      return fallback ? fallback.id : status;
    }
    return found.id;
  }
}

describe("md-to-trello to trello-to-md integration", () => {
  it("round-trips story data through provider", async () => {
    const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), "mdsync-int-"));
    try {
      const mdDir = path.join(tmpRoot, "md");
      const outDir = path.join(tmpRoot, "out");
      await fs.mkdir(mdDir, { recursive: true });
      await fs.mkdir(outDir, { recursive: true });
      const storyMarkdown = [
        "## Ready",
        "- Story: STORY-300 Round Trip",
        "  description: Body text",
        "  labels: Blue",
        "  assignees: dev@example.com",
        "  acceptance_criteria:",
        "  - [ ] First",
        "  - [x] Second"
      ].join("\n");
      await fs.writeFile(path.join(mdDir, "story.md"), storyMarkdown, "utf8");

      const lists = [
        { id: "list-ready", name: "Ready" },
        { id: "list-done", name: "Done" }
      ];
      const provider = new MemoryProvider({
        lists,
        checklistName: "Todos",
        labels: [{ id: "lab-blue", name: "Blue" }],
        members: [{ id: "mem-dev", username: "dev@example.com" }]
      });

      const result = await mdToTrello({
        trelloKey: "key",
        trelloToken: "token",
        trelloBoardId: "board",
        mdInputDir: "md",
        mdOutputDir: "out",
        projectRoot: tmpRoot,
        checklistName: "Todos",
        trelloListMapJson: { ready: "Ready", done: "Done" },
        writeLocal: true,
        provider
      });

      assert.equal(result.result.created, 1);
      const snapshot = provider.getSnapshot();
      assert.equal(snapshot.length, 1);
      const card = snapshot[0];
      assert.equal(card.name, "STORY-300 Round Trip");
      assert.equal(card.labels[0].name, "Blue");
      assert.equal(card.idMembers[0], "mem-dev");
      assert.equal(card.checklists[0].checkItems.length, 2);

      const exportDir = path.join(tmpRoot, "exported");
      await fs.mkdir(exportDir, { recursive: true });
      const exportResult = await trelloToMd({
        trelloKey: "key",
        trelloToken: "token",
        trelloBoardId: "board",
        mdOutputDir: "exported",
        checklistName: "Todos",
        provider,
        list: "Ready"
      }, { projectRoot: tmpRoot });

      assert.equal(exportResult.files.length, 1);
      const exportedFile = exportResult.files[0].file;
      const contents = await fs.readFile(exportedFile, "utf8");
      const stories = parseMarkdownToStories(contents, { statusMap: { ready: "Ready" }, defaultChecklistName: "Todos" });
      assert.equal(stories.length, 1);
      const story = stories[0];
      assert.equal(story.storyId, "STORY-300");
      assert.equal(story.title, "Round Trip");
      assert.equal(story.todos?.length, 2);
      assert.equal(story.todos?.[1].done, true);
      assert.ok(contents.includes("## Story: STORY-300 Round Trip"));
      assert.ok(contents.includes("### Status"));
    } finally {
      await fs.rm(tmpRoot, { recursive: true, force: true });
    }
  });
});
