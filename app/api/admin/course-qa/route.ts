import { NextResponse } from "next/server";
import {
  listPendingAnswers,
  listPendingQuestions,
  postOfficialAnswer,
  setAnswerStatus,
  setQuestionStatus,
} from "@/lib/server/course-qa-store";
import { isMainAdminEmail } from "@/lib/server/admin-emails";

export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "private, no-store, max-age=0" };

function adminEmailFromRequest(request: Request): string | null {
  const url = new URL(request.url);
  return (
    request.headers.get("x-admin-email")?.trim().toLowerCase() ||
    url.searchParams.get("email")?.trim().toLowerCase() ||
    null
  );
}

function assertAdmin(request: Request): NextResponse | null {
  const email = adminEmailFromRequest(request);
  if (!email || !isMainAdminEmail(email)) {
    return NextResponse.json({ ok: false, message: "Admin access required." }, { status: 403 });
  }
  return null;
}

export async function GET(request: Request) {
  const denied = assertAdmin(request);
  if (denied) return denied;

  const [pendingQuestions, pendingAnswers] = await Promise.all([
    listPendingQuestions(),
    listPendingAnswers(),
  ]);

  return NextResponse.json(
    { ok: true, pendingQuestions, pendingAnswers },
    { headers: noStore },
  );
}

export async function PATCH(request: Request) {
  const denied = assertAdmin(request);
  if (denied) return denied;

  let body: {
    type?: "question" | "answer" | "official";
    questionId?: string;
    answerId?: string;
    action?: "approve" | "reject";
    officialBody?: string;
  };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON" }, { status: 400 });
  }

  const questionId = body.questionId?.trim();
  if (!questionId) {
    return NextResponse.json({ ok: false, message: "questionId required" }, { status: 400 });
  }

  if (body.type === "official") {
    const text = body.officialBody?.trim() ?? "";
    if (text.length < 3) {
      return NextResponse.json({ ok: false, message: "Official answer text required." }, { status: 400 });
    }
    const answer = await postOfficialAnswer({ questionId, body: text });
    if (!answer) {
      return NextResponse.json({ ok: false, message: "Question not found." }, { status: 404 });
    }
    return NextResponse.json({ ok: true, answer }, { headers: noStore });
  }

  const action = body.action;
  if (action !== "approve" && action !== "reject") {
    return NextResponse.json({ ok: false, message: "action must be approve or reject" }, { status: 400 });
  }
  const status = action === "approve" ? "approved" : "rejected";

  if (body.type === "answer") {
    const answerId = body.answerId?.trim();
    if (!answerId) {
      return NextResponse.json({ ok: false, message: "answerId required" }, { status: 400 });
    }
    const updated = await setAnswerStatus(questionId, answerId, status);
    if (!updated) {
      return NextResponse.json({ ok: false, message: "Answer not found." }, { status: 404 });
    }
    return NextResponse.json({ ok: true, answer: updated }, { headers: noStore });
  }

  const updated = await setQuestionStatus(questionId, status);
  if (!updated) {
    return NextResponse.json({ ok: false, message: "Question not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true, question: updated }, { headers: noStore });
}
