import { canonicalCategorySlug } from "@/lib/category-page-resolve";
import type { TutorLedCatalogLandingStored, TutorLedCatalogPageConfig } from "@/lib/content-schema";
import {
  defaultIso22000CatalogLanding,
  defaultTutorLedCatalogPageConfig,
  mergeTutorLedCatalogPageConfig,
} from "@/lib/content-schema";
import type { TutorLedProgramStored } from "@/lib/default-tutor-led-programs";
import { ISO_22000_TUTOR_LED_TEMPLATES } from "@/lib/iso-22000-tutor-led-seed";

export function slugifyTutorLedCatalog(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function tutorLedCatalogPublicHref(slug: string): string {
  const key = slug.trim();
  if (!key) return "/tutor-led";
  if (key === "iso-22000") return "/tutor-led/iso-22000";
  return `/tutor-led/catalog/${encodeURIComponent(key)}`;
}

export function catalogLandingEnrollSlugs(catalog: TutorLedCatalogLandingStored): string[] {
  return catalog.page.programs.map((p) => p.enrollSlug?.trim()).filter(Boolean) as string[];
}

/** When a catalog goes live, publish its Zoom levels so enrolled dashboards can load Join. */
export function publishLinkedTutorLedPrograms(
  catalog: TutorLedCatalogLandingStored,
  programs: TutorLedProgramStored[],
): TutorLedProgramStored[] {
  if (!catalog.published) return programs;
  const slugs = new Set(catalogLandingEnrollSlugs(catalog));
  if (slugs.size === 0) return programs;
  return programs.map((p) => (slugs.has(p.slug) ? { ...p, published: true } : p));
}

export function blankTutorLedCatalogLanding(): TutorLedCatalogLandingStored {
  const page = structuredClone(defaultTutorLedCatalogPageConfig);
  page.hero.eyebrow = "Tutor led · Live online";
  page.hero.heading = "New training catalog";
  page.hero.headingHighlight = "Programs";
  page.hero.subtitle =
    "Describe this live program family. Add levels, prices, trainer, and FAQs — then Publish.";
  page.programsSection.title = "Choose your training level";
  page.programsSection.subtitle = "Add one or more live Zoom levels for this catalog.";
  page.programs = [];
  page.batches.rows = [];
  return {
    slug: `catalog-${Date.now()}`,
    category: "food-safety",
    published: false,
    cardTitle: "New tutor-led catalog",
    page,
  };
}

const PATTERN_LEVELS = [
  { id: "basic", label: "Awareness" },
  { id: "implementation", label: "Implementator" },
  { id: "internal-auditor", label: "Internal Auditor" },
  { id: "lead-auditor", label: "Lead Auditor" },
] as const;

function uniqueCatalogSlug(base: string, taken: Set<string>): string {
  let slug = slugifyTutorLedCatalog(base) || `catalog-${Date.now()}`;
  if (!taken.has(slug)) return slug;
  let i = 2;
  while (taken.has(`${slug}-${i}`)) i += 1;
  return `${slug}-${i}`;
}

function cloneLiveProgram(
  source: TutorLedProgramStored | undefined,
  slug: string,
  title: string,
  tagline: string,
  price: number,
  category: string,
): TutorLedProgramStored {
  const base = structuredClone(source ?? ISO_22000_TUTOR_LED_TEMPLATES[0]);
  return {
    ...base,
    slug,
    title,
    subtitle: tagline || base.subtitle,
    price: price || base.price,
    published: false,
    category,
    liveJoinUrl: "",
    zoomMeetingId: "",
    zoomPasscode: "",
    nextBatchDate: "",
  };
}

/**
 * Same ISO 22000-style catalog: 4 live levels, designed landing, pick 2/3/all.
 * Clones marketing cards + Zoom programs with new slugs so the original is untouched.
 */
export function cloneTutorLedCatalogPattern(input: {
  source?: TutorLedCatalogLandingStored | null;
  livePrograms?: TutorLedProgramStored[];
  takenSlugs?: Iterable<string>;
  asCopy?: boolean;
}): { catalog: TutorLedCatalogLandingStored; programs: TutorLedProgramStored[] } {
  const source = structuredClone(input.source ?? defaultIso22000CatalogLanding());
  const live = input.livePrograms ?? [];
  const taken = new Set(
    [...(input.takenSlugs ?? []), ...live.map((p) => p.slug)].filter(Boolean),
  );
  const baseKey = input.asCopy ? `${source.slug}-copy` : `live-training-${Date.now()}`;
  const catalogSlug = uniqueCatalogSlug(baseKey, taken);
  taken.add(catalogSlug);

  const page = mergeTutorLedCatalogPageConfig(source.page);
  if (!input.asCopy) {
    page.hero.eyebrow = "Tutor led · Live online";
    page.hero.heading = "New live training";
    page.hero.headingHighlight = "Programs";
    page.hero.subtitle =
      "Same layout as ISO 22000: pick a level, open Description, or buy any 2, 3, or all batches. Rename titles and images, then Publish.";
    page.programsSection.title = "Choose your training level";
    page.programsSection.subtitle =
      "Four live Zoom programs in one catalog — Awareness, Implementator, Internal Auditor, and Lead Auditor.";
    page.cta.heading = "Ready to train with your cohort?";
  }

  if (!page.programs.length) {
    page.programs = structuredClone(defaultTutorLedCatalogPageConfig.programs);
  }

  const programs: TutorLedProgramStored[] = [];
  page.programs = page.programs.map((card, index) => {
    const level = PATTERN_LEVELS[index] ?? PATTERN_LEVELS[index % PATTERN_LEVELS.length];
    const id = card.id?.trim() || level.id;
    const enrollSlug = uniqueCatalogSlug(`${catalogSlug}-${id}`, taken);
    taken.add(enrollSlug);
    const fromLive = live.find((p) => p.slug === card.enrollSlug?.trim());
    const fromIso = ISO_22000_TUTOR_LED_TEMPLATES[index] ?? ISO_22000_TUTOR_LED_TEMPLATES[0];
    const title = input.asCopy
      ? card.title
      : card.title?.replace(/iso\s*22000:2018/i, "New program").trim() || `New program — ${level.label}`;
    programs.push(
      cloneLiveProgram(
        fromLive ?? fromIso,
        enrollSlug,
        title,
        card.tagline,
        card.price,
        source.category || "food-safety",
      ),
    );
    return {
      ...card,
      id,
      title,
      enrollSlug,
      matchPattern: card.matchPattern || id,
    };
  });

  const catalog: TutorLedCatalogLandingStored = {
    slug: catalogSlug,
    category: source.category || "food-safety",
    published: false,
    cardTitle: input.asCopy
      ? `${source.cardTitle} (copy)`
      : "New tutor-led training programs",
    page,
  };
  return { catalog, programs };
}

function asLanding(raw: unknown): TutorLedCatalogLandingStored | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Partial<TutorLedCatalogLandingStored> & Partial<TutorLedCatalogPageConfig> & {
    page?: unknown;
  };
  const slug = String(r.slug ?? "").trim();
  if (!slug) return null;
  const nested = r.page && typeof r.page === "object" ? r.page : raw;
  return {
    slug,
    category: canonicalCategorySlug(String(r.category ?? "").trim()) || "food-safety",
    published: r.published !== false,
    cardTitle:
      String(r.cardTitle ?? "").trim() ||
      `${(nested as TutorLedCatalogPageConfig).hero?.heading ?? slug}`.trim(),
    page: mergeTutorLedCatalogPageConfig(nested as Partial<TutorLedCatalogPageConfig>),
  };
}

