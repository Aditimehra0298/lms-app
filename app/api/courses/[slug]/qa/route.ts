import { NextResponse } from "next/server";
import { questionToCourseQAItem } from "@/lib/course-qa-present";
import { createQuestion, listQuestionsForCourse } from "@/lib/server/course-qa-store";
import {
  requireLearnerWriter,
  resolveLearnerViewer,
} from "@/lib/server/learner-request-identity";

export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "private, no-store, max-age=0" };

export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  const courseSlug = slug.trim();
  if (!courseSlug) {
    return NextResponse.json({ ok: false, message: "Missing course" }, { status: 400 });
  }

  const viewer = resolveLearnerViewer(request);
  const rows = await listQuestionsForCourse(courseSlug, viewer?.email);
  const questions = rows.map((q) => questionToCourseQAItem(q, viewer?.email));

  return NextResponse.json(
    {
      ok: true,
      questions,
      viewerEmail: viewer?.email ?? null,
    },
    { headers: noStore },
  );
}

export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  const courseSlug = slug.trim();
  if (!courseSlug) {
    return NextResponse.json({ ok: false, message: "Missing course" }, { status: 400 });
  }

  const learnerAuth = requireLearnerWriter(request);
  if ("response" in learnerAuth) return learnerAuth.response;
  const learner = learnerAuth;

  let body: { module?: string; question?: string };
  try {
    body = (await request.json()) as { module?: string; question?: string };
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON" }, { status: 400 });
  }

  const question = body.question?.trim() ?? "";
  if (question.length < 10) {
    return NextResponse.json(
      { ok: false, message: "Please write at least 10 characters." },
      { status: 400 },
    );
  }

  const created = await createQuestion({
    courseSlug,
    authorEmail: learner.email,
    authorName: learner.name,
    module: body.module?.trim() || "General",
    question,
  });

  return NextResponse.json(
    {
      ok: true,
      message: "Your question was submitted and is pending review. It will appear here once approved.",
      question: questionToCourseQAItem(created, learner.email),
    },
    { status: 201, headers: noStore },
  );
}
