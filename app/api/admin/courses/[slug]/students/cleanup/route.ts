import { NextResponse } from "next/server";
import { cleanupCourseEnrollments } from "@/lib/server/cleanup-enrollments";
import { assertMainAdmin } from "@/lib/server/admin-api-auth";

export const dynamic = "force-dynamic";

/** POST — dedupe enrollments for this course and link rows to lms_user (Primary ID). */
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

  try {
    const result = await cleanupCourseEnrollments(courseSlug);
    return NextResponse.json({
      message: `Cleaned roster: ${result.removed} duplicate(s) removed, ${result.kept} learner(s) kept, ${result.linked} linked to user accounts.`,
      ...result,
      ok: true,
    });
  } catch (err) {
    console.error("[admin/courses/[slug]/students/cleanup]", err);
    return NextResponse.json({ ok: false, message: "Cleanup failed." }, { status: 503 });
  }
}
