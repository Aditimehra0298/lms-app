import type { CertificateProgramRef } from "@/lib/certificate-program-resolve";
import { findCertificateProgram } from "@/lib/certificate-program-resolve";
import { buildCertificateVerifyUrl } from "@/lib/certificate-verify-url";
import { allocateDelegateNumber } from "@/lib/server/delegate-number-issue";
import {
  resolveCertificateAssetsForSlug,
} from "@/lib/global-certificate-assets";
import { readAdminContent } from "@/lib/server/content-store";
import { allocateSftCertificateNumber } from "@/lib/server/certificate-number-issue";
import {
  resolveCertificatePermissions,
  shouldShowOnLearnerDashboard,
  type CertificatePermissionSettings,
} from "@/lib/server/certificate-permissions";
import { ensureCourseInMysql, getCourseBySlug } from "@/lib/server/course-mysql-sync";
import { lookupRegistrationByEmail } from "@/lib/server/registration-lookup";
import type { AdminCertificateRowDto, CertificateRowDto } from "@/lib/certificate-types";
import { issueCourseCertificate } from "@/lib/server/certificate-service";
import {
  formatGrade,
  formatIssueDate,
  formatLearningMode,
} from "@/lib/certificate-payload-fields";
import { prisma } from "@/lib/prisma";
import { buildN8nWebhookHeaders } from "@/lib/server/n8n-webhook-auth";
import {
  certificatePdfServePath,
  isValidArchivedCertificatePdf,
  N8N_ARCHIVED_PDF_MIN_BYTES,
  persistCertificatePdf,
  resolveStoredCertificatePdfUrl,
} from "@/lib/server/certificate-pdf-store";
import {
  appBaseUrl,
  n8nCallbackBaseUrl,
  toAbsoluteAppUrl,
} from "@/lib/server/certificate-app-url";

export type { AdminCertificateRowDto, CertificateRowDto };

