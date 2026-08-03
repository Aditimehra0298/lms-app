import type { ManagedCourseCertificateConfig } from "@/lib/content-schema";
import { findCertificateProgram, type CertificateProgramRef } from "@/lib/certificate-program-resolve";
import { readAdminContent } from "@/lib/server/content-store";
import {
  resolveCertificateAssetsForSlug,
  resolveCertificateAssetsFromConfig,
} from "@/lib/global-certificate-assets";
import { allocateSftCertificateNumber } from "@/lib/server/certificate-number-issue";
import { allocateDelegateNumber } from "@/lib/server/delegate-number-issue";
import { buildCertificateVerifyUrl } from "@/lib/certificate-verify-url";
import { prisma } from "@/lib/prisma";
import {
  isValidArchivedCertificatePdf,
  N8N_ARCHIVED_PDF_MIN_BYTES,
  resolveStoredCertificatePdfUrl,
} from "@/lib/server/certificate-pdf-store";
import {
  ensureOrganizationProfile,
  getOrganizationByWorkEmail,
} from "@/lib/server/organization-identification";
import { ensureUserIdentificationNumber } from "@/lib/server/user-identification";
import { allocateEmployeeCertificateNumbers } from "@/lib/server/organization-employee-certificate";

import type { IssuedCertificateDto, SupplementaryDoc } from "@/lib/certificate-types";

export type { IssuedCertificateDto, SupplementaryDoc };

const DEFAULT_TEMPLATE = "/certificates/haccp-certificate-template.jpg";

export function resolveCertificateConfig(
  program: CertificateProgramRef,
  content?: Awaited<ReturnType<typeof readAdminContent>>,
): Required<
  Pick<
    ManagedCourseCertificateConfig,
    "templateImage" | "badgeImage" | "title" | "nameTopPercent" | "numberTopPercent" | "dateTopPercent"
  >
> & { supplementaryDocs: SupplementaryDoc[]; enabled: boolean } {
  const cfg = program.certificateConfig ?? {};
  const hero = program.hero ?? {};
  const globalAssets = content
    ? resolveCertificateAssetsFromConfig(content, program.certificateConfig)
    : null;
  return {
    enabled: cfg.enabled !== false && (hero.certificate ?? "").trim().toLowerCase() !== "no",
    templateImage: globalAssets?.templateImage || DEFAULT_TEMPLATE,
    badgeImage: globalAssets?.badgeImage || cfg.badgeImage?.trim() || "",
    title: cfg.title?.trim() || hero.certificatePreviewLabel?.trim() || "Certificate of Attainment",
    nameTopPercent: cfg.nameTopPercent ?? 38,
    numberTopPercent: cfg.numberTopPercent ?? 52,
    dateTopPercent: cfg.dateTopPercent ?? 62,
    supplementaryDocs: globalAssets?.supplementaryDocs.length ? globalAssets.supplementaryDocs : [],
  };
}

