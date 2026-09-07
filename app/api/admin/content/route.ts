import { NextResponse } from "next/server";
import { AdminContent, type ManagedCourse } from "@/lib/content-schema";
import { mergeOrganizationTeamAdminConfig } from "@/lib/organization-team-config";
import {
  hydrateManagedCoursesFromMysql,
  syncAllCourseContentToMysql,
} from "@/lib/server/course-content-mysql-sync";
import { deleteCoursesFromMysql, syncManagedCoursesToMysql } from "@/lib/server/course-mysql-sync";
import { readAdminContentFromDisk, writeAdminContent, normalizeManagedCategories } from "@/lib/server/content-store";
import { sanitizePromotions } from "@/lib/promotions";
import { assertMainAdmin } from "@/lib/server/admin-api-auth";

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
  removedSlugs: Set<string> = new Set(),
  opts?: { authoritative?: boolean },
): ManagedCourse[] {
  const prevBySlug = new Map<string, ManagedCourse>();
  for (const c of existing ?? []) {
    const slug = c.slug?.trim();
    if (slug) prevBySlug.set(slug, c);
  }

  const incomingBySlug = new Map<string, ManagedCourse>();
  const mergedIncoming: ManagedCourse[] = [];
  for (const course of incoming ?? []) {
    const slug = course.slug?.trim();
    if (!slug || removedSlugs.has(slug)) continue;
    const prev = prevBySlug.get(slug);
    let next: ManagedCourse = course;
    if (prev) {
      // Only when curriculum key is omitted (stale Course-tab payloads). Explicit [] clears.
      if (course.curriculum === undefined && Array.isArray(prev.curriculum) && prev.curriculum.length > 0) {
        next = { ...course, curriculum: prev.curriculum };
      } else {
        // Guard: never replace a richer curriculum (more modules/videos) with a poorer stale payload.
        const inScore = curriculumMediaScore(course.curriculum);
        const prevScore = curriculumMediaScore(prev.curriculum);
        if (prevScore > 0 && inScore < prevScore && (course.curriculum?.length ?? 0) < (prev.curriculum?.length ?? 0)) {
          next = { ...course, curriculum: prev.curriculum };
        }
      }
    }
    incomingBySlug.set(slug, next);
    mergedIncoming.push(next);
  }

  // Explicit deletes / full catalog replaces must not resurrect omitted rows.
  if (opts?.authoritative || removedSlugs.size > 0) {
    return mergedIncoming;
  }

  // Keep existing courses that were not in this PUT (partial/stale catalog payloads).
  const leftovers = (existing ?? []).filter((c) => {
    const slug = c.slug?.trim();
    return Boolean(slug) && !incomingBySlug.has(slug) && !removedSlugs.has(slug);
  });
  return [...mergedIncoming, ...leftovers];
}

export async function GET(request: Request) {
  const denied = await assertMainAdmin(request);
  if (denied) return denied;

  // Bypass React cache so admin always sees the latest disk write.
  const content = await readAdminContentFromDisk();
  const { courses, addedSlugs } = await hydrateManagedCoursesFromMysql(
    content.managedCourses ?? [],
    { excludeSlugs: content.deletedCourseSlugs },
  );
  if (addedSlugs.length > 0) {
    const next = { ...content, managedCourses: courses };
    try {
      await writeAdminContent(next);
      console.info(
        "[admin/content GET] restored from MySQL:",
        addedSlugs.join(", "),
      );
    } catch (err) {
      console.error("[admin/content GET] persist MySQL hydrate", err);
    }
    return NextResponse.json(next, { headers: noStoreJson });
  }
  return NextResponse.json(content, { headers: noStoreJson });
}

export async function PUT(request: Request) {
  const denied = await assertMainAdmin(request);
  if (denied) return denied;

  try {
    // Always read fresh from disk (not request-scoped React cache).
    const existing = await readAdminContentFromDisk();
    const body = (await request.json()) as Partial<AdminContent> & {
      removedCourseSlugs?: string[];
    };
    const removedCourseSlugs = [
      ...new Set(
        (Array.isArray(body.removedCourseSlugs) ? body.removedCourseSlugs : [])
          .map((s) => String(s ?? "").trim())
          .filter(Boolean),
      ),
    ];
    const removedSet = new Set(removedCourseSlugs);

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

    const nextManagedCourses = Array.isArray(body.managedCourses)
      ? mergeManagedCoursesPreservingCurriculum(
          existing.managedCourses ?? [],
          body.managedCourses,
          removedSet,
          { authoritative: removedSet.size > 0 },
        )
      : removedSet.size > 0
        ? (existing.managedCourses ?? []).filter((c) => !removedSet.has(c.slug?.trim() ?? ""))
        : existing.managedCourses;
    const keptSlugs = new Set(
      (nextManagedCourses ?? []).map((c) => c.slug?.trim()).filter(Boolean),
    );
    const nextDeletedCourseSlugs = [
      ...new Set(
        [...(existing.deletedCourseSlugs ?? []), ...removedCourseSlugs]
          .map((s) => s.trim())
          .filter((s) => Boolean(s) && !keptSlugs.has(s)),
      ),
    ];

    // Allow clearing the last tutor-led/workshop program (empty array must persist).
    const tutorLedProvided = Object.prototype.hasOwnProperty.call(body, "tutorLedPrograms");
    const nextTutorLedPrograms =
      tutorLedProvided && Array.isArray(body.tutorLedPrograms)
        ? body.tutorLedPrograms
        : existing.tutorLedPrograms;

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
      managedCourses: nextManagedCourses,
      deletedCourseSlugs: nextDeletedCourseSlugs,
      categories: nextCategories,
      categoryPages: nextCategoryPages,
      coursesPage: body.coursesPage ?? existing.coursesPage,
      homePage: body.homePage ?? existing.homePage,
      aboutPage: body.aboutPage ?? existing.aboutPage,
      tutorLedPrograms: nextTutorLedPrograms,
      globalCertificateAssets:
        body.globalCertificateAssets !== undefined
          ? body.globalCertificateAssets
          : existing.globalCertificateAssets,
      organizationTeam: mergeOrganizationTeamAdminConfig(
        body.organizationTeam ?? existing.organizationTeam,
      ),
      promotions:
        body.promotions !== undefined
          ? sanitizePromotions(body.promotions)
          : existing.promotions,
    };

    await writeAdminContent(nextContent);

    const prevSlugs = new Set((existing.managedCourses ?? []).map((c) => c.slug.trim()).filter(Boolean));
    const nextSlugs = new Set((nextContent.managedCourses ?? []).map((c) => c.slug.trim()).filter(Boolean));
    const removed = [...prevSlugs].filter((s) => !nextSlugs.has(s));
    const added = [...nextSlugs].filter((s) => !prevSlugs.has(s));
    const isRename = removed.length === 1 && added.length === 1;
    const renames = isRename ? [{ from: removed[0], to: added[0] }] : [];
    const mysqlDeletes = isRename
      ? removedCourseSlugs.filter((s) => s !== removed[0])
      : [...new Set([...removed, ...removedCourseSlugs])];

    if (mysqlDeletes.length > 0) {
      try {
        await deleteCoursesFromMysql(mysqlDeletes);
      } catch (err) {
        console.error("[admin/content PUT] MySQL course delete", err);
      }
    }

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
