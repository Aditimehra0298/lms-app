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
import { appBaseUrl } from "@/lib/server/certificate-app-url";
import { prisma } from "@/lib/prisma";
import {
  certificatePdfServePath,
  deleteStoredCertificatePdf,
  isValidArchivedCertificatePdf,
  N8N_ARCHIVED_PDF_MIN_BYTES,
  persistCertificatePdf,
  resolveStoredCertificatePdfUrl,
} from "@/lib/server/certificate-pdf-store";
import {
  COURSE_CERTIFICATE_ASSETS_MISSING_MESSAGE,
  courseCertificateAssetsReady,
  isCertificateApiProvider,
  isGeneratorIssuedVia,
  mayUseLocalCertificateFallback,
  resolveCourseCertificateAssets,
} from "@/lib/server/certificate-generation-policy";
import {
  dispatchCertificateToGeneratorApi,
  type CertificateGeneratorSentSummary,
} from "@/lib/server/certificate-generator-api";
import { ensureLocalCertificatePdf, generateCertificateFromCourseTemplate } from "@/lib/server/local-certificate-fallback";

export type { AdminCertificateRowDto, CertificateRowDto };
export type { CertificateGeneratorSentSummary };
/** @deprecated Use CertificateGeneratorSentSummary */
export type N8nCertificateSentSummary = CertificateGeneratorSentSummary;

/** PDF URL from generator API JSON (or legacy n8n plain-text URL). */
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
    minBytes: isGeneratorIssuedVia(row.issuedVia) ? N8N_ARCHIVED_PDF_MIN_BYTES : 128,
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

