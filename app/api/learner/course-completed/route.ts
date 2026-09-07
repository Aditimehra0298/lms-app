import { NextResponse } from "next/server";
import { requireLearnerMutationAuth } from "@/lib/server/learner-session";
import { queueCourseCompletionEmail } from "@/lib/server/n8n-course-lifecycle-emails";
import type { PurchaseDeliveryKind } from "@/lib/server/n8n-purchase-confirmation-service";

export const dynamic = "force-dynamic";

type Body = {
  courseSlug?: string;
  courseName?: string;
  learnerName?: string;
  deliveryKind?: PurchaseDeliveryKind;
  certificateId?: string;
};

/** POST — course-completion for the signed-in learner only. */
export async function POST(request: Request) {
  const auth = requireLearnerMutationAuth(request);
  if ("response" in auth) return auth.response;

  try {
    const body = (await request.json()) as Body;
    const courseSlug = body.courseSlug?.trim() ?? "";

    if (!courseSlug) {
      return NextResponse.json({ ok: false, message: "courseSlug is required." }, { status: 400 });
    }

    const result = await queueCourseCompletionEmail({
      learnerEmail: auth.email,
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
