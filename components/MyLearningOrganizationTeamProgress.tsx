"use client";

import Image from "next/image";
import Link from "next/link";
import {
  BookOpen,
  CheckCircle2,
  CircleDot,
  Clock3,
  GraduationCap,
  Users,
} from "lucide-react";
import { OrgTutorLedTeamRoster } from "@/components/OrgTutorLedTeamRoster";
import type { ManagedCourse } from "@/lib/content-schema";
import type { TutorLedExploreCard, TutorLedLiveHubRow } from "@/lib/tutor-led-live-hub-enrich";
import {
  buildOrganizationTeamProgress,
  buildOrganizationTeamTutorProgress,
  summarizeTeamProgress,
  summarizeTeamTutorProgress,
  type OrgTeamCourseAssignment,
  type OrgTeamMemberCourseProgress,
} from "@/lib/organization-team-progress";

type Props = {
  courses: ManagedCourse[];
  tutorEnrollments?: TutorLedLiveHubRow[];
  tutorExplore?: TutorLedExploreCard[];
  companySize?: string | null;
};

const surface =
  "rounded-xl border border-white/[0.07] bg-[#101018] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]";

function statusClass(status: OrgTeamMemberCourseProgress["status"]): string {
  if (status === "Completed") return "bg-emerald-500/15 text-emerald-300 ring-emerald-500/25";
  if (status === "In Progress") return "bg-amber-500/15 text-amber-200 ring-amber-500/25";
  return "bg-zinc-500/15 text-zinc-400 ring-white/10";
}

