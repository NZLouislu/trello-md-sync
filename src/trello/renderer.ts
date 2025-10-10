import type { Story } from "./types";
export function renderSingleStoryMarkdown(s: Story): string {
  const lines: string[] = [];
  lines.push(`## Story: ${s.title}`);
  lines.push("");
  lines.push("### Story ID");
  lines.push(s.storyId || "");
  lines.push("");
  lines.push("### Status");
  lines.push(s.status || "Backlog");
  lines.push("");
  lines.push("### Description");
  lines.push(s.body || "");
  lines.push("");
  const hasTodos = s.todos && s.todos.length > 0;
  lines.push("### Acceptance Criteria");
  if (hasTodos) {
    for (const t of s.todos) {
      lines.push(`- [${t.done ? "x" : " "}] ${t.text}`);
    }
  }
  lines.push("");
  return lines.join("\n").replace(/\n+$/,"") + "\n";
}
export function preferredStoryFileName(s: Story): string {
  const id = (s.storyId || "").trim();
  const titleSlug = (s.title || "untitled").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  if (id) return `${id}-${titleSlug}.md`;
  return `mdsync-${titleSlug}.md`;
}