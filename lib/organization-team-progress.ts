import type { ManagedCourse } from "@/lib/content-schema";
import { countCurriculumModules } from "@/lib/learner-course-progress";
import type { TutorLedExploreCard, TutorLedLiveHubRow } from "@/lib/tutor-led-live-hub-enrich";
import { buildEmployeeCertificateNumbers } from "@/lib/organization-employee-certificate-numbers";
import { formatOrgEmployeeUserId } from "@/lib/organization-dashboard";
import { isDemoRosterEntry, type OrgTeamRosterEntry } from "@/lib/organization-team-config";
import { getCachedOrganizationTeamRecord } from "@/lib/organization-team-sync-client";

export type OrgTeamMemberCourseProgress = {
  employeeId: string;
  name: string;
  email: string;
  avatarUrl?: string;
  modulesCompleted: number;
  modulesTotal: number;
  progressPercent: number;
  examScorePercent: number | null;
  status: "Not Started" | "In Progress" | "Completed";
};

export type OrgTeamCourseAssignment = {
  courseSlug: string;
  courseTitle: string;
  courseImage?: string;
  duration: string;
  modulesTotal: number;
  employeesAssigned: number;
  members: OrgTeamMemberCourseProgress[];
};

export type OrgTeamMemberTutorProgress = {
  employeeId: string;
  name: string;
  email: string;
  avatarUrl?: string;
  trainingDaysCompleted: number;
  trainingDaysTotal: number;
  progressPercent: number;
  examScorePercent: number | null;
  examUnlocked: boolean;
  status: "Not Started" | "In Progress" | "Completed";
};

export type OrgTeamTutorAssignment = {
  programSlug: string;
  programTitle: string;
  programImage?: string;
  duration: string;
  trainingDaysTotal: number;
  employeesAssigned: number;
  members: OrgTeamMemberTutorProgress[];
};

export type OrgTeamCertificateRow = {
  id: string;
  employeeId: string;
  employeeUserId: string;
  employeeName: string;
  employeeEmail: string;
  avatarUrl?: string;
  courseSlug: string;
  courseTitle: string;
  deliveryKind: "self-paced" | "tutor-led";
  certificateNumber: string;
  delegateNumber: string;
  identificationNumber: number;
  scorePercent: number | null;
  status: "ready" | "pending";
  earnedDate: string;
};

/** Invited (real) employees from the organisation team record loaded from the server. */
export function readInvitedOrgTeamMembers(): OrgTeamRosterEntry[] {
  if (typeof window === "undefined") return [];
  const roster = getCachedOrganizationTeamRecord()?.roster ?? [];
  return roster.filter((r) => r.invited && r.name.trim() && !isDemoRosterEntry(r));
}

function assignedTeamMembers(slug: string, team: OrgTeamRosterEntry[]): OrgTeamRosterEntry[] {
  const ids = getCachedOrganizationTeamRecord()?.courseAssignments?.[slug] ?? [];
  if (ids.length === 0) return [];
  return team.filter((r) => ids.includes(r.id));
}

/**
 * Courses the organisation assigned to its invited employees.
 * Per-employee progress is not tracked on the server yet, so members start at Not Started.
 */
export function buildOrganizationTeamProgress(
  courses: ManagedCourse[],
  _companySize?: string | null,
): OrgTeamCourseAssignment[] {
  const team = readInvitedOrgTeamMembers();
  if (team.length === 0) return [];

  const rows: OrgTeamCourseAssignment[] = [];
  for (const course of courses) {
    const members = assignedTeamMembers(course.slug, team);
    if (members.length === 0) continue;
    const modulesTotal = Math.max(1, countCurriculumModules(course.curriculum) || 1);
    rows.push({
      courseSlug: course.slug,
      courseTitle: course.title,
      courseImage: course.image,
      duration: course.duration?.trim() || "—",
      modulesTotal,
      employeesAssigned: members.length,
      members: members.map((m) => ({
        employeeId: m.id,
        name: m.name,
        email: m.email,
        avatarUrl: m.avatarUrl,
        modulesCompleted: 0,
        modulesTotal,
        progressPercent: 0,
        examScorePercent: null,
        status: "Not Started",
      })),
    });
  }
  return rows;
}

/** Tutor-led programs assigned to invited employees (same rules as self-paced). */
export function buildOrganizationTeamTutorProgress(
  enrollments: TutorLedLiveHubRow[],
  explore: TutorLedExploreCard[],
  _companySize?: string | null,
): OrgTeamTutorAssignment[] {
  const team = readInvitedOrgTeamMembers();
  if (team.length === 0) return [];

  const programs = new Map<string, { title: string; image?: string; duration?: string; trainingDays: number }>();
  for (const p of [...enrollments, ...explore]) {
    if (!programs.has(p.slug)) {
      programs.set(p.slug, { title: p.title, image: p.image, duration: p.duration, trainingDays: p.trainingDays });
    }
  }

  const rows: OrgTeamTutorAssignment[] = [];
  for (const [slug, program] of programs) {
    const members = assignedTeamMembers(slug, team);
    if (members.length === 0) continue;
    const trainingDaysTotal = Math.max(1, program.trainingDays);
    rows.push({
      programSlug: slug,
      programTitle: program.title,
      programImage: program.image,
      duration: program.duration?.trim() || "—",
      trainingDaysTotal,
      employeesAssigned: members.length,
      members: members.map((m) => ({
        employeeId: m.id,
        name: m.name,
        email: m.email,
        avatarUrl: m.avatarUrl,
        trainingDaysCompleted: 0,
        trainingDaysTotal,
        progressPercent: 0,
        examScorePercent: null,
        examUnlocked: false,
        status: "Not Started",
      })),
    });
  }
  return rows;
}