export async function issueCourseCertificate(input: {
  learnerEmail: string;
  learnerName?: string;
  courseSlug: string;
  scorePercent?: number;
  accountType?: "individual" | "organisation";
  companyName?: string;
}): Promise<{ ok: true; certificate: IssuedCertificateDto } | { ok: false; message: string }> {
  const email = input.learnerEmail.trim().toLowerCase();
  const slug = input.courseSlug.trim();
  if (!email || !slug) return { ok: false, message: "Email and course slug are required." };

  const content = await readAdminContent();
  const program = findCertificateProgram(content, slug);
  if (!program) return { ok: false, message: "Course not found in catalog." };

  const cfg = resolveCertificateConfig(program, content);
  if (!cfg.enabled) return { ok: false, message: "Certificates are not enabled for this course." };

  const courseRow = await prisma.lmsCourse.findUnique({ where: { slug } });
  if (!courseRow) {
    return { ok: false, message: "Course must be synced to MySQL before issuing a certificate." };
  }

  const existing = await prisma.lmsCertificate.findFirst({
    where: { learnerEmail: email, courseSlug: slug },
  });
  if (existing) {
    return { ok: true, certificate: await enrichCertificate(serializeCertificate(existing)) };
  }

  const user = await prisma.lmsUser.findUnique({
    where: { email },
    select: {
      id: true,
      name: true,
      accountType: true,
      companyName: true,
      personalEmail: true,
      industryType: true,
      companySize: true,
    },
  });

  const isOrganisation =
    input.accountType === "organisation" ||
    user?.accountType === "organisation";

  let identificationNumber: number | null = null;
  let organizationId: string | null = null;
  let holderType: "individual" | "organisation" = "individual";
  let displayName = input.learnerName?.trim() || user?.name?.trim() || email.split("@")[0];
  let companyName: string | null = null;

  if (isOrganisation) {
    holderType = "organisation";
    const org =
      (await getOrganizationByWorkEmail(email)) ??
      (user?.companyName
        ? await ensureOrganizationProfile({
            workEmail: email,
            companyName: input.companyName?.trim() || user.companyName,
            personalEmail: user.personalEmail,
            industryType: user.industryType,
            companySize: user.companySize,
            userId: user?.id,
          })
        : null);
    if (!org) {
      return {
        ok: false,
        message:
          "Organisation must be registered with company name before issuing a certificate. Sign up as Organisation account type.",
      };
    }
    identificationNumber = org.identificationNumber;
    organizationId = org.id;
    companyName = org.companyName;
    displayName = org.companyName;
  } else {
    identificationNumber = await ensureUserIdentificationNumber(email);
    if (identificationNumber == null) {
      return { ok: false, message: "Learner must be registered in the database before issuing a certificate." };
    }
  }

  const issuedAt = new Date();
  const certificateNumber = await allocateSftCertificateNumber({
    courseIdentificationNumber: courseRow.courseIdentificationNumber,
    userIdentificationNumber: identificationNumber,
    holderType,
    issuedAt,
  });

  const { delegateNumber, verifyNumber } = await allocateDelegateNumber({
    userIdentificationNumber: identificationNumber,
    holderType,
    issuedAt,
  });

  const row = await prisma.lmsCertificate.create({
    data: {
      userId: user?.id,
      organizationId,
      holderType,
      learnerEmail: email,
      learnerName: displayName,
      courseSlug: slug,
      courseTitle: program.title,
      certificateNumber,
      delegateNumber,
      verifyNumber,
      identificationNumber,
      issuedAt,
      scorePercent: input.scorePercent ?? null,
      templateImage: cfg.templateImage,
      badgeImage: cfg.badgeImage || null,
      supplementaryDocs: cfg.supplementaryDocs.length > 0 ? cfg.supplementaryDocs : undefined,
    },
  });

  return { ok: true, certificate: await enrichCertificate(serializeCertificate(row, companyName)) };
}

/**
 * Issue a certificate for an organisation employee — same number pattern as individual learners
 * (`YYYY-MM-courseId-trainingId/userId` and `YYYY-verifyNumber-userId`, no `-org` suffix).
 */
export async function issueEmployeeCourseCertificate(input: {
  employeeEmail: string;
  employeeName?: string;
  organizationWorkEmail?: string | null;
  courseSlug: string;
  scorePercent?: number;
}): Promise<{ ok: true; certificate: IssuedCertificateDto } | { ok: false; message: string }> {
  const employeeEmail = input.employeeEmail.trim().toLowerCase();
  const slug = input.courseSlug.trim();
  if (!employeeEmail || !slug) {
    return { ok: false, message: "Employee email and course slug are required." };
  }

  const content = await readAdminContent();
  const program = findCertificateProgram(content, slug);
  if (!program) return { ok: false, message: "Course not found in catalog." };

  const cfg = resolveCertificateConfig(program, content);
  if (!cfg.enabled) return { ok: false, message: "Certificates are not enabled for this course." };

  const courseRow = await prisma.lmsCourse.findUnique({ where: { slug } });
  if (!courseRow) {
    return { ok: false, message: "Course must be synced to MySQL before issuing a certificate." };
  }

  const existing = await prisma.lmsCertificate.findFirst({
    where: { learnerEmail: employeeEmail, courseSlug: slug },
  });
  if (existing) {
    return { ok: true, certificate: await enrichCertificate(serializeCertificate(existing)) };
  }

  const allocated = await allocateEmployeeCertificateNumbers({
    employeeEmail,
    organizationWorkEmail: input.organizationWorkEmail,
    courseIdentificationNumber: courseRow.courseIdentificationNumber,
  });
  if (!allocated.ok) return allocated;

  let companyName: string | null = null;
  if (allocated.organizationId) {
    const org = await prisma.lmsOrganization.findUnique({
      where: { id: allocated.organizationId },
      select: { companyName: true },
    });
    companyName = org?.companyName ?? null;
  }

  const displayName =
    input.employeeName?.trim() ||
    (await prisma.lmsUser.findUnique({ where: { email: employeeEmail }, select: { name: true } }))
      ?.name?.trim() ||
    employeeEmail.split("@")[0];

  const issuedAt = new Date();
  const row = await prisma.lmsCertificate.create({
    data: {
      userId: allocated.userId,
      organizationId: allocated.organizationId,
      holderType: "individual",
      learnerEmail: employeeEmail,
      learnerName: displayName,
      courseSlug: slug,
      courseId: courseRow.id,
      courseTitle: program.title,
      certificateNumber: allocated.certificateNumber,
      delegateNumber: allocated.delegateNumber,
      verifyNumber: allocated.verifyNumber,
      identificationNumber: allocated.identificationNumber,
      issuedAt,
      scorePercent: input.scorePercent ?? null,
      templateImage: cfg.templateImage,
      badgeImage: cfg.badgeImage || null,
      supplementaryDocs: cfg.supplementaryDocs.length > 0 ? cfg.supplementaryDocs : undefined,
    },
  });

  return { ok: true, certificate: await enrichCertificate(serializeCertificate(row, companyName)) };
}

function appBaseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel}`;
  return "http://localhost:3000";
}

function serializeCertificate(
  row: {
    id: string;
    certificateNumber: string;
    delegateNumber?: string | null;
    verifyNumber?: number | null;
    identificationNumber: number;
    holderType?: string;
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
  },
  companyName?: string | null,
): IssuedCertificateDto {
  let supplementaryDocs: SupplementaryDoc[] = [];
  if (Array.isArray(row.supplementaryDocs)) {
    supplementaryDocs = row.supplementaryDocs as SupplementaryDoc[];
  }
  const holderType = row.holderType === "organisation" ? "organisation" : "individual";
  return {
    id: row.id,
    certificateNumber: row.certificateNumber,
    delegateNumber: row.delegateNumber ?? null,
    verifyNumber: row.verifyNumber ?? null,
    verifyUrl: buildCertificateVerifyUrl(appBaseUrl(), {
      delegateNumber: row.delegateNumber,
      certificateNumber: row.certificateNumber,
    }),
    identificationNumber: row.identificationNumber,
    holderType,
    organizationId: row.organizationId ?? null,
    companyName: companyName ?? null,
    learnerName: row.learnerName ?? row.learnerEmail,
    learnerEmail: row.learnerEmail,
    courseSlug: row.courseSlug,
    courseTitle: row.courseTitle,
    issuedAt: row.issuedAt.toISOString(),
    scorePercent: row.scorePercent,
    templateImage: row.templateImage,
    badgeImage: row.badgeImage,
    supplementaryDocs,
  };
}

async function enrichCertificate(cert: IssuedCertificateDto): Promise<IssuedCertificateDto> {
  if (cert.organizationId && !cert.companyName) {
    const org = await prisma.lmsOrganization.findUnique({
      where: { id: cert.organizationId },
      select: { companyName: true },
    });
    if (org) cert.companyName = org.companyName;
  }
  try {
    const content = await readAdminContent();
    const assets = resolveCertificateAssetsForSlug(content, cert.courseSlug);
    const program = findCertificateProgram(content, cert.courseSlug);
    const cfg = program ? resolveCertificateConfig(program, content) : null;
    return {
      ...cert,
      templateImage: assets.templateImage,
      badgeImage: assets.badgeImage || cert.badgeImage,
      supplementaryDocs: assets.supplementaryDocs.length ? assets.supplementaryDocs : cert.supplementaryDocs,
      nameTopPercent: cfg?.nameTopPercent ?? cert.nameTopPercent,
      numberTopPercent: cfg?.numberTopPercent ?? cert.numberTopPercent,
      dateTopPercent: cfg?.dateTopPercent ?? cert.dateTopPercent,
    };
  } catch {
    /* ignore */
  }
  return cert;
}

export async function listCertificatesForEmail(email: string): Promise<IssuedCertificateDto[]> {
  const rows = await prisma.lmsCertificate.findMany({
    where: { learnerEmail: email.trim().toLowerCase() },
    orderBy: { issuedAt: "desc" },
  });
  return Promise.all(rows.map((r) => enrichCertificate(serializeCertificate(r))));
}

function maskEmailForPublic(email: string): string {
  const trimmed = email.trim().toLowerCase();
  const at = trimmed.indexOf("@");
  if (at <= 0) return "***";
  const local = trimmed.slice(0, at);
  const domain = trimmed.slice(at + 1);
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}***@${domain}`;
}

