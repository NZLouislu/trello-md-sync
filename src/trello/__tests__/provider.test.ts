import { strict as assert } from "assert";
import { TrelloProvider } from "../provider";

type ResponseLike = {
  status: number;
  ok: boolean;
  headers: { get(name: string): string | null };
  json(): Promise<any>;
  text(): Promise<string>;
};

describe("TrelloProvider", () => {
  const originalFetch = (globalThis as any).fetch;

  const createResponse = (status: number, body: string, headers?: Record<string, string>): ResponseLike => {
    return {
      status,
      ok: status >= 200 && status < 300,
      headers: {
        get(name: string) {
          const key = name.toLowerCase();
          return headers?.[key] || null;
        }
      },
      async json() {
        return JSON.parse(body);
      },
      async text() {
        return body;
      }
    };
  };

  afterEach(() => {
    if (originalFetch) {
      (globalThis as any).fetch = originalFetch;
    } else {
      delete (globalThis as any).fetch;
    }
  });

  it("retries on rate limits and succeeds", async () => {
    const calls: string[] = [];
    (globalThis as any).fetch = async (url: string) => {
      calls.push(url);
      if (calls.length === 1) {
        return createResponse(429, "", {});
      }
      return createResponse(200, JSON.stringify([{ id: "list-ready", name: "Ready" }]), { "content-type": "application/json" });
    };
    const provider = new TrelloProvider({ auth: { key: "key", token: "token" }, listMap: { ready: "Ready" }, checklistName: "Todos" });
    (provider as any).sleep = async () => {};
    const lists = await provider.getLists("board");
    assert.equal(lists.length, 1);
    assert.equal(lists[0].name, "Ready");
    assert.equal(calls.length, 2);
  });

  it("finds card by parsing title when custom field missing", async () => {
    const responses: Record<string, any> = {};
    const cardsPayload = [{
      id: "card-1",
      name: "STORY-200 Example",
      desc: "Body",
      idList: "list-ready",
      labels: [],
      idMembers: [],
      customFieldItems: [],
      checklists: []
    }];
    responses["/boards/board/cards?customFieldItems=true&checklists=all"] = createResponse(200, JSON.stringify(cardsPayload), { "content-type": "application/json" });
    responses["/search"] = createResponse(200, JSON.stringify({ cards: [] }), { "content-type": "application/json" });
    (globalThis as any).fetch = async (url: string) => {
      for (const key of Object.keys(responses)) {
        if (url.includes(key)) {
          return responses[key];
        }
      }
      return createResponse(404, "", {});
    };
    const provider = new TrelloProvider({ auth: { key: "key", token: "token" }, listMap: { ready: "Ready" }, checklistName: "Todos" });
    const card = await provider.findItemByStoryIdOrTitle("board", "STORY-200", "STORY-200 Example");
    assert.ok(card);
    assert.equal(card?.id, "card-1");
  });

  it("warns when resolving missing labels", async () => {
    const warnings: any[] = [];
    const payload = { labels: [{ id: "L1", name: "Blue" }] };
    (globalThis as any).fetch = async (url: string) => {
      if (url.includes("/boards/board/labels")) {
        return createResponse(200, JSON.stringify(payload.labels), { "content-type": "application/json" });
      }
      return createResponse(200, JSON.stringify([]), { "content-type": "application/json" });
    };
    const provider = new TrelloProvider({
      auth: { key: "key", token: "token" },
      listMap: { ready: "Ready" },
      checklistName: "Todos",
      logger: {
        warn(msg: string, meta?: any) {
          warnings.push({ msg, meta });
        }
      }
    });
    const res = await provider.resolveLabelIds("board", ["Blue", "Missing"]);
    assert.deepEqual(res.ids, ["L1"]);
    assert.deepEqual(res.missing, ["Missing"]);
    assert.equal(warnings.length, 1);
    assert.equal(warnings[0].msg, "trello.labels.missing");
    assert.deepEqual(warnings[0].meta, { missing: ["Missing"] });
  });
});
