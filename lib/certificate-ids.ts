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

export function parseAnyCertificateNumber(value: string): (CertificateNumberParts & { holderType: "individual" | "organisation" }) | null {
  const org = parseOrganizationCertificateNumber(value);
  if (org) return { ...org, holderType: "organisation" };
  const ind = parseCertificateNumber(value);
  if (ind) return { ...ind, holderType: "individual" };
  return null;
}

export function describeCertificateIdFormat(): string {
  return `Individual: {id}/{MM-YYYY}/{issue#} (e.g. 101/05-2026/001). Organisation: {id}-org/{MM-YYYY}/{issue#} (e.g. 101-org/05-2026/001). IDs start at 101.`;
}

export function describeOrganizationIdFormat(): string {
  return `Organisation table lms_organization — identificationNumber 101, 102, 103… Certificate number uses {id}-org/{MM-YYYY}/{sequence}.`;
}
