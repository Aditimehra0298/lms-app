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

/** Serialize all store mutations so concurrent PUTs cannot truncate/corrupt the JSON file. */
let writeChain: Promise<void> = Promise.resolve();

function enqueueStoreWrite<T>(fn: () => Promise<T>): Promise<T> {
  const run = writeChain.then(fn, fn);
  writeChain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

async function ensureStoreFile(): Promise<void> {
  const dir = path.dirname(storePath);
  await fs.mkdir(dir, { recursive: true });
  try {
    await fs.access(storePath);
  } catch {
    const empty: ProgressFile = { learners: {} };
    await atomicWriteJson(storePath, empty);
  }
}

async function atomicWriteJson(filePath: string, data: ProgressFile): Promise<void> {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
  const tmp = path.join(dir, `.${path.basename(filePath)}.${process.pid}.${Date.now()}.tmp`);
  const payload = JSON.stringify(data, null, 2);
  await fs.writeFile(tmp, payload, "utf8");
  await fs.rename(tmp, filePath);
}

async function readStore(): Promise<ProgressFile> {
  await ensureStoreFile();
  const raw = await fs.readFile(storePath, "utf8");
  const parsed = parseProgressFileRaw(raw);
  if (!parsed.ok) {
    console.error("[learner-course-progress-store] unreadable progress file — refusing to wipe");
    // Return empty for this request only. Do not rewrite the file here (avoids data loss).
    return { learners: {} };
  }
  if (parsed.repaired) {
    try {
      await enqueueStoreWrite(() => atomicWriteJson(storePath, parsed.data));
      console.warn("[learner-course-progress-store] repaired corrupted progress JSON");
    } catch (err) {
      console.warn("[learner-course-progress-store] repair rewrite failed:", err);
    }
  }
  return parsed.data;
}

/** Recover when a bad write left trailing garbage after a valid JSON object. */
function parseProgressFileRaw(
  raw: string,
): { ok: true; data: ProgressFile; repaired: boolean } | { ok: false } {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: true, data: { learners: {} }, repaired: false };

  try {
    const parsed = JSON.parse(trimmed) as ProgressFile;
    return {
      ok: true,
      data: { learners: parsed.learners && typeof parsed.learners === "object" ? parsed.learners : {} },
      repaired: false,
    };
  } catch {
    // Fall through and try to salvage the first complete object.
  }

  const start = trimmed.indexOf("{");
  if (start < 0) return { ok: false };
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < trimmed.length; i++) {
    const ch = trimmed[i];
    if (inString) {
      if (escape) escape = false;
      else if (ch === "\\") escape = true;
      else if (ch === "\"") inString = false;
      continue;
    }
    if (ch === "\"") {
      inString = true;
      continue;
    }
    if (ch === "{") depth += 1;
    else if (ch === "}") {
      depth -= 1;
      if (depth === 0) {
        try {
          const parsed = JSON.parse(trimmed.slice(start, i + 1)) as ProgressFile;
          return {
            ok: true,
            data: {
              learners:
                parsed.learners && typeof parsed.learners === "object" ? parsed.learners : {},
            },
            repaired: true,
          };
        } catch {
          return { ok: false };
        }
      }
    }
  }
  return { ok: false };
}

async function writeStore(data: ProgressFile): Promise<void> {
  await ensureStoreFile();
  await atomicWriteJson(storePath, data);
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

  return enqueueStoreWrite(async () => {
    // Re-read inside the lock so concurrent writers do not clobber each other.
    const store = await readStore();
    if (!store.learners[email]) store.learners[email] = {};
    const prev = store.learners[email][slug];
    store.learners[email][slug] = {
      ...row,
      examScores: { ...(prev?.examScores ?? {}), ...row.examScores },
    };
    await writeStore(store);
    return store.learners[email][slug];
  });
}

/**
 * If MySQL already has a ready certificate but progress is missing/incomplete,
 * write full module completion so My Learning shows 100% for that learner.
 */
