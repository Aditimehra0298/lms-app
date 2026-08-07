import type { CourseCurriculumModule } from "@/lib/content-schema";
import { emailAppName, emailAppUrl } from "@/lib/email-brand-config";
import { normalizeLearnerEmail } from "@/lib/learner-email";
import { flattenModuleCurriculumItems } from "@/lib/curriculum-learner-filter";
import { getManagedCourseForLearner } from "@/lib/server/course-catalog";
import { getPurchasesForLearner } from "@/lib/server/get-learner-purchases";
import { canonicalCourseSlug } from "@/lib/course-slug-aliases";
import {
  buildEmailDispatchKey,
  markEmailDispatchFailed,
  markEmailDispatchSent,
  wasEmailDispatchSent,
} from "@/lib/server/n8n-email-dispatch-store";
import {
  getLearnerCourseProgressFromStore,
  type StoredLearnerCourseProgress,
} from "@/lib/server/learner-course-progress-store";
import { postSftN8nEmailWebhook } from "@/lib/server/n8n-sft-email-service";
import { N8N_WEBHOOK_PATHS, resolveN8nWebhookUrlFromEnv } from "@/lib/server/n8n-webhook-url";

const MILESTONE_THRESHOLDS = [25, 50, 75, 100] as const;

function progressReportEnabled(): boolean {
  return process.env.COURSE_PROGRESS_EMAIL_ENABLED !== "false";
}

function progressReportWebhookUrl(): string {
  return resolveN8nWebhookUrlFromEnv(
    "N8N_PROGRESS_REPORT_WEBHOOK_URL",
    N8N_WEBHOOK_PATHS.progressReport,
  );
}

function brandBlock() {
  const appName = emailAppName();
  const appUrl = (
    process.env.MAIL_BRAND_URL?.trim() ||
    "https://www.sftrainings.org"
  ).replace(/\/$/, "");
  const lmsUrl = emailAppUrl().replace(/\/$/, "");
  return {
    appName,
    brandUrl: appUrl,
    lmsUrl,
    brand: { appName, appUrl },
  };
}

function moduleItems(mod: CourseCurriculumModule) {
  return flattenModuleCurriculumItems(mod);
}

function moduleTitle(mod: CourseCurriculumModule, index: number): string {
  const title = typeof mod.title === "string" ? mod.title.trim() : "";
  return title || `Module ${index + 1}`;
}

export type ProgressReportSnapshot = {
  overall: number;
  completedLessons: number;
  totalLessons: number;
  quizzesPassed: number;
  modules: Array<{ name: string; done: number; total: number }>;
};

/** Build progress numbers from stored completion + curriculum. */
export function buildProgressSnapshot(
  curriculum: CourseCurriculumModule[] | null | undefined,
  progress: StoredLearnerCourseProgress | null | undefined,
): ProgressReportSnapshot {
  const modules = Array.isArray(curriculum) ? curriculum : [];
  const completed = new Set(
    (progress?.completedModules ?? []).filter((n) => Number.isFinite(n) && n > 0),
  );
  const examScores = progress?.examScores ?? {};

  let completedLessons = 0;
  let totalLessons = 0;
  const moduleRows: Array<{ name: string; done: number; total: number }> = [];

  for (let i = 0; i < modules.length; i++) {
    const mod = modules[i];
    const items = moduleItems(mod);
    const total = Math.max(1, items.length || 1);
    totalLessons += total;
    const moduleNumber = i + 1;
    const isDone = completed.has(moduleNumber);
    const done = isDone ? total : 0;
    if (isDone) completedLessons += total;
    moduleRows.push({
      name: moduleTitle(mod, i),
      done,
      total,
    });
  }

  const quizzesPassed = Object.values(examScores).filter((s) => s?.passed).length;
  const overall =
    modules.length > 0
      ? Math.min(100, Math.round((completed.size / modules.length) * 100))
      : 0;

  return {
    overall,
    completedLessons,
    totalLessons: Math.max(totalLessons, modules.length),
    quizzesPassed,
    modules: moduleRows.slice(0, 5),
  };
}