/** PDF URL from n8n Respond to Webhook (plain text URL or JSON with pdfUrl). */
export function parseN8nWebhookPdfUrl(body: string): string | null {
  const trimmed = body.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  try {
    const json = JSON.parse(trimmed) as Record<string, unknown>;
    for (const key of ["pdfUrl", "pdf_url", "url"]) {
      const value = json[key];
      if (typeof value === "string" && /^https?:\/\//i.test(value.trim())) {
        return value.trim();
      }
    }
  } catch {
    const match = trimmed.match(/https?:\/\/[^\s"'<>]+/i);
    if (match) return match[0];
  }
  return null;
}

function learnerAccessLabel(
  status: string,
  visibleToLearner: boolean,
): AdminCertificateRowDto["learnerAccess"] {
  if (status !== "ready") return "pending";
  return visibleToLearner ? "allowed" : "blocked";
}

/** Apply per-course/program certificate design with global fallback. */
async function withSharedCertificateDesign(
  rows: CertificateRowDto[],
): Promise<CertificateRowDto[]> {
  const content = await readAdminContent();
  return rows.map((dto) => {
    const assets = resolveCertificateAssetsForSlug(content, dto.courseSlug);
    return {
      ...dto,
      templateImage: assets.templateImage,
      badgeImage: assets.badgeImage || dto.badgeImage,
      supplementaryDocs: assets.supplementaryDocs.length ? assets.supplementaryDocs : dto.supplementaryDocs,
    };
  });
}

async function enrichAdminCertificateRows(
  rows: CertificateRowDto[],
): Promise<AdminCertificateRowDto[]> {
  const emails = [...new Set(rows.map((r) => r.learnerEmail.trim().toLowerCase()))];
  const users =
    emails.length > 0
      ? await prisma.lmsUser.findMany({
          where: { email: { in: emails } },
          select: { email: true, role: true, accountType: true, phone: true },
        })
      : [];
  const byEmail = new Map(users.map((u) => [u.email.toLowerCase(), u]));

  return rows.map((dto) => {
    const user = byEmail.get(dto.learnerEmail.trim().toLowerCase());
    return {
      ...dto,
      phone: user?.phone?.trim() || null,
      userRole: user?.role?.trim() || "learner",
      userType:
        user?.accountType?.trim() ||
        (dto.holderType === "organisation" ? "organisation" : "individual"),
      learnerAccess: learnerAccessLabel(dto.status, dto.visibleToLearner),
    };
  });
}

function appBaseUrlForVerify(): string {
  return appBaseUrl();
}

async function toDto(row: {
  id: string;
  certificateNumber: string;
  delegateNumber: string | null;
  verifyNumber: number | null;
  identificationNumber: number;
  holderType: string;
  organizationId: string | null;
  learnerName: string | null;
  learnerEmail: string;
  courseSlug: string;
  courseTitle: string;
  issuedAt: Date;
  scorePercent: number | null;
  templateImage: string | null;
  badgeImage: string | null;
  supplementaryDocs: unknown;
  status: string;
  visibleToLearner: boolean;
  pdfUrl: string | null;
  issuedVia: string;
}): Promise<CertificateRowDto> {
  let supplementaryDocs: { title: string; url: string }[] = [];
  if (Array.isArray(row.supplementaryDocs)) {
    supplementaryDocs = row.supplementaryDocs as { title: string; url: string }[];
  }
  const verifyUrl = buildCertificateVerifyUrl(appBaseUrlForVerify(), {
    delegateNumber: row.delegateNumber,
    certificateNumber: row.certificateNumber,
  });
  const pdfUrl = await resolveStoredCertificatePdfUrl(row.id, row.pdfUrl);
  const pdfReady = await isValidArchivedCertificatePdf(row.id, {
    minBytes: row.issuedVia === "n8n" ? N8N_ARCHIVED_PDF_MIN_BYTES : 128,
  });
  return {
    id: row.id,
    certificateNumber: row.certificateNumber,
    delegateNumber: row.delegateNumber,
    verifyNumber: row.verifyNumber,
    verifyUrl,
    identificationNumber: row.identificationNumber,
    holderType: row.holderType === "organisation" ? "organisation" : "individual",
    organizationId: row.organizationId,
    companyName: null,
    learnerName: row.learnerName ?? row.learnerEmail,
    learnerEmail: row.learnerEmail,
    courseSlug: row.courseSlug,
    courseTitle: row.courseTitle,
    issuedAt: row.issuedAt.toISOString(),
    scorePercent: row.scorePercent,
    templateImage: row.templateImage,
    badgeImage: row.badgeImage,
    supplementaryDocs,
    status: row.status,
    visibleToLearner: row.visibleToLearner,
    pdfUrl,
    issuedVia: row.issuedVia,
    pdfReady,
  };
}

async function findCourse(slug: string): Promise<CertificateProgramRef | undefined> {
  const content = await readAdminContent();
  return findCertificateProgram(content, slug);
}

/** True only when n8n generated a valid PDF saved on LMS disk. */
async function hasPermanentN8nPdf(certificateId: string, issuedVia: string): Promise<boolean> {
  return (
    issuedVia === "n8n" &&
    (await isValidArchivedCertificatePdf(certificateId, { minBytes: N8N_ARCHIVED_PDF_MIN_BYTES }))
  );
}

type CertificateDbRow = {
  id: string;
  certificateNumber: string;
  delegateNumber: string | null;
  verifyNumber: number | null;
  identificationNumber: number;
  holderType: string;
  organizationId?: string | null;
  learnerName: string | null;
  learnerEmail: string;
  courseSlug: string;
  courseTitle: string;
  issuedAt: Date;
  scorePercent: number | null;
  templateImage: string | null;
  badgeImage: string | null;
  supplementaryDocs: unknown;
  status: string;
  visibleToLearner: boolean;
  pdfUrl: string | null;
  issuedVia: string;
};

function buildN8nCertificatePayload(input: {
  row: CertificateDbRow;
  course: CertificateProgramRef;
  courseRow: NonNullable<Awaited<ReturnType<typeof getCourseBySlug>>>;
  registration: NonNullable<Awaited<ReturnType<typeof lookupRegistrationByEmail>>>;
  perms: CertificatePermissionSettings;
  assets: ReturnType<typeof resolveCertificateAssetsForSlug>;
  displayName: string;
  scorePercent?: number | null;
}) {
  const { row, course, courseRow, registration, perms, assets, displayName } = input;
  const scorePercent = input.scorePercent ?? row.scorePercent;
  const issuedAt = row.issuedAt;
  const delegateNumber = row.delegateNumber ?? "";
  const verifyUrl = buildCertificateVerifyUrl(appBaseUrlForVerify(), {
    delegateNumber: row.delegateNumber,
    certificateNumber: row.certificateNumber,
  });
  const issueDate = formatIssueDate(issuedAt);
  const grade = formatGrade(scorePercent);
  const callbackBase = n8nCallbackBaseUrl();
  const callbackUrl = `${callbackBase}/api/certificates/n8n-callback`;
  const absoluteAssets = {
    certificateTemplate: toAbsoluteAppUrl(assets.templateImage!, callbackBase),
    badge: toAbsoluteAppUrl(assets.badgeImage!, callbackBase),
    transcriptTemplate: toAbsoluteAppUrl(assets.transcriptFile!, callbackBase),
  };

  return {
    event: "course_completed" as const,
    certificateId: row.id,
    callbackUrl,
    email: row.learnerEmail,
    learnerName: displayName,
    learner: {
      ...registration,
      displayName,
      delegateNumber,
    },
    courseSlug: row.courseSlug,
    courseTitle: row.courseTitle,
    course: courseRow,
    courseCategory: course.category,
    courseLevel: course.level,
    courseDuration: course.duration,
    courseMode: formatLearningMode(course.learningFormat),
    scorePercent: scorePercent ?? null,
    completedAt: issuedAt.toISOString(),
    registration,
    requireAdminApproval: perms.requireAdminApproval,
    autoVisibleWhenReady: perms.autoVisibleWhenReady,
    assets: absoluteAssets,
    certificateFields: {
      candidateName: displayName,
      courseName: row.courseTitle,
      duration: course.duration,
      mode: formatLearningMode(course.learningFormat),
      issueDate,
      certificateNumber: row.certificateNumber,
      delegateNumber,
      verifyUrl,
    },
    transcriptFields: {
      candidateName: displayName,
      trainingProgram: row.courseTitle,
      grade,
      certificateNumber: row.certificateNumber,
      issueDate,
      delegateNumber,
    },
    tracker: {
      delegateNumber,
      verifyNumber: row.verifyNumber,
      verifyUrl,
      qrCodeData: verifyUrl,
    },
  };
}

/** POST certificate payload to n8n; archive PDF when Respond to Webhook returns a URL. */
async function dispatchCertificateToN8n(input: {
  row: CertificateDbRow;
  course: CertificateProgramRef;
  courseRow: NonNullable<Awaited<ReturnType<typeof getCourseBySlug>>>;
  registration: NonNullable<Awaited<ReturnType<typeof lookupRegistrationByEmail>>>;
  perms: CertificatePermissionSettings;
  assets: ReturnType<typeof resolveCertificateAssetsForSlug>;
  displayName: string;
  scorePercent?: number | null;
}): Promise<
  | { ok: true; certificate: CertificateRowDto; message: string }
  | { ok: false; message: string }
> {
  const webhookUrl = input.perms.n8nWebhookUrl;
  if (!webhookUrl) {
    return { ok: false, message: "Certificate workflow is not configured. Contact your technical team." };
  }

  await prisma.lmsCertificate.update({
    where: { id: input.row.id },
    data: { status: "pending", issuedVia: "n8n" },
  });

  const payload = buildN8nCertificatePayload(input);
  console.info("[certificate] POST n8n", webhookUrl, payload.certificateId);

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: buildN8nWebhookHeaders(),
      body: JSON.stringify(payload),
    });
    const responseBody = await res.text();
    console.info("[certificate] n8n response", res.status, responseBody.slice(0, 240));
    if (!res.ok) {
      await prisma.lmsCertificate.update({
        where: { id: input.row.id },
        data: { status: "failed" },
      });
      return {
        ok: false,
        message: `n8n webhook returned ${res.status}. Check your workflow.`,
      };
    }

    const pdfUrl = parseN8nWebhookPdfUrl(responseBody);
    if (pdfUrl) {
      console.info("[certificate] n8n temp PDF URL", pdfUrl.slice(0, 120));
      await completeN8nCertificateCallback({
        certificateId: input.row.id,
        certificateNumber: input.row.certificateNumber,
        pdfUrl,
        status: "ready",
      });
      const updated = await prisma.lmsCertificate.findUnique({ where: { id: input.row.id } });
      return {
        ok: true,
        certificate: await toDto(updated!),
        message: "Certificate generated.",
      };
    }

    const updated = await prisma.lmsCertificate.findUnique({ where: { id: input.row.id } });
    return {
      ok: true,
      certificate: await toDto(updated!),
      message: "Certificate sent to n8n. PDF will appear when generation completes.",
    };
  } catch (err) {
    await prisma.lmsCertificate.update({
      where: { id: input.row.id },
      data: { status: "failed" },
    });
    const msg = err instanceof Error ? err.message : "n8n request failed";
    return { ok: false, message: msg };
  }
}

