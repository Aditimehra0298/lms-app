"use client";

import Link from "next/link";
import { Lock } from "lucide-react";
import {
  assignmentStatusLabel,
  filterLearnerVisibleAssignments,
  type AssignmentRow,
  type AssignmentStatus,
} from "@/lib/my-learning-assignments";

function statusClass(status: AssignmentStatus): string {
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

type Props = {
  rows: AssignmentRow[];
};

export function MyLearningAssignmentsTab({ rows }: Props) {
  const visible = filterLearnerVisibleAssignments(rows);
  const pending = visible.filter((r) => r.status === "pending" || r.status === "failed").length;
  const passed = visible.filter((r) => r.status === "passed").length;

  return (
    <section className="rounded-2xl border border-white/10 bg-[#0a0a0a] p-4 shadow-[0_0_24px_rgba(0,0,0,0.35)]">
      <div className="grid gap-4 lg:grid-cols-[1.7fr_1fr]">
        <div>
          <h1 className="text-4xl font-bold">Assignments</h1>
          <p className="mt-1 text-sm text-gray-300">
            Module exams unlock after you complete lessons. Tutor-led final exams unlock after all
            training days.
          </p>
        </div>
        {pending > 0 ? (
          <div className="rounded-xl border border-amber-300/25 bg-linear-to-r from-amber-500/15 to-rose-500/10 p-4">
            <p className="text-sm font-semibold text-amber-100">{pending} exam(s) ready or need retake</p>
            <p className="mt-1 text-xs text-gray-300">Open unlocked exams from the table below.</p>
          </div>
        ) : null}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {[
          ["Total", String(visible.length)],
          ["Pending / retake", String(pending)],
          ["Passed", String(passed)],
        ].map(([label, value]) => (
          <article key={label} className="rounded-xl border border-white/10 bg-black/30 p-3">
            <p className="text-xs text-gray-400">{label}</p>
            <p className="mt-1 text-3xl font-bold">{value}</p>
          </article>
        ))}
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl border border-white/10 bg-black/30">
        {visible.length === 0 ? (
          <p className="p-8 text-center text-sm text-gray-400">
            No exams are available for your courses yet. Check back after you progress in your
            lessons or live sessions.
          </p>
        ) : (
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-white/10 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-3 py-3 font-semibold">Course</th>
                <th className="px-3 py-3 font-semibold">Assessment</th>
                <th className="px-3 py-3 font-semibold">Type</th>
                <th className="px-3 py-3 font-semibold">Status</th>
                <th className="px-3 py-3 font-semibold">Marks</th>
                <th className="px-3 py-3 text-right font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => (
                <tr key={row.id} className="border-b border-white/5 last:border-0">
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
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusClass(row.status)}`}
                    >
                      {assignmentStatusLabel(row.status)}
                    </span>
                    {row.lockReason && row.status === "locked" ? (
                      <p className="mt-1 max-w-[200px] text-[10px] leading-snug text-gray-500">
                        {row.lockReason}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-3 py-3 font-mono text-xs text-amber-100">{row.marksLabel}</td>
                  <td className="px-3 py-3 text-right">
                    {row.ready && row.unlocked ? (
                      <Link
                        href={row.href}
                        className="inline-flex rounded-md border border-emerald-400/40 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-100 hover:bg-emerald-500/20"
                      >
                        {row.status === "passed" ? "Review" : row.status === "failed" ? "Retake" : "Start exam"}
                      </Link>
                    ) : row.status === "locked" ? (
                      <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                        <Lock className="h-3.5 w-3.5" aria-hidden />
                        Locked
                      </span>
                    ) : (
                      <span className="text-xs text-gray-500">Not available</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
