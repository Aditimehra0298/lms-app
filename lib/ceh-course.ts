import type { ManagedCourse } from "@/lib/content-schema";

export const CEH_SLUG = "courses-certfied-ethical-hacking-and-penitration-testing";
export const CEH_SLUG_ALT = "certified-ethical-hacking-and-penetration-testing";
export const CEH_TITLE = "Certified Ethical Hacking and Penetration Testing";

export function isCehSlug(slug: string | undefined | null): boolean {
  const key = String(slug ?? "").trim();
  return key === CEH_SLUG || key === CEH_SLUG_ALT;
}

function hasCurriculum(course: ManagedCourse | null | undefined): boolean {
  return Boolean(course && Array.isArray(course.curriculum) && course.curriculum.length > 0);
}

/** Keep Cyber Security. Do not replace landing or curriculum. */
export function applyCehCategory(course: ManagedCourse): ManagedCourse {
  const rawTitle = course.title?.trim() || CEH_TITLE;
  return {
    ...course,
    slug: course.slug?.trim() || CEH_SLUG,
    title: /certfied/i.test(rawTitle) ? CEH_TITLE : rawTitle,
    category: "cyber-security",
    published: true,
    learningFormat: course.learningFormat || "self-paced",
  };
}

export function isOldCehLeftover(_course: ManagedCourse | null | undefined): boolean {
  return false;
}

/**
 * This host only: use the catalog JSON saved here, or this host's MySQL if JSON has no modules.
 * Never mix in repo overlay / other-machine files.
 */
export function pickDesignedCeh(
  json: ManagedCourse | null | undefined,
  mysql: ManagedCourse | null | undefined,
  _opts?: {
    mysqlUpdatedAt?: Date | null;
    jsonUpdatedAt?: Date | null;
    extra?: ManagedCourse | null;
    overlay?: ManagedCourse | null;
  },
): ManagedCourse | null {
  if (hasCurriculum(json)) return applyCehCategory(json);
  if (hasCurriculum(mysql)) return applyCehCategory(mysql);
  if (json) return applyCehCategory(json);
  if (mysql) return applyCehCategory(mysql);
  return null;
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
