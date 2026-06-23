import { prisma } from "@/lib/prisma";
import { canonicalCourseSlug } from "@/lib/course-slug-aliases";
import { normalizeLearnerEmail } from "@/lib/learner-email";
import {
  findExistingEnrollment,
  reconcileEnrollmentIdentity,
} from "@/lib/server/enrollment-lookup";
import { queuePurchaseConfirmationEmails } from "@/lib/server/n8n-purchase-confirmation-service";

export type PurchaseCourseInput = { slug: string; title: string };

export async function recordPurchasesForLearner(input: {
  learnerEmail: string;
  courses: PurchaseCourseInput[];
}): Promise<{ ok: true; recorded: number; skipped: number } | { ok: false; message: string }> {
  const email = normalizeLearnerEmail(input.learnerEmail);
  if (!email || !email.includes("@")) {
    return { ok: false, message: "Valid learner email is required." };
  }

  const courses = input.courses
    .map((c) => ({
      slug: canonicalCourseSlug(c.slug),
      title: c.title.trim(),
    }))
    .filter((c) => c.slug.length > 0);

  if (courses.length === 0) {
    return { ok: false, message: "At least one course slug is required." };
  }

  let recorded = 0;
  let skipped = 0;
  const newlyRecorded: PurchaseCourseInput[] = [];

  const user = await prisma.lmsUser.findUnique({
    where: { email },
    select: { id: true, name: true },
  });

  for (const course of courses) {
    const existing = await findExistingEnrollment({
      learnerEmail: email,
      courseSlug: course.slug,
    });

    if (existing) {
      await reconcileEnrollmentIdentity(existing, email, user?.id ?? null);
      skipped += 1;
      continue;
    }

    const dbCourse = await prisma.lmsCourse.findUnique({
      where: { slug: course.slug },
      select: { id: true, title: true },
    });

    try {
      await prisma.lmsPurchase.create({
        data: {
          learnerEmail: email,
          courseSlug: course.slug,
          title: course.title || dbCourse?.title || course.slug,
          courseId: dbCourse?.id ?? null,
          userId: user?.id ?? null,
        },
      });
      recorded += 1;
      newlyRecorded.push({
        slug: course.slug,
        title: course.title || dbCourse?.title || course.slug,
      });
    } catch (err: unknown) {
      const code =
        err && typeof err === "object" && "code" in err
          ? String((err as { code: string }).code)
          : "";
      if (code === "P2002") {
        const again = await findExistingEnrollment({
          learnerEmail: email,
          courseSlug: course.slug,
        });
        if (again) {
          await reconcileEnrollmentIdentity(again, email, user?.id ?? null);
        }
        skipped += 1;
        continue;
      }
      throw err;
    }
  }

  if (newlyRecorded.length > 0) {
    queuePurchaseConfirmationEmails({
      learnerEmail: email,
      learnerName: user?.name,
      courses: newlyRecorded,
    });
  }

  return { ok: true, recorded, skipped };
}
