import { NextResponse } from "next/server";
import type { CourseCurriculumItem, CourseCurriculumModule, ManagedCourse } from "@/lib/content-schema";
import { assertMainAdmin } from "@/lib/server/admin-api-auth";
import { syncCourseContentToMysql } from "@/lib/server/course-content-mysql-sync";
import { readAdminContentFromDisk, writeAdminContent } from "@/lib/server/content-store";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

type MediaRow = {
  id: string;
  url: string;
  originalName: string | null;
  kind: string;
  courseSlug: string | null;
  createdAt: Date;
};

function collectCurriculumUrls(mods: CourseCurriculumModule[] | undefined): Set<string> {
  const urls = new Set<string>();
  for (const m of mods ?? []) {
    const rows: CourseCurriculumItem[] = [
      ...(m.items ?? []),
      ...((m.subModules ?? []).flatMap((s) => s.items ?? [])),
    ];
    for (const item of rows) {
      for (const key of [
        "videoUrl",
        "examUploadUrl",
        "pdfUrl",
        "pptUrl",
        "podcastUrl",
        "downloadUrl",
        "resourceUrl",
      ] as const) {
        const v = item[key]?.trim();
        if (v) urls.add(v);
      }
    }
  }
  return urls;
}

function titleFromAsset(asset: MediaRow, index: number): string {
  const raw = (asset.originalName || "").replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim();
  if (raw) return `Module ${index} : ${raw}`;
  return `Module ${index} : Recovered video`;
}

function labelFromAsset(asset: MediaRow): string {
  const raw = (asset.originalName || "").replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim();
  return raw || "Recovered lesson video";
}

/**
 * GET ?slug=… — list DB media for this course + orphan videos not linked in any curriculum.
 * POST { slug, dryRun?, includeOrphans? } — append missing videos as new modules, save JSON+MySQL.
 */
