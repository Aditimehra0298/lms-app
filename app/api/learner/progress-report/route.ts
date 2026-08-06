import { NextResponse } from "next/server";
import { canonicalCourseSlug } from "@/lib/course-slug-aliases";
import { normalizeLearnerEmail } from "@/lib/learner-email";
import { sendCourseProgressReportEmail } from "@/lib/server/n8n-progress-report-service";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Body = {
  email?: string;
  slug?: string;
  courseName?: string;
  learnerName?: string;
  force?: boolean;
};

/**
 * POST { email, slug, learnerName?, courseName?, force? }
 * Sends a course progress report email via n8n (backend proxy — credentials stay server-side).
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as Body;
    const email = normalizeLearnerEmail(body.email?.trim() ?? "");
    const slug = canonicalCourseSlug(body.slug?.trim() ?? "");
    if (!email) {
      return NextResponse.json({ ok: false, message: "email is required" }, { status: 400 });
    }
    if (!slug) {
      return NextResponse.json({ ok: false, message: "slug is required" }, { status: 400 });
    }

    const result = await sendCourseProgressReportEmail({
      learnerEmail: email,
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
