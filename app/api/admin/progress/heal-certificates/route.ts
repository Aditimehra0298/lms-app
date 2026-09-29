import { NextResponse } from "next/server";
import { canonicalCourseSlug } from "@/lib/course-slug-aliases";
import { countLearnerCurriculumModules } from "@/lib/curriculum-learner-filter";
import { assertMainAdmin } from "@/lib/server/admin-api-auth";
import { grantLearnerCertificateDownloadAccess } from "@/lib/server/admin-grant-certificate-access";
import { getManagedCourses } from "@/lib/server/course-catalog";
import { prisma } from "@/lib/prisma";
import {
  ensureProgressForReadyCertificate,
  readAllLearnerCourseProgressStore,
  upsertLearnerCourseProgressInStore,
} from "@/lib/server/learner-course-progress-store";
import { getPublishedTutorLedPrograms } from "@/lib/server/tutor-led-catalog";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * One-shot heal:
 * 1) For every ready certificate → write 100% module progress.
 * 2) For progress that is complete / nearly-complete (all exams + ≤1 module short)
 *    with no certificate → issue + unlock certificate for the learner.
 */
export async function POST(request: Request) {
  const denied = await assertMainAdmin(request);
  if (denied) return denied;

  try {
    const body = (await request.json().catch(() => ({}))) as {
      learnerEmail?: string;
      courseSlug?: string;
    };
    const onlyEmail = body.learnerEmail?.trim().toLowerCase() || "";
    const onlySlug = body.courseSlug?.trim() || "";

    const certs = await prisma.lmsCertificate.findMany({
      where: {
        status: "ready",
        ...(onlyEmail ? { learnerEmail: onlyEmail } : {}),
        ...(onlySlug ? { courseSlug: onlySlug } : {}),
      },
      select: { learnerEmail: true, courseSlug: true, scorePercent: true, learnerName: true },
      orderBy: { issuedAt: "desc" },
    });

    const seen = new Set<string>();
    let healedProgress = 0;
    const samples: { email: string; name: string | null; slug: string }[] = [];

    for (const cert of certs) {
      const email = cert.learnerEmail.trim().toLowerCase();
      const slug = cert.courseSlug.trim();
      if (!email || !slug) continue;
      const key = `${email}::${slug}`;
      if (seen.has(key)) continue;
      seen.add(key);

      await ensureProgressForReadyCertificate({
        learnerEmail: email,
        courseSlug: slug,
        scorePercent: cert.scorePercent,
      });
      healedProgress += 1;
      if (samples.length < 25) {
        samples.push({ email, name: cert.learnerName, slug });
      }
    }

    const [courses, programs, allProgress] = await Promise.all([
      getManagedCourses(),
      getPublishedTutorLedPrograms(),
      readAllLearnerCourseProgressStore(),
    ]);

    const moduleCountBySlug = new Map<string, number>();
    for (const course of courses) {
      const slug = canonicalCourseSlug(course.slug) || course.slug.trim();
      if (slug) moduleCountBySlug.set(slug, countLearnerCurriculumModules(course.curriculum));
    }
    for (const program of programs) {
      const slug = canonicalCourseSlug(program.slug) || program.slug.trim();
      if (!slug) continue;
      const n = Array.isArray(program.curriculum) ? program.curriculum.length : 0;
      if (n > 0) moduleCountBySlug.set(slug, n);
    }

    let issuedMissing = 0;
    const issuedSamples: { email: string; slug: string; message: string }[] = [];

    for (const [email, bySlug] of Object.entries(allProgress)) {
      const learnerEmail = email.trim().toLowerCase();
      if (!learnerEmail) continue;
      if (onlyEmail && learnerEmail !== onlyEmail) continue;

      for (const [rawSlug, progress] of Object.entries(bySlug ?? {})) {
        const slug = canonicalCourseSlug(rawSlug) || rawSlug.trim();
        if (!slug) continue;
        if (onlySlug && slug !== canonicalCourseSlug(onlySlug) && slug !== onlySlug) continue;

        const total = moduleCountBySlug.get(slug) ?? 0;
        if (total <= 0) continue;

        const completed = progress.completedModules ?? [];
        const exams = Object.values(progress.examScores ?? {});
        const allExamsPassed = exams.length > 0 && exams.every((e) => e.passed);
        const full = completed.length >= total;
        const nearly =
          !full && completed.length >= total - 1 && completed.length < total && allExamsPassed;
        if (!full && !nearly) continue;

        if (nearly) {
          await upsertLearnerCourseProgressInStore({
            learnerEmail,
            courseSlug: slug,
            completedModules: Array.from({ length: total }, (_, i) => i + 1),
            examScores: progress.examScores ?? {},
          });
        }

        const existing = await prisma.lmsCertificate.findFirst({
          where: { learnerEmail, courseSlug: slug, status: "ready" },
          select: { id: true },
        });
        if (existing) continue;

        const result = await grantLearnerCertificateDownloadAccess({
          learnerEmail,
          courseSlug: slug,
        });
        if (result.ok && result.granted) {
          issuedMissing += 1;
          if (issuedSamples.length < 25) {
            issuedSamples.push({ email: learnerEmail, slug, message: result.message });
          }
        } else if (issuedSamples.length < 25 && result.ok === false) {
          issuedSamples.push({
            email: learnerEmail,
            slug,
            message: result.message,
          });
        }
      }
    }

    return NextResponse.json({
      ok: true,
      healedProgress,
      issuedMissing,
      totalReadyCertificates: certs.length,
      samples,
      issuedSamples,
      message: `Healed ${healedProgress} progress rows from ready certificates; issued ${issuedMissing} missing certificates.`,
    });
  } catch (err) {
    console.error("[api/admin/progress/heal-certificates]", err);
    return NextResponse.json({ ok: false, message: "Heal failed." }, { status: 503 });
  }
}
