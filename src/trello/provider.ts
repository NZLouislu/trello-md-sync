import { parseFormattedStoryName } from "./story-format";

type ListMap = Record<string,string>;
type RetryOpts = { retries?: number; baseMs?: number; factor?: number; };
type Auth = { key: string; token: string; };
type Card = { id: string; name: string; desc: string; idList: string; };
type ProviderLogger = { debug?: (...args: any[]) => void; warn?: (...args: any[]) => void; info?: (...args: any[]) => void; };
type CacheEntry<T> = { value: T; createdAt: number };

export class TrelloProvider {
  private base = "https://api.trello.com/1";
  private auth: Auth;
  private listMap: ListMap;
  private checklistName: string;
  private logger: ProviderLogger;
  private listCache?: CacheEntry<{ id: string; name: string; }[]>;
  private labelListCache?: CacheEntry<any[]>;
  private memberListCache?: CacheEntry<any[]>;
  private idCache: Map<string, string>;
  private memberCache: Map<string, any>;
  private labelCache: Map<string, any>;

  constructor(params: { auth: Auth; listMap: ListMap; checklistName: string; logger?: ProviderLogger; }) {
    this.auth = params.auth;
    this.listMap = params.listMap;
    this.checklistName = params.checklistName;
    this.logger = params.logger || {};
    this.idCache = new Map();
    this.memberCache = new Map();
    this.labelCache = new Map();
  }

  private qs(extra?: Record<string,string>): string {
    const base = new URLSearchParams({ key: this.auth.key, token: this.auth.token });
    if (extra) for (const [k,v] of Object.entries(extra)) base.append(k, v);
    return base.toString();
  }

