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

/** Prefer the redesigned course over the old 85-module leftover. */
export function pickDesignedCeh(
  json: ManagedCourse | null | undefined,
  mysql: ManagedCourse | null | undefined,
): ManagedCourse | null {
  const jsonOld = isOldCehLeftover(json);
  const mysqlOld = isOldCehLeftover(mysql);
  if (mysql && !mysqlOld) return applyCehCategory(mysql);
  if (json && !jsonOld) return applyCehCategory(json);
  if (mysql) return applyCehCategory(mysql);
  if (json) return applyCehCategory(json);
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
