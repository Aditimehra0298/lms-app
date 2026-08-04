import type { CertificateProgramRef } from "@/lib/certificate-program-resolve";
import { buildCertificateQrVerifyUrl, buildCertificateVerifyUrl } from "@/lib/certificate-verify-url";
import {
  formatGrade,
  formatIssueDate,
  formatLearningMode,
} from "@/lib/certificate-payload-fields";
import type { AdminContent, CourseCurriculumModule } from "@/lib/content-schema";
import type { CourseMysqlRecord } from "@/lib/server/course-mysql-sync";
import { n8nCallbackBaseUrl, appBaseUrl } from "@/lib/server/certificate-app-url";
import { toAbsoluteN8nAssetUrl } from "@/lib/server/n8n-certificate-assets";
import type { CertificatePermissionSettings } from "@/lib/server/certificate-permissions";
import type { RegistrationLookupResult } from "@/lib/server/registration-lookup";
import type { ResolvedGlobalCertificateAssets } from "@/lib/global-certificate-assets";
import { resolveN8nCertificateTemplateName, N8N_CERTIFICATE_COURSE_NAMES } from "@/lib/n8n-certificate-template-map";

export type N8nCertificateWebhookPayload = {
  source: "lms";
  event: "course_completed";
  certificateId: string;
  callbackUrl: string;
  email: string;
  learnerName: string;
  courseSlug: string;
  courseTitle: string;
  scorePercent: number | null;
  completedAt: string;
  requireAdminApproval: boolean;
  autoVisibleWhenReady: boolean;
  learner: RegistrationLookupResult & {
    displayName: string;
    delegateNumber: string;
  };
  registration: RegistrationLookupResult;
  mysql: {
    course: CourseMysqlRecord;
    registration: RegistrationLookupResult;
  };
  course: CourseMysqlRecord;
  courseCategory: string;
  courseLevel: string;
  courseDuration: string;
  courseMode: string;
  courseDescription: string;
  assets: {
    certificateTemplate: string;
    badge: string;
    transcriptTemplate: string;
    certificateTemplatePath: string;
    badgePath: string;
    transcriptTemplatePath: string;
  };
  certificateLayout: {
    nameTopPercent: number;
    numberTopPercent: number;
    dateTopPercent: number;
  };
  certificateFields: {
    candidateName: string;
    courseName: string;
    courseDescription: string;
    duration: string;
    mode: string;
    issueDate: string;
    certificateNumber: string;
    delegateNumber: string;
    verifyUrl: string;
  };
  transcriptFields: {
    candidateName: string;
    trainingProgram: string;
    grade: string;
    certificateNumber: string;
    issueDate: string;
    delegateNumber: string;
  };
  curriculumRows: Array<{
    moduleNumber: number;
    title: string;
    itemCount: number;
  }>;
  tracker: {
    delegateNumber: string;
    verifyNumber: number | null;
    verifyUrl: string;
    qrCodeData: string;
  };
  /**
   * Flat aliases at JSON root for n8n Set nodes.
   * Use expressions: {{ $json.body.candidateName }} (or {{ $json.candidateName }} if webhook flattens body).
   */
  candidateName: string;
  courseName: string;
  certificateNumber: string;
  delegateNumber: string;
  verifyUrl: string;
  grade: string;
  issueDate: string;
  duration: string;
  mode: string;
  trainingProgram: string;
  certificateTemplate: string;
  badge: string;
  transcriptTemplate: string;
};

export type N8nCertificateSentSummary = {
  certificateTemplate: string;
  badge: string;
  transcriptTemplate: string;
  candidateName: string;
  certificateNumber: string;
  courseName: string;
};

/** @deprecated Use N8nCertificateSentSummary */
export type CertificateGeneratorSentSummary = N8nCertificateSentSummary;

export function summarizeN8nCertificatePayload(
  payload: N8nCertificateWebhookPayload,
): N8nCertificateSentSummary {
  return {
    certificateTemplate: payload.assets.certificateTemplate,
    badge: payload.assets.badge,
    transcriptTemplate: payload.assets.transcriptTemplate,
    candidateName: payload.certificateFields.candidateName,
    certificateNumber: payload.certificateFields.certificateNumber,
    courseName: payload.certificateFields.courseName,
  };
}

function findCurriculum(content: AdminContent, courseSlug: string): CourseCurriculumModule[] {
  const course = content.managedCourses?.find((c) => c.slug === courseSlug);
  return course?.curriculum ?? [];
}

function buildCurriculumRows(modules: CourseCurriculumModule[]) {
  return modules.map((mod, idx) => ({
    moduleNumber: idx + 1,
    title: mod.title?.trim() || `Module ${idx + 1}`,
    itemCount: Array.isArray(mod.items) ? mod.items.length : 0,
  }));
}

function assetPair(pathOrUrl: string, callbackBase: string) {
  const trimmed = pathOrUrl.trim();
  return {
    path: trimmed,
    url: toAbsoluteN8nAssetUrl(trimmed, callbackBase),
  };
}

function appBaseUrlForVerify(): string {
  return appBaseUrl();
}

