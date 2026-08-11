import type { ManagedCourse } from "@/lib/content-schema";
import { prisma } from "@/lib/prisma";
import { ensureCourseInMysql } from "@/lib/server/course-mysql-sync";

/** Allow large curriculum JSON (many modules + video URLs) in one upsert. */
async function ensureLargeMysqlPacket(): Promise<void> {
  try {
    await prisma.$executeRawUnsafe("SET SESSION max_allowed_packet = 67108864"); // 64 MB
  } catch {
    // Host may not allow SESSION max_allowed_packet — continue with server default.
  }
}

/** Upsert full course content (curriculum, hero, URLs) into MySQL. */
export async function syncCourseContentToMysql(
  course: ManagedCourse,
): Promise<{ slug: string; ok: boolean } | null> {
  const slug = course.slug?.trim();
  if (!slug) return null;

  const row = await ensureCourseInMysql(course);
  if (!row) return null;

  await ensureLargeMysqlPacket();

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
  await ensureLargeMysqlPacket();
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

function stubManagedCourseFromMysqlRow(row: {
  slug: string;
  title: string;
  subtitle: string | null;
  category: string | null;
  level: string | null;
  published: boolean;
  learningFormat: string | null;
}): ManagedCourse {
  const format = row.learningFormat?.trim().toLowerCase();
  return {
    slug: row.slug.trim(),
    title: row.title.trim() || row.slug,
    subtitle: row.subtitle?.trim() || "",
    category: row.category?.trim() || "",
    level: row.level?.trim() || "Beginner",
    duration: "3h 00m",
    rating: "4.6",
    learners: "0",
    price: "$49.00",
    oldPrice: "$79.00",
    image: "",
    published: row.published !== false,
    learningFormat:
      format === "interactive" || format === "live" ? format : "self-paced",
  };
}

/**
 * Courses saved in admin are written to MySQL. A later `git reset` can replace
 * `data/admin-content.json` with GitHub's older copy, so the learner dashboard
 * still works (MySQL) while Admin → Self-paced catalog hides the course.
 * Re-attach any MySQL rows missing from JSON.
 */
export async function hydrateManagedCoursesFromMysql(
  courses: ManagedCourse[],
): Promise<{ courses: ManagedCourse[]; addedSlugs: string[] }> {
  const list = Array.isArray(courses) ? [...courses] : [];
  const have = new Set(list.map((c) => c.slug?.trim()).filter(Boolean));
  const addedSlugs: string[] = [];

  try {
    const rows = await prisma.lmsCourse.findMany({
      include: { content: true },
      orderBy: { updatedAt: "desc" },
    });
    for (const row of rows) {
      const slug = row.slug?.trim();
      if (!slug || have.has(slug)) continue;
      const payload =
        row.content?.payload && typeof row.content.payload === "object"
          ? (row.content.payload as ManagedCourse)
          : null;
      const next: ManagedCourse = payload
        ? {
            ...stubManagedCourseFromMysqlRow(row),
            ...payload,
            slug,
            title: payload.title?.trim() || row.title,
          }
        : stubManagedCourseFromMysqlRow(row);
      list.push(next);
      have.add(slug);
      addedSlugs.push(slug);
    }
  } catch (err) {
    console.error("[hydrateManagedCoursesFromMysql]", err);
  }

  return { courses: list, addedSlugs };
}
