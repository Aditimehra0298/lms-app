import { readFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { PrismaClient } from "@prisma/client";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const prisma = new PrismaClient();

const COURSE_ID_START = 101;

function formatCourseCode(n) {
  return String(n).padStart(3, "0");
}

async function ensureCourseInMysql(course) {
  const slug = course.slug?.trim();
  const title = course.title?.trim();
  if (!slug || !title) return null;

  const existing = await prisma.lmsCourse.findUnique({ where: { slug } });
  if (existing) {
    return prisma.lmsCourse.update({
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
  }

  const agg = await prisma.lmsCourse.aggregate({
    _max: { courseIdentificationNumber: true },
  });
  const next = Math.max(
    COURSE_ID_START,
    (agg._max.courseIdentificationNumber ?? COURSE_ID_START - 1) + 1,
  );

  return prisma.lmsCourse.create({
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
}

async function syncCourseContentToMysql(course) {
  const slug = course.slug?.trim();
  if (!slug) return false;
  const row = await ensureCourseInMysql(course);
  if (!row) return false;

  await prisma.lmsCourseContent.upsert({
    where: { courseSlug: slug },
    create: {
      courseId: row.id,
      courseSlug: slug,
      payload: course,
    },
    update: {
      courseId: row.id,
      payload: course,
    },
  });
  return true;
}

const raw = await readFile(path.join(root, "data", "admin-content.json"), "utf8");
const content = JSON.parse(raw);
const courses = content.managedCourses ?? [];

let synced = 0;
for (const c of courses) {
  if (await syncCourseContentToMysql(c)) synced++;
}

const rows = await prisma.lmsCourse.findMany({
  orderBy: { createdAt: "desc" },
  include: { content: { select: { courseSlug: true } } },
});

console.log(`Synced ${synced} courses from admin-content.json`);
console.log(`MySQL now has ${rows.length} courses, ${rows.filter((r) => r.content).length} with full content`);
for (const r of rows) {
  console.log(
    `  ${formatCourseCode(r.courseIdentificationNumber)} | ${r.slug} | content: ${r.content ? "yes" : "no"} | created: ${r.createdAt.toISOString().slice(0, 10)}`,
  );
}

await prisma.$disconnect();
