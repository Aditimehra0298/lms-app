import type { ManagedCourse } from "@/lib/content-schema";
import { canonicalCourseSlug } from "@/lib/course-slug-aliases";
import { curriculumModulesForLearner } from "@/lib/curriculum-learner-filter";
import { mergeCoursePreferringRicherCurriculum } from "@/lib/curriculum-richness";
import {
  enrichExistingCoursesFromMysql,
  getCourseContentFromMysql,
  hydrateManagedCoursesFromMysql,
} from "@/lib/server/course-content-mysql-sync";
import { readAdminContent } from "@/lib/server/content-store";
import { dropCoursesRemovedFromMysql } from "@/lib/server/course-mysql-sync";
import { listDeletedCourseSlugs } from "@/lib/server/deleted-course-tombstones";
import { ensureCehCourse } from "@/lib/server/ensure-ceh-course";
import { pickUniqueCourseCover, isGenericCoursePlaceholder } from "@/lib/course-thumbnail";
import { ensureCourseRegionalPricing } from "@/lib/standard-course-pricing";

function pickRegionalPrices(
  jsonRows: ManagedCourse["regionalPrices"],
  mysqlRows: ManagedCourse["regionalPrices"],
  mergedRows: ManagedCourse["regionalPrices"],
): ManagedCourse["regionalPrices"] {
  const jsonLen = jsonRows?.length ?? 0;
  const mysqlLen = mysqlRows?.length ?? 0;
  // Prefer the richer country-price set (DB often has the designed sheet).
  if (mysqlLen > jsonLen) return mysqlRows;
  if (jsonLen > 0) return jsonRows;
  if (mysqlLen > 0) return mysqlRows;
  return mergedRows;
}

export async function getManagedCourses() {
  const content = await readAdminContent();
  const deletedSlugs = await listDeletedCourseSlugs(content.deletedCourseSlugs);
  const deletedSet = new Set(deletedSlugs);
  const reconciled = await dropCoursesRemovedFromMysql(
    (content.managedCourses ?? []).filter((c) => !deletedSet.has(c.slug?.trim() ?? "")),
  );
  const { courses: hydrated } = await hydrateManagedCoursesFromMysql(reconciled.courses, {
    excludeSlugs: [...deletedSlugs, ...reconciled.droppedSlugs],
  });
  const enriched = await enrichExistingCoursesFromMysql(hydrated);
  const { courses } = await ensureCehCourse(enriched.courses);
  const published = courses.filter(
    (course) => course.published && course.settings?.showInCatalog !== false,
  );
  return Promise.all(
    published.map(async (course) => {
      const fromMysql = await getCourseContentFromMysql(course.slug).catch(() => null);
      const merged =
        course.slug?.trim() === "courses-certfied-ethical-hacking-and-penitration-testing" && fromMysql
          ? { ...fromMysql, slug: course.slug, category: "cyber-security", published: true }
          : mergeCoursePreferringRicherCurriculum(course, fromMysql);
      const uniqueImage = pickUniqueCourseCover(
        course.image,
        fromMysql?.image,
        merged.image,
        course.hero?.previewImage,
        fromMysql?.hero?.previewImage,
        course.hero?.backgroundImage,
      );
      const priced = ensureCourseRegionalPricing({
        ...merged,
        image: uniqueImage || (!isGenericCoursePlaceholder(merged.image) ? merged.image : "") || "",
        price:
          fromMysql?.price?.trim() ||
          course.price?.trim() ||
          merged.price ||
          "",
        oldPrice:
          fromMysql?.oldPrice?.trim() ||
          course.oldPrice?.trim() ||
          merged.oldPrice ||
          "",
        basePrice:
          fromMysql?.basePrice?.trim() ||
          course.basePrice?.trim() ||
          merged.basePrice ||
          "",
        regionalPrices: pickRegionalPrices(
          course.regionalPrices,
          fromMysql?.regionalPrices,
          merged.regionalPrices,
        ),
        hero: uniqueImage
          ? {
              ...(merged.hero ?? {}),
              previewImage: uniqueImage,
              backgroundImage: uniqueImage,
            }
          : merged.hero,
        curriculum: curriculumModulesForLearner(merged.curriculum),
      });
      return priced;
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
  const deletedSlugs = await listDeletedCourseSlugs(content.deletedCourseSlugs);
  if (deletedSlugs.includes(key) || (decoded !== key && deletedSlugs.includes(decoded))) {
    return null;
  }
  const { courses: all } = await ensureCehCourse(content.managedCourses ?? []);

  const fromJson = all.find((course) => matchSlug(course, key, decoded)) ?? null;
  const fromMysql =
    (await getCourseContentFromMysql(key)) ??
    (decoded !== key ? await getCourseContentFromMysql(decoded) : null);

  const isCeh =
    key === "courses-certfied-ethical-hacking-and-penitration-testing" ||
    decoded === "courses-certfied-ethical-hacking-and-penitration-testing";
  const merged =
    isCeh && fromMysql
      ? { ...fromMysql, slug: fromMysql.slug || key, category: "cyber-security", published: true }
      : fromJson
        ? mergeCoursePreferringRicherCurriculum(fromJson, fromMysql)
        : fromMysql;

  if (!merged) return null;

  return ensureCourseRegionalPricing({
    ...merged,
    price: fromMysql?.price?.trim() || merged.price || "",
    oldPrice: fromMysql?.oldPrice?.trim() || merged.oldPrice || "",
    basePrice: fromMysql?.basePrice?.trim() || merged.basePrice || "",
    regionalPrices: pickRegionalPrices(
      fromJson?.regionalPrices,
      fromMysql?.regionalPrices,
      merged.regionalPrices,
    ),
    curriculum: curriculumModulesForLearner(merged.curriculum),
  });
}
