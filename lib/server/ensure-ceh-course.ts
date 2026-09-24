import type { ManagedCourse } from "@/lib/content-schema";
import {
  CEH_SLUG,
  CEH_SLUG_ALT,
  applyCehCategory,
  pickDesignedCeh,
} from "@/lib/ceh-course";
import { getCourseContentFromMysql } from "@/lib/server/course-content-mysql-sync";
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

/** Keep CEH visible. Never replace an existing server-designed curriculum. */
export async function ensureCehCourse(courses: ManagedCourse[]): Promise<{
  courses: ManagedCourse[];
  added: boolean;
}> {
  await clearDeletedCourseSlugs([CEH_SLUG, CEH_SLUG_ALT]);
  const list = Array.isArray(courses) ? [...courses] : [];
  const idx = list.findIndex((c) => c.slug?.trim() === CEH_SLUG || c.slug?.trim() === CEH_SLUG_ALT);
  if (idx >= 0) {
    const prev = list[idx];
    list[idx] = applyCehCategory(prev);
    return { courses: list, added: prev.category !== "cyber-security" };
  }
  const fromMysql =
    (await getCourseContentFromMysql(CEH_SLUG).catch(() => null)) ??
    (await getCourseContentFromMysql(CEH_SLUG_ALT).catch(() => null));
  const picked = pickDesignedCeh(null, fromMysql);
  if (!picked) return { courses: list, added: false };
  return { courses: [...list, picked], added: true };
}