export async function GET(request: Request) {
  const denied = assertMainAdmin(request);
  if (denied) return denied;

  const slug = new URL(request.url).searchParams.get("slug")?.trim() || "";
  if (!slug) {
    return NextResponse.json({ ok: false, error: "slug is required" }, { status: 400 });
  }

  try {
    const existing = await readAdminContentFromDisk();
    const course = (existing.managedCourses ?? []).find((c) => c.slug === slug);
    const usedInCourse = collectCurriculumUrls(course?.curriculum);

    const allCourses = existing.managedCourses ?? [];
    const usedAnywhere = new Set<string>();
    for (const c of allCourses) {
      for (const u of collectCurriculumUrls(c.curriculum)) usedAnywhere.add(u);
    }

    const linked = await prisma.lmsMediaAsset.findMany({
      where: { courseSlug: slug, kind: "video" },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        url: true,
        originalName: true,
        kind: true,
        courseSlug: true,
        createdAt: true,
      },
    });

    const orphans = await prisma.lmsMediaAsset.findMany({
      where: {
        kind: "video",
        OR: [{ courseSlug: null }, { courseSlug: "" }, { courseSlug: { not: slug } }],
      },
      orderBy: { createdAt: "desc" },
      take: 200,
      select: {
        id: true,
        url: true,
        originalName: true,
        kind: true,
        courseSlug: true,
        createdAt: true,
      },
    });

    const orphanUnused = orphans.filter((a) => !usedAnywhere.has(a.url));
    const linkedMissing = linked.filter((a) => !usedInCourse.has(a.url));

    return NextResponse.json({
      ok: true,
      slug,
      curriculumModules: course?.curriculum?.length ?? 0,
      linkedVideos: linked.length,
      linkedNotInCurriculum: linkedMissing.length,
      orphanVideosUnused: orphanUnused.length,
      linkedMissing,
      orphanUnused: orphanUnused.slice(0, 50),
    });
  } catch (err) {
    console.error("[restore-from-media GET]", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Lookup failed" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const denied = assertMainAdmin(request);
  if (denied) return denied;

  try {
    const body = (await request.json().catch(() => ({}))) as {
      slug?: string;
      dryRun?: boolean;
      includeOrphans?: boolean;
    };
    const slug = typeof body.slug === "string" ? body.slug.trim() : "";
    if (!slug) {
      return NextResponse.json({ ok: false, error: "slug is required" }, { status: 400 });
    }

    const existing = await readAdminContentFromDisk();
    const courses = [...(existing.managedCourses ?? [])];
    const idx = courses.findIndex((c) => c.slug === slug);
    if (idx < 0) {
      return NextResponse.json({ ok: false, error: "Course not found" }, { status: 404 });
    }

    const course = courses[idx];
    const usedInCourse = collectCurriculumUrls(course.curriculum);
    const usedAnywhere = new Set<string>();
    for (const c of courses) {
      for (const u of collectCurriculumUrls(c.curriculum)) usedAnywhere.add(u);
    }

    const linked = await prisma.lmsMediaAsset.findMany({
      where: { courseSlug: slug, kind: "video" },
      orderBy: { createdAt: "asc" },
    });

    let candidates: MediaRow[] = linked.filter((a) => !usedInCourse.has(a.url));

    if (body.includeOrphans) {
      const orphans = await prisma.lmsMediaAsset.findMany({
        where: { kind: "video" },
        orderBy: { createdAt: "asc" },
        take: 500,
      });
      const extra = orphans.filter(
        (a) =>
          !usedAnywhere.has(a.url) &&
          !candidates.some((c) => c.url === a.url) &&
          (a.courseSlug === slug || !a.courseSlug),
      );
      candidates = [...candidates, ...extra];
    }

    // Dedupe by URL
    const seen = new Set<string>();
    candidates = candidates.filter((a) => {
      if (seen.has(a.url)) return false;
      seen.add(a.url);
      return true;
    });

    if (candidates.length === 0) {
      return NextResponse.json({
        ok: true,
        restored: false,
        message: "No recoverable videos found in the database for this course.",
        slug,
        moduleCount: course.curriculum?.length ?? 0,
        added: 0,
      });
    }

    if (body.dryRun) {
      return NextResponse.json({
        ok: true,
        dryRun: true,
        wouldAdd: candidates.length,
        files: candidates.map((c) => c.originalName || c.url),
        moduleCountAfter: (course.curriculum?.length ?? 0) + candidates.length,
      });
    }

    const startIdx = (course.curriculum?.length ?? 0) + 1;
    const newMods: CourseCurriculumModule[] = candidates.map((asset, i) => ({
      title: titleFromAsset(asset, startIdx + i),
      items: [
        {
          label: labelFromAsset(asset),
          kind: "video" as const,
          videoUrl: asset.url,
        },
      ],
    }));

    const updated: ManagedCourse = {
      ...course,
      curriculum: [...(course.curriculum ?? []), ...newMods],
      finalExam: undefined,
    };
    courses[idx] = updated;

    // Tag orphans with this course slug for future recovery
    const orphanIds = candidates
      .filter((a) => !a.courseSlug)
      .map((a) => a.id);
    if (orphanIds.length > 0) {
      await prisma.lmsMediaAsset.updateMany({
        where: { id: { in: orphanIds } },
        data: { courseSlug: slug },
      });
    }

    await writeAdminContent({ ...existing, managedCourses: courses });

    let mysqlOk = false;
    try {
      const result = await syncCourseContentToMysql(updated);
      mysqlOk = Boolean(result?.ok);
    } catch (err) {
      console.error("[restore-from-media] MySQL", err);
    }

    return NextResponse.json({
      ok: true,
      restored: true,
      slug,
      added: newMods.length,
      moduleCount: updated.curriculum?.length ?? 0,
      mysqlOk,
    });
  } catch (err) {
    console.error("[restore-from-media POST]", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Restore failed" },
      { status: 500 },
    );
  }
}