async function retryN8nCertificate(input: {
  row: CertificateDbRow;
  course: CertificateProgramRef;
  courseRow: NonNullable<Awaited<ReturnType<typeof getCourseBySlug>>>;
  perms: CertificatePermissionSettings;
  learnerName?: string;
  scorePercent?: number;
}): Promise<
  | { ok: true; certificate: CertificateRowDto; message?: string }
  | { ok: false; message: string }
> {
  const registration = await lookupRegistrationByEmail(input.row.learnerEmail);
  if (!registration?.identificationNumber) {
    return { ok: false, message: "User must be registered in MySQL before requesting a certificate." };
  }

  const content = await readAdminContent();
  const assets = resolveCertificateAssetsForSlug(content, input.course.slug);
  if (!assets.templateImage || !assets.badgeImage || !assets.transcriptFile) {
    return {
      ok: false,
      message:
        "Certificate samples are not ready. Upload certificate, badge, and transcript for this program (or set global defaults under Users & Access → Certificates).",
    };
  }

  const displayName =
    registration.companyName ??
    input.learnerName?.trim() ??
    input.row.learnerName?.trim() ??
    input.row.learnerEmail.split("@")[0];

  return dispatchCertificateToN8n({
    row: input.row,
    course: input.course,
    courseRow: input.courseRow,
    registration,
    perms: input.perms,
    assets,
    displayName,
    scorePercent: input.scorePercent ?? input.row.scorePercent,
  });
}