function crossedMilestones(prevOverall: number, nextOverall: number): number[] {
  return MILESTONE_THRESHOLDS.filter((t) => prevOverall < t && nextOverall >= t);
}

function newlyCompletedModules(prev: number[], next: number[]): number[] {
  const before = new Set(prev);
  return next.filter((n) => Number.isFinite(n) && n > 0 && !before.has(n)).sort((a, b) => a - b);
}

async function postWithOneRetry(
  payload: Record<string, unknown>,
): Promise<{ ok: boolean; message?: string }> {
  const url = progressReportWebhookUrl();
  const first = await postSftN8nEmailWebhook(url, payload, "progress-report");
  if (first.ok) return first;
  console.warn("[progress-report] first attempt failed, retrying once:", first.message);
  await new Promise((r) => setTimeout(r, 600));
  return postSftN8nEmailWebhook(url, payload, "progress-report");
}

export function buildProgressReportPayload(input: {
  email: string;
  learnerName?: string | null;
  courseName: string;
  deliveryKind?: "self-paced" | "tutor-led";
  progress: ProgressReportSnapshot;
}): Record<string, unknown> {
  const email = normalizeLearnerEmail(input.email);
  const { brand, lmsUrl } = brandBlock();
  const learnerName =
    (input.learnerName?.trim() || email.split("@")[0] || "Learner").slice(0, 200);
  const courseName = (input.courseName.trim() || "Your course").slice(0, 300);

  return {
    email,
    learnerName,
    courseName,
    deliveryKind: input.deliveryKind ?? "self-paced",
    event: "course.progress",
    source: "LMS",
    emailContent: {
      subject: "Your Course Progress Report",
      previewText:
        "See your latest course progress and keep moving forward toward certification.",
    },
    links: {
      dashboard: `${lmsUrl}/my-learning`,
    },
    progress: {
      overall: Number(input.progress.overall) || 0,
      completedLessons: Number(input.progress.completedLessons) || 0,
      totalLessons: Number(input.progress.totalLessons) || 0,
      quizzesPassed: Number(input.progress.quizzesPassed) || 0,
      modules: (input.progress.modules ?? []).slice(0, 5).map((m) => ({
        name: String(m.name ?? "Module").slice(0, 200),
        done: Number(m.done) || 0,
        total: Math.max(1, Number(m.total) || 1),
      })),
    },
    brand,
  };
}

async function learnerIsEnrolled(email: string, courseSlug: string): Promise<boolean> {
  try {
    const purchases = await getPurchasesForLearner(email);
    const slug = canonicalCourseSlug(courseSlug);
    return purchases.some((p) => canonicalCourseSlug(p.slug) === slug);
  } catch (err) {
    console.warn("[progress-report] enrollment lookup failed — allowing send:", err);
    return true;
  }
}

async function sendOnce(input: {
  email: string;
  learnerName?: string | null;
  courseName: string;
  courseSlug: string;
  deliveryKind?: "self-paced" | "tutor-led";
  progress: ProgressReportSnapshot;
  dispatchKey: string;
}): Promise<{ ok: boolean; message?: string; skipped?: boolean }> {
  if (!progressReportEnabled()) return { ok: true, skipped: true };

  const email = normalizeLearnerEmail(input.email);
  if (!email) return { ok: false, message: "email is required" };

  const key = buildEmailDispatchKey({
    event: "course.progress",
    learnerEmail: email,
    courseSlug: input.courseSlug,
    dispatchKey: input.dispatchKey,
  });
  if (wasEmailDispatchSent(key)) return { ok: true, skipped: true };

  if (!(await learnerIsEnrolled(email, input.courseSlug))) {
    return { ok: true, skipped: true, message: "Learner not enrolled — skipped." };
  }

  const payload = buildProgressReportPayload({
    email,
    learnerName: input.learnerName,
    courseName: input.courseName,
    deliveryKind: input.deliveryKind,
    progress: input.progress,
  });

  const result = await postWithOneRetry(payload);
  if (result.ok) {
    markEmailDispatchSent({
      event: "course.progress",
      learnerEmail: email,
      courseSlug: input.courseSlug,
      dispatchKey: input.dispatchKey,
    });
    return { ok: true };
  }

  markEmailDispatchFailed({
    event: "course.progress",
    learnerEmail: email,
    courseSlug: input.courseSlug,
    dispatchKey: input.dispatchKey,
    message: result.message ?? "send failed",
  });
  return result;
}