/** True when generator API produced a valid multi-page PDF on LMS disk. */
async function hasPermanentGeneratorPdf(certificateId: string, issuedVia: string): Promise<boolean> {
  return (
    isGeneratorIssuedVia(issuedVia) &&
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

/** POST learner data + course templates to certificate generator API. */
async function dispatchCertificateGeneration(input: {
  row: CertificateDbRow;
  course: CertificateProgramRef;
  registration: NonNullable<Awaited<ReturnType<typeof lookupRegistrationByEmail>>>;
  perms: CertificatePermissionSettings;
  assets: ReturnType<typeof resolveCertificateAssetsForSlug>;
  displayName: string;
  scorePercent?: number | null;
}): Promise<
  | {
      ok: true;
      certificate: CertificateRowDto;
      message: string;
      generatorSent: CertificateGeneratorSentSummary;
      n8nSent: CertificateGeneratorSentSummary;
    }
  | { ok: false; message: string }
> {
  if (!input.perms.certificateGeneratorApiUrl) {
    return {
      ok: false,
      message: "Certificate generator API is not configured. Set CERTIFICATE_GENERATOR_API_URL in .env.local.",
    };
  }

  await prisma.lmsCertificate.update({
    where: { id: input.row.id },
    data: {
      status: "pending",
      issuedVia: "course-template",
      templateImage: input.assets.templateImage,
      badgeImage: input.assets.badgeImage,
    },
  });

  // Use admin-uploaded templates directly (native size) — matches course preview.
  const local = await generateCertificateFromCourseTemplate({
    certificateId: input.row.id,
    learnerEmail: input.row.learnerEmail,
    forceRegenerate: false,
  });

  if (local.ok) {
    const updated = await prisma.lmsCertificate.findUnique({ where: { id: input.row.id } });
    const sent: CertificateGeneratorSentSummary = {
      certificateTemplate: local.templateImage,
      transcriptTemplate: input.assets.transcriptFile,
      candidateName: input.displayName,
      certificateNumber: input.row.certificateNumber,
      courseName: input.row.courseTitle,
    };
    return {
      ok: true,
      certificate: await toDto(updated!),
      message: local.message,
      generatorSent: sent,
      n8nSent: sent,
    };
  }

  console.warn("[certificate] local template generation failed:", local.message);

  return {
    ok: false,
    message:
      local.message ??
      "Could not generate certificate from the uploaded course template. Re-upload certificate samples in Admin → Course → Certificates.",
  };
}

async function retryCertificateGeneration(input: {
  row: CertificateDbRow;
  course: CertificateProgramRef;
  courseRow: NonNullable<Awaited<ReturnType<typeof getCourseBySlug>>>;
  perms: CertificatePermissionSettings;
  learnerName?: string;
  scorePercent?: number;
}): Promise<
  | {
      ok: true;
      certificate: CertificateRowDto;
      message: string;
      generatorSent: CertificateGeneratorSentSummary;
      n8nSent: CertificateGeneratorSentSummary;
    }
  | { ok: false; message: string }
> {
  const registration = await lookupRegistrationByEmail(input.row.learnerEmail);
  if (!registration?.identificationNumber) {
    return { ok: false, message: "User must be registered in MySQL before requesting a certificate." };
  }

  const content = await readAdminContent();
  const assets = resolveCourseCertificateAssets(content, input.course.slug);
  if (!courseCertificateAssetsReady(assets)) {
    return { ok: false, message: COURSE_CERTIFICATE_ASSETS_MISSING_MESSAGE };
  }

  const displayName =
    input.learnerName?.trim() ??
    input.row.learnerName?.trim() ??
    registration.name?.trim() ??
    registration.companyName ??
    input.row.learnerEmail.split("@")[0];

  return dispatchCertificateGeneration({
    row: input.row,
    course: input.course,
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

  const apiConfigured = isCertificateApiProvider(perms);

  const existing = await prisma.lmsCertificate.findFirst({
    where: { learnerEmail: email, courseSlug: slug },
    orderBy: { issuedAt: "desc" },
  });
  if (existing) {
    const hasN8nPdf = await hasPermanentGeneratorPdf(existing.id, existing.issuedVia);
    if (existing.status === "ready" && hasN8nPdf && !input.forceRetry) {
      return { ok: true, certificate: await toDto(existing) };
    }
    // n8n: (re)send when pending/failed, admin retry, or ready without an n8n PDF yet.
    if (
      apiConfigured &&
      (existing.status === "pending" ||
        existing.status === "failed" ||
        input.forceRetry ||
        (existing.status === "ready" && !hasN8nPdf))
    ) {
      if (existing.status === "ready" && !hasN8nPdf) {
        await deleteStoredCertificatePdf(existing.id);
      }
      return retryCertificateGeneration({
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

  if (!perms.certificateGeneratorApiUrl) {
    return {
      ok: false,
      message:
        "Certificate generator API is not configured. Set CERTIFICATE_GENERATOR_API_URL in .env.local.",
    };
  }

  const registration = await lookupRegistrationByEmail(email);
  if (!registration?.identificationNumber) {
    return { ok: false, message: "User must be registered in MySQL before requesting a certificate." };
  }

  const content = await readAdminContent();
  const assets = resolveCourseCertificateAssets(content, slug);
  if (!courseCertificateAssetsReady(assets)) {
    return { ok: false, message: COURSE_CERTIFICATE_ASSETS_MISSING_MESSAGE };
  }

  const displayName =
    registration.name?.trim() ??
    input.learnerName?.trim() ??
    registration.companyName ??
    email.split("@")[0];
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
      issuedVia: "api",
      issuedAt,
    },
  });

  const dispatched = await dispatchCertificateGeneration({
    row,
    course,
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
      issuedVia: "api",
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
  /** UI Generate — always POST course template + learner data to n8n. */
  triggerN8n?: boolean;
}): Promise<
  | {
      ok: true;
      downloadUrl: string;
      status: string;
      n8nCalled?: boolean;
      cached?: boolean;
      n8nSent?: N8nCertificateSentSummary;
      message?: string;
    }
  | {
      ok: false;
      message: string;
      status?: string;
      n8nCalled?: boolean;
      n8nSent?: N8nCertificateSentSummary;
    }
> {
  const email = input.learnerEmail.trim().toLowerCase();
  const id = input.certificateId.trim();
  const forceRegenerate = input.forceRegenerate === true || input.triggerN8n === true;
  if (!email || !id) {
    return { ok: false, message: "Email and certificate id are required." };
  }

  const row = await prisma.lmsCertificate.findUnique({ where: { id } });
  if (!row || row.learnerEmail.trim().toLowerCase() !== email) {
    return { ok: false, message: "Certificate not found." };
  }

  // Learner may download their own certificate once ready; admin approval only affects public listing.
  if (row.status !== "ready" && row.status !== "pending") {
    if (!(forceRegenerate && row.status === "failed")) {
      return { ok: false, message: "Certificate is not ready yet.", status: row.status };
    }
  }

  const course = await findCourse(row.courseSlug);
  if (!course) {
    return { ok: false, message: "Course not found for this certificate." };
  }

  const perms = resolveCertificatePermissions(course);
  const apiConfigured = isCertificateApiProvider(perms);
  const mayUseLocal = mayUseLocalCertificateFallback(apiConfigured);
  const autoVisible = perms.autoVisibleWhenReady && !perms.requireAdminApproval;

  // Permanent n8n PDF already saved — instant download, skip n8n.
  const hasN8nPdf = !forceRegenerate && (await hasPermanentGeneratorPdf(id, row.issuedVia));
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

  const hasStoredPdf =
    !forceRegenerate && (await isValidArchivedCertificatePdf(id, { minBytes: 128 }));

  if (hasStoredPdf && !apiConfigured) {
    console.info("[certificate] prepare: using stored local PDF (n8n not configured)", id);
    await prisma.lmsCertificate.update({
      where: { id },
      data: { visibleToLearner: true, status: "ready" },
    });
    return {
      ok: true,
      downloadUrl: certificatePdfServePath(id),
      status: row.status,
      cached: true,
      n8nCalled: false,
    };
  }

  if (forceRegenerate) {
    console.info("[certificate] prepare: force regenerate requested", id);
    await deleteStoredCertificatePdf(id);
    await prisma.lmsCertificate.update({
      where: { id },
      data: { pdfUrl: null, status: "pending" },
    });
  } else if (hasStoredPdf && apiConfigured && !isGeneratorIssuedVia(row.issuedVia)) {
    console.info("[certificate] prepare: replacing non-API PDF — triggering generator", id);
    await deleteStoredCertificatePdf(id);
  } else if (
    row.status === "ready" &&
    !hasStoredPdf &&
    !apiConfigured &&
    (await ensureLocalCertificatePdf(id))
  ) {
    return {
      ok: true,
      downloadUrl: certificatePdfServePath(id),
      status: "ready",
      cached: false,
      n8nCalled: false,
    };
  }

  console.info("[certificate] prepare: will trigger n8n", id, row.issuedVia);

  // Temp http link from a previous n8n run — archive now without calling n8n again.
  if (!forceRegenerate && row.pdfUrl?.trim().startsWith("http")) {
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
  if (!apiConfigured) {
    if (!mayUseLocal) {
      return {
        ok: false,
        message:
          "Certificate generator API is not configured. Set CERTIFICATE_GENERATOR_API_URL in .env.local.",
      };
    }
    const created = await ensureLocalCertificatePdf(id);
    if (created && (await isValidArchivedCertificatePdf(id))) {
      await prisma.lmsCertificate.update({
        where: { id },
        data: { visibleToLearner: true, status: "ready" },
      });
      return {
        ok: true,
        downloadUrl: certificatePdfServePath(id),
        status: "ready",
        cached: false,
        n8nCalled: false,
      };
    }
    return {
      ok: false,
      message: "Certificate workflow is not configured for this course.",
    };
  }

  const content = await readAdminContent();
  const assets = resolveCourseCertificateAssets(content, row.courseSlug);
  if (!courseCertificateAssetsReady(assets)) {
    return { ok: false, message: COURSE_CERTIFICATE_ASSETS_MISSING_MESSAGE };
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
  const dispatched = await retryCertificateGeneration({
    row,
    course,
    courseRow,
    perms,
    learnerName: row.learnerName ?? undefined,
    scorePercent: row.scorePercent ?? undefined,
  });

  if (dispatched.ok) {
    const n8nSent = dispatched.n8nSent;
    if (await isValidArchivedCertificatePdf(id, { minBytes: N8N_ARCHIVED_PDF_MIN_BYTES })) {
      return {
        ok: true,
        downloadUrl: certificatePdfServePath(id),
        status: "ready",
        n8nCalled: true,
        cached: false,
        n8nSent,
        message: dispatched.message,
      };
    }

    if (mayUseLocal && (await ensureLocalCertificatePdf(id))) {
      return {
        ok: true,
        downloadUrl: certificatePdfServePath(id),
        status: "ready",
        n8nCalled: true,
        cached: false,
        n8nSent,
        message: dispatched.message,
      };
    }

    return {
      ok: true,
      downloadUrl: certificatePdfServePath(id),
      status: dispatched.certificate.status ?? "pending",
      n8nCalled: true,
      cached: false,
      n8nSent,
      message: dispatched.message,
    };
  }

  if (mayUseLocal) {
    const created = await ensureLocalCertificatePdf(id);
    if (created && (await isValidArchivedCertificatePdf(id))) {
      await prisma.lmsCertificate.update({
        where: { id },
        data: { visibleToLearner: true, status: "ready" },
      });
      return {
        ok: true,
        downloadUrl: certificatePdfServePath(id),
        status: "ready",
        n8nCalled: true,
        cached: false,
      };
    }
  }
  return { ok: false, message: dispatched.message, status: row.status, n8nCalled: true };
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
      issuedVia: storedPdfUrl ? "api" : row.issuedVia,
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
  return requestCourseCertificate({ ...input, forceRetry: true });
}

/**
 * Generate certificate via direct API call (course templates from admin).
 * Used by the learner Generate button.
 */
export async function triggerCertificateGeneration(input: {
  certificateId: string;
  learnerEmail: string;
}): Promise<
  | {
      ok: true;
      apiCalled: true;
      n8nCalled: true;
      generatorSent: CertificateGeneratorSentSummary;
      n8nSent: CertificateGeneratorSentSummary;
      message: string;
      certificate: CertificateRowDto;
    }
  | { ok: false; message: string }
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

  const course = await findCourse(row.courseSlug);
  if (!course) {
    return { ok: false, message: "Course not found for this certificate." };
  }

  const perms = resolveCertificatePermissions(course);
  if (!perms.enabled) {
    return { ok: false, message: "Certificates are not enabled for this course." };
  }
  if (!isCertificateApiProvider(perms)) {
    return {
      ok: false,
      message:
        "Certificate generator API is not configured. Set CERTIFICATE_GENERATOR_API_URL in .env.local.",
    };
  }

  const content = await readAdminContent();
  const assets = resolveCourseCertificateAssets(content, row.courseSlug);
  if (!courseCertificateAssetsReady(assets)) {
    return { ok: false, message: COURSE_CERTIFICATE_ASSETS_MISSING_MESSAGE };
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

  const registration = await lookupRegistrationByEmail(email);
  if (!registration?.identificationNumber) {
    return {
      ok: false,
      message: "User must be registered in MySQL before requesting a certificate.",
    };
  }

  await deleteStoredCertificatePdf(id);
  await prisma.lmsCertificate.update({
    where: { id },
    data: {
      pdfUrl: null,
      status: "pending",
      issuedVia: "course-template",
      templateImage: assets.templateImage,
      badgeImage: assets.badgeImage,
    },
  });

  const displayName =
    row.learnerName?.trim() ??
    registration.name?.trim() ??
    registration.companyName ??
    email.split("@")[0];

  const freshRow = await prisma.lmsCertificate.findUnique({ where: { id } });
  if (!freshRow) {
    return { ok: false, message: "Certificate not found." };
  }

  const dispatched = await dispatchCertificateGeneration({
    row: freshRow,
    course,
    registration,
    perms,
    assets,
    displayName,
    scorePercent: freshRow.scorePercent,
  });

  if (!dispatched.ok) {
    return { ok: false, message: dispatched.message };
  }

  return {
    ok: true,
    apiCalled: true,
    n8nCalled: true,
    generatorSent: dispatched.generatorSent,
    n8nSent: dispatched.n8nSent,
    message: dispatched.message,
    certificate: dispatched.certificate,
  };
}

/** @deprecated Use triggerCertificateGeneration */
export const triggerN8nCertificateGeneration = triggerCertificateGeneration;