/** Learner passed exam → request certificate via n8n (or builtin fallback). */
export async function requestCourseCertificate(input: {
  learnerEmail: string;
  learnerName?: string;
  courseSlug: string;
  scorePercent?: number;
  forceRetry?: boolean;
}): Promise<
  | { ok: true; certificate: CertificateRowDto; message?: string }
  | { ok: false; message: string }
> {
  const email = input.learnerEmail.trim().toLowerCase();
  const slug = input.courseSlug.trim();
  if (!email || !slug) return { ok: false, message: "Email and course slug are required." };

  const course = await findCourse(slug);
  if (!course) return { ok: false, message: "Course not found." };

  const courseRow =
    (await getCourseBySlug(slug)) ??
    (await ensureCourseInMysql({
      slug: course.slug,
      title: course.title,
      subtitle: course.subtitle,
      category: course.category,
      level: course.level,
      published: course.published,
      learningFormat: course.learningFormat,
    }));
  if (!courseRow) {
    return { ok: false, message: "Could not save course to MySQL (lms_course)." };
  }

  const perms = resolveCertificatePermissions(course);
  if (!perms.enabled) return { ok: false, message: "Certificates are not enabled for this course." };

  const existing = await prisma.lmsCertificate.findFirst({
    where: { learnerEmail: email, courseSlug: slug },
    orderBy: { issuedAt: "desc" },
  });
  if (existing) {
    const hasN8nPdf = await hasPermanentN8nPdf(existing.id, existing.issuedVia);
    if (existing.status === "ready" && hasN8nPdf && !input.forceRetry) {
      return { ok: true, certificate: await toDto(existing) };
    }
    // n8n runs once: on pending/failed, or when admin forces retry.
    // Ready certs without a saved PDF are handled by POST /prepare on download (not here).
    if (
      perms.provider === "n8n" &&
      perms.n8nWebhookUrl &&
      (existing.status === "pending" ||
        existing.status === "failed" ||
        (input.forceRetry && !hasN8nPdf))
    ) {
      return retryN8nCertificate({
        row: existing,
        course,
        courseRow,
        perms,
        learnerName: input.learnerName,
        scorePercent: input.scorePercent,
      });
    }
    if (existing.status === "ready" && !input.forceRetry) {
      return { ok: true, certificate: await toDto(existing) };
    }
  }

  if (perms.provider === "builtin") {
    const built = await issueCourseCertificate({
      learnerEmail: email,
      learnerName: input.learnerName,
      courseSlug: slug,
      scorePercent: input.scorePercent,
    });
    if (!built.ok) return built;
    await prisma.lmsCertificate.update({
      where: { id: built.certificate.id },
      data: {
        status: "ready",
        visibleToLearner: perms.autoVisibleWhenReady,
        issuedVia: "builtin",
      },
    });
    const row = await prisma.lmsCertificate.findUnique({ where: { id: built.certificate.id } });
    return { ok: true, certificate: await toDto(row!) };
  }

  if (!perms.n8nWebhookUrl) {
    return {
      ok: false,
      message: "Certificate workflow is not configured. Contact your technical team.",
    };
  }

  const registration = await lookupRegistrationByEmail(email);
  if (!registration?.identificationNumber) {
    return { ok: false, message: "User must be registered in MySQL before requesting a certificate." };
  }

  const content = await readAdminContent();
  const assets = resolveCertificateAssetsForSlug(content, slug);
  if (!assets.templateImage || !assets.badgeImage || !assets.transcriptFile) {
    return {
      ok: false,
      message:
        "Certificate samples are not ready. Upload certificate, badge, and transcript for this program (or set global defaults under Users & Access → Certificates).",
    };
  }

  const displayName =
    registration.companyName ?? input.learnerName?.trim() ?? email.split("@")[0];
  const holderType =
    registration.accountType === "organisation" ? "organisation" : "individual";
  const issuedAt = new Date();
  const certificateNumber = await allocateSftCertificateNumber({
    courseIdentificationNumber: courseRow.courseIdentificationNumber,
    userIdentificationNumber: registration.identificationNumber,
    holderType,
    issuedAt,
  });
  const { delegateNumber, verifyNumber } = await allocateDelegateNumber({
    userIdentificationNumber: registration.identificationNumber,
    holderType,
    issuedAt,
  });
  const row = await prisma.lmsCertificate.create({
    data: {
      learnerEmail: email,
      learnerName: displayName,
      courseSlug: slug,
      courseId: courseRow.id,
      courseTitle: course.title,
      certificateNumber,
      delegateNumber,
      verifyNumber,
      identificationNumber: registration.identificationNumber,
      holderType,
      scorePercent: input.scorePercent ?? null,
      templateImage: assets.templateImage,
      badgeImage: assets.badgeImage,
      supplementaryDocs: assets.supplementaryDocs.length > 0 ? assets.supplementaryDocs : undefined,
      status: "pending",
      visibleToLearner: false,
      issuedVia: "n8n",
      issuedAt,
    },
  });

  const dispatched = await dispatchCertificateToN8n({
    row,
    course,
    courseRow,
    registration,
    perms,
    assets,
    displayName,
    scorePercent: input.scorePercent,
  });
  if (!dispatched.ok) return dispatched;
  return {
    ok: true,
    certificate: dispatched.certificate,
    message: dispatched.message,
  };
}

