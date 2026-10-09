import type {
  CoursesPageFeaturedRef,
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
};

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
