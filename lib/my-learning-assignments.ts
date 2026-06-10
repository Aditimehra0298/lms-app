import type { ManagedCourse } from "@/lib/content-schema";
import type { TutorLedProgramStored } from "@/lib/default-tutor-led-programs";
import {
  computeCombinedExamGrade,
  FINAL_EXAM_SCORE_KEY,
  learnerCredentialsEligible,
  readModuleExamScores,
  type ModuleExamScore,
} from "@/lib/learner-exam-scores";
import { readCompletedModules } from "@/lib/learner-course-progress";
import {
  modulePreviewProgress,
  readModuleWatchedSeconds,
} from "@/lib/learner-preview-gate";
import { examLinksFromManagedCourse, resolveLearningCourseSlug } from "@/lib/my-learning-exams";
import { resolveLearnerSection } from "@/lib/tutor-led-learner-section";
import type { TutorLedLiveHubRow } from "@/lib/tutor-led-live-hub-enrich";
import { getCurriculumSessionCount } from "@/lib/tutor-led-training-schedule";

export type AssignmentStatus =
  | "locked"
  | "awaiting-file"
  | "pending"
  | "passed"
  | "failed";

export type AssignmentRow = {
  id: string;
  courseTitle: string;
  courseSlug: string;
  deliveryKind: "self-paced" | "tutor-led";
  assessment: string;
  slot: string;
  href: string;
  ready: boolean;
  unlocked: boolean;
  lockReason?: string;
  status: AssignmentStatus;
  marksLabel: string;
  percent: number | null;
  passed: boolean;
};

type PurchasedRow = { title: string; slug?: string; deliveryKind?: string };

function formatMarks(correct: number, total: number, percent: number): string {
  return `${correct}/${total} (${percent}%)`;
}

function statusFromScore(
  unlocked: boolean,
  ready: boolean,
  score: ModuleExamScore | undefined,
  lockReason?: string,
): Pick<AssignmentRow, "status" | "marksLabel" | "percent" | "passed" | "unlocked" | "lockReason"> {
  if (!ready) {
    return {
      status: "awaiting-file",
      marksLabel: "—",
      percent: null,
      passed: false,
      unlocked: false,
      lockReason: undefined,
    };
  }
  if (!unlocked) {
    return {
      status: "locked",
      marksLabel: "—",
      percent: null,
      passed: false,
      unlocked: false,
      lockReason,
    };
  }
  if (score) {
    return {
      status: score.passed ? "passed" : "failed",
      marksLabel: formatMarks(score.correct, score.total, score.percent),
      percent: score.percent,
      passed: score.passed,
      unlocked: true,
    };
  }
  return {
    status: "pending",
    marksLabel: "—",
    percent: null,
    passed: false,
    unlocked: true,
  };
}

function isSelfPacedModuleUnlocked(
  courseSlug: string,
  moduleNumber: number,
  course: ManagedCourse,
): boolean {
  const mod = course.curriculum?.[moduleNumber - 1];
  if (!mod) return false;
  const watched = readModuleWatchedSeconds(courseSlug);
  return modulePreviewProgress(mod, watched[moduleNumber] ?? 0).unlocked;
}

function isSelfPacedFinalUnlocked(courseSlug: string, course: ManagedCourse): boolean {
  const curriculum = course.curriculum ?? [];
  if (!curriculum.length) return false;
  const completed = readCompletedModules(courseSlug);
  const { allExamsPassed } = computeCombinedExamGrade(courseSlug, curriculum);
  const { allModulesDone } = learnerCredentialsEligible(curriculum, completed, allExamsPassed);
  return allModulesDone && allExamsPassed;
}

