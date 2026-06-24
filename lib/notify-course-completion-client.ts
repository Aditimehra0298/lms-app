import { readJsonResponse } from "@/lib/safe-json";

/** Notify LMS backend → single n8n course-completion webhook (self-paced + tutor-led). */
export async function notifyCourseCompletionClient(input: {
  learnerEmail: string;
  courseSlug: string;
  courseName?: string;
  learnerName?: string;
  deliveryKind?: "tutor-led" | "self-paced";
  certificateId?: string;
}): Promise<{ ok: boolean; message?: string; skipped?: boolean }> {
  const res = await fetch("/api/learner/course-completed", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    cache: "no-store",
    body: JSON.stringify(input),
  });
  const data = await readJsonResponse(res, {} as {
    ok?: boolean;
    message?: string;
    skipped?: boolean;
  });
  return {
    ok: Boolean(data.ok),
    message: data.message,
    skipped: data.skipped,
  };
}
