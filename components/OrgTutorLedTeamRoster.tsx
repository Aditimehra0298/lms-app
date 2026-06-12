"use client";

import Image from "next/image";
import Link from "next/link";
import { Play, Users, Video } from "lucide-react";
import { liveTutorCourseHref, tutorLedOrgEmployeeJoinHref } from "@/lib/tutor-led-routes";
import type { OrgTeamMemberTutorProgress, OrgTeamTutorAssignment } from "@/lib/organization-team-progress";

function dayDotClass(dayIndex: number, completedDays: number, trainingDays: number): string {
  if (dayIndex < completedDays) return "bg-emerald-500/30 text-emerald-200 ring-emerald-500/40";
  if (dayIndex === completedDays && completedDays < trainingDays) {
    return "border-2 border-amber-400 bg-amber-500/15 text-amber-300";
  }
  return "border border-white/15 text-zinc-600";
}

function memberStatusClass(status: OrgTeamMemberTutorProgress["status"]): string {
  if (status === "Completed") return "bg-emerald-500/15 text-emerald-300";
  if (status === "In Progress") return "bg-amber-500/15 text-amber-200";
  return "bg-zinc-500/15 text-zinc-400";
}

function EmployeeInRoster({
  member,
  programSlug,
}: {
  member: OrgTeamMemberTutorProgress;
  programSlug: string;
}) {
  const canJoin = member.status !== "Completed";

  return (
    <div className="flex flex-col rounded-xl border border-white/10 bg-black/30 p-3">
      <div className="flex items-center gap-2.5">
        {member.avatarUrl ? (
          <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full ring-1 ring-white/10">
            <Image src={member.avatarUrl} alt="" fill className="object-cover" sizes="36px" />
          </div>
        ) : (
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/5 text-[10px] font-bold text-zinc-400 ring-1 ring-white/10">
            {member.name
              .split(/\s+/)
              .slice(0, 2)
              .map((p) => p[0]?.toUpperCase() ?? "")
              .join("")}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white">{member.name}</p>
          <span
            className={`mt-0.5 inline-flex rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${memberStatusClass(member.status)}`}
          >
            {member.status}
          </span>
        </div>
        <p className="shrink-0 text-lg font-bold tabular-nums text-amber-200">{member.progressPercent}%</p>
      </div>

      <div className="mt-2.5 flex flex-wrap gap-1">
        {Array.from({ length: member.trainingDaysTotal }).map((_, idx) => (
          <span
            key={idx}
            title={`Day ${idx + 1}`}
            className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold ${dayDotClass(
              idx,
              member.trainingDaysCompleted,
              member.trainingDaysTotal,
            )}`}
          >
            {idx + 1}
          </span>
        ))}
      </div>

      <div className="mt-2.5 flex items-center justify-between gap-2 text-[10px] text-zinc-500">
        <span>
          Score:{" "}
          <span className="font-semibold text-zinc-300">
            {member.examScorePercent != null ? `${member.examScorePercent}%` : "—"}
          </span>
        </span>
        <span>{member.examUnlocked ? "Exam unlocked" : "Exam locked"}</span>
      </div>

      <div className="mt-3">
        {canJoin ? (
          <Link
            href={tutorLedOrgEmployeeJoinHref(programSlug, member.employeeId, member.name)}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-amber-400 py-2 text-xs font-semibold text-black transition hover:bg-amber-300"
          >
            <Play className="h-3.5 w-3.5 fill-black" aria-hidden />
            Join live
          </Link>
        ) : (
          <span className="flex w-full items-center justify-center rounded-lg border border-white/10 py-2 text-xs text-zinc-500">
            Completed
          </span>
        )}
      </div>
    </div>
  );
}

type Props = {
  assignment: OrgTeamTutorAssignment;
  variant?: "default" | "compact";
};

/** One program — all team members grouped in a single roster block. */
export function OrgTutorLedTeamRoster({ assignment, variant = "default" }: Props) {
  const avgProgress =
    assignment.members.length > 0
      ? Math.round(
          assignment.members.reduce((s, m) => s + m.progressPercent, 0) / assignment.members.length,
        )
      : 0;

  return (
    <article
      className={`rounded-xl border border-white/10 bg-black/20 ${
        variant === "compact" ? "p-4" : "p-4 md:p-5"
      }`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        {assignment.programImage?.trim() ? (
          <div className="relative h-24 w-full shrink-0 overflow-hidden rounded-lg border border-white/10 sm:h-20 sm:w-28">
            <Image
              src={assignment.programImage.trim()}
              alt=""
              fill
              className="object-cover"
              sizes="112px"
            />
          </div>
        ) : (
          <div className="flex h-20 w-full items-center justify-center rounded-lg border border-white/10 bg-black/30 text-xs text-gray-500 sm:w-28">
            Live
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-lg font-semibold leading-snug text-white">{assignment.programTitle}</p>
          <p className="mt-1 text-xs text-gray-400">
            {assignment.trainingDaysTotal} training days · {assignment.duration}
          </p>
          <p className="mt-1 inline-flex items-center gap-1 text-[11px] text-sky-300/90">
            <Video className="h-3 w-3 shrink-0" aria-hidden />
            Live on Zoom
          </p>
          <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-gray-400">
            <Users size={13} className="text-amber-300" />
            {assignment.employeesAssigned} people in this program · {avgProgress}% team avg
          </p>
          <Link
            href={liveTutorCourseHref(assignment.programSlug)}
            className="mt-2 inline-block text-xs font-medium text-amber-200 hover:underline"
          >
            View program page →
          </Link>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-amber-500/20 bg-black/25 p-3 md:p-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-amber-200/90">
          Team in this session — each person joins separately
        </p>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {assignment.members.map((member) => (
            <EmployeeInRoster
              key={member.employeeId}
              member={member}
              programSlug={assignment.programSlug}
            />
          ))}
        </div>
      </div>
    </article>
  );
}
