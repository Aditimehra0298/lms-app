import { formatDelegateNumber, type DelegateNumberParts } from "@/lib/delegate-number";
import { prisma } from "@/lib/prisma";

/** Next global verify sequence for the given year (0001, 0002, …). */
export async function nextVerifySequence(year: number): Promise<number> {
  const agg = await prisma.lmsCertificate.aggregate({
    where: { verifyNumber: { not: null }, delegateNumber: { startsWith: `${year}-` } },
    _max: { verifyNumber: true },
  });
  return (agg._max.verifyNumber ?? 0) + 1;
}

export async function allocateDelegateNumber(input: {
  userIdentificationNumber: number;
  holderType: "individual" | "organisation";
  issuedAt?: Date;
}): Promise<{ delegateNumber: string; verifyNumber: number }> {
  const issuedAt = input.issuedAt ?? new Date();
  const year = issuedAt.getFullYear();
  const verifyNumber = await nextVerifySequence(year);
  const parts: DelegateNumberParts = {
    year,
    verifyNumber,
    userIdentificationNumber: input.userIdentificationNumber,
    holderType: input.holderType,
  };
  return { delegateNumber: formatDelegateNumber(parts), verifyNumber };
}
