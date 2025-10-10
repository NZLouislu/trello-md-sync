export function normalizeStatus(input: string, map: Record<string, string>): string {
  const s = String(input || "").trim();
  if (!s) return s;
  const key = s.toLowerCase();
  if (map && map[key]) return map[key];
  const aliases: Record<string, string> = {
    backlog: "Backlog",
    todo: map?.backlog || "Backlog",
    ready: "Ready",
    "ready to start": "Ready",
    "ready for development": "Ready",
    doing: map?.["in progress"] || "In progress",
    "in progress": "In progress",
    progress: "In progress",
    review: "In review",
    "in review": "In review",
    done: "Done",
    completed: "Done",
    complete: "Done",
    finished: "Done"
  };
  if (aliases[key]) return aliases[key];
  return s;
}