import { NextResponse } from "next/server";
import { canonicalCourseSlug } from "@/lib/course-slug-aliases";
import { normalizeLearnerEmail } from "@/lib/learner-email";
import { getLearnerCourseProgressFromStore } from "@/lib/server/learner-course-progress-store";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const email = normalizeLearnerEmail(url.searchParams.get("email")?.trim() ?? "");
  const slug = canonicalCourseSlug(url.searchParams.get("slug")?.trim() ?? "");

  if (!email) {
    return NextResponse.json({ ok: false, message: "email query required" }, { status: 400 });
  }
  if (!slug) {
    return NextResponse.json({ ok: false, message: "slug query required" }, { status: 400 });
  }

  try {
    const progress = await getLearnerCourseProgressFromStore(email, slug);
    return NextResponse.json({ ok: true, progress });
  } catch (err) {
    console.error("[api/learner/course-progress]", err);
    return NextResponse.json({ ok: false, message: "Could not load progress." }, { status: 503 });
  }
}
