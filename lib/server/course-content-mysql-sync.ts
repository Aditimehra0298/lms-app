import type { ManagedCourse } from "@/lib/content-schema";
import { prisma } from "@/lib/prisma";
import { ensureCourseInMysql } from "@/lib/server/course-mysql-sync";

/** Upsert full course content (curriculum, hero, URLs) into MySQL. */
export async function syncCourseContentToMysql(
  course: ManagedCourse,
): Promise<{ slug: string; ok: boolean } | null> {
  const slug = course.slug?.trim();
  if (!slug) return null;

  const row = await ensureCourseInMysql(course);
  if (!row) return null;

  await prisma.lmsCourseContent.upsert({
    where: { courseSlug: slug },
    create: {
      courseId: row.id,
      courseSlug: slug,
      payload: course as object,
    },
    update: {
      courseId: row.id,
      payload: course as object,
    },
  });

  return { slug, ok: true };
}

/** Sync every managed course payload after admin saves content. */
export async function syncAllCourseContentToMysql(
  courses: ManagedCourse[],
): Promise<{ synced: number }> {
  let synced = 0;
  for (const c of courses) {
    const result = await syncCourseContentToMysql(c);
    if (result?.ok) synced += 1;
  }
  return { synced };
}

/** Load course content from MySQL (optional fallback / reporting). */
export async function getCourseContentFromMysql(
  slug: string,
): Promise<ManagedCourse | null> {
  const row = await prisma.lmsCourseContent.findUnique({
    where: { courseSlug: slug.trim() },
  });
  if (!row?.payload || typeof row.payload !== "object") return null;
  return row.payload as ManagedCourse;
}
