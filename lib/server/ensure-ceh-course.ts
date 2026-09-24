import { promises as fs } from "node:fs";
import path from "node:path";
import type { ManagedCourse } from "@/lib/content-schema";
import {
  CEH_SLUG,
  CEH_SLUG_ALT,
  applyCehCategory,
  pickDesignedCeh,
} from "@/lib/ceh-course";
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

async function jsonFileTime(): Promise<Date | null> {
  try {
    const st = await fs.stat(path.join(process.cwd(), "data", "admin-content.json"));
    return st.mtime;
  } catch {
    return null;
  }
}

/** Keep CEH visible and show whichever copy was saved last. */
export async function ensureCehCourse(courses: ManagedCourse[]): Promise<{
  courses: ManagedCourse[];
  added: boolean;
}> {
  await clearDeletedCourseSlugs([CEH_SLUG, CEH_SLUG_ALT]);
  const list = Array.isArray(courses) ? [...courses] : [];
  const idx = list.findIndex((c) => c.slug?.trim() === CEH_SLUG || c.slug?.trim() === CEH_SLUG_ALT);
  const row =
    (await getCourseContentRowFromMysql(CEH_SLUG).catch(() => null)) ??
    (await getCourseContentRowFromMysql(CEH_SLUG_ALT).catch(() => null));
  const picked = pickDesignedCeh(idx >= 0 ? list[idx] : null, row?.course, {
    mysqlUpdatedAt: row?.updatedAt ?? null,
    jsonUpdatedAt: await jsonFileTime(),
  });
  if (!picked) return { courses: list, added: false };
  if (idx >= 0) {
    const prev = list[idx];
    list[idx] = applyCehCategory(picked);
    return { courses: list, added: prev.category !== "cyber-security" || prev !== list[idx] };
  }
  return { courses: [...list, applyCehCategory(picked)], added: true };
}
