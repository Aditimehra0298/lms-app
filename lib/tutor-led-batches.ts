import type { TutorLedProgramStored } from "@/lib/default-tutor-led-programs";

export type TutorLedBatchRecord = {
  id: string;
  label: string;
  date: string;
  schedule?: string;
  examUploadUrl?: string;
  examTitle?: string;
  examMinutes?: number;
  examPassingScore?: number;
  examTimed?: boolean;
  examQuestions?: number;
  /** active = current enrollments; closed = previous cohort (keep exam + roster). */
  status: "active" | "closed";
  createdAt: string;
};

export type TutorLedBatchExam = {
  examUploadUrl: string;
  examTitle: string;
  examMinutes: number;
  examPassingScore: number;
  examTimed: boolean;
};

function slugPart(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export function makeTutorLedBatchId(label: string, date: string): string {
  const a = slugPart(label) || "batch";
  const b = slugPart(date) || String(Date.now());
  return `${a}-${b}`;
}

export function listTutorLedBatches(program: Pick<TutorLedProgramStored, "batches">): TutorLedBatchRecord[] {
  return Array.isArray(program.batches) ? program.batches : [];
}

export function getActiveTutorLedBatch(
  program: Pick<TutorLedProgramStored, "batches" | "batchLabel" | "nextBatchDate">,
): TutorLedBatchRecord | null {
  const batches = listTutorLedBatches(program);
  return batches.find((b) => b.status === "active") ?? batches[batches.length - 1] ?? null;
}

export function getTutorLedBatchById(
  program: Pick<TutorLedProgramStored, "batches">,
  batchId: string | null | undefined,
): TutorLedBatchRecord | null {
  const id = batchId?.trim();
  if (!id) return getActiveTutorLedBatch(program);
  return listTutorLedBatches(program).find((b) => b.id === id) ?? getActiveTutorLedBatch(program);
}

function examFromSection(program: TutorLedProgramStored): Partial<TutorLedBatchRecord> {
  const ls = program.learnerSection ?? {};
  return {
    examUploadUrl: ls.examUploadUrl?.trim() || "",
    examTitle: ls.finalExamTitle?.trim() || "",
    examMinutes: ls.examMinutes,
    examPassingScore: ls.examPassingScore,
    examTimed: ls.examTimed,
    examQuestions: ls.examQuestions,
  };
}

/** Keep an active batch row in sync with Zoom & batch date/name. Does not wipe exams. */
export function syncProgramBatchFromSchedule(program: TutorLedProgramStored): TutorLedProgramStored {
  const label = program.batchLabel?.trim() || "Live batch";
  const date = program.nextBatchDate?.trim() || "";
  const schedule = program.schedule?.trim() || "";
  const batches = [...listTutorLedBatches(program)];
  const examSeed = examFromSection(program);
  const activeIdx = batches.findIndex((b) => b.status === "active");

  if (activeIdx < 0) {
    batches.push({
      id: makeTutorLedBatchId(label, date || new Date().toISOString().slice(0, 10)),
      label,
      date,
      schedule,
      status: "active",
      createdAt: new Date().toISOString(),
      ...examSeed,
    });
    return { ...program, batches };
  }

  const current = batches[activeIdx]!;
  batches[activeIdx] = {
    ...current,
    label: label || current.label,
    date: date || current.date,
    schedule: schedule || current.schedule,
    examUploadUrl: examSeed.examUploadUrl || current.examUploadUrl,
    examTitle: examSeed.examTitle || current.examTitle,
    examMinutes: examSeed.examMinutes ?? current.examMinutes,
    examPassingScore: examSeed.examPassingScore ?? current.examPassingScore,
    examTimed: examSeed.examTimed ?? current.examTimed,
    examQuestions: examSeed.examQuestions ?? current.examQuestions,
  };
  return { ...program, batches };
}

export function patchTutorLedBatchExam(
  program: TutorLedProgramStored,
  batchId: string | undefined,
  exam: Partial<
    Pick<
      TutorLedBatchRecord,
      "examUploadUrl" | "examTitle" | "examMinutes" | "examPassingScore" | "examTimed" | "examQuestions"
    >
  >,
): TutorLedProgramStored {
  const synced = syncProgramBatchFromSchedule(program);
  const batches = [...listTutorLedBatches(synced)];
  const targetId = batchId?.trim() || getActiveTutorLedBatch(synced)?.id;
  const nextBatches = batches.map((row) => (row.id === targetId ? { ...row, ...exam } : row));
  const active = nextBatches.find((b) => b.status === "active");
  const ls = { ...(synced.learnerSection ?? {}) };
  if (active && active.id === targetId) {
    if (exam.examUploadUrl !== undefined) ls.examUploadUrl = exam.examUploadUrl;
    if (exam.examTitle !== undefined) ls.finalExamTitle = exam.examTitle;
    if (exam.examMinutes !== undefined) ls.examMinutes = exam.examMinutes;
    if (exam.examPassingScore !== undefined) ls.examPassingScore = exam.examPassingScore;
    if (exam.examTimed !== undefined) ls.examTimed = exam.examTimed;
    if (exam.examQuestions !== undefined) ls.examQuestions = exam.examQuestions;
  }
  return { ...synced, batches: nextBatches, learnerSection: ls };
}

/** Close the current cohort (keep its exam) and open a new batch with a blank exam paper. */
export function startNewTutorLedBatch(
  program: TutorLedProgramStored,
  input: { label: string; date: string; schedule?: string },
): TutorLedProgramStored {
  const synced = syncProgramBatchFromSchedule(program);
  const label = input.label.trim() || "New live batch";
  const date = input.date.trim();
  const schedule = input.schedule?.trim() || synced.schedule || "";
  const closed = listTutorLedBatches(synced).map((b) =>
    b.status === "active" ? { ...b, status: "closed" as const } : b,
  );
  const next: TutorLedBatchRecord = {
    id: makeTutorLedBatchId(label, date || new Date().toISOString().slice(0, 10)),
    label,
    date,
    schedule,
    status: "active",
    createdAt: new Date().toISOString(),
    examUploadUrl: "",
    examTitle: synced.learnerSection?.finalExamTitle || "Final Certification Assessment",
  };
  const ls = { ...(synced.learnerSection ?? {}), examUploadUrl: "" };
  return {
    ...synced,
    batchLabel: label,
    nextBatchDate: date,
    schedule: schedule || synced.schedule,
    batches: [...closed, next],
    learnerSection: ls,
  };
}

export function resolveTutorLedBatchExam(
  program: TutorLedProgramStored,
  batchId?: string | null,
): TutorLedBatchExam {
  const batch = getTutorLedBatchById(program, batchId);
  const ls = program.learnerSection ?? {};
  const examUploadUrl = (batch?.examUploadUrl || ls.examUploadUrl || "").trim();
  return {
    examUploadUrl,
    examTitle: (batch?.examTitle || ls.finalExamTitle || "Final Certification Assessment").trim(),
    examMinutes: batch?.examMinutes ?? ls.examMinutes ?? 60,
    examPassingScore: batch?.examPassingScore ?? ls.examPassingScore ?? 70,
    examTimed: batch?.examTimed ?? ls.examTimed !== false,
  };
}

export function formatTutorLedBatchLabel(batch: Pick<TutorLedBatchRecord, "label" | "date">): string {
  const label = batch.label?.trim() || "Live batch";
  const date = batch.date?.trim();
  return date ? `${label} · ${date}` : label;
}
