import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

try {
  const courses = await prisma.lmsCourse.findMany({
    orderBy: { createdAt: "desc" },
    include: { content: { select: { id: true, updatedAt: true } } },
  });
  console.log("=== lms_course (" + courses.length + " rows) ===");
  for (const c of courses) {
    console.log(
      JSON.stringify({
        id: c.courseIdentificationNumber,
        slug: c.slug,
        title: c.title,
        createdAt: c.createdAt.toISOString(),
        hasContent: !!c.content,
      })
    );
  }

  const jsonCourses = await prisma.$queryRaw`
    SELECT courseSlug, updatedAt FROM lms_course_content ORDER BY updatedAt DESC LIMIT 20
  `;
  console.log("\n=== lms_course_content ===");
  console.log(JSON.stringify(jsonCourses, null, 2));
} finally {
  await prisma.$disconnect();
}
