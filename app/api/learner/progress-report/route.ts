import { NextResponse } from "next/server";
import { canonicalCourseSlug } from "@/lib/course-slug-aliases";
import { requireLearnerMutationAuth } from "@/lib/server/learner-session";
import { sendCourseProgressReportEmail } from "@/lib/server/n8n-progress-report-service";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Body = {
  slug?: string;
  courseName?: string;
  learnerName?: string;
  force?: boolean;
};

/**
 * POST { slug, learnerName?, courseName?, force? }
 * Sends progress report for the signed-in learner only.
 */
export async function POST(request: Request) {
  const auth = requireLearnerMutationAuth(request);
  if ("response" in auth) return auth.response;

  try {
    const body = (await request.json().catch(() => ({}))) as Body;
    const slug = canonicalCourseSlug(body.slug?.trim() ?? "");
    if (!slug) {
      return NextResponse.json({ ok: false, message: "slug is required" }, { status: 400 });
    }

    const result = await sendCourseProgressReportEmail({
      learnerEmail: auth.email,
      learnerName: body.learnerName,
      courseSlug: slug,
      courseName: body.courseName,
      force: Boolean(body.force),
    });

    return NextResponse.json(result, { status: result.ok ? 200 : 502 });
  } catch (err) {
    console.error("[api/learner/progress-report]", err);
    return NextResponse.json(
      { ok: false, message: err instanceof Error ? err.message : "Send failed" },
      { status: 500 },
    );
  }
}
