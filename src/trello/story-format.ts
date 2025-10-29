import type { Story } from "./types";

const disallowedFileChars = /[<>:"/\\|?*]+/g;

function normalize(value: string): string {
  return (value || "").trim();
}

export function formatStoryName(storyId: string, title: string): string {
  const id = normalize(storyId);
  const cleanTitle = normalize(title);
  if (id && cleanTitle) return `${id} ${cleanTitle}`;
  if (id) return id;
  return cleanTitle;
}

export function cardNameForStory(story: Story): string {
  return formatStoryName(story.storyId, story.title);
}

export function parseFormattedStoryName(value: string): { storyId: string; title: string } {
  const raw = normalize(value);
  const storyMatch = raw.match(/^(STORY-[^\s]+)(?:\s+(.+))?$/i);
  if (storyMatch) {
    const id = normalize(storyMatch[1]);
    const title = normalize(storyMatch[2] || "");
    return { storyId: id, title };
  }
  const match = raw.match(/^ID:\s*([^\s]+)(?:\s+(.+))?$/i);
  if (match) {
    const id = normalize(match[1]);
    const title = normalize(match[2] || "");
    return { storyId: id, title };
  }
  return { storyId: "", title: raw };
}

export function formatLegacyStoryName(storyId: string, title: string): string {
  const id = normalize(storyId);
  const cleanTitle = normalize(title);
  if (id && cleanTitle) return `ID: ${id} ${cleanTitle}`;
  if (id) return `ID: ${id}`;
  return cleanTitle;
}

export function storyFileName(story: Story): string {
  const base = formatStoryName(story.storyId, story.title || "untitled") || "untitled";
  const sanitized = base.replace(disallowedFileChars, "-").replace(/\s+/g, " ").trim() || "untitled";
  const parts = sanitized.split(/\s+/);
  if (parts.length > 1 && /^STORY-[^\s]+$/i.test(parts[0])) {
    const id = parts.shift()!;
    const rest = parts.join(" ") || "untitled";
    const slug = rest.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "untitled";
    return `${id}-${slug}.md`;
  }
  if (/^STORY-[^\s]+$/i.test(sanitized)) return `${sanitized}.md`;
  const slug = sanitized.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "untitled";
  return `${slug}.md`;
}