  private async sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
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
        this.logger.warn?.("trello.retry", { attempt, path, status: res.status, delay });
        await this.sleep(delay);
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
    const now = Date.now();
    if (this.listCache && now - this.listCache.createdAt < 30_000) {
      return this.listCache.value;
    }
    const value = await this.req(`/boards/${boardId}/lists?cards=none`, { method: "GET" });
    this.listCache = { value, createdAt: now };
    return value;
  }

  async listItems(boardId: string): Promise<Card[]> {
    return this.req(`/boards/${boardId}/cards?customFieldItems=true&checklists=all`, { method: "GET" });
  }

  async getCustomFields(boardId: string): Promise<any[]> {
    return this.req(`/boards/${boardId}/customFields`, { method: "GET" });
  }

  private async getBoardLabels(boardId: string): Promise<any[]> {
    const now = Date.now();
    if (this.labelListCache && now - this.labelListCache.createdAt < 30_000) return this.labelListCache.value;
    const res = await this.req(`/boards/${boardId}/labels`, { method: "GET" });
    this.labelListCache = { value: res, createdAt: now };
    return res;
  }

  private async getBoardMembers(boardId: string): Promise<any[]> {
    const now = Date.now();
    if (this.memberListCache && now - this.memberListCache.createdAt < 30_000) return this.memberListCache.value;
    const res = await this.req(`/boards/${boardId}/members`, { method: "GET" });
    this.memberListCache = { value: res, createdAt: now };
    return res;
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
    if (storyId && this.idCache.has(storyId)) {
      const byCache = this.idCache.get(storyId);
      this.logger.debug?.("trello.cache.storyId.hit", { storyId, cardId: byCache });
      if (byCache) {
        try {
          const card = await this.req(`/cards/${byCache}?customFieldItems=true&checklists=all`, { method: "GET" });
          return card;
        } catch (err) {
          this.logger.warn?.("trello.cache.storyId.stale", { storyId, cardId: byCache, error: (err as any)?.message });
          this.idCache.delete(storyId);
        }
      }
    }
    const cards: any[] = await this.listItems(boardId);
    const matchesById: any[] = [];
    const normalizedId = String(storyId || "").trim().toLowerCase();
    for (const c of cards) {
      if (normalizedId) {
        const parsed = parseFormattedStoryName(String(c?.name || ""));
        if (parsed.storyId && parsed.storyId.toLowerCase() === normalizedId) {
          matchesById.push(c);
        }
      }
    }
    if (matchesById.length === 1) {
      const card = matchesById[0];
      if (storyId) this.idCache.set(storyId, card.id);
      return card as Card;
    }
    if (matchesById.length > 1) {
      const names = matchesById.map((c: any) => String(c?.name || ""));
      this.logger.warn?.("trello.lookup.duplicateNames", { storyId, names });
      throw new Error(`Multiple cards share story id ${storyId}`);
    }
    const byTitle = (await this.req(`/search?query=${encodeURIComponent(title)}&modelTypes=cards&board_fields=name&card_fields=name,desc,idList,labels,idMembers&boards_limit=1&cards_limit=20`, { method: "GET" })).cards || [];
    const titleCard = byTitle.find((c: any) => c.name === title);
    if (titleCard && storyId) this.logger.warn?.("trello.lookup.titleFallback", { storyId, title });
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

  async ensureChecklist(cardId: string, items: { text: string; checked: boolean; }[]): Promise<void> {
    await this.replaceChecklist(cardId, this.checklistName, items);
  }

  async resolveLabelIds(boardId: string, names: string[]): Promise<{ ids: string[]; missing: string[] }> {
    const ids: string[] = [];
    const missing: string[] = [];
    if (!names.length) return { ids, missing };
    const labels = await this.getBoardLabels(boardId);
    for (const l of labels) {
      const key = (l.name || "").toLowerCase();
      if (!this.labelCache.has(key)) this.labelCache.set(key, l);
    }
    for (const raw of names) {
      const key = (raw || "").toLowerCase();
      const hit = this.labelCache.get(key);
      if (hit && hit.id) {
        ids.push(hit.id);
      } else {
        const found = labels.find((l: any) => (l.name || "").toLowerCase() === key);
        if (found && found.id) {
          ids.push(found.id);
          this.labelCache.set(key, found);
        } else {
          missing.push(raw);
        }
      }
    }
    if (missing.length) this.logger.warn?.("trello.labels.missing", { missing });
    return { ids, missing };
  }

  async ensureLabels(boardId: string, labels: { name: string; color?: string }[], options?: { create?: boolean }): Promise<{ created: string[]; existing: string[]; missing: string[] }> {
    const created: string[] = [];
    const existing: string[] = [];
    const missing: string[] = [];
    if (!labels.length) return { created, existing, missing };
    const current = await this.getBoardLabels(boardId);
    const byName = new Map<string, any>();
    for (const label of current) {
      const key = (label.name || "").toLowerCase();
      if (key) byName.set(key, label);
    }
    for (const input of labels) {
      const key = (input.name || "").toLowerCase();
      if (!key) continue;
      if (byName.has(key)) {
        const hit = byName.get(key);
        if (hit?.id) {
          existing.push(hit.id);
          await this.cacheLabel(boardId, key, hit);
        }
        continue;
      }
      if (options?.create === false) {
        missing.push(input.name);
        continue;
      }
      const color = input.color || "sky";
      const createdLabel = await this.req(`/labels`, { method: "POST", body: new URLSearchParams({ idBoard: boardId, name: input.name, color }) as any });
      if (createdLabel?.id) {
        created.push(createdLabel.id);
        await this.cacheLabel(boardId, key, createdLabel);
      }
    }
    return { created, existing, missing };
  }

  async resolveMemberIds(boardId: string, names: string[]): Promise<{ ids: string[]; missing: string[] }> {
    const ids: string[] = [];
    const missing: string[] = [];
    if (!names.length) return { ids, missing };
    const members = await this.getBoardMembers(boardId);
    for (const m of members) {
      const key = ((m.username || m.fullName || m.memberFullName || "") as string).toLowerCase();
      if (key) this.memberCache.set(key, m);
    }
    for (const raw of names) {
      const key = (raw || "").toLowerCase();
      let hit = this.memberCache.get(key);
      if (!hit) {
        hit = members.find((m: any) => ((m.username || m.fullName || m.memberFullName || "") as string).toLowerCase() === key);
        if (hit) this.memberCache.set(key, hit);
      }
      if (hit && hit.id) {
        ids.push(hit.id);
      } else {
        missing.push(raw);
      }
    }
    if (missing.length) this.logger.warn?.("trello.members.missing", { missing });
    return { ids, missing };
  }

  async ensureMembers(boardId: string, aliases: Record<string, string>): Promise<{ mapped: Record<string, string>; missing: string[] }> {
    const mapped: Record<string, string> = {};
    const missing: string[] = [];
    if (!aliases || !Object.keys(aliases).length) return { mapped, missing };
    const members = await this.getBoardMembers(boardId);
    for (const m of members) {
      const key = ((m.username || m.fullName || m.memberFullName || "") as string).toLowerCase();
      if (key) this.memberCache.set(key, m);
    }
    for (const [alias, trelloName] of Object.entries(aliases)) {
      const targetKey = (trelloName || "").toLowerCase();
      const member = this.memberCache.get(targetKey) || members.find((m: any) => ((m.username || m.fullName || m.memberFullName || "") as string).toLowerCase() === targetKey);
      if (member?.id) {
        mapped[alias] = member.id;
      } else {
        missing.push(alias);
      }
    }
    return { mapped, missing };
  }

  async setCardLabels(cardId: string, labelIds: string[]): Promise<void> {
    const payload = new URLSearchParams();
    payload.set("idLabels", labelIds.join(","));
    await this.req(`/cards/${cardId}`, { method: "PUT", body: payload as any });
  }

  async setCardMembers(cardId: string, memberIds: string[]): Promise<void> {
    const payload = new URLSearchParams();
    payload.set("idMembers", memberIds.join(","));
    await this.req(`/cards/${cardId}`, { method: "PUT", body: payload as any });
  }

  async cacheLabel(boardId: string, key: string, value: any) {
    const norm = (key || "").toLowerCase();
    this.labelCache.set(norm, value);
    this.logger.debug?.("trello.cache.label", { boardId, key: norm, id: value?.id });
  }

  getCachedLabel(key: string) {
    return this.labelCache.get((key || "").toLowerCase());
  }

  async cacheMember(boardId: string, key: string, value: any) {
    const norm = (key || "").toLowerCase();
    this.memberCache.set(norm, value);
    this.logger.debug?.("trello.cache.member", { boardId, key: norm, id: value?.id });
  }

  getCachedMember(key: string) {
    return this.memberCache.get((key || "").toLowerCase());
  }
}