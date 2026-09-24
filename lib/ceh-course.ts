import type { ManagedCourse, ManagedCourseHeroSection } from "@/lib/content-schema";
import { curriculumRichnessScore } from "@/lib/curriculum-richness";

export const CEH_SLUG = "courses-certfied-ethical-hacking-and-penitration-testing";
export const CEH_SLUG_ALT = "certified-ethical-hacking-and-penetration-testing";
export const CEH_TITLE = "Certified Ethical Hacking and Penetration Testing";

export function isCehSlug(slug: string | undefined | null): boolean {
  const key = String(slug ?? "").trim();
  return key === CEH_SLUG || key === CEH_SLUG_ALT;
}

function mediaCount(course: ManagedCourse | null | undefined): number {
  const mods = course?.curriculum ?? [];
  let n = 0;
  for (const m of mods) {
    const rows = [
      ...(m.items ?? []),
      ...((m.subModules ?? []).flatMap((s) => s.items ?? [])),
    ];
    for (const item of rows) {
      if (item.videoUrl || item.examUploadUrl || item.pdfUrl || item.downloadUrl) n += 1;
    }
  }
  return n;
}

function nonemptyArray<T>(v: T[] | undefined | null): v is T[] {
  return Array.isArray(v) && v.length > 0;
}

function nonemptyString(v: string | undefined | null): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function pickFilled<T>(...vals: Array<T | null | undefined>): T | undefined {
  for (const v of vals) {
    if (v == null) continue;
    if (typeof v === "string" && !v.trim()) continue;
    if (Array.isArray(v) && v.length === 0) continue;
    return v;
  }
  return undefined;
}

/** How complete the public landing page is (hero, FAQs, overview — not curriculum). */
export function cehLandingScore(course: ManagedCourse | null | undefined): number {
  if (!course) return 0;
  let n = 0;
  if (nonemptyString(course.subtitle)) n += 8;
  if (nonemptyArray(course.highlights)) n += course.highlights.length * 6;
  if (nonemptyArray(course.faqs)) n += course.faqs.length * 8;
  if (nonemptyString(course.trainerBio)) n += 10;
  if (nonemptyString(course.instructorName)) n += 4;
  if (course.instructorSection?.introParagraphs?.length) n += 20;
  if (course.instructorSection?.sidebarInstructors?.length) n += 10;
  if (course.overviewSection?.learnOutcomes?.length) n += 20;
  if (course.overviewSection?.whatYouLearn?.length) n += 20;
  if (course.overviewSection?.requirements?.length) n += 8;
  if (nonemptyString(course.hero?.aboutText)) n += 40;
  if (nonemptyArray(course.hero?.courseIncludes)) n += 12;
  if (nonemptyString(course.hero?.previewImage)) n += 6;
  if (nonemptyString(course.hero?.certificatePreviewImage)) n += 6;
  if (nonemptyString(course.pageBadge)) n += 2;
  return n;
}

/**
 * Empty / generic CEH template (August 10-module landing).
 * The live designed course is 85 modules with Part titles and uploaded videos.
 */
export function isOldCehLeftover(course: ManagedCourse | null | undefined): boolean {
  if (!course) return true;
  const mods = course.curriculum ?? [];
  if (mods.length === 0) return true;
  const first = mods[0]?.title?.toLowerCase() ?? "";
  const second = mods[1]?.title?.toLowerCase() ?? "";
  if (first.includes("general instructions for candidate")) return true;
  if (second.includes("ethical hacking foundations")) return true;
  if (mods.length <= 15 && mediaCount(course) === 0) return true;
  return false;
}

export function cehDesignScore(course: ManagedCourse | null | undefined): number {
  if (!course) return 0;
  if (isOldCehLeftover(course)) return 1 + cehLandingScore(course);
  return curriculumRichnessScore(course.curriculum) + cehLandingScore(course);
}

function mergeHero(
  ...heroes: Array<ManagedCourseHeroSection | undefined | null>
): ManagedCourseHeroSection | undefined {
  const present = heroes.filter((h): h is ManagedCourseHeroSection => Boolean(h && typeof h === "object"));
  if (present.length === 0) return undefined;
  const keys = new Set(present.flatMap((h) => Object.keys(h) as Array<keyof ManagedCourseHeroSection>));
  const out: ManagedCourseHeroSection = {};
  for (const key of keys) {
    const val = pickFilled(...present.map((h) => h[key]));
    if (val !== undefined) {
      (out as Record<string, unknown>)[key] = val;
    }
  }
  return out;
}

