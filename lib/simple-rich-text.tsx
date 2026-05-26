import type { ReactNode } from "react";

/** Turn `**bold**` and `*italic*` into inline React nodes (plain text otherwise). */
export function formatSimpleRichText(text: string): ReactNode {
  if (!text) return null;
  const parts: ReactNode[] = [];
  const re = /\*\*([^*]+)\*\*|\*([^*]+)\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    if (m[1]) parts.push(<strong key={key++}>{m[1]}</strong>);
    else if (m[2]) parts.push(<em key={key++}>{m[2]}</em>);
    last = re.lastIndex;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts.length === 1 ? parts[0] : <>{parts}</>;
}

/** Multiline text with simple rich inline formatting per line. */
export function formatSimpleRichTextBlock(text: string): ReactNode {
  const lines = text.split(/\r?\n/);
  if (lines.length === 1) return formatSimpleRichText(text);
  return (
    <>
      {lines.map((line, i) => (
        <span key={i}>
          {i > 0 ? <br /> : null}
          {formatSimpleRichText(line)}
        </span>
      ))}
    </>
  );
}
