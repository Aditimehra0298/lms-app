import { NextResponse } from "next/server";
import { findCertificateProgram } from "@/lib/certificate-program-resolve";
import { normalizeLearnerEmail } from "@/lib/learner-email";
import { prisma } from "@/lib/prisma";
import { issueCourseCertificate } from "@/lib/server/certificate-service";
import { readAdminContent } from "@/lib/server/content-store";
import {
  findExistingEnrollment,
  reconcileEnrollmentIdentity,
} from "@/lib/server/enrollment-lookup";
import { isCertificateApiProvider } from "@/lib/server/certificate-generation-policy";
import { resolveCertificatePermissions } from "@/lib/server/certificate-permissions";
import { requestCourseCertificate } from "@/lib/server/n8n-certificate-service";
import { recordPurchasesForLearner } from "@/lib/server/record-purchase";

export const dynamic = "force-dynamic";

type ActionBody = {
  learnerEmail?: string;
  action?: "bypass-access" | "manual-certificate-pass";
};

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const courseSlug = slug.trim().toLowerCase();
  if (!courseSlug) {
    return NextResponse.json({ ok: false, message: "course slug required" }, { status: 400 });
  }

  let body: ActionBody;
  try {
    body = (await request.json()) as ActionBody;
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON" }, { status: 400 });
  }

  const learnerEmail = normalizeLearnerEmail(body.learnerEmail ?? "");
  if (!learnerEmail) {
    return NextResponse.json({ ok: false, message: "learnerEmail required" }, { status: 400 });
  }
  if (!body.action) {
    return NextResponse.json({ ok: false, message: "action required" }, { status: 400 });
  }

  try {
    if (body.action === "bypass-access") {
      const existing = await findExistingEnrollment({ learnerEmail, courseSlug });
      if (existing) {
        const user = await prisma.lmsUser.findUnique({
          where: { email: learnerEmail },
          select: { id: true },
        });
        await reconcileEnrollmentIdentity(existing, learnerEmail, user?.id ?? null);
        return NextResponse.json({
          ok: true,
          message: "Learner is already enrolled for this course.",
        });
      }

      const course = await prisma.lmsCourse.findUnique({
        where: { slug: courseSlug },
        select: { title: true },
      });
      const result = await recordPurchasesForLearner({
        learnerEmail,
        courses: [{ slug: courseSlug, title: course?.title ?? courseSlug }],
      });
      if (!result.ok) {
        return NextResponse.json({ ok: false, message: result.message }, { status: 400 });
      }
      return NextResponse.json({ ok: true, message: "Learner added to this course." });
    }

    // manual-certificate-pass
    const content = await readAdminContent();
    const program = findCertificateProgram(content, courseSlug);
    const perms = program ? resolveCertificatePermissions(program) : null;

    if (perms && isCertificateApiProvider(perms)) {
      const apiResult = await requestCourseCertificate({
        learnerEmail,
        courseSlug,
        forceRetry: true,
      });
      if (!apiResult.ok) {
        return NextResponse.json({ ok: false, message: apiResult.message }, { status: 400 });
      }
      await prisma.lmsCertificate.update({
        where: { id: apiResult.certificate.id },
        data: { visibleToLearner: true },
      });
      return NextResponse.json({
        ok: true,
        message:
          "Certificate generated using this course's uploaded templates.",
      });
    }

    let cert = await prisma.lmsCertificate.findFirst({
      where: { learnerEmail, courseSlug },
      orderBy: { issuedAt: "desc" },
      select: { id: true },
    });

    if (!cert) {
      const issued = await issueCourseCertificate({
        learnerEmail,
        courseSlug,
      });
      if (!issued.ok) {
        return NextResponse.json({ ok: false, message: issued.message }, { status: 400 });
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

    return NextResponse.json({
      ok: true,
      message: "Manual certificate pass applied and learner download is enabled.",
    });
  } catch (err) {
    console.error("[admin/courses/[slug]/students/actions]", err);
    return NextResponse.json({ ok: false, message: "Action failed." }, { status: 503 });
  }
}

