import type { TutorLedProgramStored } from "@/lib/default-tutor-led-programs";
import {
  extractScheduleTime,
  parseFlexibleDate,
  startOfDay,
} from "@/lib/my-learning-dashboard-events";
import type { TutorLedCatalogBatchRow, TutorLedCatalogProgramCard } from "@/lib/content-schema";

export type LiveCatalogBatchRow = TutorLedCatalogBatchRow & {
  /** Published tutor-led program slug for Zoom enroll / checkout. */
  slug: string;
};

/** Upcoming live Zoom batches from published tutor-led programs (skips past dates). */
export function buildLiveCatalogBatchRows(
  programs: TutorLedProgramStored[],
): LiveCatalogBatchRow[] {
  const today = startOfDay(new Date());
  const rows: (LiveCatalogBatchRow & { sortKey: number })[] = [];

  for (const program of programs) {
    const dateRaw = program.nextBatchDate?.trim();
    if (!dateRaw) continue;
    const parsed = parseFlexibleDate(dateRaw);
    if (parsed && parsed < today) continue;

    rows.push({
      date: dateRaw,
      time: extractScheduleTime(program.schedule || "") || "See program schedule",
      programId: program.slug,
      programLabel: program.batchLabel?.trim() || program.title,
      seats: typeof program.seatsLeft === "number" ? program.seatsLeft : 0,
      slug: program.slug,
      sortKey: parsed?.getTime() ?? Number.MAX_SAFE_INTEGER,
    });
  }

  return rows
    .sort((a, b) => a.sortKey - b.sortKey)
    .map(({ sortKey: _sortKey, ...row }) => row);
}

/** Resolve marketing card → published Zoom program slug. */
export function resolveCatalogEnrollSlug(
  card: TutorLedCatalogProgramCard,
  catalog: TutorLedProgramStored[] | undefined,
): string | null {
  const explicit = card.enrollSlug?.trim();
  if (explicit) {
    if (!catalog?.length) return explicit;
    const exact = catalog.find((p) => p.slug === explicit);
    return exact?.slug ?? explicit;
  }
  if (!catalog?.length) return null;

  const byId = catalog.find(
    (p) =>
      p.slug === card.id ||
      p.slug.includes(card.id) ||
      card.id.includes(p.slug),
  );
  if (byId) return byId.slug;

  let re: RegExp | null = null;
  const pattern = card.matchPattern?.trim();
  if (pattern) {
    try {
      re = new RegExp(pattern, "i");
    } catch {
      re = null;
    }
  }
  if (re) {
    const hit = catalog.find((p) => re!.test(p.title) || re!.test(p.slug));
    if (hit) return hit.slug;
  }

  const titleKey = card.title.trim().toLowerCase();
  if (titleKey) {
    const titleHit = catalog.find(
      (p) =>
        p.title.toLowerCase().includes(titleKey) ||
        titleKey.includes(p.title.toLowerCase()),
    );
    if (titleHit) return titleHit.slug;
  }

  return null;
}
