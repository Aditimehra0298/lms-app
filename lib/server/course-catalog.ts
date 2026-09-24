import type { ManagedCourse } from "@/lib/content-schema";
import { isCehSlug, pickDesignedCeh } from "@/lib/ceh-course";
import { canonicalCourseSlug } from "@/lib/course-slug-aliases";
import { curriculumModulesForLearner } from "@/lib/curriculum-learner-filter";
import { mergeCoursePreferringRicherCurriculum } from "@/lib/curriculum-richness";
import {
  enrichExistingCoursesFromMysql,
  getCourseContentFromMysql,
  getCourseContentRowFromMysql,
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
      const mysqlRow = isCehSlug(course.slug)
        ? await getCourseContentRowFromMysql(course.slug).catch(() => null)
        : null;
      const fromMysql = mysqlRow?.course ?? (await getCourseContentFromMysql(course.slug).catch(() => null));
      const merged = isCehSlug(course.slug)
        ? pickDesignedCeh(course, fromMysql, { mysqlUpdatedAt: mysqlRow?.updatedAt ?? null }) ?? course
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
  const mysqlRow =
    (await getCourseContentRowFromMysql(key).catch(() => null)) ??
    (decoded !== key ? await getCourseContentRowFromMysql(decoded).catch(() => null) : null);
  const fromMysql =
    mysqlRow?.course ??
    (await getCourseContentFromMysql(key)) ??
    (decoded !== key ? await getCourseContentFromMysql(decoded) : null);

  const merged = isCehSlug(key) || isCehSlug(decoded)
    ? pickDesignedCeh(fromJson, fromMysql, { mysqlUpdatedAt: mysqlRow?.updatedAt ?? null })
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
