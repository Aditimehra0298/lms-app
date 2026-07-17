import { NextResponse } from "next/server";
import { AdminContent, defaultAdminContent } from "@/lib/content-schema";
import { mergeOrganizationTeamAdminConfig } from "@/lib/organization-team-config";
import { syncAllCourseContentToMysql } from "@/lib/server/course-content-mysql-sync";
import { syncManagedCoursesToMysql } from "@/lib/server/course-mysql-sync";
import { readAdminContent, writeAdminContent } from "@/lib/server/content-store";

/** Always read fresh JSON from disk — marketing/admin UIs must not serve a stale cached payload. */
export const dynamic = "force-dynamic";

const noStoreJson = { "Cache-Control": "private, no-store, max-age=0" };

export async function GET() {
  const content = await readAdminContent();
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
        calendarReminders: Array.isArray(body.dashboard?.calendarReminders)
          ? body.dashboard.calendarReminders
          : existing.dashboard.calendarReminders ?? defaultAdminContent.dashboard.calendarReminders ?? [],
        communityConnect: Array.isArray(body.dashboard?.communityConnect)
          ? body.dashboard.communityConnect
          : existing.dashboard.communityConnect ?? defaultAdminContent.dashboard.communityConnect ?? [],
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
      globalCertificateAssets:
        body.globalCertificateAssets !== undefined
          ? body.globalCertificateAssets
          : existing.globalCertificateAssets,
      organizationTeam: mergeOrganizationTeamAdminConfig(
        body.organizationTeam ?? existing.organizationTeam,
      ),
    };

    await writeAdminContent(nextContent);

    const prevSlugs = new Set((existing.managedCourses ?? []).map((c) => c.slug.trim()).filter(Boolean));
    const nextSlugs = new Set((nextContent.managedCourses ?? []).map((c) => c.slug.trim()).filter(Boolean));
    const removed = [...prevSlugs].filter((s) => !nextSlugs.has(s));
    const added = [...nextSlugs].filter((s) => !prevSlugs.has(s));
    const renames =
      removed.length === 1 && added.length === 1 ? [{ from: removed[0], to: added[0] }] : [];

    // Do not block the admin UI on MySQL — sync in the background (slow or missing DB was freezing saves).
    void (async () => {
      try {
        await syncManagedCoursesToMysql(nextContent.managedCourses ?? [], { renames });
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
