import { canonicalCategorySlug } from "@/lib/category-page-resolve";
import type { TutorLedCatalogLandingStored, TutorLedCatalogPageConfig } from "@/lib/content-schema";
import {
  defaultIso22000CatalogLanding,
  defaultTutorLedCatalogPageConfig,
  mergeTutorLedCatalogPageConfig,
} from "@/lib/content-schema";

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
