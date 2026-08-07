import type { CourseCurriculumModule } from "@/lib/content-schema";
import { canonicalCourseSlug } from "@/lib/course-slug-aliases";
import { emailAppName, emailAppUrl } from "@/lib/email-brand-config";
import { normalizeLearnerEmail } from "@/lib/learner-email";
import { flattenModuleCurriculumItems } from "@/lib/curriculum-learner-filter";
import { getManagedCourseForLearner } from "@/lib/server/course-catalog";
import { getPurchasesForLearner } from "@/lib/server/get-learner-purchases";
import {
  buildEmailDispatchKey,
  markEmailDispatchFailed,
  markEmailDispatchSent,
  wasEmailDispatchSent,
} from "@/lib/server/n8n-email-dispatch-store";
import type { StoredLearnerCourseProgress } from "@/lib/server/learner-course-progress-store";
import { postSftN8nEmailWebhook } from "@/lib/server/n8n-sft-email-service";
import { N8N_WEBHOOK_PATHS, resolveN8nWebhookUrlFromEnv } from "@/lib/server/n8n-webhook-url";

function moduleCompletedEmailEnabled(): boolean {
  return process.env.MODULE_COMPLETED_EMAIL_ENABLED !== "false";
}

function moduleCompletedWebhookUrl(): string {
  return resolveN8nWebhookUrlFromEnv(
    "N8N_MODULE_COMPLETED_WEBHOOK_URL",
    N8N_WEBHOOK_PATHS.moduleCompleted,
  );
}

function brandBlock() {
  const appName = emailAppName();
  const brandUrl = (
    process.env.MAIL_BRAND_URL?.trim() ||
    "https://www.sftrainings.org"
  ).replace(/\/$/, "");
  const lmsUrl = emailAppUrl().replace(/\/$/, "");
  return {
    lmsUrl,
    brand: { appName, appUrl: brandUrl },
  };
}

function moduleItems(mod: CourseCurriculumModule) {
  return flattenModuleCurriculumItems(mod);
}

function moduleTitleAt(curriculum: CourseCurriculumModule[], moduleNumber: number): string {
  const mod = curriculum[moduleNumber - 1];
  const title = typeof mod?.title === "string" ? mod.title.trim() : "";
  return title || `Module ${moduleNumber}`;
}

