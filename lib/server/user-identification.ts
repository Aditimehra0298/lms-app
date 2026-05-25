import { REGISTRATION_ID_START } from "@/lib/registration-ids";
import { prisma } from "@/lib/prisma";

/** Assign permanent learner ID (101, 102, …) on first need. */
export async function ensureUserIdentificationNumber(email: string): Promise<number | null> {
  const normalized = email.trim().toLowerCase();
  const user = await prisma.lmsUser.findUnique({
    where: { email: normalized },
    select: { id: true, identificationNumber: true },
  });
  if (!user) return null;
  if (user.identificationNumber != null) return user.identificationNumber;

  const agg = await prisma.lmsUser.aggregate({
    _max: { identificationNumber: true },
  });
  const next = Math.max(REGISTRATION_ID_START, (agg._max.identificationNumber ?? REGISTRATION_ID_START - 1) + 1);

  const updated = await prisma.lmsUser.update({
    where: { id: user.id },
    data: { identificationNumber: next },
    select: { identificationNumber: true },
  });
  return updated.identificationNumber;
}
