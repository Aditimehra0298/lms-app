/** One row parsed from the admin bulk-import textarea. */
export type BulkCourseImportRow = {
  title: string;
  description: string;
  slug?: string;
};

/**
 * Parse pasted food-course list. Supported formats:
 *
 * 1) Blocks separated by --- or ===
 *    First line = title, rest = description
 *
 * 2) Explicit labels:
 *    TITLE: ...
 *    DESCRIPTION: ...
 *
 * 3) JSON array: [{ "title", "description", "slug"? }]
 */
export function parseBulkCourseImportText(raw: string): BulkCourseImportRow[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];

  if (trimmed.startsWith("[")) {
    try {
      const arr = JSON.parse(trimmed) as unknown;
      if (!Array.isArray(arr)) return [];
      return arr
        .map((item) => {
          if (!item || typeof item !== "object") return null;
          const o = item as Record<string, unknown>;
          const title = String(o.title ?? o.name ?? "").trim();
          const description = String(o.description ?? o.body ?? o.text ?? "").trim();
          const slug = typeof o.slug === "string" ? o.slug.trim() : undefined;
          if (!title && !description) return null;
          return { title: title || "Untitled course", description, slug };
        })
        .filter((r): r is BulkCourseImportRow => r !== null);
    } catch {
      return [];
    }
  }

  const blocks = trimmed.split(/\n(?:---|===)\s*\n|\n---+\s*$|^---+\s*\n/m);
  const rows: BulkCourseImportRow[] = [];

  for (const block of blocks) {
    const b = block.trim();
    if (!b) continue;

    const titleMatch = b.match(/^TITLE:\s*(.+)$/im);
    const descMatch = b.match(/^DESCRIPTION:\s*\n?([\s\S]*)$/im);
    if (titleMatch) {
      rows.push({
        title: titleMatch[1].trim(),
        description: (descMatch?.[1] ?? b.replace(/^TITLE:[^\n]*\n?/im, "")).trim(),
      });
      continue;
    }

    const lines = b.split("\n");
    const title = lines[0]?.trim() ?? "";
    const description = lines.slice(1).join("\n").trim();
    if (!title && !description) continue;
    rows.push({
      title: title || "Untitled course",
      description: description || title,
    });
  }

  return rows;
}
