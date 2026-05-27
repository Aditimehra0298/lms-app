import { NextResponse } from "next/server";
import { AdminContent, defaultAdminContent } from "@/lib/content-schema";
import { syncAllCourseContentToMysql } from "@/lib/server/course-content-mysql-sync";
import { syncManagedCoursesToMysql } from "@/lib/server/course-mysql-sync";
import { readAdminContent, writeAdminContent } from "@/lib/server/content-store";

/** Always read fresh JSON from disk — marketing/admin UIs must not serve a stale cached payload. */
export const dynamic = "force-dynamic";

const noStoreJson = { "Cache-Control": "private, no-store, max-age=0" };

export async function GET() {
  const content = await readAdminContent();
  void syncManagedCoursesToMysql(content.managedCourses ?? []).catch((err) =>
    console.error("[admin/content GET] course sync", err),
  );
  return NextResponse.json(content, { headers: noStoreJson });
}

export async function PUT(request: Request) {
  try {
    const existing = await readAdminContent();
    const body = (await request.json()) as Partial<AdminContent>;
    const nextContent: AdminContent = {
      dashboard: {
        nextClassTitle:
          body.dashboard?.nextClassTitle ?? defaultAdminContent.dashboard.nextClassTitle,
        nextClassTime: body.dashboard?.nextClassTime ?? defaultAdminContent.dashboard.nextClassTime,
        streakDays: Number(body.dashboard?.streakDays ?? defaultAdminContent.dashboard.streakDays),
      },
      learningCourses:
        body.learningCourses && body.learningCourses.length > 0
          ? body.learningCourses
          : defaultAdminContent.learningCourses,
      managedCourses:
        body.managedCourses && body.managedCourses.length > 0
          ? body.managedCourses
          : defaultAdminContent.managedCourses,
      categories: Array.isArray(body.categories)
        ? body.categories
        : defaultAdminContent.categories,
      categoryPages:
        body.categoryPages !== undefined && body.categoryPages !== null
          ? body.categoryPages
          : existing.categoryPages ?? {},
      coursesPage: body.coursesPage ?? existing.coursesPage,
      homePage: body.homePage ?? existing.homePage,
      aboutPage: body.aboutPage ?? existing.aboutPage,
      tutorLedPrograms:
        Array.isArray(body.tutorLedPrograms) && body.tutorLedPrograms.length > 0
          ? body.tutorLedPrograms
          : existing.tutorLedPrograms ?? defaultAdminContent.tutorLedPrograms,
    };

    await writeAdminContent(nextContent);

    // Do not block the admin UI on MySQL — sync in the background (slow or missing DB was freezing saves).
    void (async () => {
      try {
        await syncManagedCoursesToMysql(nextContent.managedCourses ?? []);
        await syncAllCourseContentToMysql(nextContent.managedCourses ?? []);
      } catch (err) {
        console.error("[admin/content PUT] course MySQL sync", err);
      }
    })();

    return NextResponse.json({ ok: true }, { headers: noStoreJson });
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid payload" }, { status: 400 });
  }
}
