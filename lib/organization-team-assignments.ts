import type { ManagedCourse } from "@/lib/content-schema";
import type { TutorLedExploreCard, TutorLedLiveHubRow } from "@/lib/tutor-led-live-hub-enrich";
import {
  demoOrgEmployeeEmail,
  formatOrgEmployeeUserId,
  type OrgEmployeeProgress,
} from "@/lib/organization-dashboard";
import {
  buildOrganizationTeamProgress,
  buildOrganizationTeamTutorProgress,
} from "@/lib/organization-team-progress";
import {
  assignmentStatusLabel,
  type AssignmentStatus,
} from "@/lib/my-learning-assignments";
import { examLinksFromManagedCourse } from "@/lib/my-learning-exams";

export type OrgSelfPacedPhase = "preview-only" | "in-progress" | "completed";

export type OrgTeamAssignmentRow = {
  id: string;
  employeeId: string;
  employeeUserId: string;
  employeeName: string;
  employeeEmail: string;
  courseTitle: string;
  courseSlug: string;
  assessment: string;
  slot: string;
  deliveryKind: "self-paced" | "tutor-led";
  selfPacedPhase: OrgSelfPacedPhase;
  selfPacedLabel: string;
  selfPacedDetail: string;
  ready: boolean;
  unlocked: boolean;
  lockReason?: string;
  status: AssignmentStatus;
  marksLabel: string;
};

export function selfPacedPhaseFromModules(
  modulesCompleted: number,
  modulesTotal: number,
): { phase: OrgSelfPacedPhase; label: string; detail: string; complete: boolean } {
  const total = Math.max(1, modulesTotal);
  const done = Math.min(total, Math.max(0, modulesCompleted));
  if (done <= 0) {
    return {
      phase: "preview-only",
      label: "Preview only",
      detail: "Lessons not completed — exams stay locked",
      complete: false,
    };
  }
  if (done < total) {
    return {
      phase: "in-progress",
      label: "Self-paced in progress",
      detail: `${done}/${total} modules completed`,
      complete: false,
    };
  }
  return {
    phase: "completed",
    label: "Self-paced complete",
    detail: `${total}/${total} modules completed`,
    complete: true,
  };
}

function marksFromScore(scorePercent: number | null, status: AssignmentStatus): string {
  if (status === "passed" && scorePercent != null) return `${scorePercent}%`;
  if (status === "failed" && scorePercent != null) return `${scorePercent}% (retake)`;
  return "—";
}

function examStatusForMember(input: {
  unlocked: boolean;
  ready: boolean;
  scorePercent: number | null;
  memberStatus: "Not Started" | "In Progress" | "Completed";
  lockReason: string;
}): Pick<OrgTeamAssignmentRow, "status" | "marksLabel" | "unlocked" | "lockReason"> {
  if (!input.ready) {
    return {
      status: "awaiting-file",
      marksLabel: "—",
      unlocked: false,
      lockReason: undefined,
    };
  }
  if (!input.unlocked) {
    return {
      status: "locked",
      marksLabel: "—",
      unlocked: false,
      lockReason: input.lockReason,
    };
  }
  if (input.memberStatus === "Completed" && input.scorePercent != null && input.scorePercent >= 70) {
    return {
      status: "passed",
      marksLabel: marksFromScore(input.scorePercent, "passed"),
      unlocked: true,
      lockReason: undefined,
    };
  }
  if (input.scorePercent != null && input.scorePercent > 0 && input.scorePercent < 70) {
    return {
      status: "failed",
      marksLabel: marksFromScore(input.scorePercent, "failed"),
      unlocked: true,
      lockReason: undefined,
    };
  }
  return {
    status: "pending",
    marksLabel: "—",
    unlocked: true,
    lockReason: undefined,
  };
}

function moduleNumberFromSlot(slot: string): number | null {
  const m = slot.match(/Module\s+(\d+)/i);
  if (!m) return null;
  const n = Number.parseInt(m[1] ?? "", 10);
  return Number.isFinite(n) ? n : null;
}

