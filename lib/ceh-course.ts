import type { ManagedCourse } from "@/lib/content-schema";

export const CEH_SLUG = "courses-certfied-ethical-hacking-and-penitration-testing";
export const CEH_SLUG_ALT = "certified-ethical-hacking-and-penetration-testing";

export function isCehSlug(slug: string | undefined | null): boolean {
  const key = String(slug ?? "").trim();
  return key === CEH_SLUG || key === CEH_SLUG_ALT;
}

/** Old leftover we accidentally kept injecting (Food Safety / 85 generic modules). */
export function isOldCehLeftover(course: ManagedCourse | null | undefined): boolean {
  if (!course) return false;
  const mods = course.curriculum?.length ?? 0;
  const subtitle = `${course.subtitle ?? ""} ${course.title ?? ""}`.toLowerCase();
  const first = course.curriculum?.[0]?.title?.toLowerCase() ?? "";
  return (
    mods === 85 &&
    (subtitle.includes("85 video lectures") || first.includes("introduction ethical hacking"))
  );
}

export function applyCehCategory(course: ManagedCourse): ManagedCourse {
  return {
    ...course,
    slug: course.slug?.trim() || CEH_SLUG,
    title: course.title?.trim() || "Certified Ethical Hacking and Penetration Testing",
    category: "cyber-security",
    published: true,
    learningFormat: course.learningFormat || "self-paced",
  };
}

function hasCurriculum(course: ManagedCourse | null | undefined): boolean {
  return Boolean(course && Array.isArray(course.curriculum) && course.curriculum.length > 0);
}

/**
 * The course designed in server Admin lives in admin-content.json.
 * Do not replace that curriculum with the older MySQL/snapshot copy.
 */
export function pickDesignedCeh(
  json: ManagedCourse | null | undefined,
  mysql: ManagedCourse | null | undefined,
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