async function toPublishedCertificate(
  row: {
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
  } | null,
  opts?: { forPublicVerify?: boolean },
): Promise<IssuedCertificateDto | null> {
  if (!row || row.status !== "ready") return null;
  // Dashboard list still requires visibility; public verify accepts any ready certificate.
  if (!opts?.forPublicVerify && !row.visibleToLearner) return null;
  const cert = await enrichCertificate(serializeCertificate(row));
  const pdfReady = await isValidArchivedCertificatePdf(row.id, {
    minBytes: row.issuedVia === "n8n" ? N8N_ARCHIVED_PDF_MIN_BYTES : 128,
  });
  const pdfUrl = await resolveStoredCertificatePdfUrl(row.id, row.pdfUrl);
  if (opts?.forPublicVerify) {
    return {
      ...cert,
      pdfReady,
      pdfUrl,
      learnerEmail: maskEmailForPublic(cert.learnerEmail),
    };
  }
  return { ...cert, pdfReady, pdfUrl };
}

export async function getCertificateById(id: string): Promise<IssuedCertificateDto | null> {
  const row = await prisma.lmsCertificate.findUnique({ where: { id } });
  if (!row) return null;
  const cert = await enrichCertificate(serializeCertificate(row));
  const pdfReady = await isValidArchivedCertificatePdf(row.id, {
    minBytes: row.issuedVia === "n8n" ? N8N_ARCHIVED_PDF_MIN_BYTES : 128,
  });
  const pdfUrl = await resolveStoredCertificatePdfUrl(row.id, row.pdfUrl);
  return { ...cert, pdfReady, pdfUrl };
}

export async function verifyCertificateNumber(
  certificateNumber: string,
): Promise<IssuedCertificateDto | null> {
  const row = await prisma.lmsCertificate.findUnique({
    where: { certificateNumber: certificateNumber.trim() },
  });
  return toPublishedCertificate(row, { forPublicVerify: true });
}

export async function verifyCertificateByDelegate(
  delegateNumber: string,
): Promise<IssuedCertificateDto | null> {
  const row = await prisma.lmsCertificate.findUnique({
    where: { delegateNumber: delegateNumber.trim() },
  });
  return toPublishedCertificate(row, { forPublicVerify: true });
}

export async function verifyCertificateById(id: string): Promise<IssuedCertificateDto | null> {
  const row = await prisma.lmsCertificate.findUnique({ where: { id: id.trim() } });
  return toPublishedCertificate(row, { forPublicVerify: true });
}

export async function verifyCertificateLookup(input: {
  number?: string;
  delegate?: string;
  id?: string;
  q?: string;
  /** When set, certificate must belong to this learner email. */
  email?: string;
}): Promise<IssuedCertificateDto | null> {
  const requireEmail = Boolean(input.email?.trim());
  const email = input.email?.trim().toLowerCase();
  if (requireEmail && (!email || !email.includes("@"))) return null;

  let cert: IssuedCertificateDto | null = null;

  const id = input.id?.trim();
  if (id) {
    cert = await verifyCertificateById(id);
  }

  if (!cert) {
    const delegate = input.delegate?.trim();
    if (delegate) {
      cert = await verifyCertificateByDelegate(delegate);
    }
  }

  if (!cert) {
    const number = input.number?.trim();
    if (number) {
      cert = await verifyCertificateNumber(number);
    }
  }

  if (!cert) {
    const q = input.q?.trim();
    if (q) {
      if (/^\d{4}-\d+-\d+(-org)?$/i.test(q)) {
        cert = await verifyCertificateByDelegate(q);
      }
      if (!cert) cert = await verifyCertificateNumber(q);
      if (!cert) cert = await verifyCertificateByDelegate(q);
    }
  }

  if (!cert) return null;

  if (!requireEmail || !email) return cert;

  const row =
    (cert.delegateNumber
      ? await prisma.lmsCertificate.findUnique({
          where: { delegateNumber: cert.delegateNumber },
          select: { learnerEmail: true, status: true },
        })
      : null) ??
    (await prisma.lmsCertificate.findUnique({
      where: { certificateNumber: cert.certificateNumber },
      select: { learnerEmail: true, status: true },
    }));

  if (!row || row.status !== "ready") return null;
  if (row.learnerEmail.trim().toLowerCase() !== email) return null;

  return cert;
}

/** Resolve a published certificate row for public PDF streaming. */
export async function resolvePublicCertificateRow(input: {
  delegate?: string;
  number?: string;
}) {
  const delegate = input.delegate?.trim();
  if (delegate) {
    return prisma.lmsCertificate.findUnique({ where: { delegateNumber: delegate } });
  }
  const number = input.number?.trim();
  if (number) {
    return prisma.lmsCertificate.findUnique({ where: { certificateNumber: number } });
  }
  return null;
}