function ModuleDots({
  completed,
  total,
}: {
  completed: number;
  total: number;
}) {
  const safe = Math.max(1, total);
  return (
    <div className="flex flex-wrap gap-1">
      {Array.from({ length: safe }).map((_, idx) => (
        <span
          key={idx}
          className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[9px] ${
            idx < completed
              ? "bg-emerald-500/25 text-emerald-200"
              : "border border-white/10 text-zinc-600"
          }`}
        >
          {idx + 1}
        </span>
      ))}
    </div>
  );
}

function EmployeeProgressRow({ member }: { member: OrgTeamMemberCourseProgress }) {
  return (
    <tr className="border-b border-white/[0.06] last:border-0">
      <td className="py-3 pr-3">
        <div className="flex items-center gap-2.5">
          {member.avatarUrl ? (
            <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full ring-1 ring-white/10">
              <Image src={member.avatarUrl} alt="" fill className="object-cover" sizes="32px" />
            </div>
          ) : (
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/[0.04] text-[10px] font-bold text-zinc-400 ring-1 ring-white/10">
              {member.name
                .split(/\s+/)
                .slice(0, 2)
                .map((p) => p[0]?.toUpperCase() ?? "")
                .join("")}
            </span>
          )}
          <span className="text-sm font-medium text-zinc-200">{member.name}</span>
        </div>
      </td>
      <td className="hidden py-3 pr-3 md:table-cell">
        <ModuleDots completed={member.modulesCompleted} total={member.modulesTotal} />
        <p className="mt-1 text-[10px] text-zinc-600">
          {member.modulesCompleted}/{member.modulesTotal} modules
        </p>
      </td>
      <td className="py-3 pr-3 text-center">
        <p className="text-lg font-semibold tabular-nums text-white">{member.progressPercent}%</p>
        <p className="text-[10px] text-zinc-600 md:hidden">
          {member.modulesCompleted}/{member.modulesTotal} modules
        </p>
      </td>
      <td className="hidden py-3 pr-3 text-center sm:table-cell">
        <p className="text-sm font-semibold tabular-nums text-zinc-300">
          {member.examScorePercent != null ? `${member.examScorePercent}%` : "—"}
        </p>
        <p className="text-[10px] text-zinc-600">Combined score</p>
      </td>
      <td className="py-3 text-right">
        <span
          className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${statusClass(member.status)}`}
        >
          {member.status}
        </span>
      </td>
    </tr>
  );
}

function TeamCourseCard({ assignment }: { assignment: OrgTeamCourseAssignment }) {
  const completedCount = assignment.members.filter((m) => m.status === "Completed").length;
  const avgProgress =
    assignment.members.length > 0
      ? Math.round(
          assignment.members.reduce((sum, m) => sum + m.progressPercent, 0) /
            assignment.members.length,
        )
      : 0;

  return (
    <article className={`overflow-hidden ${surface}`}>
      <div className="flex flex-col gap-4 border-b border-white/[0.06] p-5 sm:flex-row sm:items-start">
        {assignment.courseImage?.trim() ? (
          <div className="relative h-24 w-full shrink-0 overflow-hidden rounded-lg ring-1 ring-white/10 sm:h-20 sm:w-32">
            <Image
              src={assignment.courseImage.trim()}
              alt=""
              fill
              className="object-cover"
              sizes="128px"
            />
          </div>
        ) : (
          <div className="flex h-20 w-full items-center justify-center rounded-lg border border-dashed border-white/10 bg-black/20 text-xs text-zinc-600 sm:w-32">
            Course
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-lg font-semibold text-white">{assignment.courseTitle}</p>
          <p className="mt-1 text-xs text-zinc-500">
            {assignment.modulesTotal} modules · {assignment.duration}
          </p>
          <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-zinc-400">
            <Users size={13} className="text-amber-400/80" />
            {assignment.employeesAssigned} employees assigned · {completedCount} completed ·{" "}
            {avgProgress}% avg progress
          </p>
        </div>
        <Link
          href={`/courses/${encodeURIComponent(assignment.courseSlug)}`}
          className="shrink-0 self-start rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:border-amber-500/30 hover:text-amber-300"
        >
          View course
        </Link>
      </div>

      <div className="overflow-x-auto px-5 pb-4 pt-2">
        <table className="w-full min-w-[520px] text-left">
          <thead>
            <tr className="text-[10px] font-semibold uppercase tracking-wide text-zinc-600">
              <th className="pb-2 pr-3 font-semibold">Employee</th>
              <th className="hidden pb-2 pr-3 font-semibold md:table-cell">Modules</th>
              <th className="pb-2 pr-3 text-center font-semibold">Progress</th>
              <th className="hidden pb-2 pr-3 text-center font-semibold sm:table-cell">Score</th>
              <th className="pb-2 text-right font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {assignment.members.map((member) => (
              <EmployeeProgressRow key={member.employeeId} member={member} />
            ))}
          </tbody>
        </table>
      </div>
    </article>
  );
}

export function MyLearningOrganizationTeamProgress({
  courses,
  tutorEnrollments = [],
  tutorExplore = [],
  companySize,
}: Props) {
  const assignments = buildOrganizationTeamProgress(courses, companySize);
  const tutorAssignments = buildOrganizationTeamTutorProgress(
    tutorEnrollments,
    tutorExplore,
    companySize,
  );
  const summary = summarizeTeamProgress(assignments);
  const tutorSummary = summarizeTeamTutorProgress(tutorAssignments);

  return (
    <section className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
            Team progress
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">Team course progress</h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-zinc-500">
            Track each employee on shared self-paced and tutor-led programs — modules, training days,
            scores, and status — the same pattern as individual progress.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[
            [Users, summary.employeesAssigned, "Employees assigned"],
            [BookOpen, summary.teamCourses, "Team courses"],
            [CheckCircle2, summary.completedEnrollments, "Completed"],
            [Clock3, summary.inProgressEnrollments, "In progress"],
          ].map(([Icon, value, label]) => {
            const StatIcon = Icon as typeof Users;
            return (
              <article key={label as string} className={`p-3 ${surface}`}>
                <StatIcon size={15} className="text-amber-400/80" />
                <p className="mt-2 text-2xl font-semibold text-white">{value as number}</p>
                <p className="text-[11px] text-zinc-500">{label as string}</p>
              </article>
            );
          })}
        </div>
      </div>

      {assignments.length === 0 ? (
        <article className={`p-6 text-center ${surface}`}>
          <CircleDot size={28} className="mx-auto text-zinc-600" />
          <p className="mt-3 text-sm text-zinc-400">No team courses assigned yet.</p>
          <Link
            href="/my-learning?tab=org-courses"
            className="mt-4 inline-flex rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-black hover:bg-amber-400"
          >
            Assign team courses
          </Link>
        </article>
      ) : (
        <div className="space-y-4">
          {assignments.map((assignment) => (
            <TeamCourseCard key={assignment.courseSlug} assignment={assignment} />
          ))}
        </div>
      )}

      <div className="border-t border-white/[0.06] pt-6">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
              Tutor-led
            </p>
            <h2 className="mt-1 text-xl font-semibold text-white">Team tutor-led progress</h2>
          </div>
          <div className="flex flex-wrap gap-3 text-xs text-zinc-500">
            <span className="inline-flex items-center gap-1">
              <GraduationCap size={13} className="text-amber-400/80" />
              {tutorSummary.programs} programs
            </span>
            <span>{tutorSummary.completedEnrollments} completed</span>
            <span>{tutorSummary.examsUnlocked} exams unlocked</span>
          </div>
        </div>
        <div className="space-y-4">
          {tutorAssignments.map((assignment) => (
            <OrgTutorLedTeamRoster
              key={assignment.programSlug}
              assignment={assignment}
              variant="compact"
            />
          ))}
        </div>
      </div>

      <p className="text-[11px] text-zinc-600">
        Team progress mirrors individual self-paced and tutor-led views. Employee roster API will
        replace demo data when connected.
      </p>
    </section>
  );
}
