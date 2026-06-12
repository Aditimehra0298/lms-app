"use client";

import Link from "next/link";
import { Lock, Users } from "lucide-react";
import {
  assignmentStatusLabel,
  summarizeOrganizationTeamAssignments,
  type OrgSelfPacedPhase,
  type OrgTeamAssignmentRow,
} from "@/lib/organization-team-assignments";
import type { AssignmentStatus } from "@/lib/my-learning-assignments";

function examStatusClass(status: AssignmentStatus): string {
  switch (status) {
    case "passed":
      return "bg-emerald-500/20 text-emerald-200";
    case "failed":
      return "bg-rose-500/20 text-rose-200";
    case "pending":
      return "bg-amber-500/20 text-amber-200";
    case "locked":
      return "bg-zinc-500/20 text-zinc-300";
    default:
      return "bg-white/10 text-gray-400";
  }
}

function selfPacedClass(phase: OrgSelfPacedPhase): string {
  if (phase === "completed") return "bg-emerald-500/15 text-emerald-300 ring-emerald-500/25";
  if (phase === "in-progress") return "bg-sky-500/15 text-sky-200 ring-sky-500/25";
  return "bg-amber-500/15 text-amber-200 ring-amber-500/25";
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

type Props = {
  rows: OrgTeamAssignmentRow[];
};

export function MyLearningOrganizationAssignmentsTab({ rows }: Props) {
  const visible = rows.filter((r) => r.status !== "awaiting-file");
  const summary = summarizeOrganizationTeamAssignments(rows);

  return (
    <section className="rounded-2xl border border-white/10 bg-[#0a0a0a] p-4 shadow-[0_0_24px_rgba(0,0,0,0.35)]">
      <div className="grid gap-4 lg:grid-cols-[1.7fr_1fr]">
        <div>
          <h1 className="text-4xl font-bold">Team Assignments</h1>
          <p className="mt-1 text-sm text-gray-300">
            Per-employee exam status across self-paced and tutor-led programs. Exams unlock only after
            self-paced lessons are complete — preview watch does not unlock exams.
          </p>
        </div>
        {summary.locked > 0 ? (
          <div className="rounded-xl border border-amber-300/25 bg-linear-to-r from-amber-500/15 to-violet-500/10 p-4">
            <p className="text-sm font-semibold text-amber-100">
              {summary.locked} exam(s) locked for team members
            </p>
            <p className="mt-1 text-xs text-gray-300">
              {summary.previewOnly > 0
                ? `${summary.previewOnly} still on preview only — lessons must be completed first.`
                : "Complete self-paced modules or training days to unlock exams."}
            </p>
          </div>
        ) : null}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {[
          ["Team rows", String(summary.total)],
          ["Locked", String(summary.locked)],
          ["Pending / retake", String(summary.pending)],
          ["Passed", String(summary.passed)],
          ["Preview only", String(summary.previewOnly)],
        ].map(([label, value]) => (
          <article key={label} className="rounded-xl border border-white/10 bg-black/30 p-3">
            <p className="text-xs text-gray-400">{label}</p>
            <p className="mt-1 text-2xl font-bold">{value}</p>
          </article>
        ))}
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl border border-white/10 bg-black/30">
        {visible.length === 0 ? (
          <p className="p-8 text-center text-sm text-gray-400">
            No team exams are set up yet. Assign courses from Team Courses and check back once
            employees begin self-paced lessons or live training.
          </p>
        ) : (
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="border-b border-white/10 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-3 py-3 font-semibold">Employee</th>
                <th className="px-3 py-3 font-semibold">Course / program</th>
                <th className="px-3 py-3 font-semibold">Assessment</th>
                <th className="px-3 py-3 font-semibold">Type</th>
                <th className="px-3 py-3 font-semibold">Self-paced</th>
                <th className="px-3 py-3 font-semibold">Exam</th>
                <th className="px-3 py-3 font-semibold">Marks</th>
                <th className="px-3 py-3 text-right font-semibold">Unlocked</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => (
                <tr key={row.id} className="border-b border-white/5 last:border-0">
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2.5">
                      {row.employeeName ? (
                        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/5 text-[10px] font-bold text-zinc-400 ring-1 ring-white/10">
                          {initials(row.employeeName)}
                        </span>
                      ) : null}
                      <div className="min-w-0">
                        <p className="font-semibold text-white">{row.employeeName}</p>
                        <p className="font-mono text-[10px] text-amber-200/90">{row.employeeUserId}</p>
                        <p className="truncate text-[10px] text-gray-500">{row.employeeEmail}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <p className="font-semibold text-white">{row.courseTitle}</p>
                    <p className="text-[10px] text-gray-500">{row.slot}</p>
                  </td>
                  <td className="px-3 py-3 text-gray-300">{row.assessment}</td>
                  <td className="px-3 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                        row.deliveryKind === "tutor-led"
                          ? "bg-violet-500/15 text-violet-200"
                          : "bg-sky-500/15 text-sky-200"
                      }`}
                    >
                      {row.deliveryKind === "tutor-led" ? "Tutor led" : "Self-paced"}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-semibold ring-1 ${selfPacedClass(row.selfPacedPhase)}`}
                    >
                      {row.selfPacedLabel}
                    </span>
                    <p className="mt-1 max-w-[180px] text-[10px] leading-snug text-gray-500">
                      {row.selfPacedDetail}
                    </p>
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${examStatusClass(row.status)}`}
                    >
                      {assignmentStatusLabel(row.status)}
                    </span>
                    {row.lockReason && row.status === "locked" ? (
                      <p className="mt-1 max-w-[220px] text-[10px] leading-snug text-gray-500">
                        {row.lockReason}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-3 py-3 font-mono text-xs text-amber-100">{row.marksLabel}</td>
                  <td className="px-3 py-3 text-right">
                    {row.unlocked ? (
                      <span className="inline-flex items-center gap-1 rounded-md border border-emerald-400/35 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold text-emerald-200">
                        Unlocked
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                        <Lock className="h-3.5 w-3.5" aria-hidden />
                        Locked
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/25 px-4 py-3">
        <p className="inline-flex items-center gap-2 text-xs text-gray-400">
          <Users className="h-3.5 w-3.5 text-amber-300" aria-hidden />
          Demo roster until employee API is connected — each row shows name, user ID, and email.
        </p>
        <Link
          href="/my-learning?tab=learning"
          className="text-xs font-semibold text-amber-200 hover:underline"
        >
          View team progress →
        </Link>
      </div>
    </section>
  );
}
