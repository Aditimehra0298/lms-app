import { NextResponse } from "next/server";
import { loadExamQuestionsFromStoredUrl } from "@/lib/server/load-exam-questions";
import { assertMainAdmin } from "@/lib/server/admin-api-auth";

export const dynamic = "force-dynamic";

/**
 * Load parsed exam questions from an already-uploaded exam CSV URL.
 * Used by admin image-options builder so existing quizzes are not wiped.
 * GET ?url=/api/media/... or storage path used as examUploadUrl
 */
export async function GET(request: Request) {
  const denied = await assertMainAdmin(request);
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url")?.trim();
  if (!url) {
    return NextResponse.json({ ok: false, message: "url is required." }, { status: 400 });
  }

  try {
    const questions = await loadExamQuestionsFromStoredUrl(url);
    if (questions.length === 0) {
      return NextResponse.json({
        ok: false,
        message: "No questions found in this exam file (CSV required).",
      });
    }
    return NextResponse.json({ ok: true, questions, count: questions.length });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        message: err instanceof Error ? err.message : "Failed to load exam questions.",
      },
      { status: 500 },
    );
  }
}
