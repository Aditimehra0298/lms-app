import { promises as fs } from "node:fs";
import path from "node:path";
import type { ManagedCourse } from "@/lib/content-schema";
import {
  CEH_SLUG,
  CEH_SLUG_ALT,
  applyCehCategory,
  cehDesignScore,
  pickDesignedCeh,
} from "@/lib/ceh-course";
import {
  getCourseContentRowFromMysql,
  syncCourseContentToMysql,
} from "@/lib/server/course-content-mysql-sync";
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

export async function loadCehSnapshot(): Promise<ManagedCourse | null> {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), "data", "ceh-live-course.json"), "utf8");
    const course = JSON.parse(raw) as ManagedCourse;
    if (!course || !Array.isArray(course.curriculum) || course.curriculum.length === 0) return null;
    return course;
  } catch {
    return null;
  }
}

/** Keep CEH visible and show the designed 85-module course, not the empty template. */
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
  const snapshot = await loadCehSnapshot();
  const current = idx >= 0 ? list[idx] : null;
  const picked = pickDesignedCeh(current, row?.course, {
    mysqlUpdatedAt: row?.updatedAt ?? null,
    jsonUpdatedAt: await jsonFileTime(),
    extra: snapshot,
  });
  if (!picked) return { courses: list, added: false };

  if (idx >= 0) {
    const prev = list[idx];
    const prevScore = cehDesignScore(prev);
    const nextScore = cehDesignScore(picked);
    const categoryFixed = prev.category !== "cyber-security";
    if (nextScore < prevScore) {
      const kept = applyCehCategory(prev);
      list[idx] = kept;
      return { courses: list, added: categoryFixed };
    }
    if (nextScore === prevScore) {
      const kept = applyCehCategory(prev);
      list[idx] = kept;
      return { courses: list, added: categoryFixed };
    }
    const next = applyCehCategory(picked, prev);
    list[idx] = next;
    try {
      await syncCourseContentToMysql(next);
    } catch (err) {
      console.error("[ensureCehCourse] restore MySQL", err);
    }
    return { courses: list, added: true };
  }

  const next = applyCehCategory(picked);
  try {
    await syncCourseContentToMysql(next);
  } catch (err) {
    console.error("[ensureCehCourse] add MySQL", err);
  }
  return { courses: [...list, next], added: true };
}
