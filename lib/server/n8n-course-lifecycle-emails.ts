import { emailAppName, emailAppUrl } from "@/lib/email-brand-config";
import { normalizeLearnerEmail } from "@/lib/learner-email";
import { canonicalCourseSlug } from "@/lib/course-slug-aliases";
import { getPurchasesForLearner } from "@/lib/server/get-learner-purchases";
import {
  buildEmailDispatchKey,
  listDueScheduledDispatches,
  completeScheduledDispatch,
  markEmailDispatchFailed,
  markEmailDispatchSent,
  scheduleEmailDispatch,
  wasEmailDispatchSent,
} from "@/lib/server/n8n-email-dispatch-store";
import { postSftN8nEmailWebhook, queueSftN8nEmailWebhook } from "@/lib/server/n8n-sft-email-service";
import {
  resolvePurchaseDeliveryKind,
  type PurchaseDeliveryKind,
} from "@/lib/server/n8n-purchase-confirmation-service";
import { N8N_WEBHOOK_PATHS, resolveN8nWebhookUrlFromEnv } from "@/lib/server/n8n-webhook-url";

function lifecycleEmailsEnabled(): boolean {
  return process.env.COURSE_LIFECYCLE_EMAIL_ENABLED !== "false";
}

function feedbackDelayHours(): number {
  const raw = Number(process.env.N8N_FEEDBACK_EMAIL_DELAY_HOURS ?? 72);
  return Number.isFinite(raw) && raw >= 0 ? raw : 72;
}

function courseCompletionWebhookUrl(): string {
  return resolveN8nWebhookUrlFromEnv(
    "N8N_COURSE_COMPLETION_WEBHOOK_URL",
    N8N_WEBHOOK_PATHS.courseCompletion,
  );
}

function courseFeedbackWebhookUrl(): string {
  return resolveN8nWebhookUrlFromEnv("N8N_REVIEWS_WEBHOOK_URL", N8N_WEBHOOK_PATHS.reviews);
}

function brandBlock() {
  const appName = emailAppName();
  const brandUrl = (
    process.env.MAIL_BRAND_URL?.trim() ||
    "https://www.sftrainings.org"
  ).replace(/\/$/, "");
  const lmsUrl = emailAppUrl().replace(/\/$/, "");
  return {
    appName,
    brandUrl,
    lmsUrl,
    brand: { appName, appUrl: brandUrl },
  };
}

function buildCourseCompletionPayload(input: {
  email: string;
  learnerName: string;
  courseName: string;
  deliveryKind: PurchaseDeliveryKind;
  certificateHref: string;
}) {
  const { brand, lmsUrl, brandUrl } = brandBlock();
  return {
    email: normalizeLearnerEmail(input.email),
    learnerName: input.learnerName.slice(0, 200),
    courseName: input.courseName.slice(0, 300),
    event: "course.completed",
    source: "LMS",
    deliveryKind: input.deliveryKind,
    emailContent: {
      subject: "Congratulations! You've Successfully Completed the Course",
      previewText:
        "Congratulations! Your course completion certificate is ready. Download it and showcase your achievement with pride.",
    },
    links: {
      certificate: input.certificateHref,
      browseCourses: `${brandUrl}/courses`,
      support: "mailto:info@sftrainings.org",
      dashboard: `${lmsUrl}/my-learning`,
    },
    brand,
  };
}

function buildCourseFeedbackPayload(input: {
  email: string;
  learnerName: string;
  courseName: string;
  courseSlug: string;
  deliveryKind: PurchaseDeliveryKind;
}) {
  const { brand, lmsUrl } = brandBlock();
  const slug = encodeURIComponent(input.courseSlug);
  return {
    email: normalizeLearnerEmail(input.email),
    learnerName: input.learnerName.slice(0, 200),
    courseName: input.courseName.slice(0, 300),
    event: "course.feedback.requested",
    source: "LMS",
    deliveryKind: input.deliveryKind,
    emailContent: {
      subject: "How Was Your Learning Experience?",
      previewText: "Share your feedback and help us improve future courses.",
    },
    links: {
      review: `${lmsUrl}/my-learning/course/${slug}#reviews`,
      dashboard: `${lmsUrl}/my-learning`,
    },
    brand,
  };
}

