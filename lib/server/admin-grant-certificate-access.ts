import { findCertificateProgram } from "@/lib/certificate-program-resolve";
import { normalizeLearnerEmail } from "@/lib/learner-email";
import { prisma } from "@/lib/prisma";
import { issueCourseCertificate } from "@/lib/server/certificate-service";
import { readAdminContent } from "@/lib/server/content-store";
import { isCertificateApiProvider } from "@/lib/server/certificate-generation-policy";
import { resolveCertificatePermissions } from "@/lib/server/certificate-permissions";
import { requestCourseCertificate } from "@/lib/server/n8n-certificate-service";

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
  const courseSlug = input.courseSlug.trim().toLowerCase();
  if (!learnerEmail || !courseSlug) {
    return { ok: false, message: "Learner email and course slug are required." };
  }

  const content = await readAdminContent();
  const program = findCertificateProgram(content, courseSlug);
  if (!program) {
    return { ok: true, granted: false, message: "No certificate configured for this program." };
  }

  const perms = resolveCertificatePermissions(program);
  if (!perms.enabled) {
    return { ok: true, granted: false, message: "Certificates are not enabled for this program." };
  }

  if (isCertificateApiProvider(perms)) {
    const apiResult = await requestCourseCertificate({
      learnerEmail,
      courseSlug,
      forceRetry: true,
      bypassLearnerGates: true,
    });
    if (!apiResult.ok) {
      return { ok: false, message: apiResult.message };
    }
    await prisma.lmsCertificate.update({
      where: { id: apiResult.certificate.id },
      data: { visibleToLearner: true },
    });
    return {
      ok: true,
      granted: true,
      message: "Certificate download is enabled for this learner.",
      certificateId: apiResult.certificate.id,
    };
  }

  let cert = await prisma.lmsCertificate.findFirst({
    where: { learnerEmail, courseSlug },
    orderBy: { issuedAt: "desc" },
    select: { id: true },
  });

  if (!cert) {
    const issued = await issueCourseCertificate({ learnerEmail, courseSlug });
    if (!issued.ok) {
      return { ok: false, message: issued.message };
    }
    cert = { id: issued.certificate.id };
  }

  await prisma.lmsCertificate.update({
    where: { id: cert.id },
    data: {
      status: "ready",
      visibleToLearner: true,
    },
  });

  const { ensureLocalCertificatePdf } = await import("@/lib/server/local-certificate-fallback");
  await ensureLocalCertificatePdf(cert.id);

  return {
    ok: true,
    granted: true,
    message: "Certificate download is enabled for this learner.",
    certificateId: cert.id,
  };
}
