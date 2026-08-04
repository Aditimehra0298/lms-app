import { NextResponse } from "next/server";
import type { CourseCurriculumModule, ManagedCourse } from "@/lib/content-schema";
import { assertCurriculumModuleCapacity } from "@/lib/curriculum-limits";
import { syncCourseContentToMysql } from "@/lib/server/course-content-mysql-sync";
import { readAdminContentFromDisk, writeAdminContent } from "@/lib/server/content-store";

export const dynamic = "force-dynamic";
/** Large curricula (many modules + video URLs) need headroom. */
export const maxDuration = 300;

const noStoreJson = { "Cache-Control": "private, no-store, max-age=0" };

type Body = {
  slug?: string;
  curriculum?: CourseCurriculumModule[];
  /** Optional catalog duration label (e.g. "12h 30m") derived from lesson lengths. */
  duration?: string;
};

/**
 * Persist one course curriculum without re-sending the full catalog.
 * Writes admin-content.json first, then upserts MySQL lmsCourseContent.
 * No module-count limit.
 */
export async function PUT(request: Request) {
  try {
    const body = (await request.json()) as Body;
    const slug = typeof body.slug === "string" ? body.slug.trim() : "";
    if (!slug) {
      return NextResponse.json({ ok: false, error: "slug is required" }, { status: 400 });
    }
    if (!Array.isArray(body.curriculum)) {
      return NextResponse.json({ ok: false, error: "curriculum must be an array" }, { status: 400 });
    }

    const capacity = assertCurriculumModuleCapacity(body.curriculum);
    if (!capacity.ok) {
      return NextResponse.json({ ok: false, error: capacity.error }, { status: 400 });
    }

    const existing = await readAdminContentFromDisk();
    const courses = [...(existing.managedCourses ?? [])];
    const idx = courses.findIndex((c) => c.slug?.trim() === slug);
    if (idx < 0) {
      return NextResponse.json(
        {
          ok: false,
          error: `Course “${slug}” not found. Save the course on the Course tab first.`,
        },
        { status: 404 },
      );
    }

    const duration =
      typeof body.duration === "string" && body.duration.trim()
        ? body.duration.trim()
        : courses[idx].duration;

    const updated: ManagedCourse = {
      ...courses[idx],
      curriculum: body.curriculum,
      duration,
      finalExam: undefined,
    };
    courses[idx] = updated;

    await writeAdminContent({
      ...existing,
      managedCourses: courses,
    });

    let mysqlOk = false;
    let mysqlError: string | undefined;
    try {
      const result = await syncCourseContentToMysql(updated);
      mysqlOk = Boolean(result?.ok);
      if (!mysqlOk) {
        mysqlError = "MySQL course row missing; JSON was still saved.";
      }
    } catch (err) {
      console.error("[admin/course-curriculum PUT] MySQL sync", err);
      mysqlError = err instanceof Error ? err.message : "MySQL sync failed";
    }

    return NextResponse.json(
      {
        ok: true,
        slug,
        moduleCount: body.curriculum.length,
        mysqlOk,
        ...(mysqlError ? { mysqlError } : {}),
      },
      { headers: noStoreJson },
    );
  } catch (err) {
    console.error("[admin/course-curriculum PUT]", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Save failed" },
      { status: 500 },
    );
  }
}
