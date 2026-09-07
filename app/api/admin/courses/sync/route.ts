import { NextResponse } from "next/server";
import { readAdminContent } from "@/lib/server/content-store";
import { syncManagedCoursesToMysql } from "@/lib/server/course-mysql-sync";
import { assertMainAdmin } from "@/lib/server/admin-api-auth";

export const dynamic = "force-dynamic";

/** Sync all catalog courses from admin JSON into MySQL lms_course. */
export async function POST(request: Request) {
  const denied = await assertMainAdmin(request);
  if (denied) return denied;

  try {
    const content = await readAdminContent();
    const sync = await syncManagedCoursesToMysql(content.managedCourses ?? []);
    return NextResponse.json({ ok: true, synced: sync.synced, courses: sync.records });
  } catch (err) {
    console.error("[admin/courses/sync]", err);
    return NextResponse.json(
      { ok: false, message: "Sync failed. Run npx.cmd prisma db push and restart the dev server." },
      { status: 503 },
    );
  }
}
