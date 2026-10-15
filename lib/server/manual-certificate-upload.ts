import { prisma } from "@/lib/prisma";
import { findCertificateProgram } from "@/lib/certificate-program-resolve";
import { readAdminContent } from "@/lib/server/content-store";
import { ensureCourseInMysql, getCourseBySlug } from "@/lib/server/course-mysql-sync";
import { lookupRegistrationByEmail } from "@/lib/server/registration-lookup";
import { allocateSftCertificateNumber } from "@/lib/server/certificate-number-issue";
import { allocateDelegateNumber } from "@/lib/server/delegate-number-issue";
import { persistCertificatePdf } from "@/lib/server/certificate-pdf-store";

export type ManualCertificateUploadResult =
  | {
      ok: true;
      created: boolean;
      certificate: { id: string; certificateNumber: string; delegateNumber: string | null; courseTitle: string };
    }
  | { ok: false; message: string };

/**
 * Admin uploads a hand-made certificate PDF for one exceptional learner + course.
 * The PDF is saved on LMS disk and published to the learner dashboard immediately.
 * Because a saved PDF already exists, the normal flow serves it instead of calling n8n.
 */
export async function uploadManualCertificatePdf(input: {
  learnerEmail: string;
  courseSlug: string;
  pdfBase64: string;
  learnerName?: string;
  uploadedByEmail?: string | null;
}): Promise<ManualCertificateUploadResult> {
  const email = input.learnerEmail.trim().toLowerCase();
  const slug = input.courseSlug.trim();
  if (!email || !slug) return { ok: false, message: "Learner email and course are required." };

  const course = findCertificateProgram(await readAdminContent(), slug);
  if (!course) return { ok: false, message: "Course not found." };

  let row = await prisma.lmsCertificate.findFirst({
    where: { learnerEmail: email, courseSlug: slug, status: { not: "revoked" } },
    orderBy: { issuedAt: "desc" },
  });
  const created = !row;

  if (!row) {
    const registration = await lookupRegistrationByEmail(email);
    if (!registration?.identificationNumber) {
      return { ok: false, message: "No registered learner with this email. They must sign up on the LMS first." };
    }
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
    if (!courseRow) return { ok: false, message: "Could not save course to MySQL (lms_course)." };

    const holderType = registration.accountType === "organisation" ? "organisation" : "individual";
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
    row = await prisma.lmsCertificate.create({
      data: {
        learnerEmail: email,
        learnerName:
          input.learnerName?.trim() || registration.name?.trim() || registration.companyName || email.split("@")[0],
        courseSlug: slug,
        courseId: courseRow.id,
        courseTitle: course.title,
        certificateNumber,
        delegateNumber,
        verifyNumber,
        identificationNumber: registration.identificationNumber,
        holderType,
        status: "pending",
        visibleToLearner: false,
        issuedVia: "manual",
        issuedAt,
      },
    });
  }

  const persisted = await persistCertificatePdf({ certificateId: row.id, pdfBase64: input.pdfBase64 });
  if (!persisted.ok) return { ok: false, message: persisted.message };

  const updated = await prisma.lmsCertificate.update({
    where: { id: row.id },
    data: {
      status: "ready",
      pdfUrl: persisted.storedUrl,
      visibleToLearner: true,
      issuedVia: "manual",
      ...(input.learnerName?.trim() ? { learnerName: input.learnerName.trim() } : {}),
      ...(row.status !== "ready" ? { issuedAt: new Date() } : {}),
    },
  });

  console.info(
    "[manual-certificate-upload]",
    JSON.stringify({ id: updated.id, email, slug, created, by: input.uploadedByEmail ?? null }),
  );

  return {
    ok: true,
    created,
    certificate: {
      id: updated.id,
      certificateNumber: updated.certificateNumber,
      delegateNumber: updated.delegateNumber,
      courseTitle: updated.courseTitle,
    },
  };
}
