import type { CourseLearningFormat } from "@/lib/content-schema";

export type CertificateOverlayFields = {
  candidateName: string;
  courseName: string;
  duration: string;
  mode: string;
  issueDate: string;
  certificateNumber: string;
  delegateNumber: string;
};

export type TranscriptOverlayFields = {
  candidateName: string;
  trainingProgram: string;
  grade: string;
  certificateNumber: string;
  issueDate: string;
  delegateNumber: string;
};

export function formatIssueDate(date: Date): string {
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatLearningMode(format?: CourseLearningFormat | string): string {
  const f = (format ?? "self-paced").toLowerCase();
  if (f === "live" || f === "interactive") return "Live Online";
  if (f === "self-paced") return "E-Learning, Video-based, Self-paced";
  return "E-Learning, Video-based, Self-paced";
}

export function formatGrade(scorePercent?: number | null): string {
  if (scorePercent == null || !Number.isFinite(scorePercent)) return "Pass";
  return `${Math.round(scorePercent)}%`;
}

/** @deprecated Use allocateDelegateNumber — format is YYYY-verifyNumber-userId */
export function formatDelegateNumber(identificationNumber: number): string {
  return String(identificationNumber);
}