export function buildMyLearningAssignments(input: {
  purchased: PurchasedRow[];
  catalog: ManagedCourse[];
  tutorLedHubRows: TutorLedLiveHubRow[];
  tutorLedPrograms: TutorLedProgramStored[];
  titleToSlug: (title: string) => string;
}): AssignmentRow[] {
  const rows: AssignmentRow[] = [];

  for (const purchase of input.purchased) {
    if (purchase.deliveryKind === "tutor-led" || purchase.deliveryKind === "workshop") {
      const slug = purchase.slug?.trim();
      if (!slug) continue;
      const hub = input.tutorLedHubRows.find((r) => r.slug === slug);
      const program = input.tutorLedPrograms.find((p) => p.slug === slug);
      const section = program ? resolveLearnerSection(program) : null;
      const ready = !!section?.examUploadUrl?.trim();
      const href = `/my-learning/course/${encodeURIComponent(slug)}/exam?module=final`;
      const score = readModuleExamScores(slug)[FINAL_EXAM_SCORE_KEY];
      const unlocked = hub?.examUnlocked ?? false;
      const trainingDays = hub?.trainingDays ?? (program ? getCurriculumSessionCount(program) : 0);
      const completedDays = hub?.completedDays ?? 0;
      const meta = statusFromScore(
        unlocked,
        ready,
        score,
        `Complete all ${trainingDays} training day${trainingDays === 1 ? "" : "s"} (${completedDays}/${trainingDays} done)`,
      );
      rows.push({
        id: `tl-final-${slug}`,
        courseTitle: program?.title?.trim() || purchase.title,
        courseSlug: slug,
        deliveryKind: "tutor-led",
        assessment: section?.finalExamTitle?.trim() || "Final certification exam",
        slot: "Final",
        href,
        ready,
        ...meta,
      });
      continue;
    }

    const slug =
      purchase.slug?.trim() ??
      resolveLearningCourseSlug(purchase, input.catalog, input.titleToSlug) ??
      "";
    if (!slug) continue;
    const course = input.catalog.find((c) => c.slug === slug);
    if (!course) continue;

    const scores = readModuleExamScores(slug);
    const links = examLinksFromManagedCourse(course);

    for (const link of links) {
      const isFinal = link.slot === "Final" || link.href.includes("final=1");
      const moduleNum = link.href.includes("module=")
        ? link.href.split("module=")[1]?.split("&")[0]
        : null;
      const moduleNumber =
        moduleNum && moduleNum !== "final"
          ? Number.parseInt(moduleNum, 10)
          : NaN;

      const scoreKey = isFinal ? FINAL_EXAM_SCORE_KEY : String(moduleNumber);
      const score = scores[scoreKey];

      let unlocked = false;
      let lockReason = "Complete module lessons first";

      if (isFinal) {
        unlocked = isSelfPacedFinalUnlocked(slug, course);
        lockReason = "Pass all module exams and complete every module";
      } else if (Number.isFinite(moduleNumber)) {
        unlocked = isSelfPacedModuleUnlocked(slug, moduleNumber, course);
        const mod = course.curriculum?.[moduleNumber - 1];
        lockReason = mod
          ? `Finish watching lessons in ${mod.title}`
          : "Complete module lessons first";
      }

      const meta = statusFromScore(unlocked, link.ready, score, lockReason);

      rows.push({
        id: `${slug}-${link.href}`,
        courseTitle: course.title,
        courseSlug: slug,
        deliveryKind: "self-paced",
        assessment: link.label,
        slot: link.slot,
        href: link.href,
        ready: link.ready,
        ...meta,
      });
    }
  }

  return rows.sort((a, b) => {
    const order = (s: AssignmentStatus) =>
      s === "pending" ? 0 : s === "failed" ? 1 : s === "locked" ? 2 : s === "awaiting-file" ? 3 : 4;
    const d = order(a.status) - order(b.status);
    if (d !== 0) return d;
    return a.courseTitle.localeCompare(b.courseTitle);
  });
}

export function assignmentStatusLabel(status: AssignmentStatus): string {
  switch (status) {
    case "locked":
      return "Locked";
    case "awaiting-file":
      return "Coming soon";
    case "pending":
      return "Pending";
    case "passed":
      return "Passed";
    case "failed":
      return "Failed";
    default:
      return status;
  }
}

/** Learner UI — hide exams that are not published/ready yet (no admin setup exposed). */
export function filterLearnerVisibleAssignments(rows: AssignmentRow[]): AssignmentRow[] {
  return rows.filter((row) => row.status !== "awaiting-file");
}
