import type { ManagedCourse } from "@/lib/content-schema";
import { countCurriculumModules } from "@/lib/learner-course-progress";
import type { TutorLedExploreCard, TutorLedLiveHubRow } from "@/lib/tutor-led-live-hub-enrich";
import { buildEmployeeCertificateNumbers } from "@/lib/organization-employee-certificate-numbers";
import {
  defaultOrgEmployeeProgress,
  demoOrgEmployeeEmail,
  formatOrgEmployeeUserId,
  seatsTotalFromCompanySize,
  type OrgEmployeeProgress,
} from "@/lib/organization-dashboard";

export type OrgTeamMemberCourseProgress = {
  employeeId: string;
  name: string;
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

function deriveMemberStatus(
  progressPercent: number,
): "Not Started" | "In Progress" | "Completed" {
  if (progressPercent >= 100) return "Completed";
  if (progressPercent > 0) return "In Progress";
  return "Not Started";
}

function deriveExamScore(progressPercent: number, status: OrgTeamMemberCourseProgress["status"]): number | null {
  if (status === "Not Started") return null;
  if (status === "Completed") return Math.min(100, progressPercent + 6);
  return Math.max(45, Math.min(92, progressPercent - 4));
}

function memberProgressFromEmployee(
  employee: OrgEmployeeProgress,
  modulesTotal: number,
): OrgTeamMemberCourseProgress {
  const safeModules = Math.max(1, modulesTotal);
  const progressPercent = Math.min(100, Math.max(0, employee.progressPercent));
  const modulesCompleted = Math.min(
    safeModules,
    Math.round((progressPercent / 100) * safeModules),
  );
  const status = deriveMemberStatus(progressPercent);

  return {
    employeeId: employee.id,
    name: employee.name,
    avatarUrl: employee.avatarUrl,
    modulesCompleted,
    modulesTotal: safeModules,
    progressPercent,
    examScorePercent: deriveExamScore(progressPercent, status),
    status,
  };
}

/** Team course assignments — demo data until org roster + enrollments API is wired. */
export function buildOrganizationTeamProgress(
  courses: ManagedCourse[],
  companySize?: string | null,
): OrgTeamCourseAssignment[] {
  const seatsTotal = seatsTotalFromCompanySize(companySize);
  const employees = defaultOrgEmployeeProgress().slice(0, Math.min(seatsTotal, 8));
  const published = courses.filter((c) => c.published !== false && c.settings?.showInCatalog !== false);
  const assigned = (published.length > 0 ? published : courses).slice(0, 2);

  if (assigned.length === 0) {
    return [
      {
        courseSlug: "team-food-safety",
        courseTitle: "Food Safety & HACCP Fundamentals",
        duration: "12 hours",
        modulesTotal: 8,
        employeesAssigned: employees.length,
        members: employees.map((e) => memberProgressFromEmployee(e, 8)),
      },
    ];
  }

  return assigned.map((course) => {
    const modulesTotal = Math.max(1, countCurriculumModules(course.curriculum) || 6);
    return {
      courseSlug: course.slug,
      courseTitle: course.title,
      courseImage: course.image,
      duration: course.duration?.trim() || "—",
      modulesTotal,
      employeesAssigned: employees.length,
      members: employees.map((e) => memberProgressFromEmployee(e, modulesTotal)),
    };
  });
}

function memberTutorFromEmployee(
  employee: OrgEmployeeProgress,
  trainingDaysTotal: number,
): OrgTeamMemberTutorProgress {
  const safeDays = Math.max(1, trainingDaysTotal);
  const progressPercent = Math.min(100, Math.max(0, employee.progressPercent));
  const trainingDaysCompleted = Math.min(
    safeDays,
    Math.round((progressPercent / 100) * safeDays),
  );
  const status = deriveMemberStatus(progressPercent);
  const examUnlocked = trainingDaysCompleted >= Math.max(1, safeDays - 1);

  return {
    employeeId: employee.id,
    name: employee.name,
    avatarUrl: employee.avatarUrl,
    trainingDaysCompleted,
    trainingDaysTotal: safeDays,
    progressPercent,
    examScorePercent: deriveExamScore(progressPercent, status),
    examUnlocked,
    status,
  };
}

function hubRowFromExplore(card: TutorLedExploreCard): TutorLedLiveHubRow {
  return {
    slug: card.slug,
    title: card.title,
    trainingDays: card.trainingDays,
    completedDays: 0,
    duration: card.duration,
    status: "Not Started",
    image: card.image,
    examUnlocked: false,
    progressPercent: 0,
  };
}

/** Team tutor-led assignments — demo until org live enrollments API is wired. */
export function buildOrganizationTeamTutorProgress(
  enrollments: TutorLedLiveHubRow[],
  explore: TutorLedExploreCard[],
  companySize?: string | null,
): OrgTeamTutorAssignment[] {
  const seatsTotal = seatsTotalFromCompanySize(companySize);
  const employees = defaultOrgEmployeeProgress().slice(0, Math.min(seatsTotal, 8));
  const programs =
    enrollments.length > 0
      ? enrollments.slice(0, 2)
      : explore.slice(0, 2).map(hubRowFromExplore);

  if (programs.length === 0) {
    return [
      {
        programSlug: "haccp-tutor-led",
        programTitle: "HACCP Tutor-Led Live Program",
        duration: "5 days live",
        trainingDaysTotal: 5,
        employeesAssigned: employees.length,
        members: employees.map((e) => memberTutorFromEmployee(e, 5)),
      },
    ];
  }

  return programs.map((program) => {
    const trainingDaysTotal = Math.max(1, program.trainingDays);
    return {
      programSlug: program.slug,
      programTitle: program.title,
      programImage: program.image,
      duration: program.duration?.trim() || "—",
      trainingDaysTotal,
      employeesAssigned: employees.length,
      members: employees.map((e) => memberTutorFromEmployee(e, trainingDaysTotal)),
    };
  });
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
  const employeeRef = {
    id: input.member.employeeId,
    name: input.member.name,
  };
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
    employeeEmail: demoOrgEmployeeEmail(employeeRef),
    avatarUrl: input.member.avatarUrl,
    courseSlug: input.courseSlug,
    courseTitle: input.courseTitle,
    deliveryKind: input.deliveryKind,
    certificateNumber: numbers.certificateNumber,
    delegateNumber: numbers.delegateNumber,
    identificationNumber: numbers.identificationNumber,
    scorePercent: input.member.examScorePercent,
    status: input.status,
    earnedDate: "12 May 2026",
  };
}

