import { NextResponse } from "next/server";
import { AdminContent, defaultAdminContent } from "@/lib/content-schema";
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
    return NextResponse.json({ ok: true }, { headers: noStoreJson });
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid payload" }, { status: 400 });
  }
}
