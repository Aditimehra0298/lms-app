import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import type {
  CourseQAStoreFile,
  QaModerationStatus,
  StoredCourseAnswer,
  StoredCourseQuestion,
} from "@/lib/course-qa-types";

const storePath = path.join(process.cwd(), "data", "course-qa.json");

async function ensureStoreFile(): Promise<void> {
  const dir = path.dirname(storePath);
  await fs.mkdir(dir, { recursive: true });
  try {
    await fs.access(storePath);
  } catch {
    const empty: CourseQAStoreFile = { questions: [] };
    await fs.writeFile(storePath, JSON.stringify(empty, null, 2), "utf8");
  }
}

export async function readCourseQAStore(): Promise<CourseQAStoreFile> {
  await ensureStoreFile();
  const raw = await fs.readFile(storePath, "utf8");
  try {
    const parsed = JSON.parse(raw) as CourseQAStoreFile;
    return { questions: Array.isArray(parsed.questions) ? parsed.questions : [] };
  } catch {
    return { questions: [] };
  }
}

async function writeCourseQAStore(data: CourseQAStoreFile): Promise<void> {
  await ensureStoreFile();
  await fs.writeFile(storePath, JSON.stringify(data, null, 2), "utf8");
}

export async function listQuestionsForCourse(
  courseSlug: string,
  viewerEmail?: string | null,
): Promise<StoredCourseQuestion[]> {
  const store = await readCourseQAStore();
  const email = viewerEmail?.trim().toLowerCase() || "";
  return store.questions.filter((q) => {
    if (q.courseSlug !== courseSlug) return false;
    if (q.status === "approved") return true;
    return email.length > 0 && q.authorEmail.toLowerCase() === email;
  });
}

export async function listPendingQuestions(): Promise<StoredCourseQuestion[]> {
  const store = await readCourseQAStore();
  return store.questions
    .filter((q) => q.status === "pending")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function listPendingAnswers(): Promise<
  Array<{ question: StoredCourseQuestion; answer: StoredCourseAnswer }>
> {
  const store = await readCourseQAStore();
  const rows: Array<{ question: StoredCourseQuestion; answer: StoredCourseAnswer }> = [];
  for (const q of store.questions) {
    for (const a of q.answers) {
      if (a.status === "pending") rows.push({ question: q, answer: a });
    }
  }
  return rows.sort((a, b) => b.answer.createdAt.localeCompare(a.answer.createdAt));
}

export async function createQuestion(input: {
  courseSlug: string;
  authorEmail: string;
  authorName: string;
  module: string;
  question: string;
}): Promise<StoredCourseQuestion> {
  const store = await readCourseQAStore();
  const row: StoredCourseQuestion = {
    id: randomUUID(),
    courseSlug: input.courseSlug,
    authorEmail: input.authorEmail.trim().toLowerCase(),
    authorName: input.authorName.trim() || "Learner",
    module: input.module.trim() || "General",
    question: input.question.trim(),
    status: "pending",
    helpful: 0,
    createdAt: new Date().toISOString(),
    answers: [],
  };
  store.questions.unshift(row);
  await writeCourseQAStore(store);
  return row;
}

export async function createAnswer(input: {
  questionId: string;
  authorEmail: string;
  authorName: string;
  body: string;
  isOfficial?: boolean;
}): Promise<StoredCourseAnswer | null> {
  const store = await readCourseQAStore();
  const q = store.questions.find((row) => row.id === input.questionId);
  if (!q || q.status !== "approved") return null;

  const answer: StoredCourseAnswer = {
    id: randomUUID(),
    authorEmail: input.authorEmail.trim().toLowerCase(),
    authorName: input.authorName.trim() || "Learner",
    body: input.body.trim(),
    isOfficial: Boolean(input.isOfficial),
    status: input.isOfficial ? "approved" : "pending",
    helpful: 0,
    createdAt: new Date().toISOString(),
  };
  q.answers.push(answer);
  await writeCourseQAStore(store);
  return answer;
}

export async function setQuestionStatus(
  questionId: string,
  status: QaModerationStatus,
): Promise<StoredCourseQuestion | null> {
  const store = await readCourseQAStore();
  const q = store.questions.find((row) => row.id === questionId);
  if (!q) return null;
  q.status = status;
  await writeCourseQAStore(store);
  return q;
}

export async function setAnswerStatus(
  questionId: string,
  answerId: string,
  status: QaModerationStatus,
): Promise<StoredCourseAnswer | null> {
  const store = await readCourseQAStore();
  const q = store.questions.find((row) => row.id === questionId);
  if (!q) return null;
  const a = q.answers.find((row) => row.id === answerId);
  if (!a) return null;
  a.status = status;
  await writeCourseQAStore(store);
  return a;
}

export async function postOfficialAnswer(input: {
  questionId: string;
  body: string;
  authorName?: string;
}): Promise<StoredCourseAnswer | null> {
  const store = await readCourseQAStore();
  const q = store.questions.find((row) => row.id === input.questionId);
  if (!q) return null;
  if (q.status === "pending") {
    q.status = "approved";
    await writeCourseQAStore(store);
  }
  return createAnswer({
    questionId: input.questionId,
    authorEmail: "official@sft.academy",
    authorName: input.authorName?.trim() || "SFT Expert Team",
    body: input.body,
    isOfficial: true,
  });
}
