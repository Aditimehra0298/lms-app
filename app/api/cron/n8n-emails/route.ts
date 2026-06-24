import { NextResponse } from "next/server";
import { sendDueCourseFeedbackEmails } from "@/lib/server/n8n-course-lifecycle-emails";
import { sendDueMeetingReminders } from "@/lib/server/n8n-meeting-reminder-service";

export const dynamic = "force-dynamic";

function authorizeCron(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return process.env.NODE_ENV !== "production";

  const header = request.headers.get("authorization")?.trim() ?? "";
  if (header === `Bearer ${secret}`) return true;
  if (request.headers.get("x-cron-secret")?.trim() === secret) return true;

  const url = new URL(request.url);
  return url.searchParams.get("secret")?.trim() === secret;
}

/** Cron: meeting reminders (~10 min before) + delayed course feedback emails. */
export async function GET(request: Request) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    const [meeting, feedback] = await Promise.all([
      sendDueMeetingReminders(),
      sendDueCourseFeedbackEmails(),
    ]);

    return NextResponse.json({
      ok: true,
      meeting,
      feedback,
      ranAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[cron/n8n-emails]", err);
    return NextResponse.json(
      { ok: false, message: err instanceof Error ? err.message : "Cron failed" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  return GET(request);
}
