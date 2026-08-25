import { promises as fs } from "node:fs";
import path from "node:path";
import { canonicalCourseSlug } from "@/lib/course-slug-aliases";
import { normalizeLearnerEmail } from "@/lib/learner-email";

export type StoredModuleExamScore = {
  correct: number;
  total: number;
  percent: number;
  passed: boolean;
  updatedAt: string;
};

export type StoredLearnerCourseProgress = {
  completedModules: number[];
  examScores: Record<string, StoredModuleExamScore>;
  updatedAt: string;
};

type ProgressFile = {
  learners: Record<string, Record<string, StoredLearnerCourseProgress>>;
};

const storePath = path.join(process.cwd(), "data", "learner-course-progress.json");

async function ensureStoreFile(): Promise<void> {
  const dir = path.dirname(storePath);
  await fs.mkdir(dir, { recursive: true });
  try {
    await fs.access(storePath);
  } catch {
    const empty: ProgressFile = { learners: {} };
    await fs.writeFile(storePath, JSON.stringify(empty, null, 2), "utf8");
  }
}

async function readStore(): Promise<ProgressFile> {
  await ensureStoreFile();
  const raw = await fs.readFile(storePath, "utf8");
  try {
    const parsed = JSON.parse(raw) as ProgressFile;
    return { learners: parsed.learners && typeof parsed.learners === "object" ? parsed.learners : {} };
  } catch {
    return { learners: {} };
  }
}

async function writeStore(data: ProgressFile): Promise<void> {
  await ensureStoreFile();
  await fs.writeFile(storePath, JSON.stringify(data, null, 2), "utf8");
}

export async function getLearnerCourseProgressFromStore(
  learnerEmail: string,
  courseSlug: string,
): Promise<StoredLearnerCourseProgress | null> {
  const email = normalizeLearnerEmail(learnerEmail);
  const slug = canonicalCourseSlug(courseSlug);
  if (!email || !slug) return null;
  const store = await readStore();
  return store.learners[email]?.[slug] ?? null;
}

/** All course progress rows for one learner (email key in the JSON store). */
export async function listLearnerCourseProgressFromStore(
  learnerEmail: string,
): Promise<Record<string, StoredLearnerCourseProgress>> {
  const email = normalizeLearnerEmail(learnerEmail);
  if (!email) return {};
  const store = await readStore();
  const bySlug = store.learners[email];
  return bySlug && typeof bySlug === "object" ? { ...bySlug } : {};
}

/** Full progress file map: email → courseSlug → progress (one disk read). */
export async function readAllLearnerCourseProgressStore(): Promise<
  Record<string, Record<string, StoredLearnerCourseProgress>>
> {
  const store = await readStore();
  return store.learners ?? {};
}

export async function upsertLearnerCourseProgressInStore(input: {
  learnerEmail: string;
  courseSlug: string;
  completedModules: number[];
  examScores: Record<string, StoredModuleExamScore>;
}): Promise<StoredLearnerCourseProgress> {
  const email = normalizeLearnerEmail(input.learnerEmail);
  const slug = canonicalCourseSlug(input.courseSlug);
  if (!email || !slug) {
    throw new Error("learnerEmail and courseSlug required");
  }

  const row: StoredLearnerCourseProgress = {
    completedModules: Array.from(
      new Set(input.completedModules.filter((n) => Number.isFinite(n) && n > 0)),
    ).sort((a, b) => a - b),
    examScores: input.examScores,
    updatedAt: new Date().toISOString(),
  };

  const store = await readStore();
  if (!store.learners[email]) store.learners[email] = {};
  store.learners[email][slug] = row;
  await writeStore(store);
  return row;
}
