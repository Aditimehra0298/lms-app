import { NextResponse } from "next/server";
import { getManagedCourses } from "@/lib/server/course-catalog";

export const dynamic = "force-dynamic";

/** Public catalog for marketing pages (published courses only). */
export async function GET() {
  const courses = await getManagedCourses();
  return NextResponse.json(
    { courses },
    { headers: { "Cache-Control": "private, no-store, max-age=0" } },
  );
}
