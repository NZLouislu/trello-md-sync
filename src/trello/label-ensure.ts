import { TrelloProvider } from "./provider";

export type LabelDefinition = { name: string; color?: string };

type LabelEnsurer = {
  ensureLabels(boardId: string, labels: LabelDefinition[], options?: { create?: boolean }): Promise<{ created: string[]; existing: string[]; missing: string[] }>;
};

export async function ensureBoardLabels(params: {
  boardId: string;
  labels: LabelDefinition[];
  auth?: { key: string; token: string };
  provider?: LabelEnsurer;
  listMap?: Record<string, string>;
  checklistName?: string;
  createMissing?: boolean;
}): Promise<{ created: string[]; existing: string[]; missing: string[] }> {
  const boardId = String(params.boardId || "").trim();
  if (!boardId) throw new Error("trelloBoardId is required");
  if (!Array.isArray(params.labels)) throw new Error("labels must be an array");
  const provider = params.provider ?? new TrelloProvider({
    auth: params.auth || { key: "", token: "" },
    listMap: params.listMap || {},
    checklistName: params.checklistName || "Todos"
  });
  return provider.ensureLabels(boardId, params.labels, { create: params.createMissing !== false });
}
