"use client";

import { Users } from "lucide-react";
import type { StoredCourseEnrollment } from "@/lib/enrollment-storage";
import AdminCourseTabShell, {
  AdminCourseSelectPrompt,
  AdminPanelSection,
} from "@/components/admin/AdminCourseTabShell";

type Props = {
  courseTitle: string;
  workspaceCourseSlug: string | null;
  enrollments: StoredCourseEnrollment[];
  canEdit: boolean;
  onGoCourseInfo: () => void;
};

export default function AdminCourseStudentsPanel({
  courseTitle,
  workspaceCourseSlug,
  enrollments,
  canEdit,
  onGoCourseInfo,
}: Props) {
  if (!canEdit) {
    return <AdminCourseSelectPrompt tabName="Students" onGoCourseInfo={onGoCourseInfo} />;
  }

  if (!workspaceCourseSlug) {
    return (
      <div className="rounded-xl border border-white/10 bg-[#0b1224] px-4 py-8 text-center">
        <Users className="mx-auto h-10 w-10 text-violet-400/80" aria-hidden />
        <p className="mt-3 text-sm font-medium text-gray-200">Course URL slug required</p>
        <p className="mx-auto mt-2 max-w-md text-xs text-gray-500">
          Add a <strong className="text-gray-400">slug</strong> on the Course tab so checkout enrollments match this course.
        </p>
        <button
          type="button"
          onClick={onGoCourseInfo}
          className="mt-4 rounded-lg border border-white/15 bg-black/30 px-4 py-2 text-xs font-semibold text-gray-200 hover:bg-white/5"
        >
          Edit Course
        </button>
      </div>
    );
  }

  return (
    <AdminCourseTabShell
      courseTitle={courseTitle}
      tabTitle="Enrolled students"
      description="Learners who bought this course while signed in. Emails come from checkout — use the same slug as on the Course tab."
      icon={<Users className="h-6 w-6 text-violet-300" aria-hidden />}
      aside={
        <AdminPanelSection title="How enrollments work">
          <ol className="list-decimal space-y-2 pl-4 text-[11px] leading-relaxed text-gray-400">
            <li>Learner signs in on /account</li>
            <li>Completes checkout for this course slug</li>
            <li>Record appears here (browser storage in demo)</li>
          </ol>
          <p className="mt-3 text-[10px] text-gray-600">
            Production: connect to <code className="text-violet-300">LmsPurchase</code> in MySQL for all devices.
          </p>
        </AdminPanelSection>
      }
    >
      <div className="flex items-center justify-between rounded-xl border border-white/10 bg-[#0d1528] px-4 py-3">
        <span className="text-sm text-gray-300">Total enrolled</span>
        <span className="text-2xl font-bold tabular-nums text-white">{enrollments.length}</span>
      </div>

      <div className="overflow-hidden rounded-xl border border-white/10 bg-[#0d1528]">
        {enrollments.length === 0 ? (
          <div className="px-4 py-12 text-center text-sm text-gray-500">
            No enrollments for <span className="font-mono text-gray-400">{workspaceCourseSlug}</span> yet.
            <p className="mx-auto mt-2 max-w-lg text-xs text-gray-600">
              Run a test purchase from checkout while logged in — the learner email is stored with the course slug.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead className="border-b border-white/10 bg-black/30 text-[11px] uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3 font-medium">#</th>
                  <th className="px-4 py-3 font-medium">Learner</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Enrolled</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {enrollments.map((row, i) => (
                  <tr key={row.learnerEmail} className="text-gray-200">
                    <td className="px-4 py-3 text-xs text-gray-500">{i + 1}</td>
                    <td className="px-4 py-3">{row.learnerName?.trim() || "—"}</td>
                    <td className="px-4 py-3 font-mono text-xs text-violet-200/90">{row.learnerEmail}</td>
                    <td className="px-4 py-3 text-xs text-gray-400">
                      {new Date(row.enrolledAt).toLocaleString(undefined, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminCourseTabShell>
  );
}