/** Build the JSON body POSTed to the n8n certificate webhook (matches docs/N8N_SETUP_STEPS.md). */
export function buildN8nCertificateWebhookPayload(input: {
  row: {
    id: string;
    certificateNumber: string;
    delegateNumber: string | null;
    verifyNumber: number | null;
    learnerEmail: string;
    courseSlug: string;
    courseTitle: string;
    issuedAt: Date;
    scorePercent: number | null;
  };
  course: CertificateProgramRef;
  courseRow: CourseMysqlRecord;
  registration: RegistrationLookupResult;
  perms: CertificatePermissionSettings;
  assets: ResolvedGlobalCertificateAssets;
  displayName: string;
  scorePercent?: number | null;
  content: AdminContent;
  layout?: {
    nameTopPercent: number;
    numberTopPercent: number;
    dateTopPercent: number;
  };
}): N8nCertificateWebhookPayload {
  const { row, course, courseRow, registration, perms, assets, displayName, content } = input;
  const scorePercent = input.scorePercent ?? row.scorePercent;
  const issuedAt = row.issuedAt;
  const delegateNumber = row.delegateNumber?.trim() || registration.registrationCode?.trim() || "";
  const verifyUrl = buildCertificateVerifyUrl(appBaseUrlForVerify(), {
    delegateNumber: row.delegateNumber,
    certificateNumber: row.certificateNumber,
  });
  const qrVerifyUrl = buildCertificateQrVerifyUrl(appBaseUrlForVerify(), {
    certificateNumber: row.certificateNumber,
    delegateNumber: row.delegateNumber,
  });
  const issueDate = formatIssueDate(issuedAt);
  const grade = formatGrade(scorePercent);
  const callbackBase = n8nCallbackBaseUrl();
  const callbackUrl = `${callbackBase}/api/certificates/n8n-callback`;
  const courseDescription = course.subtitle?.trim() || course.hero?.certificatePreviewLabel?.trim() || "";
  const courseMode = formatLearningMode(course.learningFormat);

  const certTemplate = assetPair(assets.templateImage, callbackBase);
  const badge = assetPair(assets.badgeImage, callbackBase);
  const transcript = assetPair(assets.transcriptFile, callbackBase);

  const learner = {
    ...registration,
    name: registration.name?.trim() || displayName,
    displayName,
    delegateNumber,
  };

  const courseNameForN8n = resolveN8nCertificateTemplateName({
    courseSlug: row.courseSlug,
    courseTitle: row.courseTitle,
    configTemplateName: course.certificateConfig?.n8nCertificateTemplateName,
  });
  if (!courseNameForN8n) {
    throw new Error(
      `No n8n certificate courseName mapped for "${row.courseSlug}". ` +
        `courseName must be one of the ${N8N_CERTIFICATE_COURSE_NAMES.length} n8n template names.`,
    );
  }

  return {
    source: "lms",
    event: "course_completed",
    certificateId: row.id,
    callbackUrl,
    email: row.learnerEmail,
    learnerName: displayName,
    courseSlug: row.courseSlug,
    courseTitle: row.courseTitle,
    scorePercent: scorePercent ?? null,
    completedAt: issuedAt.toISOString(),
    requireAdminApproval: perms.requireAdminApproval,
    autoVisibleWhenReady: perms.autoVisibleWhenReady,
    learner,
    registration,
    mysql: {
      course: courseRow,
      registration,
    },
    course: courseRow,
    courseCategory: course.category,
    courseLevel: course.level,
    courseDuration: course.duration,
    courseMode,
    courseDescription,
    assets: {
      certificateTemplate: certTemplate.url,
      badge: badge.url,
      transcriptTemplate: transcript.url,
      certificateTemplatePath: certTemplate.path,
      badgePath: badge.path,
      transcriptTemplatePath: transcript.path,
    },
    certificateLayout: {
      nameTopPercent: input.layout?.nameTopPercent ?? 38,
      numberTopPercent: input.layout?.numberTopPercent ?? 52,
      dateTopPercent: input.layout?.dateTopPercent ?? 62,
    },
    certificateFields: {
      candidateName: displayName,
      courseName: courseNameForN8n,
      courseDescription,
      duration: course.duration,
      mode: courseMode,
      issueDate,
      certificateNumber: row.certificateNumber,
      delegateNumber,
      verifyUrl,
    },
    transcriptFields: {
      candidateName: displayName,
      trainingProgram: courseNameForN8n,
      grade,
      certificateNumber: row.certificateNumber,
      issueDate,
      delegateNumber,
    },
    curriculumRows: buildCurriculumRows(findCurriculum(content, row.courseSlug)),
    tracker: {
      delegateNumber,
      verifyNumber: row.verifyNumber,
      verifyUrl,
      qrCodeData: qrVerifyUrl,
    },
    // Flat aliases — n8n workflows often map $json.body.candidateName (not nested certificateFields)
    candidateName: displayName,
    courseName: courseNameForN8n,
    certificateNumber: row.certificateNumber,
    delegateNumber,
    verifyUrl,
    grade,
    issueDate,
    duration: course.duration,
    mode: courseMode,
    trainingProgram: courseNameForN8n,
    certificateTemplate: certTemplate.url,
    badge: badge.url,
    transcriptTemplate: transcript.url,
  };
}
