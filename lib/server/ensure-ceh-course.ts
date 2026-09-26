import type { ManagedCourse } from "@/lib/content-schema";
import { CEH_SLUG, CEH_SLUG_ALT, applyCehCategory } from "@/lib/ceh-course";
import { getCourseContentRowFromMysql } from "@/lib/server/course-content-mysql-sync";
import { clearDeletedCourseSlugs } from "@/lib/server/deleted-course-tombstones";

export {
  CEH_SLUG,
  CEH_SLUG_ALT,
  applyCehCategory,
  isCehSlug,
  isOldCehLeftover,
  pickDesignedCeh,
  withoutCehDeletedSlugs,
} from "@/lib/ceh-course";

/**
 * Keep CEH listed under Cyber Security.
 * Do not load repo overlays or localhost snapshots. Do not rewrite landing/curriculum.
 */
export async function ensureCehCourse(courses: ManagedCourse[]): Promise<{
  courses: ManagedCourse[];
  added: boolean;
}> {
  await clearDeletedCourseSlugs([CEH_SLUG, CEH_SLUG_ALT]);
  const list = Array.isArray(courses) ? [...courses] : [];
  const idx = list.findIndex((c) => c.slug?.trim() === CEH_SLUG || c.slug?.trim() === CEH_SLUG_ALT);
  if (idx >= 0) {
    const prev = list[idx];
    if (prev.category === "cyber-security" && prev.published !== false) {
      return { courses: list, added: false };
    }
    list[idx] = applyCehCategory(prev);
    return { courses: list, added: prev.category !== "cyber-security" };
  }

  const row =
    (await getCourseContentRowFromMysql(CEH_SLUG).catch(() => null)) ??
    (await getCourseContentRowFromMysql(CEH_SLUG_ALT).catch(() => null));
  if (!row?.course) return { courses: list, added: false };
  return { courses: [...list, applyCehCategory(row.course)], added: true };
}