export function buildOrganizationTeamAssignments(input: {
  courses: ManagedCourse[];
  tutorEnrollments?: TutorLedLiveHubRow[];
  tutorExplore?: TutorLedExploreCard[];
  companySize?: string | null;
}): OrgTeamAssignmentRow[] {
  const courseAssignments = buildOrganizationTeamProgress(input.courses, input.companySize);
  const tutorAssignments = buildOrganizationTeamTutorProgress(
    input.tutorEnrollments ?? [],
    input.tutorExplore ?? [],
    input.companySize,
  );
  const rows: OrgTeamAssignmentRow[] = [];

  for (const assignment of courseAssignments) {
    const course = input.courses.find((c) => c.slug === assignment.courseSlug);
    const examLinks = course ? examLinksFromManagedCourse(course) : [];

    for (const member of assignment.members) {
      const employee: OrgEmployeeProgress = {
        id: member.employeeId,
        name: member.name,
        avatarUrl: member.avatarUrl,
        progressPercent: member.progressPercent,
      };
      const selfPaced = selfPacedPhaseFromModules(
        member.modulesCompleted,
        member.modulesTotal,
      );

      for (const link of examLinks) {
        if (!link.ready) continue;

        const moduleNum = moduleNumberFromSlot(link.slot);
        const isFinal = link.slot === "Final";
        let unlocked = false;
        let lockReason =
          "Complete all self-paced lessons — preview watch alone does not unlock exams";

        if (isFinal) {
          unlocked = selfPaced.complete;
          if (!selfPaced.complete) {
            lockReason = `Self-paced incomplete (${member.modulesCompleted}/${member.modulesTotal} modules) — final exam locked`;
          } else {
            lockReason = "Pass all module exams before the final exam";
          }
        } else if (moduleNum != null) {
          unlocked = member.modulesCompleted >= moduleNum;
          if (member.modulesCompleted <= 0) {
            lockReason =
              "Self-paced not started (preview only) — complete module lessons to unlock this exam";
          } else if (!unlocked) {
            lockReason = `Finish self-paced lessons in ${link.slot} (${member.modulesCompleted}/${member.modulesTotal} modules done)`;
          }
        }

        const examMeta = examStatusForMember({
          unlocked,
          ready: link.ready,
          scorePercent: member.examScorePercent,
          memberStatus: member.status,
          lockReason,
        });

        rows.push({
          id: `sp-${member.employeeId}-${assignment.courseSlug}-${link.slot}`,
          employeeId: member.employeeId,
          employeeUserId: formatOrgEmployeeUserId(member.employeeId),
          employeeName: member.name,
          employeeEmail: demoOrgEmployeeEmail(employee),
          courseTitle: assignment.courseTitle,
          courseSlug: assignment.courseSlug,
          assessment: link.label,
          slot: link.slot,
          deliveryKind: "self-paced",
          selfPacedPhase: selfPaced.phase,
          selfPacedLabel: selfPaced.label,
          selfPacedDetail: selfPaced.detail,
          ready: link.ready,
          ...examMeta,
        });
      }
    }
  }

  for (const program of tutorAssignments) {
    for (const member of program.members) {
      const employee: OrgEmployeeProgress = {
        id: member.employeeId,
        name: member.name,
        avatarUrl: member.avatarUrl,
        progressPercent: member.progressPercent,
      };
      const selfPaced = selfPacedPhaseFromModules(
        member.trainingDaysCompleted,
        member.trainingDaysTotal,
      );
      const lockReason = member.examUnlocked
        ? undefined
        : `Complete tutor-led training days (${member.trainingDaysCompleted}/${member.trainingDaysTotal} done)`;

      const examMeta = examStatusForMember({
        unlocked: member.examUnlocked,
        ready: true,
        scorePercent: member.examScorePercent,
        memberStatus: member.status,
        lockReason: lockReason ?? "Training days incomplete",
      });

      rows.push({
        id: `tl-${member.employeeId}-${program.programSlug}`,
        employeeId: member.employeeId,
        employeeUserId: formatOrgEmployeeUserId(member.employeeId),
        employeeName: member.name,
        employeeEmail: demoOrgEmployeeEmail(employee),
        courseTitle: program.programTitle,
        courseSlug: program.programSlug,
        assessment: "Final certification exam",
        slot: "Final",
        deliveryKind: "tutor-led",
        selfPacedPhase: selfPaced.complete ? "completed" : selfPaced.phase,
        selfPacedLabel:
          member.trainingDaysCompleted <= 0
            ? "Not started"
            : member.trainingDaysCompleted >= member.trainingDaysTotal
              ? "Training complete"
              : "Live training in progress",
        selfPacedDetail: `${member.trainingDaysCompleted}/${member.trainingDaysTotal} training days`,
        ready: true,
        ...examMeta,
      });
    }
  }

  return rows.sort((a, b) => {
    const order = (s: AssignmentStatus) =>
      s === "pending" ? 0 : s === "failed" ? 1 : s === "locked" ? 2 : s === "awaiting-file" ? 3 : 4;
    const d = order(a.status) - order(b.status);
    if (d !== 0) return d;
    const nameCmp = a.employeeName.localeCompare(b.employeeName);
    if (nameCmp !== 0) return nameCmp;
    return a.courseTitle.localeCompare(b.courseTitle);
  });
}

export function summarizeOrganizationTeamAssignments(rows: OrgTeamAssignmentRow[]): {
  total: number;
  locked: number;
  pending: number;
  passed: number;
  previewOnly: number;
} {
  const visible = rows.filter((r) => r.status !== "awaiting-file");
  return {
    total: visible.length,
    locked: visible.filter((r) => r.status === "locked").length,
    pending: visible.filter((r) => r.status === "pending" || r.status === "failed").length,
    passed: visible.filter((r) => r.status === "passed").length,
    previewOnly: visible.filter((r) => r.selfPacedPhase === "preview-only").length,
  };
}

export { assignmentStatusLabel };
