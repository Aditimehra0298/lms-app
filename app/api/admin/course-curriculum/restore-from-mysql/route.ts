import { NextResponse } from "next/server";
import { assertMainAdmin } from "@/lib/server/admin-api-auth";
import { curriculumRichnessScore } from "@/lib/curriculum-richness";
import { getCourseContentFromMysql } from "@/lib/server/course-content-mysql-sync";
import { readAdminContentFromDisk, writeAdminContent } from "@/lib/server/content-store";

export const dynamic = "force-dynamic";

/**
 * If MySQL still holds a richer curriculum than admin-content.json (e.g. after a wipe),
 * copy it back into the JSON catalog.
 *
 * Body: { slug: string, dryRun?: boolean }
 */
export async function POST(request: Request) {
  const denied = await assertMainAdmin(request);
  if (denied) return denied;

  try {
    const body = (await request.json().catch(() => ({}))) as {
      slug?: string;
      dryRun?: boolean;
    };
    const slug = typeof body.slug === "string" ? body.slug.trim() : "";
    if (!slug) {
      return NextResponse.json({ ok: false, error: "slug is required" }, { status: 400 });
    }

    const fromMysql = await getCourseContentFromMysql(slug);
    const mysqlMods = fromMysql?.curriculum ?? [];
    const mysqlScore = curriculumRichnessScore(mysqlMods);

    const existing = await readAdminContentFromDisk();
    const courses = [...(existing.managedCourses ?? [])];
    const idx = courses.findIndex((c) => c.slug?.trim() === slug);
    const jsonMods = idx >= 0 ? courses[idx].curriculum ?? [] : [];
    const jsonScore = curriculumRichnessScore(jsonMods);

    if (mysqlScore <= 0) {
      return NextResponse.json({
        ok: false,
        error: "MySQL has no curriculum for this slug — nothing to restore.",
        slug,
        jsonModules: jsonMods.length,
        mysqlModules: 0,
      });
    }

    if (mysqlScore <= jsonScore) {
      return NextResponse.json({
        ok: true,
        restored: false,
        message: "JSON already has equal or richer curriculum than MySQL.",
        slug,
        jsonModules: jsonMods.length,
        mysqlModules: mysqlMods.length,
      });
    }

    if (body.dryRun) {
      return NextResponse.json({
        ok: true,
        restored: false,
        dryRun: true,
        message: `Would restore ${mysqlMods.length} modules from MySQL over ${jsonMods.length} in JSON.`,
        slug,
        jsonModules: jsonMods.length,
        mysqlModules: mysqlMods.length,
      });
    }

    if (idx < 0) {
      if (!fromMysql) {
        return NextResponse.json({ ok: false, error: "Course missing in JSON and MySQL payload incomplete" }, { status: 404 });
      }
      courses.push({ ...fromMysql, slug });
    } else {
      courses[idx] = {
        ...courses[idx],
        curriculum: mysqlMods,
        ...(fromMysql?.title ? { title: courses[idx].title || fromMysql.title } : {}),
      };
    }

    await writeAdminContent({ ...existing, managedCourses: courses });

    return NextResponse.json({
      ok: true,
      restored: true,
      slug,
      jsonModulesBefore: jsonMods.length,
      modulesNow: mysqlMods.length,
    });
  } catch (err) {
    console.error("[admin/course-curriculum/restore-from-mysql]", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Restore failed" },
      { status: 500 },
    );
  }
}
