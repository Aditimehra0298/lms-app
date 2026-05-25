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

/** Upsert one course row; assign courseIdentificationNumber from 101 on first insert. */
export async function ensureCourseInMysql(course: Pick<
  ManagedCourse,
  "slug" | "title" | "subtitle" | "category" | "level" | "published" | "learningFormat"
>): Promise<CourseMysqlRecord | null> {
  const slug = course.slug?.trim();
  const title = course.title?.trim();
  if (!slug || !title) return null;

  const existing = await prisma.lmsCourse.findUnique({ where: { slug } });
  if (existing) {
    const updated = await prisma.lmsCourse.update({
      where: { slug },
      data: {
        title,
        subtitle: course.subtitle?.trim() || null,
        category: course.category?.trim() || null,
        level: course.level?.trim() || null,
        published: course.published !== false,
        learningFormat: course.learningFormat?.trim() || "self-paced",
      },
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
      title,
      subtitle: course.subtitle?.trim() || null,
      category: course.category?.trim() || null,
      level: course.level?.trim() || null,
      published: course.published !== false,
      learningFormat: course.learningFormat?.trim() || "self-paced",
    },
  });
  return toRecord(created);
}

/** Sync all managed courses from admin JSON into MySQL (on admin save). */
export async function syncManagedCoursesToMysql(
  courses: ManagedCourse[],
): Promise<{ synced: number; records: CourseMysqlRecord[] }> {
  const records: CourseMysqlRecord[] = [];
  for (const c of courses) {
    const row = await ensureCourseInMysql(c);
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
