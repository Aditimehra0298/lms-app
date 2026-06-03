import type { ManagedCourse, ManagedCourseCertificateConfig } from "@/lib/content-schema";
import { readAdminContent } from "@/lib/server/content-store";
import {
  resolveCertificateAssetsForCourse,
  resolveGlobalCertificateAssets,
} from "@/lib/global-certificate-assets";
import { allocateSftCertificateNumber } from "@/lib/server/certificate-number-issue";
import { allocateDelegateNumber } from "@/lib/server/delegate-number-issue";
import { buildCertificateVerifyUrl } from "@/lib/certificate-verify-url";
import { prisma } from "@/lib/prisma";
import {
  ensureOrganizationProfile,
  getOrganizationByWorkEmail,
} from "@/lib/server/organization-identification";
import { ensureUserIdentificationNumber } from "@/lib/server/user-identification";

import type { IssuedCertificateDto, SupplementaryDoc } from "@/lib/certificate-types";

export type { IssuedCertificateDto, SupplementaryDoc };

const DEFAULT_TEMPLATE = "/certificates/haccp-certificate-template.jpg";

export function resolveCertificateConfig(
  course: ManagedCourse,
  content?: Awaited<ReturnType<typeof readAdminContent>>,
): Required<
  Pick<
    ManagedCourseCertificateConfig,
    "templateImage" | "badgeImage" | "title" | "nameTopPercent" | "numberTopPercent" | "dateTopPercent"
  >
> & { supplementaryDocs: SupplementaryDoc[]; enabled: boolean } {
  const cfg = course.certificateConfig ?? {};
  const hero = course.hero ?? {};
  const globalAssets = content
    ? resolveCertificateAssetsForCourse(content, course)
    : null;
  /** One shared design for every course — only learner/course fields vary on issue. */
  return {
    enabled: cfg.enabled !== false && (hero.certificate ?? "").trim().toLowerCase() !== "no",
    templateImage: globalAssets?.templateImage || DEFAULT_TEMPLATE,
    badgeImage: globalAssets?.badgeImage || "",
    title: cfg.title?.trim() || hero.certificatePreviewLabel?.trim() || "Certificate of Attainment",
    nameTopPercent: cfg.nameTopPercent ?? 42,
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
  const course = content.managedCourses?.find((c) => c.slug === slug);
  if (!course) return { ok: false, message: "Course not found in catalog." };

  const cfg = resolveCertificateConfig(course, content);
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
      courseTitle: course.title,
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
    const global = resolveGlobalCertificateAssets(content);
    const transcriptDocs = global.transcriptFile
      ? [{ title: "Transcript", url: global.transcriptFile }]
      : cert.supplementaryDocs;
    const course = content.managedCourses?.find((c) => c.slug === cert.courseSlug);
    const cfg = course ? resolveCertificateConfig(course, content) : null;
    return {
      ...cert,
      templateImage: global.templateImage,
      badgeImage: global.badgeImage || cert.badgeImage,
      supplementaryDocs: transcriptDocs,
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
  if (!row || row.status !== "ready") return null;
  return enrichCertificate(serializeCertificate(row));
}

export async function verifyCertificateByDelegate(
  delegateNumber: string,
): Promise<IssuedCertificateDto | null> {
  const row = await prisma.lmsCertificate.findUnique({
    where: { delegateNumber: delegateNumber.trim() },
  });
  if (!row || row.status !== "ready") return null;
  return enrichCertificate(serializeCertificate(row));
}

export async function verifyCertificateLookup(input: {
  number?: string;
  delegate?: string;
}): Promise<IssuedCertificateDto | null> {
  const delegate = input.delegate?.trim();
  if (delegate) {
    const byDelegate = await verifyCertificateByDelegate(delegate);
    if (byDelegate) return byDelegate;
  }
  const number = input.number?.trim();
  if (number) return verifyCertificateNumber(number);
  return null;
}
