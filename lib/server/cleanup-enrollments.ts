import { prisma } from "@/lib/prisma";
import { normalizeLearnerEmail } from "@/lib/learner-email";
import { emailsLikelySamePerson, resolveLearnerForPurchaseEmail } from "@/lib/server/learner-email-resolve";
import { ensureUserIdentificationNumber } from "@/lib/server/user-identification";

function isValidEmail(email: string): boolean {
  const n = normalizeLearnerEmail(email);
  return n.includes("@") && n.includes(".");
}

/** Remove duplicate / invalid purchase rows for one course; link survivors to lms_user. */
export async function cleanupCourseEnrollments(courseSlug: string): Promise<{
  ok: true;
  removed: number;
  linked: number;
  kept: number;
}> {
  const slug = courseSlug.trim().toLowerCase();
  const purchases = await prisma.lmsPurchase.findMany({
    where: { courseSlug: slug },
    orderBy: { createdAt: "asc" },
  });

  let removed = 0;
  let linked = 0;

  const invalidIds = purchases
    .filter((p) => !isValidEmail(p.learnerEmail))
    .map((p) => p.id);
  if (invalidIds.length > 0) {
    await prisma.lmsPurchase.deleteMany({ where: { id: { in: invalidIds } } });
    removed += invalidIds.length;
  }

  const valid = purchases.filter((p) => !invalidIds.includes(p.id));

  const clusters: (typeof valid)[] = [];
  for (const p of valid) {
    let cluster = clusters.find((c) =>
      c.some((x) => emailsLikelySamePerson(x.learnerEmail, p.learnerEmail)),
    );
    if (!cluster) {
      cluster = [];
      clusters.push(cluster);
    }
    cluster.push(p);
  }

  for (const rows of clusters) {
    const sorted = [...rows].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    const keeper = sorted[0]!;
    const resolved = await resolveLearnerForPurchaseEmail(keeper.learnerEmail);
    const canonicalEmail = resolved?.canonicalEmail ?? normalizeLearnerEmail(keeper.learnerEmail);

    let identificationNumber = resolved?.identificationNumber ?? null;
    if (resolved?.userId) {
      identificationNumber = await ensureUserIdentificationNumber(canonicalEmail);
      await prisma.lmsPurchase.update({
        where: { id: keeper.id },
        data: {
          learnerEmail: canonicalEmail,
          userId: resolved.userId,
        },
      });
      linked += 1;
    } else if (keeper.learnerEmail !== canonicalEmail) {
      await prisma.lmsPurchase.update({
        where: { id: keeper.id },
        data: { learnerEmail: canonicalEmail },
      });
    }

    void identificationNumber;

    const deleteIds = sorted.slice(1).map((r) => r.id);
    if (deleteIds.length > 0) {
      await prisma.lmsPurchase.deleteMany({ where: { id: { in: deleteIds } } });
      removed += deleteIds.length;
    }
  }

  const kept = await prisma.lmsPurchase.count({ where: { courseSlug: slug } });
  return { ok: true, removed, linked, kept };
}
