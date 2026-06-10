import { prisma } from "@/lib/prisma";
import { normalizeLearnerEmail } from "@/lib/learner-email";

export type LearnerPurchaseRow = {
  slug: string;
  title: string;
  enrolledAt: string;
};

/** Load enrollments for a learner from MySQL (checkout, admin, demo script). */
export async function getPurchasesForLearner(
  learnerEmail: string,
): Promise<LearnerPurchaseRow[]> {
  const email = normalizeLearnerEmail(learnerEmail);
  if (!email) return [];

  const user = await prisma.lmsUser.findUnique({
    where: { email },
    select: { id: true },
  });

  const purchases = await prisma.lmsPurchase.findMany({
    where: user
      ? { OR: [{ learnerEmail: email }, { userId: user.id }] }
      : { learnerEmail: email },
    select: { courseSlug: true, title: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });

  const bySlug = new Map<string, LearnerPurchaseRow>();
  for (const row of purchases) {
    const slug = row.courseSlug.trim().toLowerCase();
    if (!slug || bySlug.has(slug)) continue;
    bySlug.set(slug, {
      slug,
      title: row.title.trim() || slug,
      enrolledAt: row.createdAt.toISOString(),
    });
  }

  return Array.from(bySlug.values());
}
