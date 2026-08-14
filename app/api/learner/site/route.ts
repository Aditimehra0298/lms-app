import { NextResponse } from "next/server";
import { getManagedCourses } from "@/lib/server/course-catalog";
import { getPublishedTutorLedPrograms } from "@/lib/server/tutor-led-catalog";
import { readAdminContent } from "@/lib/server/content-store";

export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "private, no-store, max-age=0" };

/**
 * Learner-safe site payload: published catalog only.
 * Does not expose unpublished courses, admin drafts, or default demo content.
 */
export async function GET() {
  const [content, courses, programs] = await Promise.all([
    readAdminContent(),
    getManagedCourses(),
    getPublishedTutorLedPrograms(),
  ]);

  return NextResponse.json(
    {
      managedCourses: courses,
      tutorLedPrograms: programs,
      dashboard: {
        nextClassTitle: content.dashboard?.nextClassTitle ?? "",
        nextClassTime: content.dashboard?.nextClassTime ?? "",
        streakDays: content.dashboard?.streakDays ?? 0,
        calendarReminders: content.dashboard?.calendarReminders ?? [],
        communityConnect: content.dashboard?.communityConnect ?? [],
      },
      globalCertificateAssets: content.globalCertificateAssets ?? null,
      homePage: content.homePage ? { orgPlan: content.homePage.orgPlan } : undefined,
      organizationTeam: content.organizationTeam ?? null,
    },
    { headers: noStore },
  );
}
