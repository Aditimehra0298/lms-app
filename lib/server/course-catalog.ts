import type { ManagedCourse } from "@/lib/content-schema";
import { canonicalCourseSlug } from "@/lib/course-slug-aliases";
import { curriculumModulesForLearner } from "@/lib/curriculum-learner-filter";
import { mergeCoursePreferringRicherCurriculum } from "@/lib/curriculum-richness";
import { getCourseContentFromMysql } from "@/lib/server/course-content-mysql-sync";
import { readAdminContent } from "@/lib/server/content-store";
import { pickUniqueCourseCover, isGenericCoursePlaceholder } from "@/lib/course-thumbnail";

export async function getManagedCourses() {
  const content = await readAdminContent();
  const courses = content.managedCourses ?? [];
  const published = courses.filter(
    (course) => course.published && course.settings?.showInCatalog !== false,
  );
  return Promise.all(
    published.map(async (course) => {
      const fromMysql = await getCourseContentFromMysql(course.slug).catch(() => null);
      const merged = mergeCoursePreferringRicherCurriculum(course, fromMysql);
      const uniqueImage = pickUniqueCourseCover(
        course.image,
        fromMysql?.image,
        merged.image,
        course.hero?.previewImage,
        fromMysql?.hero?.previewImage,
        course.hero?.backgroundImage,
      );
      return {
        ...merged,
        image: uniqueImage || (!isGenericCoursePlaceholder(merged.image) ? merged.image : "") || "",
        price: course.price?.trim() || fromMysql?.price?.trim() || merged.price || "",
        oldPrice: course.oldPrice?.trim() || fromMysql?.oldPrice?.trim() || merged.oldPrice || "",
        regionalPrices:
          (course.regionalPrices?.length ?? 0) > 0
            ? course.regionalPrices
            : fromMysql?.regionalPrices ?? merged.regionalPrices,
        hero: uniqueImage
          ? {
              ...(merged.hero ?? {}),
              previewImage: uniqueImage,
              backgroundImage: uniqueImage,
            }
          : merged.hero,
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
  const all = content.managedCourses ?? [];

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