/** One certificate row per employee who completes a program — same issuance pattern as individual. */
export function buildOrganizationTeamCertificates(
  selfPaced: OrgTeamCourseAssignment[],
  tutorLed: OrgTeamTutorAssignment[],
): OrgTeamCertificateRow[] {
  const rows: OrgTeamCertificateRow[] = [];
  const trainingSeqByCourse = new Map<string, number>();
  let verifySequence = 42;

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

/** Rich preview rows — shown on the org certificates page until live roster data fills in. */
export function organizationTeamCertificateSamples(): OrgTeamCertificateRow[] {
  const samples: Array<{
    id: string;
    employeeId: string;
    name: string;
    email: string;
    avatarUrl?: string;
    courseSlug: string;
    courseTitle: string;
    deliveryKind: "self-paced" | "tutor-led";
    trainingSequence: number;
    verifySequence: number;
    scorePercent: number | null;
    status: "ready" | "pending";
    earnedDate: string;
  }> = [
    {
      id: "sample-sp-michael-food",
      employeeId: "3",
      name: "Michael Brown",
      email: "michael.brown@team.demo",
      avatarUrl: "https://randomuser.me/api/portraits/men/75.jpg",
      courseSlug: "food-safety-masterclass",
      courseTitle: "Diploma in HACCP Food Safety Standards (Level 2)",
      deliveryKind: "self-paced",
      trainingSequence: 1,
      verifySequence: 43,
      scorePercent: 97,
      status: "ready",
      earnedDate: "8 Jun 2026",
    },
    {
      id: "sample-sp-john-cyber",
      employeeId: "1",
      name: "John Smith",
      email: "john.smith@team.demo",
      avatarUrl: "https://randomuser.me/api/portraits/men/32.jpg",
      courseSlug: "cyber-security-essentials",
      courseTitle: "Cyber Security Essentials for Professionals",
      deliveryKind: "self-paced",
      trainingSequence: 1,
      verifySequence: 44,
      scorePercent: 88,
      status: "ready",
      earnedDate: "5 Jun 2026",
    },
    {
      id: "sample-tl-sarah-haccp",
      employeeId: "2",
      name: "Sarah Johnson",
      email: "sarah.johnson@team.demo",
      avatarUrl: "https://randomuser.me/api/portraits/women/44.jpg",
      courseSlug: "haccp-tutor-led",
      courseTitle: "HACCP Tutor-Led Live Program",
      deliveryKind: "tutor-led",
      trainingSequence: 1,
      verifySequence: 45,
      scorePercent: 92,
      status: "ready",
      earnedDate: "10 Jun 2026",
    },
    {
      id: "sample-tl-emily-pending",
      employeeId: "4",
      name: "Emily Davis",
      email: "emily.davis@team.demo",
      avatarUrl: "https://randomuser.me/api/portraits/women/68.jpg",
      courseSlug: "haccp-tutor-led",
      courseTitle: "HACCP Tutor-Led Live Program",
      deliveryKind: "tutor-led",
      trainingSequence: 2,
      verifySequence: 46,
      scorePercent: null,
      status: "pending",
      earnedDate: "—",
    },
    {
      id: "sample-sp-david-esg",
      employeeId: "5",
      name: "David Wilson",
      email: "david.wilson@team.demo",
      avatarUrl: "https://randomuser.me/api/portraits/men/41.jpg",
      courseSlug: "esg-reporting-fundamentals",
      courseTitle: "ESG Reporting and Compliance Fundamentals",
      deliveryKind: "self-paced",
      trainingSequence: 1,
      verifySequence: 47,
      scorePercent: 85,
      status: "ready",
      earnedDate: "3 Jun 2026",
    },
    {
      id: "sample-sp-sarah-esg",
      employeeId: "2",
      name: "Sarah Johnson",
      email: "sarah.johnson@team.demo",
      avatarUrl: "https://randomuser.me/api/portraits/women/44.jpg",
      courseSlug: "esg-reporting-fundamentals",
      courseTitle: "ESG Reporting and Compliance Fundamentals",
      deliveryKind: "self-paced",
      trainingSequence: 2,
      verifySequence: 48,
      scorePercent: 94,
      status: "ready",
      earnedDate: "1 Jun 2026",
    },
  ];

  return samples.map((s) => {
    const numbers = buildEmployeeCertificateNumbers({
      employeeId: s.employeeId,
      courseSlug: s.courseSlug,
      trainingSequence: s.trainingSequence,
      verifySequence: s.verifySequence,
    });
    return {
      id: s.id,
      employeeId: s.employeeId,
      employeeUserId: formatOrgEmployeeUserId(s.employeeId),
      employeeName: s.name,
      employeeEmail: s.email,
      avatarUrl: s.avatarUrl,
      courseSlug: s.courseSlug,
      courseTitle: s.courseTitle,
      deliveryKind: s.deliveryKind,
      certificateNumber: numbers.certificateNumber,
      delegateNumber: numbers.delegateNumber,
      identificationNumber: numbers.identificationNumber,
      scorePercent: s.scorePercent,
      status: s.status,
      earnedDate: s.earnedDate,
    };
  });
}

/** Merge live progress certificates with preview samples (deduped by id). */
export function mergeOrganizationTeamCertificates(
  fromProgress: OrgTeamCertificateRow[],
  includeSamples = true,
): OrgTeamCertificateRow[] {
  if (!includeSamples) return fromProgress;
  const seen = new Set(fromProgress.map((r) => r.id));
  const merged = [...fromProgress];
  for (const sample of organizationTeamCertificateSamples()) {
    if (!seen.has(sample.id)) {
      merged.push(sample);
      seen.add(sample.id);
    }
  }
  return merged.sort((a, b) => {
    const statusOrder =
      a.status === "ready" && b.status !== "ready" ? -1 : a.status !== "ready" && b.status === "ready" ? 1 : 0;
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
