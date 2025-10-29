import type { Story } from "./types";
import { storyFileName, formatStoryName } from "./story-format";

export function renderSingleStoryMarkdown(s: Story): string {
  const lines: string[] = [];
  const id = (s.storyId || "").trim();
  const title = (s.title || "").trim();
  
  const displayName = formatStoryName(id, title);
  if (displayName) lines.push(`## Story: ${displayName}`);
  else lines.push("## Story:");
  
  lines.push("");
  
  if (id) {
    lines.push("### Story ID");
    lines.push(id);
    lines.push("");
  }
  
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
  return lines.join("\n").replace(/\n+$/, "") + "\n";
}

export function preferredStoryFileName(s: Story): string {
  return storyFileName(s);
}