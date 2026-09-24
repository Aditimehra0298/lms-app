import type { ManagedCourse } from "@/lib/content-schema";
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

/**
 * Empty / generic CEH template (August 10-module landing).
 * The live designed course is 85 modules with Part titles and uploaded videos —
 * do NOT treat that as leftover.
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
  if (isOldCehLeftover(course)) return 1;
  return curriculumRichnessScore(course.curriculum);
}

export function applyCehCategory(
  course: ManagedCourse,
  fallback?: ManagedCourse | null,
): ManagedCourse {
  const rawTitle = course.title?.trim() || fallback?.title?.trim() || CEH_TITLE;
  const title = /certfied/i.test(rawTitle) ? CEH_TITLE : rawTitle;
  return {
    ...fallback,
    ...course,
    slug: course.slug?.trim() || fallback?.slug?.trim() || CEH_SLUG,
    title,
    category: "cyber-security",
    published: true,
    learningFormat: course.learningFormat || fallback?.learningFormat || "self-paced",
    image: course.image?.trim() || fallback?.image?.trim() || "",
    hero: course.hero ?? fallback?.hero,
    curriculum: course.curriculum ?? fallback?.curriculum,
  };
}

function hasCurriculum(course: ManagedCourse | null | undefined): boolean {
  return Boolean(course && Array.isArray(course.curriculum) && course.curriculum.length > 0);
}

/** Prefer the designed 85-module CEH (videos + Part titles), never the empty 10-module template. */
export function pickDesignedCeh(
  json: ManagedCourse | null | undefined,
  mysql: ManagedCourse | null | undefined,
  opts?: {
    mysqlUpdatedAt?: Date | null;
    jsonUpdatedAt?: Date | null;
    extra?: ManagedCourse | null;
  },
): ManagedCourse | null {
  const candidates: Array<{ course: ManagedCourse; at: number }> = [];
  if (json) candidates.push({ course: json, at: opts?.jsonUpdatedAt?.getTime() ?? 0 });
  if (mysql) candidates.push({ course: mysql, at: opts?.mysqlUpdatedAt?.getTime() ?? 0 });
  if (opts?.extra) candidates.push({ course: opts.extra, at: 0 });
  if (candidates.length === 0) return null;

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

  const withImage = candidates.find((c) => c.course.image?.trim())?.course;
  if (!hasCurriculum(best.course) && !hasCurriculum(json) && !hasCurriculum(mysql)) {
    return json ? applyCehCategory(json, mysql) : mysql ? applyCehCategory(mysql, json) : null;
  }
  return applyCehCategory(best.course, withImage && withImage !== best.course ? withImage : json ?? mysql);
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
