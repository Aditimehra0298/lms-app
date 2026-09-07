import { NextResponse } from "next/server";
import { assertLearnerMayRequestCertificate } from "@/lib/server/certificate-access";
import { requestCourseCertificate } from "@/lib/server/n8n-certificate-service";
import {
  learnerAuthRequiredResponse,
  requireLearnerSessionEmail,
} from "@/lib/server/learner-session";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** Start certificate generation after verified enrollment + completion (session-bound). */
export async function POST(request: Request) {
  const sessionEmail = requireLearnerSessionEmail(request);
  if (!sessionEmail) return learnerAuthRequiredResponse();

  let body: {
    learnerEmail?: string;
    learnerName?: string;
    courseSlug?: string;
    scorePercent?: number;
    forceRetry?: boolean;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON" }, { status: 400 });
  }

  const courseSlug = String(body.courseSlug ?? "").trim();
  if (!courseSlug) {
    return NextResponse.json({ ok: false, message: "courseSlug is required." }, { status: 400 });
  }

  // Never trust body.learnerEmail / scorePercent for authorization (POC-D-01).
  const gate = await assertLearnerMayRequestCertificate(sessionEmail, courseSlug);
  if (!gate.ok) {
    return NextResponse.json({ ok: false, message: gate.message }, { status: 403 });
  }

  const user = await prisma.lmsUser.findUnique({
    where: { email: sessionEmail },
    select: { name: true },
  });

  try {
    const result = await requestCourseCertificate({
      learnerEmail: sessionEmail,
      learnerName: user?.name ?? body.learnerName,
      courseSlug,
      scorePercent: gate.scorePercent,
      forceRetry: body.forceRetry === true,
      bypassLearnerGates: true, // already gated above
    });
    if (!result.ok) {
      return NextResponse.json(result, { status: 400 });
    }
    return NextResponse.json(result);
  } catch (err) {
    console.error("[certificates/request]", err);
    return NextResponse.json({ ok: false, message: "Certificate request failed." }, { status: 503 });
  }
}