/** Download temp PDF from n8n/Vercel and save permanently on LMS disk + MySQL. */
async function archiveCertificatePdfFromTempUrl(input: {
  certificateId: string;
  remoteUrl: string;
  visibleToLearner?: boolean;
}): Promise<string | null> {
  const id = input.certificateId.trim();
  if (await isValidArchivedCertificatePdf(id)) {
    return certificatePdfServePath(id);
  }

  const persisted = await persistCertificatePdf({
    certificateId: id,
    remoteUrl: input.remoteUrl,
  });
  if (!persisted.ok) {
    console.error("[certificate] archive temp PDF failed:", persisted.message);
    return null;
  }

  await prisma.lmsCertificate.update({
    where: { id },
    data: {
      pdfUrl: persisted.storedUrl,
      status: "ready",
      issuedVia: "n8n",
      ...(typeof input.visibleToLearner === "boolean"
        ? { visibleToLearner: input.visibleToLearner }
        : {}),
    },
  });
  console.info("[certificate] archived temp PDF →", persisted.storedUrl);
  return persisted.storedUrl;
}

/** Ensure PDF exists: call n8n once, archive temp URL; later downloads use permanent LMS copy only. */
export async function ensureCertificatePdfReady(input: {
  certificateId: string;
  learnerEmail: string;
  forceRegenerate?: boolean;
}): Promise<
  | { ok: true; downloadUrl: string; status: string; n8nCalled?: boolean; cached?: boolean }
  | { ok: false; message: string; status?: string; n8nCalled?: boolean }
