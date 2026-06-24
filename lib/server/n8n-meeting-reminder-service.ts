import { emailAppName, emailAppUrl } from "@/lib/email-brand-config";
import { normalizeLearnerEmail } from "@/lib/learner-email";
import {
  buildEmailDispatchKey,
  markEmailDispatchFailed,
  markEmailDispatchSent,
  wasEmailDispatchSent,
} from "@/lib/server/n8n-email-dispatch-store";
import { postSftN8nEmailWebhook } from "@/lib/server/n8n-sft-email-service";
import { N8N_WEBHOOK_PATHS, resolveN8nWebhookUrlFromEnv } from "@/lib/server/n8n-webhook-url";
import { readAdminContent } from "@/lib/server/content-store";
import { listUpcomingLiveSessionsInWindow } from "@/lib/server/tutor-led-session-times";
import { prisma } from "@/lib/prisma";

function meetingRemindersEnabled(): boolean {
  return process.env.MEETING_REMINDER_EMAIL_ENABLED !== "false";
}

function reminderLeadMinutes(): number {
  const raw = Number(process.env.N8N_MEETING_REMINDER_LEAD_MINUTES ?? 10);
  return Number.isFinite(raw) && raw > 0 ? raw : 10;
}

function meetingReminderWebhookUrl(): string {
  return resolveN8nWebhookUrlFromEnv(
    "N8N_MEETING_REMINDER_WEBHOOK_URL",
    N8N_WEBHOOK_PATHS.meetingReminder,
  );
}

function brandBlock() {
  const appName = emailAppName();
  const appUrl = emailAppUrl().replace(/\/$/, "");
  return { appName, appUrl };
}

export async function sendMeetingReminderViaN8n(input: {
  email: string;
  learnerName: string;
  courseName: string;
  instructorName: string;
  sessionDate: string;
  sessionTime: string;
  timezone: string;
  meetingPlatform: string;
  joinLink: string;
  dispatchKey: string;
  courseSlug: string;
}): Promise<{ ok: boolean; message?: string; skipped?: boolean }> {
  if (!meetingRemindersEnabled()) return { ok: true, skipped: true };

  const email = normalizeLearnerEmail(input.email);
  const idemKey = buildEmailDispatchKey({
    event: "session.reminder",
    learnerEmail: email,
    courseSlug: input.courseSlug,
    dispatchKey: input.dispatchKey,
  });
  if (wasEmailDispatchSent(idemKey)) return { ok: true, skipped: true };

  const { appName, appUrl } = brandBlock();
  const payload = {
    email,
    learnerName: input.learnerName,
    courseName: input.courseName,
    instructorName: input.instructorName,
    sessionDate: input.sessionDate,
    sessionTime: input.sessionTime,
    timezone: input.timezone,
    meetingPlatform: input.meetingPlatform,
    joinLink: input.joinLink,
    deliveryKind: "tutor-led",
    event: "session.reminder",
    source: "LMS",
    emailContent: {
      subject: "Live Session Starts in 10 Minutes!",
      previewText: "Your live tutor-led session starts in 10 minutes. Join now and stay ahead!",
    },
    brand: { appName, appUrl },
  };

  const result = await postSftN8nEmailWebhook(
    meetingReminderWebhookUrl(),
    payload,
    "meeting-reminder",
  );

  if (result.ok) {
    markEmailDispatchSent({
      event: "session.reminder",
      learnerEmail: email,
      courseSlug: input.courseSlug,
      dispatchKey: input.dispatchKey,
    });
    return { ok: true };
  }

  markEmailDispatchFailed({
    event: "session.reminder",
    learnerEmail: email,
    courseSlug: input.courseSlug,
    dispatchKey: input.dispatchKey,
    message: result.message,
  });
  return result;
}

/**
 * Find tutor-led sessions starting in ~10 minutes and POST meeting-reminder per enrolled learner.
 * Call from cron every minute.
 */
export async function sendDueMeetingReminders(now = new Date()): Promise<{
  sessions: number;
  sent: number;
  skipped: number;
  failed: number;
}> {
  if (!meetingRemindersEnabled()) {
    return { sessions: 0, sent: 0, skipped: 0, failed: 0 };
  }

  const leadMs = reminderLeadMinutes() * 60_000;
  const windowStart = new Date(now.getTime() + leadMs - 60_000);
  const windowEnd = new Date(now.getTime() + leadMs + 60_000);

  const content = await readAdminContent();
  const programs = (content.tutorLedPrograms ?? []).filter((p) => p.published !== false);

  let sessions = 0;
  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const program of programs) {
    const upcoming = listUpcomingLiveSessionsInWindow({ program, windowStart, windowEnd });
    if (!upcoming.length) continue;

    const enrollments = await prisma.lmsPurchase.findMany({
      where: { courseSlug: program.slug },
      select: { learnerEmail: true, user: { select: { name: true } } },
    });
    if (!enrollments.length) continue;

    for (const session of upcoming) {
      sessions += 1;
      for (const row of enrollments) {
        const email = normalizeLearnerEmail(row.learnerEmail);
        if (!email) continue;
        const learnerName = row.user?.name?.trim() || email.split("@")[0];
        const result = await sendMeetingReminderViaN8n({
          email,
          learnerName,
          courseName: session.courseName,
          instructorName: session.instructorName,
          sessionDate: session.sessionDateLabel,
          sessionTime: session.sessionTimeLabel,
          timezone: session.timezone,
          meetingPlatform: session.meetingPlatform,
          joinLink: session.joinLink,
          dispatchKey: session.dispatchKey,
          courseSlug: session.programSlug,
        });
        if (result.skipped) skipped += 1;
        else if (result.ok) sent += 1;
        else failed += 1;
      }
    }
  }

  return { sessions, sent, skipped, failed };
}
