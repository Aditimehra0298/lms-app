import { NextResponse } from "next/server";
import { canonicalCourseSlug } from "@/lib/course-slug-aliases";
import {
  getLearnerCourseProgressFromStore,
  upsertLearnerCourseProgressInStore,
  type StoredModuleExamScore,
} from "@/lib/server/learner-course-progress-store";
import { findExistingEnrollment } from "@/lib/server/enrollment-lookup";
import { queueCourseProgressReportCheck } from "@/lib/server/n8n-progress-report-service";
import { queueModuleCompletedEmails } from "@/lib/server/n8n-module-completed-service";
import {
  learnerAuthRequiredResponse,
  requireLearnerSessionEmail,
} from "@/lib/server/learner-session";
import { hitRateLimit, enforceMinGap } from "@/lib/server/otp-rate-limit";
import { getTrustedClientIp } from "@/lib/server/trusted-client-ip";
import { DEFAULT_MODULE_EXAM_PASS_PERCENT } from "@/lib/learner-exam-scores";

export const dynamic = "force-dynamic";

const MAX_MODULE_INDEX = 200;
const EXAM_KEY_RE = /^(final|\d{1,3})$/i;

function sanitizeExamScores(
  incoming: Record<string, unknown> | undefined,
  existing: Record<string, StoredModuleExamScore>,
): Record<string, StoredModuleExamScore> {
  const out: Record<string, StoredModuleExamScore> = { ...existing };
  if (!incoming || typeof incoming !== "object") return out;

  for (const [key, raw] of Object.entries(incoming)) {
    if (!EXAM_KEY_RE.test(key)) continue;
    if (!raw || typeof raw !== "object") continue;
    const score = raw as Record<string, unknown>;

    const total = Math.max(1, Math.min(500, Math.round(Number(score.total) || 0)));
    let correct = Math.round(Number(score.correct) || 0);
    if (!Number.isFinite(correct) || correct < 0) correct = 0;
    correct = Math.min(correct, total);

    let percent = Math.round(Number(score.percent));
    if (!Number.isFinite(percent)) {
      percent = Math.round((correct / total) * 100);
    }
    percent = Math.max(0, Math.min(100, percent));

    // Derive pass from score math — never trust a bare client `passed: true`.
    const passed = percent >= DEFAULT_MODULE_EXAM_PASS_PERCENT && correct <= total;

    const prev = out[key];
    if (!prev || percent >= (prev.percent ?? 0) || (passed && !prev.passed)) {
      out[key] = {
        correct,
        total,
        percent,
        passed: passed || Boolean(prev?.passed && prev.percent >= DEFAULT_MODULE_EXAM_PASS_PERCENT),
        updatedAt:
          typeof score.updatedAt === "string" ? score.updatedAt : new Date().toISOString(),
      };
    }
  }
  return out;
}

export async function GET(request: Request) {
  const email = requireLearnerSessionEmail(request);
  if (!email) return learnerAuthRequiredResponse();

  const url = new URL(request.url);
  // Ignore ?email= — session identity only (POC-D-07 / POC-C-04).
  void url.searchParams.get("email");
  const slug = canonicalCourseSlug(url.searchParams.get("slug")?.trim() ?? "");
  if (!slug) {
    return NextResponse.json({ ok: false, message: "slug query required" }, { status: 400 });
  }

  try {
    const progress = await getLearnerCourseProgressFromStore(email, slug);
    return NextResponse.json(
      { ok: true, progress },
      { headers: { "Cache-Control": "no-store" } },
    );
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
  learnerName?: string;
  courseName?: string;
};

/**
 * Save learner module progress for the signed-in session only (POC-D-07).
 * Body.email is ignored; enrollment required; exam pass flags derived server-side.
 */
export async function PUT(request: Request) {
  const sessionEmail = requireLearnerSessionEmail(request);
  if (!sessionEmail) return learnerAuthRequiredResponse();

  try {
    const body = (await request.json()) as PutBody;
    void body.email; // never trust client-supplied owner identity

    const slug = canonicalCourseSlug(body.slug?.trim() ?? "");
    if (!slug) {
      return NextResponse.json({ ok: false, message: "slug required" }, { status: 400 });
    }

    const ip = getTrustedClientIp(request);
    const ipLimit = hitRateLimit(
      `progress:ip:${ip}`,
      120,
      15 * 60 * 1000,
      "Too many progress updates from this network. Try again later.",
    );
    if (!ipLimit.ok) {
      return NextResponse.json(
        { ok: false, message: ipLimit.message },
        { status: 429, headers: { "Retry-After": String(ipLimit.retryAfterSec) } },
      );
    }

    const emailLimit = hitRateLimit(
      `progress:email:${sessionEmail}`,
      60,
      15 * 60 * 1000,
      "Too many progress updates. Slow down and try again.",
    );
    if (!emailLimit.ok) {
      return NextResponse.json(
        { ok: false, message: emailLimit.message },
        { status: 429, headers: { "Retry-After": String(emailLimit.retryAfterSec) } },
      );
    }

    const gap = enforceMinGap(
      `progress:gap:${sessionEmail}:${slug}`,
      300,
      "Wait a moment before saving progress again.",
    );
    if (!gap.ok) {
      return NextResponse.json(
        { ok: false, message: gap.message },
        { status: 429, headers: { "Retry-After": String(gap.retryAfterSec) } },
      );
    }

    const enrolled = await findExistingEnrollment({
      learnerEmail: sessionEmail,
      courseSlug: slug,
    });
    if (!enrolled) {
      return NextResponse.json(
        {
          ok: false,
          message: "You must be enrolled in this course to save progress.",
        },
        { status: 403 },
      );
    }

    const email = sessionEmail;
    const existing = await getLearnerCourseProgressFromStore(email, slug);
    const incomingModules = Array.isArray(body.completedModules) ? body.completedModules : [];
    const mergedModules = Array.from(
      new Set(
        [...(existing?.completedModules ?? []), ...incomingModules]
          .map((n) => Math.round(Number(n)))
          .filter((n) => Number.isFinite(n) && n > 0 && n <= MAX_MODULE_INDEX),
      ),
    ).sort((a, b) => a - b);

    const examScores = sanitizeExamScores(
      body.examScores as Record<string, unknown> | undefined,
      existing?.examScores ?? {},
    );

    const progress = await upsertLearnerCourseProgressInStore({
      learnerEmail: email,
      courseSlug: slug,
      completedModules: mergedModules,
      examScores,
    });

    queueCourseProgressReportCheck({
      learnerEmail: email,
      learnerName: body.learnerName,
      courseSlug: slug,
      courseName: body.courseName,
      previous: existing,
      next: progress,
    });

    queueModuleCompletedEmails({
      learnerEmail: email,
      learnerName: body.learnerName,
      courseSlug: slug,
      courseName: body.courseName,
      previous: existing,
      next: progress,
    });

    return NextResponse.json(
      { ok: true, progress },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    console.error("[api/learner/course-progress PUT]", err);
    return NextResponse.json({ ok: false, message: "Could not save progress." }, { status: 503 });
  }
}
