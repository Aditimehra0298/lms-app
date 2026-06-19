/** First permanent learner identification number. */
export const IDENTIFICATION_ID_START = 101;

/** First permanent organisation identification number (MySQL table `lms_organization`). */
export const ORGANIZATION_ID_START = 101;

export type CertificateNumberParts = {
  identificationNumber: number;
  monthYear: string;
  sequence: number;
};

/** e.g. 101/05-2026/001 */
export function formatCertificateNumber(
  identificationNumber: number,
  issuedAt: Date,
  sequence: number,
): string {
  const mm = String(issuedAt.getMonth() + 1).padStart(2, "0");
  const yyyy = issuedAt.getFullYear();
  const seq = String(sequence).padStart(3, "0");
  return `${identificationNumber}/${mm}-${yyyy}/${seq}`;
}

export function formatMonthYear(date: Date): string {
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  return `${mm}-${date.getFullYear()}`;
}

export function parseCertificateNumber(value: string): CertificateNumberParts | null {
  const m = value.trim().match(/^(\d+)\/(\d{2}-\d{4})\/(\d+)$/);
  if (!m) return null;
  return {
    identificationNumber: parseInt(m[1], 10),
    monthYear: m[2],
    sequence: parseInt(m[3], 10),
  };
}

/** Organisation certificate: 101-org/05-2026/001 */
export function formatOrganizationCertificateNumber(
  organizationIdentificationNumber: number,
  issuedAt: Date,
  sequence: number,
): string {
  const mm = String(issuedAt.getMonth() + 1).padStart(2, "0");
  const yyyy = issuedAt.getFullYear();
  const seq = String(sequence).padStart(3, "0");
  return `${organizationIdentificationNumber}-org/${mm}-${yyyy}/${seq}`;
}

export function parseOrganizationCertificateNumber(value: string): CertificateNumberParts | null {
  const m = value.trim().match(/^(\d+)-org\/(\d{2}-\d{4})\/(\d+)$/i);
  if (!m) return null;
  return {
    identificationNumber: parseInt(m[1], 10),
    monthYear: m[2],
    sequence: parseInt(m[3], 10),
  };
}

export function parseAnyCertificateNumber(
  value: string,
): (CertificateNumberParts & { holderType: "individual" | "organisation" }) | null {
  const sft = parseSftCertificateNumber(value);
  if (sft) {
    const mm = String(sft.month).padStart(2, "0");
    return {
      identificationNumber: sft.userIdentificationNumber,
      monthYear: `${mm}-${sft.year}`,
      sequence: sft.trainingSequence,
      holderType: sft.holderType,
    };
  }
  const org = parseOrganizationCertificateNumber(value);
  if (org) return { ...org, holderType: "organisation" };
  const ind = parseCertificateNumber(value);
  if (ind) return { ...ind, holderType: "individual" };
  return null;
}

export type SftCertificateNumberParts = {
  year: number;
  month: number;
  courseIdentificationNumber: number;
  trainingSequence: number;
  userIdentificationNumber: number;
  holderType: "individual" | "organisation";
};

/**
 * Current format: {YYYY}-{MM}-{courseId}-{trainingId}/{userId}
 * Example: 2026-05-101-001/123 (trainingId = issue sequence for that course in that month)
 */
export function formatSftCertificateNumber(parts: SftCertificateNumberParts): string {
  const mm = String(parts.month).padStart(2, "0");
  const trainingId = String(parts.trainingSequence).padStart(3, "0");
  const userId =
    parts.holderType === "organisation"
      ? `${parts.userIdentificationNumber}-org`
      : String(parts.userIdentificationNumber);
  return `${parts.year}-${mm}-${parts.courseIdentificationNumber}-${trainingId}/${userId}`;
}

export function parseSftCertificateNumber(value: string): SftCertificateNumberParts | null {
  const m = value.trim().match(/^(\d{4})-(\d{2})-(\d+)-(\d+)\/(\d+)(-org)?$/i);
  if (!m) return null;
  return {
    year: parseInt(m[1], 10),
    month: parseInt(m[2], 10),
    courseIdentificationNumber: parseInt(m[3], 10),
    trainingSequence: parseInt(m[4], 10),
    userIdentificationNumber: parseInt(m[5], 10),
    holderType: m[6] ? "organisation" : "individual",
  };
}

export function sftCertificateNumberPrefix(
  courseIdentificationNumber: number,
  issuedAt: Date,
): string {
  const mm = String(issuedAt.getMonth() + 1).padStart(2, "0");
  return `${issuedAt.getFullYear()}-${mm}-${courseIdentificationNumber}-`;
}

export function describeCertificateIdFormat(): string {
  return (
    "Current: {YYYY}-{MM}-{courseId}-{trainingId}/{userId} (e.g. 2026-05-101-001/123). " +
    "Legacy individual: {id}/{MM-YYYY}/{issue#}. Organisation legacy: {id}-org/{MM-YYYY}/{issue#}."
  );
}

export function describeOrganizationIdFormat(): string {
  return `Organisation table lms_organization — identificationNumber 101, 102, 103… Certificate number uses {id}-org/{MM-YYYY}/{sequence}.`;
}