function formatAttemptedOn(iso?: string): string {
  const d = iso ? new Date(iso) : new Date();
  if (Number.isNaN(d.getTime())) {
    return new Date().toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

async function postWithOneRetry(
  payload: Record<string, unknown>,
): Promise<{ ok: boolean; message?: string }> {
  const url = moduleCompletedWebhookUrl();
  const first = await postSftN8nEmailWebhook(url, payload, "module-completed");
  if (first.ok) return first;
  console.warn("[module-completed] first attempt failed, retrying once:", first.message);
  await new Promise((r) => setTimeout(r, 600));
  return postSftN8nEmailWebhook(url, payload, "module-completed");
}

async function learnerIsEnrolled(email: string, courseSlug: string): Promise<boolean> {
  try {
    const purchases = await getPurchasesForLearner(email);
    const slug = canonicalCourseSlug(courseSlug);
    return purchases.some((p) => canonicalCourseSlug(p.slug) === slug);
  } catch (err) {
    console.warn("[module-completed] enrollment lookup failed — allowing send:", err);
    return true;
  }
}

export function buildModuleCompletedPayload(input: {
  email: string;
  learnerName?: string | null;
  courseName: string;
  courseSlug: string;
  moduleNumber: number;
  moduleTitle: string;
  score: number;
  attemptedOn?: string;
  lessonsCompleted: number;
  quizzesAttempted: number;
  hasNextModule: boolean;
  deliveryKind?: "self-paced" | "tutor-led";
}): Record<string, unknown> {
  const email = normalizeLearnerEmail(input.email);
  const { brand, lmsUrl } = brandBlock();
  const n = Math.max(1, Math.floor(input.moduleNumber));
  const title = (input.moduleTitle || `Module ${n}`).slice(0, 200);
  const moduleName = `Module ${n}: ${title}`.slice(0, 240);
  const moduleLabel = `${n}: ${title}`.slice(0, 220);
  const slugEnc = encodeURIComponent(input.courseSlug.trim());
  const nextHref = input.hasNextModule
    ? `${lmsUrl}/my-learning/course/${slugEnc}?module=${n + 1}`
    : `${lmsUrl}/my-learning/course/${slugEnc}`;

  return {
    email,
    learnerName: (input.learnerName?.trim() || email.split("@")[0] || "Learner").slice(0, 200),
    courseName: (input.courseName.trim() || input.courseSlug).slice(0, 300),
    moduleName,
    moduleLabel,
    status: "Module Completed",
    examResult: "Passed",
    score: Math.max(0, Math.min(100, Math.round(Number(input.score) || 0))),
    attemptedOn: formatAttemptedOn(input.attemptedOn),
    lessonsCompleted: Math.max(0, Math.round(Number(input.lessonsCompleted) || 0)),
    quizzesAttempted: Math.max(0, Math.round(Number(input.quizzesAttempted) || 0)),
    certificatePath: "On Track",
    deliveryKind: input.deliveryKind ?? "self-paced",
    event: "module.completed",
    source: "LMS",
    emailContent: {
      subject: "Congratulations! You Completed the Module and Passed the Exam",
      previewText:
        "Great work! You've completed the module and passed the exam. See your results and what's next.",
    },
    links: {
      nextModule: nextHref,
      dashboard: `${lmsUrl}/my-learning`,
    },
    brand,
  };
}

/** Module numbers that newly flipped to passed between previous and next progress. */
export function newlyPassedModuleNumbers(
  previous: StoredLearnerCourseProgress | null | undefined,
  next: StoredLearnerCourseProgress,
): Array<{ moduleNumber: number; score: number; attemptedOn: string }> {
  const out: Array<{ moduleNumber: number; score: number; attemptedOn: string }> = [];
  for (const [key, score] of Object.entries(next.examScores ?? {})) {
    if (key === "final") continue;
    const moduleNumber = Number(key);
    if (!Number.isFinite(moduleNumber) || moduleNumber < 1) continue;
    if (!score?.passed) continue;
    const wasPassed = Boolean(previous?.examScores?.[key]?.passed);
    if (wasPassed) continue;
    out.push({
      moduleNumber,
      score: Math.round(Number(score.percent) || 0),
      attemptedOn: score.updatedAt || new Date().toISOString(),
    });
  }
  return out.sort((a, b) => a.moduleNumber - b.moduleNumber);
}

async function sendOne(input: {
  email: string;
  learnerName?: string | null;
  courseSlug: string;
  courseName: string;
  curriculum: CourseCurriculumModule[];
  moduleNumber: number;
  score: number;
  attemptedOn: string;
  completedModules: number[];
  examScores: StoredLearnerCourseProgress["examScores"];
}): Promise<{ ok: boolean; skipped?: boolean; message?: string }> {
  if (!moduleCompletedEmailEnabled()) return { ok: true, skipped: true };

  const email = normalizeLearnerEmail(input.email);
  if (!email) return { ok: false, message: "email is required" };

  const dispatchKey = `module:${input.moduleNumber}`;
  const key = buildEmailDispatchKey({
    event: "module.completed",
    learnerEmail: email,
    courseSlug: input.courseSlug,
    dispatchKey,
  });
  if (wasEmailDispatchSent(key)) return { ok: true, skipped: true };

  if (!(await learnerIsEnrolled(email, input.courseSlug))) {
    return { ok: true, skipped: true, message: "Learner not enrolled — skipped." };
  }

  const title = moduleTitleAt(input.curriculum, input.moduleNumber);
  const mod = input.curriculum[input.moduleNumber - 1];
  const lessonsInModule = mod ? moduleItems(mod).filter((i) => i.kind !== "exam").length : 0;
  const quizzesAttempted = Object.values(input.examScores ?? {}).filter(
    (s) => s && (s.total > 0 || s.passed),
  ).length;
  const lessonsCompleted = input.completedModules.includes(input.moduleNumber)
    ? Math.max(1, lessonsInModule)
    : Math.max(0, lessonsInModule);

  const payload = buildModuleCompletedPayload({
    email,
    learnerName: input.learnerName,
    courseName: input.courseName,
    courseSlug: input.courseSlug,
    moduleNumber: input.moduleNumber,
    moduleTitle: title,
    score: input.score,
    attemptedOn: input.attemptedOn,
    lessonsCompleted,
    quizzesAttempted,
    hasNextModule: input.moduleNumber < input.curriculum.length,
    deliveryKind: "self-paced",
  });

  const result = await postWithOneRetry(payload);
  if (result.ok) {
    markEmailDispatchSent({
      event: "module.completed",
      learnerEmail: email,
      courseSlug: input.courseSlug,
      dispatchKey,
    });
    return { ok: true };
  }

  markEmailDispatchFailed({
    event: "module.completed",
    learnerEmail: email,
    courseSlug: input.courseSlug,
    dispatchKey,
    message: result.message ?? "send failed",
  });
  return result;
}

/**
 * After progress save: email when a module exam newly passes.
 * One email per module (idempotent). Safe to call fire-and-forget.
 */
export async function maybeSendModuleCompletedEmails(input: {
  learnerEmail: string;
  learnerName?: string | null;
  courseSlug: string;
  courseName?: string;
  previous?: StoredLearnerCourseProgress | null;
  next: StoredLearnerCourseProgress;
}): Promise<{ ok: boolean; sent: number[]; skipped?: boolean; message?: string }> {
  if (!moduleCompletedEmailEnabled()) return { ok: true, sent: [], skipped: true };

  const email = normalizeLearnerEmail(input.learnerEmail);
  const slug = canonicalCourseSlug(input.courseSlug);
  if (!email || !slug) {
    return { ok: false, sent: [], message: "email and courseSlug required" };
  }

  const newlyPassed = newlyPassedModuleNumbers(input.previous, input.next);
  if (newlyPassed.length === 0) return { ok: true, sent: [], skipped: true };

  const course = await getManagedCourseForLearner(slug);
  const courseName = input.courseName?.trim() || course?.title?.trim() || slug;
  const curriculum = course?.curriculum ?? [];

  const sent: number[] = [];
  for (const row of newlyPassed) {
    const result = await sendOne({
      email,
      learnerName: input.learnerName,
      courseSlug: slug,
      courseName,
      curriculum,
      moduleNumber: row.moduleNumber,
      score: row.score,
      attemptedOn: row.attemptedOn,
      completedModules: input.next.completedModules ?? [],
      examScores: input.next.examScores ?? {},
    });
    if (result.ok && !result.skipped) sent.push(row.moduleNumber);
  }

  return { ok: true, sent };
}

export function queueModuleCompletedEmails(input: {
  learnerEmail: string;
  learnerName?: string | null;
  courseSlug: string;
  courseName?: string;
  previous?: StoredLearnerCourseProgress | null;
  next: StoredLearnerCourseProgress;
}): void {
  void maybeSendModuleCompletedEmails(input).catch((err) => {
    console.error("[module-completed] unhandled:", err);
  });
}
