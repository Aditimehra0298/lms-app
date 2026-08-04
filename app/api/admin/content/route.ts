import { NextResponse } from "next/server";
import { AdminContent, type ManagedCourse } from "@/lib/content-schema";
import { mergeOrganizationTeamAdminConfig } from "@/lib/organization-team-config";
import { syncAllCourseContentToMysql } from "@/lib/server/course-content-mysql-sync";
import { syncManagedCoursesToMysql } from "@/lib/server/course-mysql-sync";
import { readAdminContentFromDisk, writeAdminContent, normalizeManagedCategories } from "@/lib/server/content-store";

/** Always read fresh JSON from disk — marketing/admin UIs must not serve a stale cached payload. */
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const noStoreJson = { "Cache-Control": "private, no-store, max-age=0" };

/**
 * Protect course modules: a Course-tab save that omits/empties curriculum must not
 * erase modules previously saved from the Content tab.
 */
function curriculumMediaScore(mods?: ManagedCourse["curriculum"]): number {
  if (!Array.isArray(mods) || mods.length === 0) return 0;
  let media = 0;
  for (const m of mods) {
    const rows = [
      ...(m.items ?? []),
      ...((m.subModules ?? []).flatMap((s) => s.items ?? [])),
    ];
    for (const item of rows) {
      if (item.videoUrl || item.examUploadUrl || item.pdfUrl || item.downloadUrl || item.pptUrl) {
        media += 1;
      }
    }
  }
  return mods.length * 1000 + media;
}

function mergeManagedCoursesPreservingCurriculum(
  existing: ManagedCourse[],
  incoming: ManagedCourse[],
): ManagedCourse[] {
  const prevBySlug = new Map<string, ManagedCourse>();
  for (const c of existing ?? []) {
    const slug = c.slug?.trim();
    if (slug) prevBySlug.set(slug, c);
  }
  return incoming.map((course) => {
    const prev = prevBySlug.get(course.slug.trim());
    if (!prev) return course;
    // Only when curriculum key is omitted (stale Course-tab payloads). Explicit [] clears.
    if (course.curriculum === undefined && Array.isArray(prev.curriculum) && prev.curriculum.length > 0) {
      return { ...course, curriculum: prev.curriculum };
    }
    // Guard: never replace a richer curriculum (more modules/videos) with a poorer stale payload.
    const inScore = curriculumMediaScore(course.curriculum);
    const prevScore = curriculumMediaScore(prev.curriculum);
    if (prevScore > 0 && inScore < prevScore && (course.curriculum?.length ?? 0) < (prev.curriculum?.length ?? 0)) {
      return { ...course, curriculum: prev.curriculum };
    }
    return course;
  });
}

export async function GET() {
  // Bypass React cache so admin always sees the latest disk write.
  const content = await readAdminContentFromDisk();
  return NextResponse.json(content, { headers: noStoreJson });
}

export async function PUT(request: Request) {
  try {
    // Always read fresh from disk (not request-scoped React cache).
    const existing = await readAdminContentFromDisk();
    const body = (await request.json()) as Partial<AdminContent>;

    /**
     * Partial-safe merge:
     * - Only replace fields the client actually sent.
     * - categoryPages is merged key-by-key so one editor cannot wipe another's pages.
     * - Never fall back to defaultAdminContent (that reset live data on failed/partial bodies).
     * - Ignore echoed categories / categoryPages on full-document PUTs from other editors
     *   (Home/About/Courses workspace used to re-save a stale GET and wipe renames/images).
     */
    const definedKeys = (Object.keys(body) as (keyof AdminContent)[]).filter(
      (k) => body[k] !== undefined,
    );
    const trustsCatalogMeta = definedKeys.every(
      (k) => k === "categories" || k === "categoryPages",
    );
    const nextCategories =
      Array.isArray(body.categories) && trustsCatalogMeta
        ? normalizeManagedCategories(body.categories)
        : existing.categories;
    const nextCategoryPages = trustsCatalogMeta
      ? {
          ...(existing.categoryPages ?? {}),
          ...(body.categoryPages && typeof body.categoryPages === "object"
            ? body.categoryPages
            : {}),
        }
      : existing.categoryPages ?? {};

    const nextContent: AdminContent = {
      dashboard: body.dashboard
        ? {
            ...existing.dashboard,
            ...body.dashboard,
            calendarReminders: Array.isArray(body.dashboard.calendarReminders)
              ? body.dashboard.calendarReminders
              : existing.dashboard.calendarReminders ?? [],
            communityConnect: Array.isArray(body.dashboard.communityConnect)
              ? body.dashboard.communityConnect
              : existing.dashboard.communityConnect ?? [],
          }
        : existing.dashboard,
      learningCourses:
        body.learningCourses && body.learningCourses.length > 0
          ? body.learningCourses
          : existing.learningCourses,
      managedCourses:
        body.managedCourses && body.managedCourses.length > 0
          ? mergeManagedCoursesPreservingCurriculum(
              existing.managedCourses ?? [],
              body.managedCourses,
            )
          : existing.managedCourses,
      categories: nextCategories,
      categoryPages: nextCategoryPages,
      coursesPage: body.coursesPage ?? existing.coursesPage,
      homePage: body.homePage ?? existing.homePage,
      aboutPage: body.aboutPage ?? existing.aboutPage,
      tutorLedPrograms:
        Array.isArray(body.tutorLedPrograms) && body.tutorLedPrograms.length > 0
          ? body.tutorLedPrograms
          : existing.tutorLedPrograms,
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

    void (async () => {
      try {
        await syncManagedCoursesToMysql(nextContent.managedCourses ?? [], { renames });
        await syncAllCourseContentToMysql(nextContent.managedCourses ?? []);
      } catch (err) {
        console.error("[admin/content PUT] course MySQL sync", err);
      }
    })();

    return NextResponse.json({ ok: true }, { headers: noStoreJson });
  } catch (err) {
    console.error("[admin/content PUT]", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Save failed" },
      { status: 500 },
    );
  }
}
