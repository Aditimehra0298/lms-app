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

const THEME_ROTATION: Array<TutorLedCatalogProgramCard["theme"]> = [
  "emerald",
  "sky",
  "violet",
  "gold",
];

/**
 * Catalog marketing cards + live Admin → Tutor Led programs.
 * Overlays price/title from published programs; if Landing has no cards, builds from programs.
 */
export function mergeCatalogProgramCards(
  cards: TutorLedCatalogProgramCard[],
  programs: TutorLedProgramStored[],
): Array<TutorLedCatalogProgramCard & { resolvedSlug: string | null }> {
  const live = programs.filter(
    (p) => p.published && p.programKind !== "workshop",
  );

  if (!cards.length && live.length > 0) {
    return live.map((p, i) => {
      const duration =
        p.batchDetails?.find((d) => /duration/i.test(d.label))?.value ||
        p.schedule ||
        "Live Zoom";
      return {
        id: p.slug,
        title: p.title,
        tagline: p.subtitle || p.badge || "Live tutor-led training",
        bullets: (p.highlights ?? []).slice(0, 4).filter(Boolean).length
          ? (p.highlights ?? []).slice(0, 4).filter(Boolean)
          : (p.features ?? []).slice(0, 4).map((f) => f.title).filter(Boolean),
        durationLabel: duration,
        modeLabel: "Live on Zoom",
        certificateLabel: p.badge?.trim() || "Certificate of completion",
        price: typeof p.price === "number" ? p.price : 0,
        theme: THEME_ROTATION[i % THEME_ROTATION.length],
        popular: i === 0,
        icon: "Video",
        thumbnail: p.heroSrc?.trim() || "",
        enrollSlug: p.slug,
        matchPattern: "",
        resolvedSlug: p.slug,
      };
    });
  }

  return cards.map((card) => {
    const slug = resolveCatalogEnrollSlug(card, live);
    const program = slug ? live.find((p) => p.slug === slug) : undefined;
    if (!program) {
      return { ...card, resolvedSlug: slug };
    }
    const duration =
      program.batchDetails?.find((d) => /duration/i.test(d.label))?.value ||
      card.durationLabel;
    return {
      ...card,
      title: program.title?.trim() || card.title,
      tagline: program.subtitle?.trim() || card.tagline,
      price: typeof program.price === "number" ? program.price : card.price,
      thumbnail: card.thumbnail?.trim() || program.heroSrc?.trim() || "",
      durationLabel: duration,
      enrollSlug: program.slug,
      resolvedSlug: program.slug,
    };
  });
}