> {
  const email = input.learnerEmail.trim().toLowerCase();
  const id = input.certificateId.trim();
  if (!email || !id) {
    return { ok: false, message: "Email and certificate id are required." };
  }

  const row = await prisma.lmsCertificate.findUnique({ where: { id } });
  if (!row || row.learnerEmail.trim().toLowerCase() !== email) {
    return { ok: false, message: "Certificate not found." };
  }

  // Allow download while generating (pending) or when approved.
  if (row.status === "ready" && !row.visibleToLearner) {
    return {
      ok: false,
      message: "Your certificate is ready but waiting for admin approval before download.",
      status: "awaiting_approval",
    };
  }

  // Permanent n8n PDF already saved — instant download, skip n8n.
  const hasN8nPdf = !input.forceRegenerate && (await hasPermanentN8nPdf(id, row.issuedVia));
  if (hasN8nPdf) {
    console.info("[certificate] prepare: using cached n8n PDF", id);
    return {
      ok: true,
      downloadUrl: certificatePdfServePath(id),
      status: row.status,
      cached: true,
      n8nCalled: false,
    };
  }

  if (input.forceRegenerate) {
    console.info("[certificate] prepare: force regenerate requested", id);
  }

  console.info("[certificate] prepare: no n8n PDF yet, will trigger n8n", id, row.issuedVia);

  const course = await findCourse(row.courseSlug);
  if (!course) {
    return { ok: false, message: "Course not found for this certificate." };
  }

  const perms = resolveCertificatePermissions(course);
  const autoVisible = perms.autoVisibleWhenReady && !perms.requireAdminApproval;

  // Temp http link from a previous n8n run — archive now without calling n8n again.
  if (row.pdfUrl?.trim().startsWith("http")) {
    const archived = await archiveCertificatePdfFromTempUrl({
      certificateId: id,
      remoteUrl: row.pdfUrl,
      visibleToLearner: autoVisible ? true : row.visibleToLearner,
    });
    if (archived) {
      return { ok: true, downloadUrl: archived, status: "ready", cached: true, n8nCalled: false };
    }
  }

  if (!perms.enabled) {
    return { ok: false, message: "Certificates are not enabled for this course." };
  }
  if (perms.provider !== "n8n" || !perms.n8nWebhookUrl) {
    return {
      ok: false,
      message: "n8n certificate workflow is not configured. Set N8N_CERTIFICATE_WEBHOOK_URL in .env.local.",
    };
  }

  const courseRow =
    (await getCourseBySlug(row.courseSlug)) ??
    (await ensureCourseInMysql({
      slug: course.slug,
      title: course.title,
      subtitle: course.subtitle,
      category: course.category,
      level: course.level,
      published: course.published,
      learningFormat: course.learningFormat,
    }));
  if (!courseRow) {
    return { ok: false, message: "Could not load course from MySQL." };
  }

  // First download: POST n8n → temp PDF URL → archive permanently.
  const dispatched = await retryN8nCertificate({
    row,
    course,
    courseRow,
    perms,
    learnerName: row.learnerName ?? undefined,
    scorePercent: row.scorePercent ?? undefined,
  });

  if (!dispatched.ok) {
    return { ok: false, message: dispatched.message, status: row.status, n8nCalled: true };
  }

  if (await isValidArchivedCertificatePdf(id, { minBytes: N8N_ARCHIVED_PDF_MIN_BYTES })) {
    return {
      ok: true,
      downloadUrl: certificatePdfServePath(id),
      status: "ready",
      n8nCalled: true,
      cached: false,
    };
  }

  return {
    ok: false,
    message:
      dispatched.message ??
      "n8n returned but PDF was not archived. Ensure Respond to Webhook returns the full temporary PDF URL as text.",
    status: dispatched.certificate.status,
    n8nCalled: true,
  };
}