function buildOrgCertificateRow(input: {
  id: string;
  member: OrgTeamMemberCourseProgress | OrgTeamMemberTutorProgress;
  courseSlug: string;
  courseTitle: string;
  deliveryKind: "self-paced" | "tutor-led";
  trainingSequence: number;
  verifySequence: number;
  status: "ready" | "pending";
}): OrgTeamCertificateRow {
  const numbers = buildEmployeeCertificateNumbers({
    employeeId: input.member.employeeId,
    courseSlug: input.courseSlug,
    trainingSequence: input.trainingSequence,
    verifySequence: input.verifySequence,
  });

  return {
    id: input.id,
    employeeId: input.member.employeeId,
    employeeUserId: formatOrgEmployeeUserId(input.member.employeeId),
    employeeName: input.member.name,
    employeeEmail: input.member.email,
    avatarUrl: input.member.avatarUrl,
    courseSlug: input.courseSlug,
    courseTitle: input.courseTitle,
    deliveryKind: input.deliveryKind,
    certificateNumber: numbers.certificateNumber,
    delegateNumber: numbers.delegateNumber,
    identificationNumber: numbers.identificationNumber,
    scorePercent: input.member.examScorePercent,
    status: input.status,
    earnedDate: "—",
  };
}

/** One certificate row per employee who completes a program — same issuance pattern as individual. */
export function buildOrganizationTeamCertificates(
  selfPaced: OrgTeamCourseAssignment[],
  tutorLed: OrgTeamTutorAssignment[],
): OrgTeamCertificateRow[] {
  const rows: OrgTeamCertificateRow[] = [];
  const trainingSeqByCourse = new Map<string, number>();
  let verifySequence = 1;

  const nextTrainingSeq = (courseSlug: string) => {
    const key = courseSlug.toLowerCase();
    const next = (trainingSeqByCourse.get(key) ?? 0) + 1;
    trainingSeqByCourse.set(key, next);
    return next;
  };

  for (const assignment of selfPaced) {
    for (const member of assignment.members) {
      if (member.status !== "Completed") continue;
      rows.push(
        buildOrgCertificateRow({
          id: `sp-${assignment.courseSlug}-${member.employeeId}`,
          member,
          courseSlug: assignment.courseSlug,
          courseTitle: assignment.courseTitle,
          deliveryKind: "self-paced",
          trainingSequence: nextTrainingSeq(assignment.courseSlug),
          verifySequence: verifySequence++,
          status: "ready",
        }),
      );
    }
  }

  for (const assignment of tutorLed) {
    for (const member of assignment.members) {
      if (member.status !== "Completed") continue;
      rows.push(
        buildOrgCertificateRow({
          id: `tl-${assignment.programSlug}-${member.employeeId}`,
          member,
          courseSlug: assignment.programSlug,
          courseTitle: assignment.programTitle,
          deliveryKind: "tutor-led",
          trainingSequence: nextTrainingSeq(assignment.programSlug),
          verifySequence: verifySequence++,
          status: member.examUnlocked ? "ready" : "pending",
        }),
      );
    }
  }

  return rows.sort((a, b) => {
    const statusOrder = a.status === "ready" && b.status !== "ready" ? -1 : a.status !== "ready" && b.status === "ready" ? 1 : 0;
    if (statusOrder !== 0) return statusOrder;
    return a.employeeName.localeCompare(b.employeeName);
  });
}

export function summarizeTeamProgress(assignments: OrgTeamCourseAssignment[]): {
  employeesAssigned: number;
  teamCourses: number;
  completedEnrollments: number;
  inProgressEnrollments: number;
  notStartedEnrollments: number;
} {
  let completedEnrollments = 0;
  let inProgressEnrollments = 0;
  let notStartedEnrollments = 0;
  const employeeIds = new Set<string>();

  for (const assignment of assignments) {
    for (const member of assignment.members) {
      employeeIds.add(member.employeeId);
      if (member.status === "Completed") completedEnrollments += 1;
      else if (member.status === "In Progress") inProgressEnrollments += 1;
      else notStartedEnrollments += 1;
    }
  }

  return {
    employeesAssigned: employeeIds.size,
    teamCourses: assignments.length,
    completedEnrollments,
    inProgressEnrollments,
    notStartedEnrollments,
  };
}

export function summarizeTeamTutorProgress(assignments: OrgTeamTutorAssignment[]): {
  programs: number;
  completedEnrollments: number;
  inProgressEnrollments: number;
  examsUnlocked: number;
} {
  let completedEnrollments = 0;
  let inProgressEnrollments = 0;
  let examsUnlocked = 0;

  for (const assignment of assignments) {
    for (const member of assignment.members) {
      if (member.status === "Completed") completedEnrollments += 1;
      else if (member.status === "In Progress") inProgressEnrollments += 1;
      if (member.examUnlocked) examsUnlocked += 1;
    }
  }

  return {
    programs: assignments.length,
    completedEnrollments,
    inProgressEnrollments,
    examsUnlocked,
  };
}
