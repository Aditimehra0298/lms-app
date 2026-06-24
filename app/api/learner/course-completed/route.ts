import { NextResponse } from "next/server";
import { normalizeLearnerEmail } from "@/lib/learner-email";
import { queueCourseCompletionEmail } from "@/lib/server/n8n-course-lifecycle-emails";
import type { PurchaseDeliveryKind } from "@/lib/server/n8n-purchase-confirmation-service";

export const dynamic = "force-dynamic";

type Body = {
  learnerEmail?: string;
  courseSlug?: string;
  courseName?: string;
  learnerName?: string;
  deliveryKind?: PurchaseDeliveryKind;
  certificateId?: string;
};

/** POST — same n8n course-completion webhook for self-paced and tutor-led. */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Body;
    const learnerEmail = normalizeLearnerEmail(body.learnerEmail?.trim() ?? "");
    const courseSlug = body.courseSlug?.trim() ?? "";

    if (!learnerEmail) {
      return NextResponse.json({ ok: false, message: "learnerEmail is required." }, { status: 400 });
    }
    if (!courseSlug) {
      return NextResponse.json({ ok: false, message: "courseSlug is required." }, { status: 400 });
    }

    const result = await queueCourseCompletionEmail({
      learnerEmail,
      courseSlug,
      courseName: body.courseName,
      learnerName: body.learnerName,
      deliveryKind: body.deliveryKind,
      certificateId: body.certificateId,
    });

    if (!result.ok) {
      return NextResponse.json({ ok: false, message: result.message }, { status: 503 });
    }

    return NextResponse.json({
      ok: true,
      skipped: result.skipped ?? false,
      message: result.skipped ? "Completion email already sent." : "Course completion email queued.",
    });
  } catch (err) {
    console.error("[api/learner/course-completed]", err);
    return NextResponse.json({ ok: false, message: "Could not send course completion email." }, { status: 503 });
  }
}
