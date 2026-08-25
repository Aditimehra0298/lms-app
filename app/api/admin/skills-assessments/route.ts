import { NextResponse } from "next/server";
import { assertMainAdmin } from "@/lib/server/admin-api-auth";
import { prisma } from "@/lib/prisma";
import { readAdminContent } from "@/lib/server/content-store";
import { canonicalCourseSlug } from "@/lib/course-slug-aliases";
import { normalizeLearnerEmail } from "@/lib/learner-email";
import { readAllLearnerCourseProgressStore } from "@/lib/server/learner-course-progress-store";
import { curriculumModulesForLearner } from "@/lib/curriculum-learner-filter";

import type { SkillsAssessmentRow } from "@/lib/admin-skills-assessment-types";

export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "private, no-store, max-age=0" };

export type { SkillsAssessmentRow };

export async function GET(request: Request) {
  const denied = assertMainAdmin(request);
  if (denied) return denied;

  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim().toLowerCase() ?? "";
  const status = url.searchParams.get("status")?.trim().toLowerCase() ?? "all";
  const type = url.searchParams.get("type")?.trim().toLowerCase() ?? "all";
  const course = url.searchParams.get("course")?.trim().toLowerCase() ?? "all";
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? 500), 1), 2000);

  try {
    const [content, progressStore, users, certificates] = await Promise.all([
      readAdminContent(),
      readAllLearnerCourseProgressStore(),
      prisma.lmsUser.findMany({
        select: {
          email: true,
          name: true,
          identificationNumber: true,
        },
      }),
      prisma.lmsCertificate.findMany({
        orderBy: { issuedAt: "desc" },
        select: {
          id: true,
          learnerEmail: true,
          learnerName: true,
          courseSlug: true,
          courseTitle: true,
          certificateNumber: true,
          status: true,
          scorePercent: true,
          issuedAt: true,
          identificationNumber: true,
        },
      }),
    ]);

    const userByEmail = new Map(
      users.map((u) => [normalizeLearnerEmail(u.email), u] as const),
    );

    const courseMeta = new Map<
      string,
      { title: string; category: string; modules: { index: number; title: string }[] }
    >();
    for (const course of content.managedCourses ?? []) {
      const slug = canonicalCourseSlug(course.slug);
      if (!slug) continue;
      const modules = curriculumModulesForLearner(course.curriculum).map((m, i) => ({
        index: i + 1,
        title: m.title?.trim() || `Module ${i + 1}`,
      }));
      courseMeta.set(slug, {
        title: course.title,
        category: course.category?.trim() || "General",
        modules,
      });
    }

    const categoryTitleBySlug = new Map(
      (content.categories ?? []).map((c) => [c.slug, c.title] as const),
    );

    const rows: SkillsAssessmentRow[] = [];

    for (const [emailRaw, byCourse] of Object.entries(progressStore)) {
      const email = normalizeLearnerEmail(emailRaw);
      const user = userByEmail.get(email);
      for (const [slugRaw, progress] of Object.entries(byCourse ?? {})) {
        const slug = canonicalCourseSlug(slugRaw);
        const meta = courseMeta.get(slug);
        const skillArea =
          (meta?.category && categoryTitleBySlug.get(meta.category)) ||
          meta?.category ||
          "General";
        const courseTitle = meta?.title || slug;

        for (const [modKey, score] of Object.entries(progress.examScores ?? {})) {
          const moduleIndex = Number(modKey);
          const modMeta = meta?.modules.find((m) => m.index === moduleIndex);
          rows.push({
            id: `exam:${email}:${slug}:${modKey}`,
            learnerEmail: email,
            learnerName: user?.name ?? null,
            registrationId: user?.identificationNumber ?? null,
            courseSlug: slug,
            courseTitle,
            skillArea,
            assessmentType: "module_exam",
            assessmentTitle: modMeta?.title || `Module ${modKey} exam`,
            moduleIndex: Number.isFinite(moduleIndex) ? moduleIndex : null,
            scorePercent: score.percent ?? null,
            passed: Boolean(score.passed),
            status: score.passed ? "passed" : "failed",
            assessedAt: score.updatedAt ?? progress.updatedAt ?? null,
            certificateNumber: null,
          });
        }

        const totalModules = meta?.modules.length ?? 0;
        const completed = progress.completedModules?.length ?? 0;
        if (totalModules > 0 && completed >= totalModules) {
          rows.push({
            id: `complete:${email}:${slug}`,
            learnerEmail: email,
            learnerName: user?.name ?? null,
            registrationId: user?.identificationNumber ?? null,
            courseSlug: slug,
            courseTitle,
            skillArea,
            assessmentType: "course_completion",
            assessmentTitle: "Course completion",
            moduleIndex: null,
            scorePercent: 100,
            passed: true,
            status: "completed",
            assessedAt: progress.updatedAt ?? null,
            certificateNumber: null,
          });
        }
      }
    }

    for (const cert of certificates) {
      const email = normalizeLearnerEmail(cert.learnerEmail);
      const user = userByEmail.get(email);
      const slug = canonicalCourseSlug(cert.courseSlug);
      const meta = courseMeta.get(slug);
      const skillArea =
        (meta?.category && categoryTitleBySlug.get(meta.category)) ||
        meta?.category ||
        "General";
      rows.push({
        id: `cert:${cert.id}`,
        learnerEmail: email,
        learnerName: cert.learnerName ?? user?.name ?? null,
        registrationId: cert.identificationNumber ?? user?.identificationNumber ?? null,
        courseSlug: slug,
        courseTitle: cert.courseTitle || meta?.title || slug,
        skillArea,
        assessmentType: "certificate",
        assessmentTitle: "Certificate / skills credential",
        moduleIndex: null,
        scorePercent: cert.scorePercent,
        passed: cert.status === "ready",
        status: cert.status,
        assessedAt: cert.issuedAt.toISOString(),
        certificateNumber: cert.certificateNumber,
      });
    }

    let filtered = rows;
    if (q) {
      filtered = filtered.filter(
        (r) =>
          r.learnerEmail.includes(q) ||
          (r.learnerName ?? "").toLowerCase().includes(q) ||
          r.courseTitle.toLowerCase().includes(q) ||
          r.courseSlug.includes(q) ||
          r.skillArea.toLowerCase().includes(q) ||
          r.assessmentTitle.toLowerCase().includes(q) ||
          (r.certificateNumber ?? "").toLowerCase().includes(q) ||
          String(r.registrationId ?? "").includes(q),
      );
    }
    if (status !== "all") {
      filtered = filtered.filter((r) => r.status.toLowerCase() === status);
    }
    if (type !== "all") {
      filtered = filtered.filter((r) => r.assessmentType === type);
    }
    if (course !== "all") {
      filtered = filtered.filter(
        (r) =>
          r.courseSlug.toLowerCase() === course ||
          r.courseSlug.toLowerCase().includes(course) ||
          r.courseTitle.toLowerCase().includes(course),
      );
    }

    filtered.sort((a, b) => {
      const at = a.assessedAt ? new Date(a.assessedAt).getTime() : 0;
      const bt = b.assessedAt ? new Date(b.assessedAt).getTime() : 0;
      return bt - at;
    });

    const limited = filtered.slice(0, limit);

    const courseOptions = Array.from(
      new Map(
        rows.map((r) => [r.courseSlug, { slug: r.courseSlug, title: r.courseTitle }] as const),
      ).values(),
    ).sort((a, b) => a.title.localeCompare(b.title));

    const stats = {
      total: filtered.length,
      moduleExams: filtered.filter((r) => r.assessmentType === "module_exam").length,
      courseCompletions: filtered.filter((r) => r.assessmentType === "course_completion").length,
      certificates: filtered.filter((r) => r.assessmentType === "certificate").length,
      passed: filtered.filter((r) => r.passed === true).length,
      failed: filtered.filter((r) => r.passed === false).length,
    };

    return NextResponse.json(
      { ok: true, stats, assessments: limited, courses: courseOptions },
      { headers: noStore },
    );
  } catch (err) {
    console.error("[admin/skills-assessments GET]", err);
    return NextResponse.json(
      { ok: false, message: "Could not load skills assessments database." },
      { status: 503 },
    );
  }
}
