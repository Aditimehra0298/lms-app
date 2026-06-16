import { defaultAdminContent, type ManagedCourse } from "@/lib/content-schema";
import { canonicalCourseSlug } from "@/lib/course-slug-aliases";
import { curriculumModulesForLearner } from "@/lib/curriculum-learner-filter";
import { getCourseContentFromMysql } from "@/lib/server/course-content-mysql-sync";
import { readAdminContent } from "@/lib/server/content-store";

export async function getManagedCourses() {
  const content = await readAdminContent();
  const courses =
    content.managedCourses && content.managedCourses.length > 0
      ? content.managedCourses
      : defaultAdminContent.managedCourses;
  return courses
    .filter(
      (course) => course.published && course.settings?.showInCatalog !== false,
    )
    .map((course) => ({
      ...course,
      curriculum: curriculumModulesForLearner(course.curriculum),
    }));
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

/** Learner player / exams — includes unpublished rows and MySQL backup. */
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

  const fromJson = all.find((course) => matchSlug(course, key, decoded));
  if (fromJson) {
    return {
      ...fromJson,
      curriculum: curriculumModulesForLearner(fromJson.curriculum),
    };
  }

  const fromMysql = await getCourseContentFromMysql(key);
  if (fromMysql) {
    return {
      ...fromMysql,
      curriculum: curriculumModulesForLearner(fromMysql.curriculum),
    };
  }
  const fromMysqlDecoded = await getCourseContentFromMysql(decoded);
  if (fromMysqlDecoded) {
    return {
      ...fromMysqlDecoded,
      curriculum: curriculumModulesForLearner(fromMysqlDecoded.curriculum),
    };
  }
  return null;
}