/**
 * After course progress is saved: send report when a % milestone is crossed
 * or a module is newly completed. Non-blocking caller should void this.
 */
export async function maybeSendCourseProgressReportEmails(input: {
  learnerEmail: string;
  learnerName?: string | null;
  courseSlug: string;
  courseName?: string;
  previous?: StoredLearnerCourseProgress | null;
  next: StoredLearnerCourseProgress;
}): Promise<{ ok: boolean; sent: string[]; skipped?: boolean; message?: string }> {
  if (!progressReportEnabled()) return { ok: true, sent: [], skipped: true };

  const email = normalizeLearnerEmail(input.learnerEmail);
  const slug = input.courseSlug.trim();
  if (!email || !slug) {
    return { ok: false, sent: [], message: "email and courseSlug required" };
  }

  const course = await getManagedCourseForLearner(slug);
  const courseName = input.courseName?.trim() || course?.title?.trim() || slug;
  const curriculum = course?.curriculum ?? [];

  const prevOverall =
    curriculum.length > 0
      ? Math.min(
          100,
          Math.round(((input.previous?.completedModules?.length ?? 0) / curriculum.length) * 100),
        )
      : 0;
  const snapshot = buildProgressSnapshot(curriculum, input.next);
  const milestones = crossedMilestones(prevOverall, snapshot.overall);
  const newMods = newlyCompletedModules(
    input.previous?.completedModules ?? [],
    input.next.completedModules ?? [],
  );

  const dispatchKeys: string[] = [
    ...milestones.map((m) => `milestone:${m}`),
    ...newMods.map((n) => `module:${n}`),
  ];

  // Prefer milestone emails; if only module completion (no new %), still notify once per module.
  if (dispatchKeys.length === 0) {
    return { ok: true, sent: [], skipped: true };
  }

  const sent: string[] = [];
  for (const dispatchKey of dispatchKeys) {
    const result = await sendOnce({
      email,
      learnerName: input.learnerName,
      courseName,
      courseSlug: slug,
      deliveryKind: "self-paced",
      progress: snapshot,
      dispatchKey,
    });
    if (result.ok && !result.skipped) sent.push(dispatchKey);
  }

  return { ok: true, sent };
}

/** Explicit progress report (digest / admin / manual) — still idempotent per day unless force. */
export async function sendCourseProgressReportEmail(input: {
  learnerEmail: string;
  learnerName?: string | null;
  courseSlug: string;
  courseName?: string;
  force?: boolean;
}): Promise<{ ok: boolean; message?: string; skipped?: boolean }> {
  if (!progressReportEnabled()) return { ok: true, skipped: true };

  const email = normalizeLearnerEmail(input.learnerEmail);
  const slug = input.courseSlug.trim();
  if (!email) return { ok: false, message: "email is required" };
  if (!slug) return { ok: false, message: "courseSlug is required" };

  const course = await getManagedCourseForLearner(slug);
  const progress = await getLearnerCourseProgressFromStore(email, slug);
  const snapshot = buildProgressSnapshot(course?.curriculum, progress);
  const dayKey = new Date().toISOString().slice(0, 10);
  const dispatchKey = input.force ? `digest:${dayKey}:${Date.now()}` : `digest:${dayKey}`;

  return sendOnce({
    email,
    learnerName: input.learnerName,
    courseName: input.courseName?.trim() || course?.title?.trim() || slug,
    courseSlug: slug,
    deliveryKind: "self-paced",
    progress: snapshot,
    dispatchKey,
  });
}

/** Fire-and-forget wrapper — never throws into the learner request. */
export function queueCourseProgressReportCheck(input: {
  learnerEmail: string;
  learnerName?: string | null;
  courseSlug: string;
  courseName?: string;
  previous?: StoredLearnerCourseProgress | null;
  next: StoredLearnerCourseProgress;
}): void {
  void maybeSendCourseProgressReportEmails(input).catch((err) => {
    console.error("[progress-report] unhandled:", err);
  });
}
