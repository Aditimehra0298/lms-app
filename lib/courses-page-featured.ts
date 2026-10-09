import type {
  CoursesPageFeaturedRef,
  CoursesPageHero,
  CoursesPageHeroPromoType,
  CoursesPageHeroSlide,
  ManagedCourse,
  TutorLedCatalogLandingStored,
} from "@/lib/content-schema";
import type { TutorLedProgramStored } from "@/lib/default-tutor-led-programs";
import { catalogCourseLandingHref } from "@/lib/course-landing";
import { resolveCourseListThumbnail } from "@/lib/course-thumbnail";
import { tutorLedCatalogPublicHref } from "@/lib/tutor-led-catalog-landings";
import { liveTutorCourseHref } from "@/lib/tutor-led-routes";
import { isWorkshopProgram, workshopLandingHref } from "@/lib/workshop-program";

export type FeaturedCourseOption = CoursesPageFeaturedRef & {
  title: string;
  subtitle: string;
  image: string;
  href: string;
  group: string;
  priceText: string;
  oldPriceText: string;
  isFree: boolean;
  tutorName: string;
  tutorRole: string;
  tutorPhoto: string;
  /** Free-text next batch / start date when known. */
  startText: string;
};

function parsePriceAmount(text: string | number | undefined | null): number | null {
  if (typeof text === "number") return Number.isFinite(text) ? text : null;
  const raw = String(text ?? "").trim();
  if (!raw) return null;
  if (/free/i.test(raw)) return 0;
  const n = Number.parseFloat(raw.replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : null;
}

function inrText(n: number | undefined): string {
  if (!n || n <= 0) return "";
  return `₹${n.toLocaleString("en-IN")}`;
}

/** "40% OFF" from sale + list price strings, or "" when not a discount. */
export function discountLabelFromPrices(priceText?: string, oldPriceText?: string): string {
  const price = parsePriceAmount(priceText);
  const old = parsePriceAmount(oldPriceText);
  if (price == null || old == null || old <= 0 || price >= old) return "";
  const pct = Math.round(((old - price) / old) * 100);
  return pct > 0 ? `${pct}% OFF` : "";
}

export function isFreePriceText(priceText?: string): boolean {
  return parsePriceAmount(priceText) === 0;
}

export function featuredRefKey(ref: CoursesPageFeaturedRef | null | undefined): string {
  if (!ref?.slug?.trim()) return "";
  return `${ref.kind}:${ref.slug.trim()}`;
}

export function parseFeaturedRefKey(key: string): CoursesPageFeaturedRef | null {
  const idx = key.indexOf(":");
  if (idx <= 0) return null;
  const kind = key.slice(0, idx);
  const slug = key.slice(idx + 1).trim();
  if (!slug) return null;
  if (kind !== "course" && kind !== "tutor-led" && kind !== "catalog") return null;
  return { kind, slug };
}

export function buildFeaturedCourseOptions(input: {
  courses: ManagedCourse[];
  programs: TutorLedProgramStored[];
  catalogs: TutorLedCatalogLandingStored[];
}): FeaturedCourseOption[] {
  const tutorLedSlugs = new Set(input.programs.map((p) => p.slug));
  const options: FeaturedCourseOption[] = [];

  for (const c of input.courses) {
    if (c.published === false) continue;
    options.push({
      kind: "course",
      slug: c.slug,
      title: c.title,
      subtitle: c.subtitle || "",
      image: resolveCourseListThumbnail(c),
      href: catalogCourseLandingHref(c.slug, tutorLedSlugs, c.learningFormat),
      group: "Self-paced courses",
      priceText: c.price || "",
      oldPriceText: c.oldPrice || "",
      isFree: isFreePriceText(c.price),
      tutorName: c.instructorName || "",
      tutorRole: "",
      tutorPhoto: "",
      startText: "",
    });
  }

  for (const p of input.programs) {
    if (p.published === false) continue;
    const workshop = isWorkshopProgram(p);
    options.push({
      kind: "tutor-led",
      slug: p.slug,
      title: p.title,
      subtitle: p.subtitle || "",
      image: p.heroSrc || "",
      href: workshop ? workshopLandingHref(p.slug) : liveTutorCourseHref(p.slug),
      group: workshop ? "Workshops" : "Tutor-led programs",
      priceText: p.priceLabel || inrText(p.price) || (p.price === 0 ? "Free" : ""),
      oldPriceText: p.oldPriceLabel || inrText(p.originalPrice),
      isFree: p.priceLabel ? isFreePriceText(p.priceLabel) : p.price === 0,
      tutorName: p.trainer?.name || "",
      tutorRole: p.trainer?.role || "",
      tutorPhoto: p.trainer?.avatar || "",
      startText: p.nextBatchDate || "",
    });
  }

  for (const cat of input.catalogs) {
    if (!cat.published) continue;
    const hero = cat.page.hero;
    options.push({
      kind: "catalog",
      slug: cat.slug,
      title: cat.cardTitle,
      subtitle: hero.subtitle || "",
      image: hero.backgroundImage || cat.page.pageThumbnail || "",
      href: tutorLedCatalogPublicHref(cat.slug),
      group: "Tutor-led catalogs",
      priceText: "",
      oldPriceText: "",
      isFree: false,
      tutorName: "",
      tutorRole: "",
      tutorPhoto: "",
      startText: "",
    });
  }

  return options;
}

export function findFeaturedOption(
  options: FeaturedCourseOption[],
  ref: CoursesPageFeaturedRef | null | undefined,
): FeaturedCourseOption | undefined {
  const key = featuredRefKey(ref);
  if (!key) return undefined;
  return options.find((o) => featuredRefKey(o) === key);
}

export const HERO_PROMO_PRESETS: Record<
  CoursesPageHeroPromoType,
  { label: string; badgeText: string; ctaPrimary: string; ctaSecondary: string }
> = {
  featured: { label: "Featured course", badgeText: "FEATURED COURSE", ctaPrimary: "Explore Program", ctaSecondary: "View Details" },
  free: { label: "Free course", badgeText: "100% FREE COURSE", ctaPrimary: "Start Free", ctaSecondary: "View Details" },
  discount: { label: "Discount offer", badgeText: "LIMITED-TIME OFFER", ctaPrimary: "Grab the Deal", ctaSecondary: "View Details" },
  live: { label: "Live with tutor", badgeText: "LIVE WITH TUTOR", ctaPrimary: "Join Live", ctaSecondary: "View Schedule" },
  announcement: { label: "Course started / announcement", badgeText: "NOW STARTED", ctaPrimary: "Enroll Now", ctaSecondary: "View Details" },
  "new-tutor": { label: "New tutor joined", badgeText: "NEW TUTOR JOINED", ctaPrimary: "Meet the Tutor", ctaSecondary: "View Courses" },
};

export const HERO_PROMO_TYPES = Object.keys(HERO_PROMO_PRESETS) as CoursesPageHeroPromoType[];

function newSlideId(): string {
  return `slide-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

/** Value for `<input type="datetime-local">` from a free-text date, or "". */
export function toDateTimeLocal(text: string): string {
  const t = Date.parse(text);
  if (!Number.isFinite(t)) return "";
  const d = new Date(t);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function createHeroSlide(
  promoType: CoursesPageHeroPromoType,
  base?: Partial<CoursesPageHeroSlide>,
): CoursesPageHeroSlide {
  const preset = HERO_PROMO_PRESETS[promoType];
  return {
    id: newSlideId(),
    enabled: true,
    promoType,
    badgeText: preset.badgeText,
    title: "",
    highlightWord: "",
    subtitle: "",
    ctaPrimary: preset.ctaPrimary,
    ctaSecondary: preset.ctaSecondary,
    backgroundImage: "",
    featured: null,
    ...base,
  };
}

/** Slides stored on the hero, or one slide built from the legacy single-hero fields. */
export function heroSlidesFromConfig(hero: CoursesPageHero): CoursesPageHeroSlide[] {
  if (Array.isArray(hero.slides) && hero.slides.length > 0) return hero.slides;
  return [
    {
      id: "slide-legacy",
      enabled: true,
      promoType: "featured",
      badgeText: hero.badgeText,
      title: hero.title.replace("{highlight}", hero.highlightWord),
      highlightWord: hero.highlightWord,
      subtitle: hero.subtitle,
      ctaPrimary: hero.ctaPrimary,
      ctaSecondary: hero.ctaSecondary,
      backgroundImage: hero.backgroundImage,
      featured: hero.featured ?? null,
    },
  ];
}

/** Copies course details into a slide (keeps badge / button text the admin typed). */
export function applyCourseToSlide(slide: CoursesPageHeroSlide, opt: FeaturedCourseOption): CoursesPageHeroSlide {
  const next: CoursesPageHeroSlide = {
    ...slide,
    featured: { kind: opt.kind, slug: opt.slug },
    title: opt.title,
    highlightWord: "",
    subtitle: opt.subtitle,
    backgroundImage: opt.image || slide.backgroundImage,
    priceText: opt.priceText,
    oldPriceText: opt.oldPriceText,
    discountLabel: "",
  };
  if (opt.tutorName) {
    next.tutorName = opt.tutorName;
    next.tutorRole = opt.tutorRole;
    next.tutorPhoto = opt.tutorPhoto;
  }
  if (opt.startText && !slide.eventAt) next.eventAt = toDateTimeLocal(opt.startText);
  return next;
}

export type ResolvedHeroSlide = CoursesPageHeroSlide & {
  href: string;
  discountLabel: string;
};

export function resolveHeroSlides(
  hero: CoursesPageHero,
  options: FeaturedCourseOption[],
  fallbackHref: string,
): ResolvedHeroSlide[] {
  return heroSlidesFromConfig(hero)
    .filter((s) => s.enabled !== false)
    .map((s) => {
      const opt = findFeaturedOption(options, s.featured);
      return {
        ...s,
        backgroundImage: s.backgroundImage || opt?.image || "",
        href: opt?.href ?? fallbackHref,
        discountLabel: s.discountLabel?.trim() || discountLabelFromPrices(s.priceText, s.oldPriceText),
      };
    });
}
