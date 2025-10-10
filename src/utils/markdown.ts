export function mdEscape(input: string): string {
  return input.replace(/([\\`*_{}\\[\\]\\(\\)#+\\-!.])/g, "\\$1");
}

export function mdLink({ text, url }: { text: string; url: string }): string {
  return `[${mdEscape(text)}](${url})`;
}