import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { issueCourseCertificate } from "@/lib/server/certificate-service";

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

  const learnerEmail = body.learnerEmail?.trim().toLowerCase();
  if (!learnerEmail) {
    return NextResponse.json({ ok: false, message: "learnerEmail required" }, { status: 400 });
  }
  if (!body.action) {
    return NextResponse.json({ ok: false, message: "action required" }, { status: 400 });
  }

  try {
    if (body.action === "bypass-access") {
      const existing = await prisma.lmsPurchase.findFirst({
        where: { learnerEmail, courseSlug },
        select: { id: true },
      });
      if (!existing) {
        const course = await prisma.lmsCourse.findUnique({
          where: { slug: courseSlug },
          select: { id: true, title: true },
        });
        const user = await prisma.lmsUser.findUnique({
          where: { email: learnerEmail },
          select: { id: true },
        });
        await prisma.lmsPurchase.create({
          data: {
            learnerEmail,
            courseSlug,
            title: course?.title ?? courseSlug,
            courseId: course?.id ?? null,
            userId: user?.id ?? null,
          },
        });
      }
      return NextResponse.json({ ok: true, message: "Bypass granted. Learner can access dashboard." });
    }

    // manual-certificate-pass
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

    return NextResponse.json({
      ok: true,
      message: "Manual certificate pass applied and learner download is enabled.",
    });
  } catch (err) {
    console.error("[admin/courses/[slug]/students/actions]", err);
    return NextResponse.json({ ok: false, message: "Action failed." }, { status: 503 });
  }
}

