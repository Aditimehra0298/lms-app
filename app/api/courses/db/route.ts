import { NextResponse } from "next/server";
import { getCourseBySlug, listCoursesInMysql } from "@/lib/server/course-mysql-sync";
import { describeCourseIdStorage } from "@/lib/course-ids";

export const dynamic = "force-dynamic";

/** Course rows from MySQL `lms_course` (for n8n / integrations). */
export async function GET(request: Request) {
  const slug = new URL(request.url).searchParams.get("slug")?.trim();
  try {
    if (slug) {
      const course = await getCourseBySlug(slug);
      if (!course) {
        return NextResponse.json({ ok: false, message: "Course not in MySQL yet. Save course in Admin." }, { status: 404 });
      }
      return NextResponse.json({ ok: true, format: describeCourseIdStorage(), course });
    }
    const courses = await listCoursesInMysql();
    return NextResponse.json({ ok: true, format: describeCourseIdStorage(), count: courses.length, courses });
  } catch (err) {
    console.error("[courses/db]", err);
    return NextResponse.json({ ok: false, message: "Course lookup unavailable." }, { status: 503 });
  }
}
