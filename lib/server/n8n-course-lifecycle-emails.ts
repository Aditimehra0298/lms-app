import { emailAppName, emailAppUrl } from "@/lib/email-brand-config";
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
import { resolvePurchaseDeliveryKind, type PurchaseDeliveryKind } from "@/lib/server/n8n-purchase-confirmation-service";
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
  const appUrl = emailAppUrl().replace(/\/$/, "");
  return { appName, appUrl, brand: { appName, appUrl } };
}

function buildCourseCompletionPayload(input: {
  email: string;
  learnerName: string;
  courseName: string;
  courseSlug: string;
  deliveryKind: PurchaseDeliveryKind;
  certificateHref: string;
}) {
  const { appUrl, brand } = brandBlock();
  return {
    email: input.email.trim().toLowerCase(),
    learnerName: input.learnerName,
    courseName: input.courseName,
    event: "course.completed",
    source: "LMS",
    deliveryKind: input.deliveryKind,
    emailContent: {
      subject: "Congratulations! You've Completed Your Course",
      previewText: "Your certificate is ready. Download it and celebrate your achievement!",
    },
    links: {
      dashboard: `${appUrl}/dashboard`,
      certificate: input.certificateHref,
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
  const { appUrl, brand } = brandBlock();
  const slug = encodeURIComponent(input.courseSlug);
  return {
    email: input.email.trim().toLowerCase(),
    learnerName: input.learnerName,
    courseName: input.courseName,
    event: "course.feedback.requested",
    source: "LMS",
    deliveryKind: input.deliveryKind,
    emailContent: {
      subject: "How Was Your Learning Experience?",
      previewText: "Share your feedback and help us improve future courses.",
    },
    links: {
      review: `${appUrl}/my-learning/course/${slug}#reviews`,
      dashboard: `${appUrl}/dashboard`,
    },
    brand,
  };
}

/** POST course-completion webhook once per learner+course (idempotent). Same URL for tutor-led and self-paced. */
export async function sendCourseCompletionEmailViaN8n(input: {
  learnerEmail: string;
  learnerName?: string | null;
  courseName: string;
  courseSlug: string;
  certificateId?: string;
  deliveryKind?: PurchaseDeliveryKind;
}): Promise<{ ok: boolean; message?: string; skipped?: boolean }> {
  if (!lifecycleEmailsEnabled()) return { ok: true, skipped: true };

  const email = input.learnerEmail.trim().toLowerCase();
  const slug = input.courseSlug.trim();
  const dispatchKey = buildEmailDispatchKey({
    event: "course.completed",
    learnerEmail: email,
    courseSlug: slug,
  });
  if (wasEmailDispatchSent(dispatchKey)) return { ok: true, skipped: true };

  const deliveryKind = input.deliveryKind ?? (await resolvePurchaseDeliveryKind(slug));
  const { appUrl } = brandBlock();
  const certificateHref = input.certificateId
    ? `${appUrl}/api/certificates/${encodeURIComponent(input.certificateId)}/download`
    : `${appUrl}/my-learning?tab=certificates`;

  const payload = buildCourseCompletionPayload({
    email,
    learnerName: input.learnerName?.trim() || email.split("@")[0],
    courseName: input.courseName.trim() || slug,
    courseSlug: slug,
    deliveryKind,
    certificateHref,
  });

  const result = await postSftN8nEmailWebhook(
    courseCompletionWebhookUrl(),
    payload,
    "course-completion",
  );
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

  const email = input.learnerEmail.trim().toLowerCase();
  const slug = input.courseSlug.trim();
  const due = new Date();
  due.setHours(due.getHours() + feedbackDelayHours());

  void resolvePurchaseDeliveryKind(slug)
    .then((deliveryKind) => {
      const payload = buildCourseFeedbackPayload({
        email,
        learnerName: input.learnerName?.trim() || email.split("@")[0],
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

/** Same n8n course-completion webhook for self-paced and tutor-led (awaitable). */
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

/** Fire-and-forget course-completion email (shared webhook). */
export function notifyCourseCompletionEmail(input: {
  learnerEmail: string;
  learnerName?: string | null;
  courseName?: string;
  courseSlug: string;
  certificateId?: string;
  deliveryKind?: PurchaseDeliveryKind;
}): void {
  void queueCourseCompletionEmail(input).catch((err) => {
    console.error("[course-completion] failed:", err);
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
