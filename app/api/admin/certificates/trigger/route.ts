import { NextResponse } from "next/server";
import { adminTriggerCertificateForLearner } from "@/lib/server/n8n-certificate-service";

export const dynamic = "force-dynamic";

/** Admin: manually send learner to n8n workflow. */
export async function POST(request: Request) {
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
    return NextResponse.json({ ok: false, message: "Trigger failed." }, { status: 503 });
  }
}
