"use client";

import { useMemo, useState } from "react";
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
  const [courseSlug, setCourseSlug] = useState("all");
  const [openOnly, setOpenOnly] = useState(false);
  const courseOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const row of visible) {
      if (!map.has(row.courseSlug)) map.set(row.courseSlug, row.courseTitle);
    }
    return [...map.entries()].map(([slug, title]) => ({ slug, title }));
  }, [visible]);
  const filtered = useMemo(() => {
    const byCourse =
      courseSlug === "all" ? visible : visible.filter((row) => row.courseSlug === courseSlug);
    const openedFirst = [...byCourse].sort((a, b) => {
      const aOpen = a.ready && a.unlocked ? 1 : 0;
      const bOpen = b.ready && b.unlocked ? 1 : 0;
      return bOpen - aOpen;
    });
    return openOnly ? openedFirst.filter((row) => row.ready && row.unlocked) : openedFirst;
  }, [visible, courseSlug, openOnly]);
  const pending = filtered.filter((r) => r.status === "pending" || r.status === "failed").length;
  const passed = filtered.filter((r) => r.status === "passed").length;
  const opened = filtered.filter((r) => r.ready && r.unlocked && r.status !== "passed").length;

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

      {courseOptions.length > 1 ? (
        <div className="mt-4 flex flex-wrap items-end gap-2">
          <label className="min-w-[240px] flex-1 text-xs text-gray-400">
            Course
            <select
              value={courseSlug}
              onChange={(e) => setCourseSlug(e.target.value)}
              className="mt-1 w-full rounded-md border border-white/15 bg-black/50 px-2.5 py-2 text-sm text-white outline-none focus:border-emerald-400/40"
            >
              <option value="all">All courses</option>
              {courseOptions.map((option) => (
                <option key={option.slug} value={option.slug}>
                  {option.title}
                </option>
              ))}
            </select>
          </label>
          <label className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-black/40 px-3 py-2 text-xs text-gray-300">
            <input
              type="checkbox"
              checked={openOnly}
              onChange={(e) => setOpenOnly(e.target.checked)}
              className="rounded border-white/20 bg-black/40 text-emerald-400"
            />
            Opened exams only
          </label>
        </div>
      ) : null}

      <p className="mt-3 text-xs text-emerald-200/80">
        {opened === 0
          ? "No exams are open for this selection yet."
          : `${opened} exam${opened === 1 ? "" : "s"} open for this selection`}
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {[
          ["Total", String(filtered.length)],
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
        {filtered.length === 0 ? (
          <p className="p-8 text-center text-sm text-gray-400">
            {visible.length === 0
              ? "No exams are available for your courses yet. Check back after you progress in your lessons or live sessions."
              : "No matching exams for this course filter."}
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
              {filtered.map((row) => (
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
