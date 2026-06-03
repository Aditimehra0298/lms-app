import type { ManagedCourse } from "@/lib/content-schema";
import { buildCertificateVerifyUrl } from "@/lib/certificate-verify-url";
import { allocateDelegateNumber } from "@/lib/server/delegate-number-issue";
import {
  resolveCertificateAssetsForCourse,
  resolveGlobalCertificateAssets,
} from "@/lib/global-certificate-assets";
import { readAdminContent } from "@/lib/server/content-store";
import { allocateSftCertificateNumber } from "@/lib/server/certificate-number-issue";
import {
  resolveCertificatePermissions,
  shouldShowOnLearnerDashboard,
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
  persistCertificatePdf,
  resolveStoredCertificatePdfUrl,
} from "@/lib/server/certificate-pdf-store";

export type { AdminCertificateRowDto, CertificateRowDto };

function learnerAccessLabel(
  status: string,
  visibleToLearner: boolean,
): AdminCertificateRowDto["learnerAccess"] {
  if (status !== "ready") return "pending";
  return visibleToLearner ? "allowed" : "blocked";
}

/** Force every admin preview/list row to use the single global template (not per-course files). */
async function withSharedCertificateDesign(
  rows: CertificateRowDto[],
): Promise<CertificateRowDto[]> {
  const content = await readAdminContent();
  const global = resolveGlobalCertificateAssets(content);
  const transcriptDocs = global.transcriptFile
    ? [{ title: "Transcript", url: global.transcriptFile }]
    : [];
  return rows.map((dto) => ({
    ...dto,
    templateImage: global.templateImage,
    badgeImage: global.badgeImage || dto.badgeImage,
    supplementaryDocs: transcriptDocs.length > 0 ? transcriptDocs : dto.supplementaryDocs,
  }));
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

function appBaseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel}`;
  return "http://localhost:3000";
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
  const verifyUrl = buildCertificateVerifyUrl(appBaseUrl(), {
    delegateNumber: row.delegateNumber,
    certificateNumber: row.certificateNumber,
  });
  const pdfUrl = await resolveStoredCertificatePdfUrl(row.id, row.pdfUrl);
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
  };
}

async function findCourse(slug: string): Promise<ManagedCourse | undefined> {
  const content = await readAdminContent();
  return content.managedCourses?.find((c) => c.slug === slug);
}

/** Learner passed exam → request certificate via n8n (or builtin fallback). */
export async function requestCourseCertificate(input: {
  learnerEmail: string;
  learnerName?: string;
  courseSlug: string;
  scorePercent?: number;
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
  });
  if (existing) {
    if (existing.status === "pending") {
      return {
        ok: true,
        certificate: await toDto(existing),
        message: "Certificate is already being generated.",
      };
    }
    if (existing.status === "ready") {
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
  const assets = resolveCertificateAssetsForCourse(content, course);
  if (!assets.templateImage || !assets.badgeImage || !assets.transcriptFile) {
    return {
      ok: false,
      message:
        "Certificate templates are not uploaded yet. Admin → Users & Access → Certificates → upload all 3 files (one design for every course).",
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
  const verifyUrl = buildCertificateVerifyUrl(appBaseUrl(), { delegateNumber });
  const issueDate = formatIssueDate(issuedAt);
  const grade = formatGrade(input.scorePercent);

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

  const callbackUrl = `${appBaseUrl()}/api/certificates/n8n-callback`;
  const payload = {
    event: "course_completed",
    certificateId: row.id,
    callbackUrl,
    email,
    learnerName: displayName,
    learner: registration
      ? {
          ...registration,
          displayName,
          delegateNumber,
        }
      : { email, displayName, delegateNumber },
    courseSlug: slug,
    courseTitle: course.title,
    course: courseRow,
    courseCategory: course.category,
    courseLevel: course.level,
    courseDuration: course.duration,
    courseMode: formatLearningMode(course.learningFormat),
    scorePercent: input.scorePercent ?? null,
    completedAt: issuedAt.toISOString(),
    registration,
    requireAdminApproval: perms.requireAdminApproval,
    autoVisibleWhenReady: perms.autoVisibleWhenReady,
    assets: {
      certificateTemplate: assets.templateImage,
      badge: assets.badgeImage,
      transcriptTemplate: assets.transcriptFile,
    },
    certificateFields: {
      candidateName: displayName,
      courseName: course.title,
      duration: course.duration,
      mode: formatLearningMode(course.learningFormat),
      issueDate,
      certificateNumber,
      delegateNumber,
      verifyUrl,
    },
    transcriptFields: {
      candidateName: displayName,
      trainingProgram: course.title,
      grade,
      certificateNumber,
      issueDate,
      delegateNumber,
    },
    tracker: {
      delegateNumber,
      verifyNumber,
      verifyUrl,
      qrCodeData: verifyUrl,
    },
  };

  try {
    const res = await fetch(perms.n8nWebhookUrl, {
      method: "POST",
      headers: buildN8nWebhookHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      await prisma.lmsCertificate.update({
        where: { id: row.id },
        data: { status: "failed" },
      });
      return { ok: false, message: `n8n webhook returned ${res.status}. Check your workflow.` };
    }
  } catch (err) {
    await prisma.lmsCertificate.update({
      where: { id: row.id },
      data: { status: "failed" },
    });
    const msg = err instanceof Error ? err.message : "n8n request failed";
    return { ok: false, message: msg };
  }

  return {
    ok: true,
    certificate: await toDto(row),
    message: "Certificate generation started in n8n.",
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
      storedPdfUrl = input.pdfUrl?.trim() || certificatePdfServePath(id);
    }
  }

  await prisma.lmsCertificate.update({
    where: { id },
    data: {
      status,
      certificateNumber: input.certificateNumber?.trim() || row.certificateNumber,
      pdfUrl: storedPdfUrl ?? input.pdfUrl?.trim() ?? null,
      visibleToLearner: visible,
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
    const course = content.managedCourses?.find((c) => c.slug === row.courseSlug);
    if (!course) continue;
    const perms = resolveCertificatePermissions(course);
    if (!shouldShowOnLearnerDashboard(perms, row)) continue;
    out.push(await toDto(row));
  }

  return out;
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
  const [enriched] = await enrichAdminCertificateRows(shared);
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