/** Normalize stored catalogs; migrates the old single ISO page when needed. */
export function mergeTutorLedCatalogPages(
  pages?: unknown,
  legacyPage?: Partial<TutorLedCatalogPageConfig> | null,
): TutorLedCatalogLandingStored[] {
  if (Array.isArray(pages)) {
    const list = pages.map(asLanding).filter((row): row is TutorLedCatalogLandingStored => Boolean(row));
    const seen = new Set<string>();
    const unique: TutorLedCatalogLandingStored[] = [];
    for (const row of list) {
      if (seen.has(row.slug)) continue;
      seen.add(row.slug);
      unique.push(row);
    }
    return unique;
  }
  const iso = defaultIso22000CatalogLanding();
  if (legacyPage) iso.page = mergeTutorLedCatalogPageConfig(legacyPage);
  return [iso];
}

export function findTutorLedCatalog(
  pages: TutorLedCatalogLandingStored[],
  slug: string,
): TutorLedCatalogLandingStored | undefined {
  const key = slug.trim();
  return pages.find((p) => p.slug === key);
}

export function publishedCatalogsForCategory(
  pages: TutorLedCatalogLandingStored[],
  categorySlug: string,
): TutorLedCatalogLandingStored[] {
  const want = canonicalCategorySlug(categorySlug);
  if (!want) return [];
  return pages.filter((p) => p.published && canonicalCategorySlug(p.category) === want);
}

export function enrollSlugsCoveredByCatalogs(pages: TutorLedCatalogLandingStored[]): Set<string> {
  const slugs = new Set<string>();
  for (const catalog of pages) {
    slugs.add(catalog.slug);
    for (const slug of catalogLandingEnrollSlugs(catalog)) slugs.add(slug);
  }
  return slugs;
}

export function catalogHrefForProgramSlug(
  slug: string,
  pages: TutorLedCatalogLandingStored[],
): string | null {
  const key = slug.trim();
  if (!key) return null;
  const asCatalog = findTutorLedCatalog(pages, key);
  if (asCatalog) return tutorLedCatalogPublicHref(asCatalog.slug);
  for (const catalog of pages) {
    if (catalogLandingEnrollSlugs(catalog).includes(key)) {
      return tutorLedCatalogPublicHref(catalog.slug);
    }
  }
  return null;
}

/** Catalog thumbnails cover many live batches — never show one program's fee. */
export function liveCatalogBatchCopy(batchCount: number): { note: string; hint: string } | null {
  const n = Number.isFinite(batchCount) ? Math.max(0, Math.floor(batchCount)) : 0;
  if (n <= 1) return null;
  return {
    note: `${n} live batches`,
    hint: "Prices vary by program",
  };
}

export function catalogBuyAllSlugs(
  programs: Array<{ enrollSlug?: string | null }>,
): string[] {
  return [
    ...new Set(
      programs
        .map((p) => p.enrollSlug?.trim())
        .filter((slug): slug is string => Boolean(slug)),
    ),
  ];
}
