/** Wrap selection (or word at cursor) with markers for simple rich text. */
export function wrapRichTextSelection(
  value: string,
  start: number,
  end: number,
  before: string,
  after: string,
): { next: string; cursor: number } {
  const selected = value.slice(start, end) || "text";
  const next = value.slice(0, start) + before + selected + after + value.slice(end);
  const cursor = start + before.length + selected.length + after.length;
  return { next, cursor };
}

export function stripRichTextFormatting(value: string): string {
  return value
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1");
}
