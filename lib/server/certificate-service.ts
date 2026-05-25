import type { ManagedCourse, ManagedCourseCertificateConfig } from "@/lib/content-schema";
import {
  formatCertificateNumber,
  formatMonthYear,
  formatOrganizationCertificateNumber,
} from "@/lib/certificate-ids";
import { readAdminContent } from "@/lib/server/content-store";
import { prisma } from "@/lib/prisma";
import {
  ensureOrganizationProfile,
  getOrganizationByWorkEmail,
} from "@/lib/server/organization-identification";
import { ensureUserIdentificationNumber } from "@/lib/server/user-identification";

import type { IssuedCertificateDto, SupplementaryDoc } from "@/lib/certificate-types";

export type { IssuedCertificateDto, SupplementaryDoc };

const DEFAULT_TEMPLATE = "/certificates/haccp-certificate-template.jpg";

export function resolveCertificateConfig(course: ManagedCourse): Required<
  Pick<
    ManagedCourseCertificateConfig,
    "templateImage" | "badgeImage" | "title" | "nameTopPercent" | "numberTopPercent" | "dateTopPercent"
  >
> & { supplementaryDocs: SupplementaryDoc[]; enabled: boolean } {
  const cfg = course.certificateConfig ?? {};
  const hero = course.hero ?? {};
  return {
    enabled: cfg.enabled !== false && (hero.certificate ?? "").trim().toLowerCase() !== "no",
    templateImage:
      cfg.templateImage?.trim() ||
      hero.certificatePreviewImage?.trim() ||
      DEFAULT_TEMPLATE,
    badgeImage: cfg.badgeImage?.trim() || "",
    title: cfg.title?.trim() || hero.certificatePreviewLabel?.trim() || "Certificate of Attainment",
    nameTopPercent: cfg.nameTopPercent ?? 42,
    numberTopPercent: cfg.numberTopPercent ?? 52,
    dateTopPercent: cfg.dateTopPercent ?? 62,
    supplementaryDocs: Array.isArray(cfg.supplementaryDocs)
      ? cfg.supplementaryDocs.filter((d) => d?.title?.trim() && d?.url?.trim())
      : [],
  };
}

async function nextIssueSequence(
  identificationNumber: number,
  issuedAt: Date,
  holderType: "individual" | "organisation",
): Promise<number> {
  const monthYear = formatMonthYear(issuedAt);
  const prefix =
    holderType === "organisation"
      ? `${identificationNumber}-org/${monthYear}/`
      : `${identificationNumber}/${monthYear}/`;
  const existing = await prisma.lmsCertificate.findMany({
    where: { certificateNumber: { startsWith: prefix } },
    select: { certificateNumber: true },
  });
  let max = 0;
  for (const row of existing) {
    const parts = row.certificateNumber.split("/");
    const seq = parseInt(parts[parts.length - 1] ?? "0", 10);
    if (seq > max) max = seq;
  }
  return max + 1;
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
  const course = content.managedCourses?.find((c) => c.slug === slug);
  if (!course) return { ok: false, message: "Course not found in catalog." };

  const cfg = resolveCertificateConfig(course);
  if (!cfg.enabled) return { ok: false, message: "Certificates are not enabled for this course." };

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
  const sequence = await nextIssueSequence(identificationNumber, issuedAt, holderType);
  const certificateNumber =
    holderType === "organisation"
      ? formatOrganizationCertificateNumber(identificationNumber, issuedAt, sequence)
      : formatCertificateNumber(identificationNumber, issuedAt, sequence);

  const row = await prisma.lmsCertificate.create({
    data: {
      userId: user?.id,
      organizationId,
      holderType,
      learnerEmail: email,
      learnerName: displayName,
      courseSlug: slug,
      courseTitle: course.title,
      certificateNumber,
      identificationNumber,
      scorePercent: input.scorePercent ?? null,
      templateImage: cfg.templateImage,
      badgeImage: cfg.badgeImage || null,
      supplementaryDocs: cfg.supplementaryDocs.length > 0 ? cfg.supplementaryDocs : undefined,
    },
  });

  return { ok: true, certificate: await enrichCertificate(serializeCertificate(row, companyName)) };
}

function serializeCertificate(
  row: {
    id: string;
    certificateNumber: string;
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
    const course = content.managedCourses?.find((c) => c.slug === cert.courseSlug);
    if (course) {
      const cfg = resolveCertificateConfig(course);
      return {
        ...cert,
        nameTopPercent: cfg.nameTopPercent,
        numberTopPercent: cfg.numberTopPercent,
        dateTopPercent: cfg.dateTopPercent,
      };
    }
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

export async function getCertificateById(id: string): Promise<IssuedCertificateDto | null> {
  const row = await prisma.lmsCertificate.findUnique({ where: { id } });
  if (!row) return null;
  return enrichCertificate(serializeCertificate(row));
}

export async function verifyCertificateNumber(
  certificateNumber: string,
): Promise<IssuedCertificateDto | null> {
  const row = await prisma.lmsCertificate.findUnique({
    where: { certificateNumber: certificateNumber.trim() },
  });
  return row ? enrichCertificate(serializeCertificate(row)) : null;
}
