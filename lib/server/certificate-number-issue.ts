import {
  formatSftCertificateNumber,
  sftCertificateNumberPrefix,
  type SftCertificateNumberParts,
} from "@/lib/certificate-ids";
import { prisma } from "@/lib/prisma";

/** Next training issue # for a course in the issue month (001, 002, …). */
export async function nextTrainingSequence(
  courseIdentificationNumber: number,
  issuedAt: Date,
): Promise<number> {
  const prefix = sftCertificateNumberPrefix(courseIdentificationNumber, issuedAt);
  const existing = await prisma.lmsCertificate.findMany({
    where: { certificateNumber: { startsWith: prefix } },
    select: { certificateNumber: true },
  });
  let max = 0;
  for (const row of existing) {
    const m = row.certificateNumber.match(
      new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(\\d+)/`),
    );
    if (m) {
      const seq = parseInt(m[1], 10);
      if (seq > max) max = seq;
    }
  }
  return max + 1;
}

export async function allocateSftCertificateNumber(input: {
  courseIdentificationNumber: number;
  userIdentificationNumber: number;
  holderType: "individual" | "organisation";
  issuedAt?: Date;
}): Promise<string> {
  const issuedAt = input.issuedAt ?? new Date();
  const trainingSequence = await nextTrainingSequence(input.courseIdentificationNumber, issuedAt);
  const parts: SftCertificateNumberParts = {
    year: issuedAt.getFullYear(),
    month: issuedAt.getMonth() + 1,
    courseIdentificationNumber: input.courseIdentificationNumber,
    trainingSequence,
    userIdentificationNumber: input.userIdentificationNumber,
    holderType: input.holderType,
  };
  return formatSftCertificateNumber(parts);
}
