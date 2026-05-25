import { NextResponse } from "next/server";
import { questionToCourseQAItem } from "@/lib/course-qa-present";
import { createAnswer, readCourseQAStore } from "@/lib/server/course-qa-store";

export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "private, no-store, max-age=0" };

function learnerFromRequest(request: Request): { email: string; name: string } | null {
  const email = request.headers.get("x-learner-email")?.trim().toLowerCase();
  if (!email) return null;
  const name = request.headers.get("x-learner-name")?.trim() || "Learner";
  return { email, name };
}

export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string; questionId: string }> },
) {
  const { slug, questionId } = await context.params;
  const courseSlug = slug.trim();
  const learner = learnerFromRequest(request);

  if (!learner) {
    return NextResponse.json(
      { ok: false, message: "Sign in to post an answer." },
      { status: 401 },
    );
  }

  let payload: { body?: string };
  try {
    payload = (await request.json()) as { body?: string };
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON" }, { status: 400 });
  }

  const body = payload.body?.trim() ?? "";
  if (body.length < 3) {
    return NextResponse.json(
      { ok: false, message: "Please write an answer." },
      { status: 400 },
    );
  }

  const store = await readCourseQAStore();
  const question = store.questions.find(
    (q) => q.id === questionId && q.courseSlug === courseSlug,
  );
  if (!question) {
    return NextResponse.json({ ok: false, message: "Question not found." }, { status: 404 });
  }
  if (question.status !== "approved") {
    return NextResponse.json(
      { ok: false, message: "This question is not open for answers yet." },
      { status: 403 },
    );
  }

  const answer = await createAnswer({
    questionId,
    authorEmail: learner.email,
    authorName: learner.name,
    body,
  });

  if (!answer) {
    return NextResponse.json({ ok: false, message: "Could not post answer." }, { status: 400 });
  }

  const afterAnswer = await readCourseQAStore();
  const updated = afterAnswer.questions.find((q) => q.id === questionId);
  if (!updated) {
    return NextResponse.json({ ok: false, message: "Question not found." }, { status: 404 });
  }

  return NextResponse.json(
    {
      ok: true,
      message:
        "Your answer was submitted for review and will appear once approved by the team.",
      question: questionToCourseQAItem(updated, learner.email),
    },
    { status: 201, headers: noStore },
  );
}