/** n8n calls this when PDF is ready — archives PDF permanently on LMS disk + MySQL. */
export async function completeN8nCertificateCallback(input: {
  certificateId: string;
  certificateNumber?: string;
  pdfUrl?: string;
  pdfBase64?: string;
  status?: "ready" | "failed";
}): Promise<{ ok: true; storedPdfUrl?: string } | { ok: false; message: string }> {
  const id = input.certificateId.trim();
  if (!id) return { ok: false, message: "certificateId required" };

  const row = await prisma.lmsCertificate.findUnique({ where: { id } });
  if (!row) return { ok: false, message: "Certificate not found" };

  const course = await findCourse(row.courseSlug);
  const perms = course ? resolveCertificatePermissions(course) : null;
  const status = input.status === "failed" ? "failed" : "ready";
  const visible =
    status === "ready" && perms
      ? perms.autoVisibleWhenReady && !perms.requireAdminApproval
      : false;

  let storedPdfUrl: string | null = null;
  if (status === "ready" && (input.pdfUrl?.trim() || input.pdfBase64?.trim())) {
    const persisted = await persistCertificatePdf({
      certificateId: id,
      remoteUrl: input.pdfUrl,
      pdfBase64: input.pdfBase64,
    });
    if (persisted.ok) {
      storedPdfUrl = persisted.storedUrl;
    } else {
      console.error("[certificate-pdf]", persisted.message);
    }
  }

  await prisma.lmsCertificate.update({
    where: { id },
    data: {
      status,
      certificateNumber: input.certificateNumber?.trim() || row.certificateNumber,
      pdfUrl:
        storedPdfUrl ??
        (row.pdfUrl?.startsWith("http") ? row.pdfUrl : null),
      visibleToLearner: visible || row.visibleToLearner,
      issuedVia: storedPdfUrl ? "n8n" : row.issuedVia,
      issuedAt: status === "ready" ? new Date() : row.issuedAt,
    },
  });

  return { ok: true, storedPdfUrl: storedPdfUrl ?? undefined };
}

export async function listLearnerCertificates(email: string): Promise<CertificateRowDto[]> {
  const normalized = email.trim().toLowerCase();
  const rows = await prisma.lmsCertificate.findMany({
    where: { learnerEmail: normalized },
    orderBy: { issuedAt: "desc" },
  });

  const content = await readAdminContent();
  const out: CertificateRowDto[] = [];

  for (const row of rows) {
    const course = findCertificateProgram(content, row.courseSlug);
    if (!course) continue;
    const perms = resolveCertificatePermissions(course);
    if (!shouldShowOnLearnerDashboard(perms, row)) continue;
    out.push(await toDto(row));
  }

  return withSharedCertificateDesign(out);
}