async function postCompletionWithRetry(
  payload: Record<string, unknown>,
): Promise<{ ok: boolean; message?: string }> {
  const url = courseCompletionWebhookUrl();
  const first = await postSftN8nEmailWebhook(url, payload, "course-completion");
  if (first.ok) return first;
  console.warn("[course-completed] first attempt failed, retrying once:", first.message);
  await new Promise((r) => setTimeout(r, 600));
  return postSftN8nEmailWebhook(url, payload, "course-completion");
}

async function learnerIsEnrolled(email: string, courseSlug: string): Promise<boolean> {
  try {
    const purchases = await getPurchasesForLearner(email);
    const slug = canonicalCourseSlug(courseSlug);
    return purchases.some((p) => canonicalCourseSlug(p.slug) === slug);
  } catch (err) {
    console.warn("[course-completed] enrollment lookup failed — allowing send:", err);
    return true;
  }
}

function absoluteCertificateHref(certificateId: string | undefined, lmsUrl: string): string {
  const id = certificateId?.trim();
  if (id) {
    return `${lmsUrl}/api/certificates/${encodeURIComponent(id)}/download`;
  }
  return `${lmsUrl}/my-learning?tab=certificates`;
}

/**
 * POST course-completed webhook once per learner+course (idempotent).
 * Prefer calling after the certificate record exists so links.certificate is a real download URL.
 */
export async function sendCourseCompletionEmailViaN8n(input: {
  learnerEmail: string;
  learnerName?: string | null;
  courseName: string;
  courseSlug: string;
  certificateId?: string;
  deliveryKind?: PurchaseDeliveryKind;
}): Promise<{ ok: boolean; message?: string; skipped?: boolean }> {
  if (!lifecycleEmailsEnabled()) return { ok: true, skipped: true };

  const email = normalizeLearnerEmail(input.learnerEmail);
  const slug = canonicalCourseSlug(input.courseSlug);
  if (!email) return { ok: false, message: "email is required" };
  if (!slug) return { ok: false, message: "courseSlug is required" };

  const dispatchKey = buildEmailDispatchKey({
    event: "course.completed",
    learnerEmail: email,
    courseSlug: slug,
  });
  if (wasEmailDispatchSent(dispatchKey)) return { ok: true, skipped: true };

  if (!(await learnerIsEnrolled(email, slug))) {
    return { ok: true, skipped: true, message: "Learner not enrolled — skipped." };
  }

  const deliveryKind = input.deliveryKind ?? (await resolvePurchaseDeliveryKind(slug));
  const { lmsUrl } = brandBlock();
  const certificateHref = absoluteCertificateHref(input.certificateId, lmsUrl);

  const payload = buildCourseCompletionPayload({
    email,
    learnerName: input.learnerName?.trim() || email.split("@")[0] || "Learner",
    courseName: input.courseName.trim() || slug,
    deliveryKind,
    certificateHref,
  });

  const result = await postCompletionWithRetry(payload);
  if (result.ok) {
    markEmailDispatchSent({ event: "course.completed", learnerEmail: email, courseSlug: slug });
    return { ok: true };
  }
  markEmailDispatchFailed({
    event: "course.completed",
    learnerEmail: email,
    courseSlug: slug,
    message: result.message,
  });
  return result;
}

