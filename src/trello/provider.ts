type ListMap = Record<string,string>;
type RetryOpts = { retries?: number; baseMs?: number; factor?: number; };
type Auth = { key: string; token: string; };
type Card = { id: string; name: string; desc: string; idList: string; };
export class TrelloProvider {
  private base = "https://api.trello.com/1";
  private auth: Auth;
  private listMap: ListMap;

  private storyIdCustomFieldId?: string;
  constructor(params: { auth: Auth; listMap: ListMap; checklistName: string; storyIdCustomFieldId?: string; }) {
    this.auth = params.auth;
    this.listMap = params.listMap;

    this.storyIdCustomFieldId = params.storyIdCustomFieldId;
  }
  private qs(extra?: Record<string,string>): string {
    const base = new URLSearchParams({ key: this.auth.key, token: this.auth.token });
    if (extra) for (const [k,v] of Object.entries(extra)) base.append(k, v);
    return base.toString();
  }
  private async req(path: string, init?: RequestInit, retry: RetryOpts = {}): Promise<any> {
    const max = retry.retries ?? 4;
    const baseMs = retry.baseMs ?? 300;
    const factor = retry.factor ?? 2;
    let attempt = 0;
    let lastErr: any;
    while (attempt <= max) {
      const res = await fetch(`${this.base}${path}${path.includes("?") ? "&" : "?"}${this.qs()}`, init);
      if (res.status === 429 || (res.status >= 500 && res.status < 600)) {
        lastErr = new Error(`HTTP ${res.status}`);
        const delay = baseMs * Math.pow(factor, attempt);
        await new Promise(r => setTimeout(r, delay));
        attempt++;
        continue;
      }
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`HTTP ${res.status}: ${txt}`);
      }
      const ct = res.headers.get("content-type") || "";
      if (ct.includes("application/json")) return res.json();
      return res.text();
    }
    throw lastErr;
  }
  async getLists(boardId: string): Promise<{ id: string; name: string; }[]> {
    return this.req(`/boards/${boardId}/lists?cards=none`, { method: "GET" });
  }
  async listItems(boardId: string): Promise<Card[]> {
    return this.req(`/boards/${boardId}/cards?customFieldItems=true&checklists=all`, { method: "GET" });
  }
  async getCustomFields(boardId: string): Promise<any[]> {
    return this.req(`/boards/${boardId}/customFields`, { method: "GET" });
  }
  private mapStatusToListId(status: string, lists: { id: string; name: string; }[]): string {
    const key = status.trim().toLowerCase();
    const target = Object.keys(this.listMap).find(k => k.toLowerCase() === key);
    const targetName = target ? this.listMap[target] : status;
    const found = lists.find(l => l.name.toLowerCase() === targetName.toLowerCase());
    if (!found) throw new Error(`List not found for status ${status}`);
    return found.id;
  }
  async findItemByStoryIdOrTitle(boardId: string, storyId: string, title: string): Promise<Card | null> {
    const cards: any[] = await this.listItems(boardId);
    for (const c of cards) {
      if (this.storyIdCustomFieldId && Array.isArray(c.customFieldItems)) {
        const match = c.customFieldItems.find((it: any) => it.idCustomField === this.storyIdCustomFieldId && (it.value?.text || it.value?.number || it.value?.checked) === storyId);
        if (match) return c as Card;
      }
    }
    const byTitle = (await this.req(`/search?query=${encodeURIComponent(title)}&modelTypes=cards&board_fields=name&card_fields=name,desc,idList&boards_limit=1&cards_limit=20`, { method: "GET" })).cards || [];
    const titleCard = byTitle.find((c: any) => c.name === title);
    return titleCard || null;
  }
  async createItem(boardId: string, name: string, desc: string, status: string): Promise<Card> {
    const lists = await this.getLists(boardId);
    const idList = this.mapStatusToListId(status, lists);
    return this.req(`/cards`, { method: "POST", body: new URLSearchParams({ idList, name, desc }) as any });
  }
  async updateItem(cardId: string, name: string, desc: string): Promise<void> {
    await this.req(`/cards/${cardId}`, { method: "PUT", body: new URLSearchParams({ name, desc }) as any });
  }
  async moveItemToStatus(cardId: string, boardId: string, status: string): Promise<void> {
    const lists = await this.getLists(boardId);
    const idList = this.mapStatusToListId(status, lists);
    await this.req(`/cards/${cardId}`, { method: "PUT", body: new URLSearchParams({ idList }) as any });
  }
  async getItemBody(cardId: string): Promise<string> {
    const c = await this.req(`/cards/${cardId}`, { method: "GET" });
    return c.desc || "";
  }
  async setStoryId(cardId: string, value: string): Promise<void> {
    if (!this.storyIdCustomFieldId) return;
    await this.req(`/cards/${cardId}/customField/${this.storyIdCustomFieldId}/item`, { method: "PUT", body: JSON.stringify({ value: { text: value } }), headers: { "Content-Type": "application/json" } as any });
  }
  async replaceChecklist(cardId: string, name: string, items: { text: string; checked: boolean; }[]): Promise<void> {
    const checklists = await this.req(`/cards/${cardId}/checklists`, { method: "GET" });
    for (const cl of checklists) {
      if (cl.name === name) await this.req(`/checklists/${cl.id}`, { method: "DELETE" });
    }
    const created = await this.req(`/checklists`, { method: "POST", body: new URLSearchParams({ idCard: cardId, name }) as any });
    for (const it of items) {
      await this.req(`/checklists/${created.id}/checkItems`, { method: "POST", body: new URLSearchParams({ name: it.text, checked: it.checked ? "true" : "false" }) as any });
    }
  }
}