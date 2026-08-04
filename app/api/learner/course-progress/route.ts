import { NextResponse } from "next/server";
import { canonicalCourseSlug } from "@/lib/course-slug-aliases";
import { normalizeLearnerEmail } from "@/lib/learner-email";
import {
  getLearnerCourseProgressFromStore,
  upsertLearnerCourseProgressInStore,
  type StoredModuleExamScore,
} from "@/lib/server/learner-course-progress-store";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const email = normalizeLearnerEmail(url.searchParams.get("email")?.trim() ?? "");
  const slug = canonicalCourseSlug(url.searchParams.get("slug")?.trim() ?? "");

  if (!email) {
    return NextResponse.json({ ok: false, message: "email query required" }, { status: 400 });
  }
  if (!slug) {
    return NextResponse.json({ ok: false, message: "slug query required" }, { status: 400 });
  }

  try {
    const progress = await getLearnerCourseProgressFromStore(email, slug);
    return NextResponse.json({ ok: true, progress });
  } catch (err) {
    console.error("[api/learner/course-progress GET]", err);
    return NextResponse.json({ ok: false, message: "Could not load progress." }, { status: 503 });
  }
}

type PutBody = {
  email?: string;
  slug?: string;
  completedModules?: number[];
  examScores?: Record<string, StoredModuleExamScore>;
};

/** Save learner module progress (merge with any existing server row). */
export async function PUT(request: Request) {
  try {
    const body = (await request.json()) as PutBody;
    const email = normalizeLearnerEmail(body.email?.trim() ?? "");
    const slug = canonicalCourseSlug(body.slug?.trim() ?? "");
    if (!email || !slug) {
      return NextResponse.json({ ok: false, message: "email and slug required" }, { status: 400 });
    }

    const existing = await getLearnerCourseProgressFromStore(email, slug);
    const incomingModules = Array.isArray(body.completedModules) ? body.completedModules : [];
    const mergedModules = Array.from(
      new Set([...(existing?.completedModules ?? []), ...incomingModules].filter((n) => Number.isFinite(n) && n > 0)),
    ).sort((a, b) => a - b);

    const examScores: Record<string, StoredModuleExamScore> = {
      ...(existing?.examScores ?? {}),
    };
    if (body.examScores && typeof body.examScores === "object") {
      for (const [key, score] of Object.entries(body.examScores)) {
        if (!score || typeof score !== "object") continue;
        const prev = examScores[key];
        if (!prev || (score.percent ?? 0) >= (prev.percent ?? 0) || score.passed) {
          examScores[key] = {
            correct: Number(score.correct) || 0,
            total: Math.max(1, Number(score.total) || 1),
            percent: Math.round(Number(score.percent) || 0),
            passed: Boolean(score.passed) || Boolean(prev?.passed),
            updatedAt:
              typeof score.updatedAt === "string" ? score.updatedAt : new Date().toISOString(),
          };
        }
      }
    }

    const progress = await upsertLearnerCourseProgressInStore({
      learnerEmail: email,
      courseSlug: slug,
      completedModules: mergedModules,
      examScores,
    });

    return NextResponse.json({ ok: true, progress });
  } catch (err) {
    console.error("[api/learner/course-progress PUT]", err);
    return NextResponse.json({ ok: false, message: "Could not save progress." }, { status: 503 });
  }
}
