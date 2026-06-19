/**
 * Enroll a learner in a course (MySQL) so it appears on My Learning dashboard.
 *
 * Usage:
 *   node --env-file=.env.local scripts/enroll-learner-course.mjs [email] [courseSlug]
 *
 * Example:
 *   node --env-file=.env.local scripts/enroll-learner-course.mjs aditimehra0298@gmail.com cyber-security-phishing-awareness-training
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const learnerEmail = (process.argv[2] || "aditimehra0298@gmail.com").trim().toLowerCase();
const courseSlug = (process.argv[3] || "cyber-security-phishing-awareness-training")
  .trim()
  .toLowerCase();

async function main() {
  if (!learnerEmail.includes("@")) {
    throw new Error("Valid learner email required.");
  }
  if (!courseSlug) {
    throw new Error("Course slug required.");
  }

  let user = await prisma.lmsUser.findUnique({
    where: { email: learnerEmail },
    select: { id: true, name: true },
  });

  if (!user) {
    const displayName =
      learnerEmail.split("@")[0]?.replace(/[._-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) ||
      "Learner";
    user = await prisma.lmsUser.create({
      data: {
        email: learnerEmail,
        name: displayName,
        role: "learner",
        accountType: "individual",
        emailVerifiedAt: new Date(),
      },
      select: { id: true, name: true },
    });
    console.log(`[user] Created account for ${learnerEmail}`);
  }

  const dbCourse = await prisma.lmsCourse.findUnique({
    where: { slug: courseSlug },
    select: { id: true, title: true },
  });

  const title = dbCourse?.title ?? "Cyber Security Phishing Awareness Trainings";

  const existing = await prisma.lmsPurchase.findFirst({
    where: { learnerEmail, courseSlug },
    select: { id: true },
  });

  if (existing) {
    console.log(`[enroll] Already enrolled: ${learnerEmail} → ${courseSlug}`);
    return;
  }

  await prisma.lmsPurchase.create({
    data: {
      learnerEmail,
      courseSlug,
      title,
      courseId: dbCourse?.id ?? null,
      userId: user.id,
    },
  });

  console.log(`[enroll] Added: ${learnerEmail} → ${courseSlug} (${title})`);
  console.log(`\nLearner should open: /my-learning?tab=dashboard`);
  console.log(`Start course: /my-learning/course/${courseSlug}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
