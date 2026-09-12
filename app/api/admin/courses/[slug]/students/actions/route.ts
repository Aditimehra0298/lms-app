import { NextResponse } from "next/server";
import { grantLearnerCertificateDownloadAccess } from "@/lib/server/admin-grant-certificate-access";
import { findCertificateProgram } from "@/lib/certificate-program-resolve";
import { normalizeLearnerEmail } from "@/lib/learner-email";
import { prisma } from "@/lib/prisma";
import { readAdminContent } from "@/lib/server/content-store";
import {
  findExistingEnrollment,
  reconcileEnrollmentIdentity,
} from "@/lib/server/enrollment-lookup";
import { recordPurchasesForLearner } from "@/lib/server/record-purchase";
import { assertMainAdmin } from "@/lib/server/admin-api-auth";

export const dynamic = "force-dynamic";

type ActionBody = {
  learnerEmail?: string;
  action?: "bypass-access" | "manual-certificate-pass";
};

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const denied = await assertMainAdmin(request);
  if (denied) return denied;

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

        const cert = await grantLearnerCertificateDownloadAccess({ learnerEmail, courseSlug });
        if (cert.ok && cert.granted) {
          return NextResponse.json({
            ok: true,
            message: `Learner is already enrolled. ${cert.message}`,
          });
        }
        if (!cert.ok) {
          return NextResponse.json({
            ok: true,
            message: `Learner is already enrolled. Certificate could not be issued: ${cert.message}`,
          });
        }

        return NextResponse.json({
          ok: true,
          message: "Learner is already enrolled for this course.",
        });
      }

      const course = await prisma.lmsCourse.findUnique({
        where: { slug: courseSlug },
        select: { title: true },
      });
      const content = await readAdminContent();
      const programTitle = content.tutorLedPrograms?.find((p) => p.slug === courseSlug)?.title;
      const result = await recordPurchasesForLearner({
        learnerEmail,
        courses: [{ slug: courseSlug, title: course?.title || programTitle || courseSlug }],
      });
      if (!result.ok) {
        return NextResponse.json({ ok: false, message: result.message }, { status: 400 });
      }

      const cert = await grantLearnerCertificateDownloadAccess({ learnerEmail, courseSlug });
      if (cert.ok && cert.granted) {
        return NextResponse.json({
          ok: true,
          message: `Learner added to this course. ${cert.message}`,
        });
      }
      if (!cert.ok) {
        return NextResponse.json({
          ok: true,
          message: `Learner added to this course. Certificate could not be issued: ${cert.message}`,
        });
      }

      return NextResponse.json({ ok: true, message: "Learner added to this course." });
    }

    const cert = await grantLearnerCertificateDownloadAccess({ learnerEmail, courseSlug });
    if (!cert.ok) {
      return NextResponse.json({ ok: false, message: cert.message }, { status: 400 });
    }
    if (!cert.granted) {
      const content = await readAdminContent();
      const program = findCertificateProgram(content, courseSlug);
      if (!program) {
        return NextResponse.json({ ok: false, message: "Course not found in catalog." }, { status: 400 });
      }
      return NextResponse.json({ ok: false, message: cert.message }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      message: "Manual certificate pass applied and learner download is enabled.",
    });
  } catch (err) {
    console.error("[admin/courses/[slug]/students/actions]", err);
    return NextResponse.json({ ok: false, message: "Action failed." }, { status: 503 });
  }
}

