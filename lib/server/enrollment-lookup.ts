import { prisma } from "@/lib/prisma";
import { normalizeLearnerEmail } from "@/lib/learner-email";

export type ExistingEnrollment = {
  id: string;
  learnerEmail: string;
  userId: string | null;
  createdAt: Date;
};

/** One learner = one row per course (match by normalized email or linked user id). */
export async function findExistingEnrollment(input: {
  learnerEmail: string;
  courseSlug: string;
}): Promise<ExistingEnrollment | null> {
  const email = normalizeLearnerEmail(input.learnerEmail);
  const courseSlug = input.courseSlug.trim().toLowerCase();
  if (!email || !courseSlug) return null;

  const user = await prisma.lmsUser.findUnique({
    where: { email },
    select: { id: true },
  });

  const direct = await prisma.lmsPurchase.findFirst({
    where: { courseSlug, learnerEmail: email },
    select: { id: true, learnerEmail: true, userId: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
  if (direct) return direct;

  if (user) {
    const byUser = await prisma.lmsPurchase.findFirst({
      where: { courseSlug, userId: user.id },
      select: { id: true, learnerEmail: true, userId: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });
    if (byUser) return byUser;
  }

  const forCourse = await prisma.lmsPurchase.findMany({
    where: { courseSlug },
    select: { id: true, learnerEmail: true, userId: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  for (const row of forCourse) {
    if (normalizeLearnerEmail(row.learnerEmail) === email) return row;
    if (user?.id && row.userId === user.id) return row;
  }

  return null;
}

/** Align stored email / user id on an existing enrollment (no second row). */
export async function reconcileEnrollmentIdentity(
  existing: ExistingEnrollment,
  canonicalEmail: string,
  userId: string | null,
): Promise<void> {
  const email = normalizeLearnerEmail(canonicalEmail);
  const needsEmail = existing.learnerEmail !== email;
  const needsUser = userId && existing.userId !== userId;
  if (!needsEmail && !needsUser) return;

  await prisma.lmsPurchase.update({
    where: { id: existing.id },
    data: {
      ...(needsEmail ? { learnerEmail: email } : {}),
      ...(needsUser ? { userId } : {}),
    },
  });
}