export function applyCehLanding(
  course: ManagedCourse,
  ...sources: Array<ManagedCourse | null | undefined>
): ManagedCourse {
  const lands = [course, ...sources].filter((c): c is ManagedCourse => Boolean(c));
  lands.sort((a, b) => cehLandingScore(b) - cehLandingScore(a));
  const best = lands[0] ?? course;
  return {
    ...course,
    subtitle: pickFilled(...lands.map((c) => c.subtitle)) ?? course.subtitle,
    level: pickFilled(...lands.map((c) => c.level)) ?? best.level ?? "Intermediate",
    duration: pickFilled(...lands.map((c) => c.duration)) ?? course.duration,
    pageBadge: pickFilled(...lands.map((c) => c.pageBadge)) ?? "BESTSELLER",
    highlights: pickFilled(...lands.map((c) => c.highlights)) ?? course.highlights ?? [],
    faqs: pickFilled(...lands.map((c) => c.faqs)) ?? course.faqs ?? [],
    instructorName: pickFilled(...lands.map((c) => c.instructorName)) ?? course.instructorName,
    trainerRole: pickFilled(...lands.map((c) => c.trainerRole)) ?? course.trainerRole,
    trainerExperience: pickFilled(...lands.map((c) => c.trainerExperience)) ?? course.trainerExperience,
    trainerBio: pickFilled(...lands.map((c) => c.trainerBio)) ?? course.trainerBio,
    trainerCertifications:
      pickFilled(...lands.map((c) => c.trainerCertifications)) ?? course.trainerCertifications,
    trainerWorkedWith: pickFilled(...lands.map((c) => c.trainerWorkedWith)) ?? course.trainerWorkedWith,
    instructorSection: pickFilled(
      ...lands.map((c) =>
        c.instructorSection?.introParagraphs?.length || c.instructorSection?.sidebarInstructors?.length
          ? c.instructorSection
          : undefined,
      ),
    ) ?? course.instructorSection,
    overviewSection: pickFilled(
      ...lands.map((c) =>
        c.overviewSection?.learnOutcomes?.length || c.overviewSection?.whatYouLearn?.length
          ? c.overviewSection
          : undefined,
      ),
    ) ?? course.overviewSection,
    seo: pickFilled(...lands.map((c) => c.seo)) ?? course.seo,
    hero: mergeHero(...lands.map((c) => c.hero)),
    certificateConfig: pickFilled(...lands.map((c) => c.certificateConfig)) ?? course.certificateConfig,
    image: pickFilled(...lands.map((c) => c.image), course.hero?.previewImage, best.hero?.previewImage) ?? course.image,
  };
}

export function applyCehCategory(
  course: ManagedCourse,
  fallback?: ManagedCourse | null,
): ManagedCourse {
  const landed = applyCehLanding(course, fallback);
  const rawTitle = landed.title?.trim() || fallback?.title?.trim() || CEH_TITLE;
  const title = /certfied/i.test(rawTitle) ? CEH_TITLE : rawTitle;
  return {
    ...fallback,
    ...landed,
    slug: landed.slug?.trim() || fallback?.slug?.trim() || CEH_SLUG,
    title,
    category: "cyber-security",
    published: true,
    learningFormat: landed.learningFormat || fallback?.learningFormat || "self-paced",
    image: nonemptyString(landed.image) ? landed.image : fallback?.image?.trim() || "",
    hero: mergeHero(landed.hero, fallback?.hero),
    curriculum: nonemptyArray(course.curriculum) ? course.curriculum : fallback?.curriculum ?? landed.curriculum,
    highlights: nonemptyArray(landed.highlights) ? landed.highlights : fallback?.highlights,
    faqs: nonemptyArray(landed.faqs) ? landed.faqs : fallback?.faqs,
    subtitle: nonemptyString(landed.subtitle) ? landed.subtitle : fallback?.subtitle ?? landed.subtitle,
  };
}

function hasCurriculum(course: ManagedCourse | null | undefined): boolean {
  return Boolean(course && Array.isArray(course.curriculum) && course.curriculum.length > 0);
}

/** Prefer 85-module videos, then restore designed landing copy (never empty snapshot over filled page). */
export function pickDesignedCeh(
  json: ManagedCourse | null | undefined,
  mysql: ManagedCourse | null | undefined,
  opts?: {
    mysqlUpdatedAt?: Date | null;
    jsonUpdatedAt?: Date | null;
    extra?: ManagedCourse | null;
    overlay?: ManagedCourse | null;
  },
): ManagedCourse | null {
  const candidates: Array<{ course: ManagedCourse; at: number }> = [];
  if (json) candidates.push({ course: json, at: opts?.jsonUpdatedAt?.getTime() ?? 0 });
  if (mysql) candidates.push({ course: mysql, at: opts?.mysqlUpdatedAt?.getTime() ?? 0 });
  if (opts?.extra) candidates.push({ course: opts.extra, at: 0 });
  if (candidates.length === 0) {
    return opts?.overlay ? applyCehCategory(opts.overlay) : null;
  }

  let best = candidates[0];
  let bestScore = cehDesignScore(best.course);
  for (let i = 1; i < candidates.length; i += 1) {
    const row = candidates[i];
    const score = cehDesignScore(row.course);
    if (score > bestScore || (score === bestScore && row.at > best.at)) {
      best = row;
      bestScore = score;
    }
  }

  if (!hasCurriculum(best.course) && !hasCurriculum(json) && !hasCurriculum(mysql)) {
    const base = json ?? mysql ?? opts?.overlay;
    return base ? applyCehCategory(applyCehLanding(base, opts?.overlay, json, mysql), opts?.overlay) : null;
  }

  const merged = applyCehLanding(best.course, opts?.overlay, json, mysql, opts?.extra);
  return applyCehCategory(merged, json ?? mysql ?? opts?.overlay);
}

export function withoutCehDeletedSlugs(slugs: Iterable<string> | undefined): string[] {
  return [
    ...new Set(
      [...(slugs ?? [])]
        .map((s) => s.trim())
        .filter((s) => s && s !== CEH_SLUG && s !== CEH_SLUG_ALT),
    ),
  ];
}
