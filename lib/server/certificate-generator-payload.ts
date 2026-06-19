import type { CertificateProgramRef } from "@/lib/certificate-program-resolve";
import { buildCertificateVerifyUrl } from "@/lib/certificate-verify-url";
import {
  formatGrade,
  formatIssueDate,
} from "@/lib/certificate-payload-fields";
import type { ResolvedGlobalCertificateAssets } from "@/lib/global-certificate-assets";
import { appBaseUrl, isPrivateOrLocalBaseUrl } from "@/lib/server/certificate-app-url";
import { loadCertificateTemplateBytes } from "@/lib/server/certificate-template-image";
import { toAbsoluteN8nAssetUrl } from "@/lib/server/n8n-certificate-assets";

/** JSON body for POST /generate-certificate (Flask API in lms-app-main/1). */
export type CertificateGeneratorApiPayload = {
  certificateId: string;
  candidateName: string;
  courseName: string;
  grade: string;
  certificateNumber: string;
  delegateNumber: string;
  verifyUrl: string;
  issueDate: string;
  certificateTemplateUrl?: string;
  transcriptTemplateUrl?: string;
  certificateTemplateBase64?: string;
  transcriptTemplateBase64?: string;
};

export type CertificateGeneratorSentSummary = {
  certificateTemplate: string;
  transcriptTemplate: string;
  candidateName: string;
  certificateNumber: string;
  courseName: string;
};

export function summarizeCertificateGeneratorPayload(
  payload: CertificateGeneratorApiPayload,
): CertificateGeneratorSentSummary {
  return {
    certificateTemplate:
      payload.certificateTemplateUrl ??
      (payload.certificateTemplateBase64 ? "(base64 certificate template)" : ""),
    transcriptTemplate:
      payload.transcriptTemplateUrl ??
      (payload.transcriptTemplateBase64 ? "(base64 transcript template)" : ""),
    candidateName: payload.candidateName,
    certificateNumber: payload.certificateNumber,
    courseName: payload.courseName,
  };
}

/** Build request for the certificate generator API using this course's admin-uploaded templates. */
export async function buildCertificateGeneratorApiPayload(input: {
  row: {
    id: string;
    certificateNumber: string;
    delegateNumber: string | null;
    learnerEmail: string;
    courseSlug: string;
    courseTitle: string;
    issuedAt: Date;
    scorePercent: number | null;
  };
  course: CertificateProgramRef;
  assets: ResolvedGlobalCertificateAssets;
  displayName: string;
  registrationDelegateCode?: string | null;
  scorePercent?: number | null;
}): Promise<CertificateGeneratorApiPayload | { ok: false; message: string }> {
  const { row, assets, displayName, course } = input;
  const scorePercent = input.scorePercent ?? row.scorePercent;
  const delegateNumber =
    row.delegateNumber?.trim() || input.registrationDelegateCode?.trim() || "";
  const verifyUrl = buildCertificateVerifyUrl(appBaseUrl(), {
    delegateNumber: row.delegateNumber,
    certificateNumber: row.certificateNumber,
  });
  const issueDate = formatIssueDate(row.issuedAt);
  const grade = formatGrade(scorePercent);

  const templatePath = assets.templateImage?.trim();
  const transcriptPath = assets.transcriptFile?.trim();
  if (!templatePath || !transcriptPath) {
    return {
      ok: false,
      message:
        "Upload certificate sample and transcript for this course (Admin → Course → Certificates).",
    };
  }

  const base = appBaseUrl();
  const preferBase64 =
    isPrivateOrLocalBaseUrl(base) ||
    process.env.CERTIFICATE_GENERATOR_SEND_BASE64?.trim().toLowerCase() === "true";

  const core: CertificateGeneratorApiPayload = {
    certificateId: row.id,
    candidateName: displayName,
    courseName: row.courseTitle || course.title,
    grade,
    certificateNumber: row.certificateNumber,
    delegateNumber,
    verifyUrl,
    issueDate,
  };

  if (preferBase64) {
    const certBytes = await loadCertificateTemplateBytes(templatePath);
    const transcriptBytes = await loadCertificateTemplateBytes(transcriptPath);
    if (!certBytes || !transcriptBytes) {
      return {
        ok: false,
        message:
          "Could not read course certificate templates from disk. Re-upload samples in admin.",
      };
    }
    return {
      ...core,
      certificateTemplateBase64: certBytes.toString("base64"),
      transcriptTemplateBase64: transcriptBytes.toString("base64"),
    };
  }

  return {
    ...core,
    certificateTemplateUrl: toAbsoluteN8nAssetUrl(templatePath, base),
    transcriptTemplateUrl: toAbsoluteN8nAssetUrl(transcriptPath, base),
  };
}

/** Parse pdfUrl from generator API JSON response. */
export function parseCertificateGeneratorPdfUrl(body: string): string | null {
  const trimmed = body.trim();
  if (!trimmed) return null;
  try {
    const json = JSON.parse(trimmed) as Record<string, unknown>;
    if (json.success === false) return null;
    for (const key of ["pdfUrl", "pdf_url", "url"]) {
      const value = json[key];
      if (typeof value === "string" && /^https?:\/\//i.test(value.trim())) {
        return value.trim();
      }
    }
  } catch {
  }
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return null;
}