export async function listAdminCertificatesForCourse(
  courseSlug: string,
): Promise<AdminCertificateRowDto[]> {
  const rows = await prisma.lmsCertificate.findMany({
    where: { courseSlug: courseSlug.trim() },
    orderBy: { issuedAt: "desc" },
  });
  const dtos = await withSharedCertificateDesign(await Promise.all(rows.map((row) => toDto(row))));
  return enrichAdminCertificateRows(dtos);
}

/** All issued certificates (admin), newest first. */
export async function listAdminCertificatesAll(): Promise<AdminCertificateRowDto[]> {
  const rows = await prisma.lmsCertificate.findMany({
    orderBy: { issuedAt: "desc" },
  });
  const dtos = await withSharedCertificateDesign(await Promise.all(rows.map((row) => toDto(row))));
  return enrichAdminCertificateRows(dtos);
}

export async function setCertificateVisibility(
  certificateId: string,
  visibleToLearner: boolean,
): Promise<{ ok: true; certificate: AdminCertificateRowDto } | { ok: false; message: string }> {
  const row = await prisma.lmsCertificate.findUnique({ where: { id: certificateId } });
  if (!row) return { ok: false, message: "Not found" };
  if (row.status !== "ready") {
    return { ok: false, message: "Certificate must be ready before changing visibility." };
  }
  const updated = await prisma.lmsCertificate.update({
    where: { id: certificateId },
    data: { visibleToLearner },
  });
  const [shared] = await withSharedCertificateDesign([await toDto(updated)]);
  const [enriched] = await enrichAdminCertificateRows([shared]);
  return { ok: true, certificate: enriched };
}

/** Admin manually marks certificate ready (upload PDF in Drive, paste URL here). */
export async function adminUpdateCertificateManual(input: {
  certificateId: string;
  pdfUrl?: string;
  certificateNumber?: string;
  status?: "ready" | "failed" | "pending";
  visibleToLearner?: boolean;
}): Promise<{ ok: true; certificate: CertificateRowDto } | { ok: false; message: string }> {
  const row = await prisma.lmsCertificate.findUnique({ where: { id: input.certificateId } });
  if (!row) return { ok: false, message: "Not found" };

  const status = input.status ?? row.status;
  let storedPdfUrl: string | undefined;
  if (input.pdfUrl?.trim() && status === "ready") {
    const persisted = await persistCertificatePdf({
      certificateId: input.certificateId,
      remoteUrl: input.pdfUrl,
    });
    storedPdfUrl = persisted.ok ? persisted.storedUrl : input.pdfUrl.trim();
  }

  const updated = await prisma.lmsCertificate.update({
    where: { id: input.certificateId },
    data: {
      ...(input.pdfUrl !== undefined
        ? { pdfUrl: (storedPdfUrl ?? input.pdfUrl.trim()) || null }
        : {}),
      ...(input.certificateNumber?.trim() &&
      !input.certificateNumber.trim().startsWith("TEMP-")
        ? { certificateNumber: input.certificateNumber.trim() }
        : {}),
      status,
      ...(typeof input.visibleToLearner === "boolean"
        ? { visibleToLearner: input.visibleToLearner }
        : {}),
      ...(status === "ready" ? { issuedAt: new Date() } : {}),
      issuedVia: "manual",
    },
  });
  return { ok: true, certificate: await toDto(updated) };
}

/** Admin manually starts n8n for a learner (re-issue / first issue). */
export async function adminTriggerCertificateForLearner(input: {
  learnerEmail: string;
  courseSlug: string;
  learnerName?: string;
  scorePercent?: number;
}): Promise<
  | { ok: true; certificate: CertificateRowDto; message?: string }
  | { ok: false; message: string }
> {
  return requestCourseCertificate(input);
}