/** Schedule feedback/review email (default +72h) — processed by cron. */
export function scheduleCourseFeedbackEmail(input: {
  learnerEmail: string;
  learnerName?: string | null;
  courseName: string;
  courseSlug: string;
}): void {
  if (!lifecycleEmailsEnabled()) return;

  const email = normalizeLearnerEmail(input.learnerEmail);
  const slug = canonicalCourseSlug(input.courseSlug);
  const due = new Date();
  due.setHours(due.getHours() + feedbackDelayHours());

  void resolvePurchaseDeliveryKind(slug)
    .then((deliveryKind) => {
      const payload = buildCourseFeedbackPayload({
        email,
        learnerName: input.learnerName?.trim() || email.split("@")[0] || "Learner",
        courseName: input.courseName.trim() || slug,
        courseSlug: slug,
        deliveryKind,
      });
      scheduleEmailDispatch({
        event: "course.feedback.requested",
        learnerEmail: email,
        courseSlug: slug,
        scheduledFor: due,
        payload,
      });
    })
    .catch((err) => {
      console.error("[course-feedback] schedule failed:", err);
    });
}

/** Same n8n course-completed webhook for self-paced and tutor-led (awaitable). */
export async function queueCourseCompletionEmail(input: {
  learnerEmail: string;
  learnerName?: string | null;
  courseName?: string;
  courseSlug: string;
  certificateId?: string;
  deliveryKind?: PurchaseDeliveryKind;
}): Promise<{ ok: boolean; message?: string; skipped?: boolean }> {
  if (!lifecycleEmailsEnabled()) return { ok: true, skipped: true };

  return sendCourseCompletionEmailViaN8n({
    learnerEmail: input.learnerEmail,
    learnerName: input.learnerName,
    courseName: input.courseName?.trim() || input.courseSlug,
    courseSlug: input.courseSlug,
    certificateId: input.certificateId,
    deliveryKind: input.deliveryKind,
  });
}

/** Fire-and-forget course-completed email (shared webhook). */
export function notifyCourseCompletionEmail(input: {
  learnerEmail: string;
  learnerName?: string | null;
  courseName?: string;
  courseSlug: string;
  certificateId?: string;
  deliveryKind?: PurchaseDeliveryKind;
}): void {
  void queueCourseCompletionEmail(input).catch((err) => {
    console.error("[course-completed] failed:", err);
  });
}

/** Completion email now + schedule delayed feedback request. */
export function queueCourseLifecycleEmails(input: {
  learnerEmail: string;
  learnerName?: string | null;
  courseName: string;
  courseSlug: string;
  certificateId?: string;
  deliveryKind?: PurchaseDeliveryKind;
}): void {
  if (!lifecycleEmailsEnabled()) return;

  notifyCourseCompletionEmail(input);
  scheduleCourseFeedbackEmail(input);
}

export async function sendDueCourseFeedbackEmails(): Promise<{
  sent: number;
  failed: number;
}> {
  const due = listDueScheduledDispatches().filter((row) => row.event === "course.feedback.requested");
  let sent = 0;
  let failed = 0;
  const url = courseFeedbackWebhookUrl();

  for (const row of due) {
    const idemKey = buildEmailDispatchKey({
      event: "course.feedback.requested",
      learnerEmail: row.learnerEmail,
      courseSlug: row.courseSlug,
    });
    if (wasEmailDispatchSent(idemKey)) {
      completeScheduledDispatch(row.key);
      continue;
    }
    if (!row.payload) continue;

    const result = await postSftN8nEmailWebhook(url, row.payload, "course-feedback");
    if (result.ok) {
      markEmailDispatchSent({
        event: "course.feedback.requested",
        learnerEmail: row.learnerEmail,
        courseSlug: row.courseSlug,
      });
      completeScheduledDispatch(row.key);
      sent += 1;
    } else {
      completeScheduledDispatch(row.key, result.message);
      failed += 1;
    }
  }

  return { sent, failed };
}

/** Fire-and-forget helper for scheduled feedback (cron uses sendDueCourseFeedbackEmails). */
export function queueCourseFeedbackEmailNow(payload: Record<string, unknown>): void {
  queueSftN8nEmailWebhook(courseFeedbackWebhookUrl(), payload, "course-feedback");
}
