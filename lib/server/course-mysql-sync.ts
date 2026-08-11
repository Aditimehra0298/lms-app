import type { ManagedCourse } from "@/lib/content-schema";
import { COURSE_ID_START, formatCourseCode } from "@/lib/course-ids";
import { prisma } from "@/lib/prisma";

export type CourseMysqlRecord = {
  id: string;
  courseIdentificationNumber: number;
  courseCode: string;
  slug: string;
  title: string;
  subtitle: string | null;
  category: string | null;
  level: string | null;
  published: boolean;
  learningFormat: string | null;
};

function toRecord(row: {
  id: string;
  courseIdentificationNumber: number;
  slug: string;
  title: string;
  subtitle: string | null;
  category: string | null;
  level: string | null;
  published: boolean;
  learningFormat: string | null;
}): CourseMysqlRecord {
  return {
    id: row.id,
    courseIdentificationNumber: row.courseIdentificationNumber,
    courseCode: formatCourseCode(row.courseIdentificationNumber),
    slug: row.slug,
    title: row.title,
    subtitle: row.subtitle,
    category: row.category,
    level: row.level,
    published: row.published,
    learningFormat: row.learningFormat,
  };
}

type CourseMysqlFields = Pick<
  ManagedCourse,
  "slug" | "title" | "subtitle" | "category" | "level" | "published" | "learningFormat"
>;

function courseFieldData(course: CourseMysqlFields) {
  return {
    title: course.title?.trim() || "",
    subtitle: course.subtitle?.trim() || null,
    category: course.category?.trim() || null,
    level: course.level?.trim() || null,
    published: course.published !== false,
    learningFormat: course.learningFormat?.trim() || "self-paced",
  };
}

/**
 * When admin renames a course slug, update the MySQL row + related slug columns
 * instead of leaving an orphan old row and creating a duplicate.
 */
export async function renameCourseSlugInMysql(
  fromSlug: string,
  toSlug: string,
): Promise<CourseMysqlRecord | null> {
  const from = fromSlug.trim();
  const to = toSlug.trim();
  if (!from || !to || from === to) return null;

  const existing = await prisma.lmsCourse.findUnique({ where: { slug: from } });
  if (!existing) return null;

  const clash = await prisma.lmsCourse.findUnique({ where: { slug: to } });
  if (clash && clash.id !== existing.id) {
    throw new Error(`MySQL already has a course with slug “${to}”.`);
  }

  const updated = await prisma.$transaction(async (tx) => {
    const row = await tx.lmsCourse.update({
      where: { id: existing.id },
      data: { slug: to },
    });

    const content = await tx.lmsCourseContent.findUnique({ where: { courseId: existing.id } });
    if (content) {
      const payload =
        content.payload && typeof content.payload === "object"
          ? { ...(content.payload as Record<string, unknown>), slug: to }
          : content.payload;
      await tx.lmsCourseContent.update({
        where: { id: content.id },
        data: { courseSlug: to, payload: payload as object },
      });
    }

    await tx.lmsPurchase.updateMany({ where: { courseSlug: from }, data: { courseSlug: to } });
    await tx.lmsCertificate.updateMany({ where: { courseSlug: from }, data: { courseSlug: to } });
    await tx.lmsMediaAsset.updateMany({ where: { courseSlug: from }, data: { courseSlug: to } });

    return row;
  });

  return toRecord(updated);
}

/** Upsert one course row; assign courseIdentificationNumber from 101 on first insert. */
export async function ensureCourseInMysql(
  course: CourseMysqlFields,
  previousSlug?: string,
): Promise<CourseMysqlRecord | null> {
  const slug = course.slug?.trim();
  const title = course.title?.trim();
  if (!slug || !title) return null;

  const prev = previousSlug?.trim();
  if (prev && prev !== slug) {
    try {
      const renamed = await renameCourseSlugInMysql(prev, slug);
      if (renamed) {
        const updated = await prisma.lmsCourse.update({
          where: { slug },
          data: courseFieldData(course),
        });
        return toRecord(updated);
      }
    } catch (err) {
      console.error("[course-mysql-sync] renameCourseSlugInMysql", err);
    }
  }

  const existing = await prisma.lmsCourse.findUnique({ where: { slug } });
  if (existing) {
    const updated = await prisma.lmsCourse.update({
      where: { slug },
      data: courseFieldData(course),
    });
    return toRecord(updated);
  }

  const agg = await prisma.lmsCourse.aggregate({ _max: { courseIdentificationNumber: true } });
  const next = Math.max(
    COURSE_ID_START,
    (agg._max.courseIdentificationNumber ?? COURSE_ID_START - 1) + 1,
  );

  const created = await prisma.lmsCourse.create({
    data: {
      courseIdentificationNumber: next,
      slug,
      ...courseFieldData(course),
    },
  });
  return toRecord(created);
}

/** Sync all managed courses from admin JSON into MySQL (on admin save). */
export async function syncManagedCoursesToMysql(
  courses: ManagedCourse[],
  options?: { renames?: Array<{ from: string; to: string }> },
): Promise<{ synced: number; records: CourseMysqlRecord[] }> {
  const renameToPrevious = new Map(
    (options?.renames ?? [])
      .filter((r) => r.from.trim() && r.to.trim() && r.from.trim() !== r.to.trim())
      .map((r) => [r.to.trim(), r.from.trim()] as const),
  );
  const records: CourseMysqlRecord[] = [];
  for (const c of courses) {
    const row = await ensureCourseInMysql(c, renameToPrevious.get(c.slug?.trim() ?? ""));
    if (row) records.push(row);
  }
  return { synced: records.length, records };
}

export async function getCourseBySlug(slug: string): Promise<CourseMysqlRecord | null> {
  const row = await prisma.lmsCourse.findUnique({ where: { slug: slug.trim() } });
  return row ? toRecord(row) : null;
}

export async function getCourseByIdentificationNumber(
  num: number,
): Promise<CourseMysqlRecord | null> {
  const row = await prisma.lmsCourse.findUnique({
    where: { courseIdentificationNumber: num },
  });
  return row ? toRecord(row) : null;
}

export async function listCoursesInMysql(): Promise<CourseMysqlRecord[]> {
  const rows = await prisma.lmsCourse.findMany({
    orderBy: { courseIdentificationNumber: "asc" },
  });
  return rows.map(toRecord);
}

/** Remove catalog courses from MySQL so admin delete is not undone by JSON hydrate. */
export async function deleteCoursesFromMysql(slugs: string[]): Promise<{ deleted: number }> {
  const unique = [...new Set(slugs.map((s) => s.trim()).filter(Boolean))];
  if (unique.length === 0) return { deleted: 0 };
  let deleted = 0;
  for (const slug of unique) {
    try {
      const course = await prisma.lmsCourse.findUnique({ where: { slug } });
      await prisma.lmsCourseContent.deleteMany({
        where: course
          ? { OR: [{ courseSlug: slug }, { courseId: course.id }] }
          : { courseSlug: slug },
      });
      const result = await prisma.lmsCourse.deleteMany({ where: { slug } });
      deleted += result.count;
    } catch (err) {
      console.error("[course-mysql-sync] deleteCoursesFromMysql", slug, err);
    }
  }
  return { deleted };
}
