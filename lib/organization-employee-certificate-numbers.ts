/**
 * Organisation employees use the same certificate / delegate number pattern as individual learners
 * (no `-org` suffix). Numbers come from the shared SFT + delegate generators.
 */

import {
  formatSftCertificateNumber,
  IDENTIFICATION_ID_START,
  type SftCertificateNumberParts,
} from "@/lib/certificate-ids";
import { formatDelegateNumber } from "@/lib/delegate-number";

/** Permanent learner ID for certificate userId segment (roster slot → 101, 102…). */
export function employeeIdentificationNumber(employeeId: string): number {
  const digits = employeeId.replace(/\D/g, "");
  const parsed = Number.parseInt(digits, 10);
  if (!Number.isFinite(parsed)) return IDENTIFICATION_ID_START;
  if (parsed >= IDENTIFICATION_ID_START) return parsed;
  if (parsed >= 1) return IDENTIFICATION_ID_START + parsed - 1;
  return IDENTIFICATION_ID_START;
}

/** Demo / preview course IDs — align with MySQL `lms_course.courseIdentificationNumber` from 101. */
const PREVIEW_COURSE_IDENTIFICATION: Record<string, number> = {
  "food-safety-masterclass": 101,
  "cyber-security-essentials": 102,
  "esg-reporting-fundamentals": 103,
  "information-security-governance": 104,
  "medical-device-quality-regulatory": 105,
  "haccp-tutor-led": 110,
  "iso-22000-lead-auditor": 111,
};

export function previewCourseIdentificationNumber(courseSlug: string): number {
  const key = courseSlug.trim().toLowerCase();
  return PREVIEW_COURSE_IDENTIFICATION[key] ?? 101;
}

export type EmployeeCertificateNumberInput = {
  employeeId: string;
  courseSlug: string;
  trainingSequence: number;
  verifySequence: number;
  issuedAt?: Date;
  scorePercent?: number | null;
};

/** Preview numbers using the same format as `allocateSftCertificateNumber` / `allocateDelegateNumber`. */
export function buildEmployeeCertificateNumbers(input: EmployeeCertificateNumberInput): {
  identificationNumber: number;
  certificateNumber: string;
  delegateNumber: string;
  verifyNumber: number;
} {
  const issuedAt = input.issuedAt ?? new Date(2026, 5, 12);
  const userIdentificationNumber = employeeIdentificationNumber(input.employeeId);
  const courseIdentificationNumber = previewCourseIdentificationNumber(input.courseSlug);

  const certParts: SftCertificateNumberParts = {
    year: issuedAt.getFullYear(),
    month: issuedAt.getMonth() + 1,
    courseIdentificationNumber,
    trainingSequence: input.trainingSequence,
    userIdentificationNumber,
    holderType: "individual",
  };

  return {
    identificationNumber: userIdentificationNumber,
    certificateNumber: formatSftCertificateNumber(certParts),
    delegateNumber: formatDelegateNumber({
      year: issuedAt.getFullYear(),
      verifyNumber: input.verifySequence,
      userIdentificationNumber,
      holderType: "individual",
    }),
    verifyNumber: input.verifySequence,
  };
}
