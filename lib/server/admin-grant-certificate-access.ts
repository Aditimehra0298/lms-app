import { findCertificateProgram } from "@/lib/certificate-program-resolve";
import { canonicalCourseSlug } from "@/lib/course-slug-aliases";
import { normalizeLearnerEmail } from "@/lib/learner-email";
import { prisma } from "@/lib/prisma";
import { issueCourseCertificate } from "@/lib/server/certificate-service";
import { readAdminContent } from "@/lib/server/content-store";
import { ensureCourseInMysql } from "@/lib/server/course-mysql-sync";
import { isCertificateApiProvider } from "@/lib/server/certificate-generation-policy";
import { resolveCertificatePermissions } from "@/lib/server/certificate-permissions";
import { requestCourseCertificate } from "@/lib/server/n8n-certificate-service";
import { ensureProgressForReadyCertificate } from "@/lib/server/learner-course-progress-store";
import { ensureLocalCertificatePdf } from "@/lib/server/local-certificate-fallback";

export type GrantCertificateDownloadResult =
  | { ok: true; granted: false; message: string }
  | { ok: true; granted: true; message: string; certificateId: string }
  | { ok: false; message: string };

/** Issue or unlock a certificate so the learner can download after admin grants course access. */
export async function grantLearnerCertificateDownloadAccess(input: {
  learnerEmail: string;
  courseSlug: string;
}): Promise<GrantCertificateDownloadResult> {
  const learnerEmail = normalizeLearnerEmail(input.learnerEmail);
  const rawSlug = input.courseSlug.trim();
  if (!learnerEmail || !rawSlug) {
    return { ok: false, message: "Learner email and course slug are required." };
  }

  const content = await readAdminContent();
  const want = canonicalCourseSlug(rawSlug) || rawSlug.toLowerCase();
  const program =
    findCertificateProgram(content, rawSlug) ||
    findCertificateProgram(content, want) ||
    (() => {
      const course = content.managedCourses?.find(
        (c) =>
          canonicalCourseSlug(c.slug) === want ||
          c.slug.toLowerCase() === rawSlug.toLowerCase(),
      );
      return course ? findCertificateProgram(content, course.slug) : undefined;
    })();

  if (!program) {
    return {
      ok: false,
      message: `Course not found in catalog for slug "${rawSlug}".`,
    };
  }

  const courseSlug = program.slug;
  const perms = resolveCertificatePermissions(program);
  if (!perms.enabled) {
    return {
      ok: false,
      message: "Certificates are not enabled for this program (Course → Certificate → enable).",
    };
  }

  await ensureCourseInMysql({
    slug: program.slug,
    title: program.title,
    subtitle: program.subtitle,
    category: program.category,
    level: program.level,
    published: program.published,
    learningFormat: program.learningFormat,
  });

  let certificateId: string | null = null;
  let scorePercent: number | null = null;
  const notes: string[] = [];

  // Always try n8n first when the webhook is configured.
  if (isCertificateApiProvider(perms)) {
    try {
      const apiResult = await requestCourseCertificate({
        learnerEmail,
        courseSlug,
        forceRetry: true,
        bypassLearnerGates: true,
      });
      if (apiResult.ok) {
        certificateId = apiResult.certificate.id;
        scorePercent = apiResult.certificate.scorePercent ?? null;

        const { triggerCertificateGeneration } = await import(
          "@/lib/server/n8n-certificate-service"
        );
        const generated = await triggerCertificateGeneration({
          certificateId,
          learnerEmail,
          forceRegenerate: true,
        });
        if (generated.ok) {
          await prisma.lmsCertificate.update({
            where: { id: certificateId },
            data: { status: "ready", visibleToLearner: true },
          });
          await ensureProgressForReadyCertificate({
            learnerEmail,
            courseSlug,
            scorePercent,
          });
          return {
            ok: true,
            granted: true,
            message: generated.message || "Certificate generated via n8n and download enabled.",
            certificateId,
          };
        }
        notes.push(generated.message);
      } else {
        notes.push(apiResult.message);
      }
    } catch (err) {
      notes.push(err instanceof Error ? err.message : "n8n certificate request failed");
    }
  }

  if (!certificateId) {
    const existing = await prisma.lmsCertificate.findFirst({
      where: { learnerEmail, courseSlug },
      orderBy: { issuedAt: "desc" },
      select: { id: true, scorePercent: true },
    });
    if (existing) {
      certificateId = existing.id;
      scorePercent = existing.scorePercent;
    } else {
      const issued = await issueCourseCertificate({ learnerEmail, courseSlug });
      if (!issued.ok) {
        return {
          ok: false,
          message: [issued.message, ...notes].filter(Boolean).join(" | "),
        };
      }
      certificateId = issued.certificate.id;
      scorePercent = issued.certificate.scorePercent ?? null;
    }
  }

  // Safety net only if n8n did not return a usable PDF.
  const localOk = await ensureLocalCertificatePdf(certificateId).catch(() => false);
  await prisma.lmsCertificate.update({
    where: { id: certificateId },
    data: {
      status: "ready",
      visibleToLearner: true,
    },
  });
  if (!localOk) {
    notes.push("Local PDF overlay could not be built; status forced ready for visibility.");
  } else {
    notes.push("Served local PDF fallback because n8n did not return a PDF yet.");
  }

  await ensureProgressForReadyCertificate({
    learnerEmail,
    courseSlug,
    scorePercent,
  });

  return {
    ok: true,
    granted: true,
    message: notes.length
      ? `Certificate ready. Notes: ${notes.join(" | ")}`
      : "Certificate issued and download enabled for this learner.",
    certificateId,
  };
}
