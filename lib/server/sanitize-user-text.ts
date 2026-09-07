/**
 * Strip HTML/script tags and neutralize CSV/formula injection prefixes
 * for free-text fields stored from public forms and support tickets.
 */

const TAG_RE = /<\/?[a-zA-Z][^>]*>/g;
const CONTROL_RE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

/** Plain-text only: remove tags, decode common entities, trim. */
export function sanitizePlainText(input: string | null | undefined, maxLen = 4000): string {
  if (!input) return "";
  let s = String(input)
    .replace(TAG_RE, " ")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(CONTROL_RE, "")
    .replace(/\s+/g, " ")
    .trim();
  // After entity decode, strip any remaining tags once more.
  s = s.replace(TAG_RE, " ").replace(/\s+/g, " ").trim();
  if (s.length > maxLen) s = s.slice(0, maxLen).trim();
  return s;
}

/** Leading = + - @ can trigger spreadsheet formula execution on export. */
export function neutralizeCsvFormula(value: string): string {
  if (!value) return value;
  const first = value[0];
  if (first === "=" || first === "+" || first === "-" || first === "@" || first === "\t") {
    return `'${value}`;
  }
  return value;
}

export function sanitizeOptionalPlainText(
  input: string | null | undefined,
  maxLen = 4000,
): string | undefined {
  const s = sanitizePlainText(input, maxLen);
  return s || undefined;
}