export async function ensureProgressForReadyCertificate(input: {
  learnerEmail: string;
  courseSlug: string;
  moduleCount?: number;
  scorePercent?: number | null;
}): Promise<StoredLearnerCourseProgress | null> {
  const email = normalizeLearnerEmail(input.learnerEmail);
  const slug = canonicalCourseSlug(input.courseSlug);
  if (!email || !slug) return null;

  let moduleCount = Math.max(0, Math.round(Number(input.moduleCount) || 0));
  if (moduleCount <= 0) {
    try {
      const { getManagedCourses } = await import("@/lib/server/course-catalog");
      const { countLearnerCurriculumModules } = await import("@/lib/curriculum-learner-filter");
      const courses = await getManagedCourses();
      const course = courses.find((c) => canonicalCourseSlug(c.slug) === slug);
      moduleCount = course ? countLearnerCurriculumModules(course.curriculum) : 0;
    } catch {
      moduleCount = 0;
    }
  }
  if (moduleCount <= 0) moduleCount = 5;

  const existing = await getLearnerCourseProgressFromStore(email, slug);
  const needsModules =
    !existing ||
    existing.completedModules.length < moduleCount ||
    !Array.from({ length: moduleCount }, (_, i) => i + 1).every((n) =>
      existing.completedModules.includes(n),
    );
  const needsExam = !existing || Object.keys(existing.examScores ?? {}).length === 0;
  if (!needsModules && !needsExam) return existing;

  const completedModules = Array.from({ length: moduleCount }, (_, i) => i + 1);
  const examScores: Record<string, StoredModuleExamScore> = {
    ...(existing?.examScores ?? {}),
  };
  if (Object.keys(examScores).length === 0) {
    const percent = Math.max(0, Math.min(100, Math.round(Number(input.scorePercent) || 100)));
    examScores.final = {
      correct: Math.round((percent / 100) * 10),
      total: 10,
      percent,
      passed: true,
      updatedAt: new Date().toISOString(),
    };
  }

  return upsertLearnerCourseProgressInStore({
    learnerEmail: email,
    courseSlug: slug,
    completedModules: needsModules
      ? completedModules
      : existing?.completedModules ?? completedModules,
    examScores,
  });
}

/**
 * Auto-heal: if this learner has a ready certificate for the course but no/weak progress,
 * fill progress from the certificate so dashboards stay correct for every user.
 */
export async function syncProgressFromReadyCertificateIfNeeded(
  learnerEmail: string,
  courseSlug: string,
): Promise<StoredLearnerCourseProgress | null> {
  const email = normalizeLearnerEmail(learnerEmail);
  const slug = canonicalCourseSlug(courseSlug);
  if (!email || !slug) return null;

  try {
    const { prisma } = await import("@/lib/prisma");
    const cert = await prisma.lmsCertificate.findFirst({
      where: {
        learnerEmail: email,
        status: "ready",
        OR: [{ courseSlug: slug }, { courseSlug: courseSlug.trim() }],
      },
      orderBy: { issuedAt: "desc" },
      select: { scorePercent: true, courseSlug: true },
    });
    if (!cert) {
      return getLearnerCourseProgressFromStore(email, slug);
    }
    // Confirm slug match after canonicalization (OR may over-match rare aliases).
    if (
      canonicalCourseSlug(cert.courseSlug) !== slug &&
      cert.courseSlug.trim().toLowerCase() !== slug
    ) {
      return getLearnerCourseProgressFromStore(email, slug);
    }
    return ensureProgressForReadyCertificate({
      learnerEmail: email,
      courseSlug: slug,
      scorePercent: cert.scorePercent,
    });
  } catch (err) {
    console.warn("[learner-course-progress-store] cert sync skipped:", err);
    return getLearnerCourseProgressFromStore(email, slug);
  }
}

/** Remove all stored course progress for one learner (unenroll / revoke-all). */
export async function clearAllLearnerCourseProgressFromStore(
  learnerEmail: string,
): Promise<number> {
  const email = normalizeLearnerEmail(learnerEmail);
  if (!email) return 0;
  return enqueueStoreWrite(async () => {
    const store = await readStore();
    const count = Object.keys(store.learners[email] ?? {}).length;
    if (count === 0) return 0;
    delete store.learners[email];
    await writeStore(store);
    return count;
  });
}
