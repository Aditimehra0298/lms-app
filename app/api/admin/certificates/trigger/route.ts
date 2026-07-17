import { NextResponse } from "next/server";
import { assertMainAdmin } from "@/lib/server/admin-api-auth";
import { adminTriggerCertificateForLearner } from "@/lib/server/n8n-certificate-service";

export const dynamic = "force-dynamic";

/** Admin: issue / re-issue a certificate for a learner + course. */
export async function POST(request: Request) {
  const denied = assertMainAdmin(request);
  if (denied) return denied;

  let body: {
    learnerEmail?: string;
    learnerName?: string;
    courseSlug?: string;
    scorePercent?: number;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON" }, { status: 400 });
  }

  try {
    const result = await adminTriggerCertificateForLearner({
      learnerEmail: body.learnerEmail ?? "",
      learnerName: body.learnerName,
      courseSlug: body.courseSlug ?? "",
      scorePercent: body.scorePercent,
    });
    if (!result.ok) return NextResponse.json(result, { status: 400 });
    return NextResponse.json(result);
  } catch (err) {
    console.error("[admin/certificates/trigger]", err);
    return NextResponse.json({ ok: false, message: "Could not issue certificate." }, { status: 503 });
  }
}
