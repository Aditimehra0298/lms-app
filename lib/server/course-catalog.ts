import { defaultAdminContent, type ManagedCourse } from "@/lib/content-schema";
import { canonicalCourseSlug } from "@/lib/course-slug-aliases";
import { curriculumModulesForLearner } from "@/lib/curriculum-learner-filter";
import { mergeCoursePreferringRicherCurriculum } from "@/lib/curriculum-richness";
import { getCourseContentFromMysql } from "@/lib/server/course-content-mysql-sync";
import { readAdminContent } from "@/lib/server/content-store";

export async function getManagedCourses() {
  const content = await readAdminContent();
  const courses =
    content.managedCourses && content.managedCourses.length > 0
      ? content.managedCourses
      : defaultAdminContent.managedCourses;
  const published = courses.filter(
    (course) => course.published && course.settings?.showInCatalog !== false,
  );
  return Promise.all(
    published.map(async (course) => {
      const fromMysql = await getCourseContentFromMysql(course.slug).catch(() => null);
      const merged = mergeCoursePreferringRicherCurriculum(course, fromMysql);
      return {
        ...merged,
        curriculum: curriculumModulesForLearner(merged.curriculum),
      };
    }),
  );
}

function matchSlug(course: ManagedCourse, key: string, decoded: string): boolean {
  return course.slug === key || course.slug === decoded;
}

/** Catalog listing — published only. */
export async function getManagedCourseBySlug(slug: string) {
  const courses = await getManagedCourses();
  const key = slug.trim();
  let decoded = key;
  try {
    decoded = decodeURIComponent(key);
  } catch {
    /* use raw */
  }
  return courses.find((course) => matchSlug(course, key, decoded)) ?? null;
}

/**
 * Learner player / exams — includes unpublished rows.
 * If MySQL still has a richer curriculum than JSON (after an accidental wipe), prefer MySQL.
 */
export async function getManagedCourseForLearner(slug: string): Promise<ManagedCourse | null> {
  const key = canonicalCourseSlug(slug.trim());
  let decoded = key;
  try {
    decoded = decodeURIComponent(key);
  } catch {
    /* use raw */
  }

  const content = await readAdminContent();
  const all =
    content.managedCourses && content.managedCourses.length > 0
      ? content.managedCourses
      : defaultAdminContent.managedCourses;

  const fromJson = all.find((course) => matchSlug(course, key, decoded)) ?? null;
  const fromMysql =
    (await getCourseContentFromMysql(key)) ??
    (decoded !== key ? await getCourseContentFromMysql(decoded) : null);

  const merged = fromJson
    ? mergeCoursePreferringRicherCurriculum(fromJson, fromMysql)
    : fromMysql;

  if (!merged) return null;

  return {
    ...merged,
    curriculum: curriculumModulesForLearner(merged.curriculum),
  };
}
