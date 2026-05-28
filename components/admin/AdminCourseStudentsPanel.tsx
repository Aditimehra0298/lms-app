"use client";

import { Users } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { StoredCourseEnrollment } from "@/lib/enrollment-storage";
import AdminCourseTabShell, { AdminCourseSelectPrompt } from "@/components/admin/AdminCourseTabShell";

type Props = {
  courseTitle: string;
  workspaceCourseSlug: string | null;
  enrollments: StoredCourseEnrollment[];
  canEdit: boolean;
  onGoCourseInfo: () => void;
};

type MysqlStudentRow = {
  registrationId: number | null;
  learnerName: string | null;
  learnerEmail: string;
  phone: string | null;
  occupation: string | null;
  userRole: string | null;
  userType: string | null;
  enrollmentModel: "individual" | "organization";
  companyName: string | null;
  paymentPath: "company-pass" | "direct-payment";
  enrolledAt: string;
  completed: boolean;
  certificateStatus: "none" | "pending" | "ready" | "failed";
  certificateMode: "auto" | "manual-needed";
  certificateVisible: boolean;
  amountPaidLabel: string;
};

export default function AdminCourseStudentsPanel({
  courseTitle,
  workspaceCourseSlug,
  enrollments,
  canEdit,
  onGoCourseInfo,
}: Props) {
  const [dbRows, setDbRows] = useState<MysqlStudentRow[]>([]);
  const [loadingDb, setLoadingDb] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);
  const [rowBusyKey, setRowBusyKey] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const tableScrollRef = useRef<HTMLDivElement | null>(null);

  const loadStudents = useMemo(
    () => async () => {
      if (!workspaceCourseSlug) return;
      setLoadingDb(true);
      setDbError(null);
      try {
        const r = await fetch(`/api/admin/courses/${encodeURIComponent(workspaceCourseSlug)}/students`, {
          cache: "no-store",
        });
        const data = (await r.json()) as { ok?: boolean; students?: MysqlStudentRow[]; message?: string };
        if (!data?.ok) throw new Error(data?.message || "Students unavailable");
        setDbRows(Array.isArray(data.students) ? data.students : []);
      } catch (err: unknown) {
        setDbError(err instanceof Error ? err.message : "Students unavailable");
        setDbRows([]);
      } finally {
        setLoadingDb(false);
      }
    },
    [workspaceCourseSlug],
  );

  useEffect(() => {
    if (!workspaceCourseSlug) return;
    void loadStudents();
  }, [workspaceCourseSlug, loadStudents]);

  useEffect(() => {
    if (!tableScrollRef.current) return;
    tableScrollRef.current.scrollLeft = 0;
  }, [workspaceCourseSlug, dbRows.length, enrollments.length]);

  const displayRows = useMemo(() => {
    if (dbRows.length > 0) return dbRows;
    return enrollments.map((row) => ({
      registrationId: null,
      learnerName: row.learnerName?.trim() || null,
      learnerEmail: row.learnerEmail,
      phone: null,
      occupation: null,
      userRole: "learner",
      userType: null,
      enrollmentModel: "individual" as const,
      companyName: null,
      paymentPath: "direct-payment" as const,
      enrolledAt: row.enrolledAt,
      completed: false,
      certificateStatus: "none" as const,
      certificateMode: "auto" as const,
      certificateVisible: false,
      amountPaidLabel: "—",
    }));
  }, [dbRows, enrollments]);

  const runAction = async (
    row: MysqlStudentRow,
    action: "bypass-access" | "manual-certificate-pass",
  ) => {
    if (!workspaceCourseSlug) return;
    const key = `${row.learnerEmail}:${action}`;
    setRowBusyKey(key);
    setActionMsg(null);
    try {
      const res = await fetch(
        `/api/admin/courses/${encodeURIComponent(workspaceCourseSlug)}/students/actions`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ learnerEmail: row.learnerEmail, action }),
        },
      );
      const data = (await res.json()) as { ok?: boolean; message?: string };
      if (!data.ok) {
        setActionMsg(data.message ?? "Action failed");
      } else {
        setActionMsg(data.message ?? "Action completed");
        await loadStudents();
      }
    } catch {
      setActionMsg("Action failed");
    } finally {
      setRowBusyKey(null);
    }
  };

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
    >
      <div className="min-w-0 space-y-4">
      <div className="flex items-center justify-between rounded-xl border border-white/10 bg-[#0d1528] px-4 py-3">
        <span className="text-sm text-gray-300">Total enrolled</span>
        <span className="text-2xl font-bold tabular-nums text-white">{displayRows.length}</span>
      </div>
      {loadingDb ? <p className="text-xs text-gray-500">Loading MySQL student data…</p> : null}
      {dbError ? (
        <p className="text-xs text-amber-300">
          Showing local enrollments only. MySQL data unavailable: {dbError}
        </p>
      ) : null}
      {actionMsg ? <p className="text-xs text-emerald-300">{actionMsg}</p> : null}
      <div className="rounded-xl border border-cyan-400/25 bg-cyan-500/10 px-4 py-3">
        <p className="text-sm font-semibold text-cyan-100">Student table columns (auto-filled)</p>
        <p className="mt-1 text-xs text-cyan-200/85">
          Primary ID, profile fields, user type, organization/company, and pass/payment path are filled from MySQL
          user + purchase records.
        </p>
      </div>

      <div className="rounded-xl border border-white/10 bg-[#0d1528]">
        <div className="flex items-center justify-between border-b border-white/10 bg-black/20 px-3 py-2">
          <p className="text-[11px] text-gray-400">Student roster table</p>
          <p className="text-[11px] font-medium text-cyan-300">Scroll table ↔</p>
        </div>
        <div
          ref={tableScrollRef}
          className="w-full max-w-full overflow-x-auto overscroll-x-contain pb-2 [scrollbar-gutter:stable] touch-pan-x"
        >
          <table className="w-full min-w-[1350px] table-fixed text-left text-sm">
            <colgroup>
              <col className="w-12" />
              <col className="w-24" />
              <col className="w-40" />
              <col className="w-32" />
              <col className="w-56" />
              <col className="w-32" />
              <col className="w-24" />
              <col className="w-28" />
              <col className="w-28" />
              <col className="w-40" />
              <col className="w-32" />
              <col className="w-36" />
              <col className="w-24" />
              <col className="w-28" />
              <col className="w-28" />
              <col className="w-28" />
              <col className="w-32" />
              <col className="w-40" />
            </colgroup>
            <thead className="border-b border-white/10 bg-black/30 text-[11px] uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-3 py-3 font-medium">#</th>
                <th className="px-3 py-3 font-medium">Primary ID</th>
                <th className="px-3 py-3 font-medium">Name</th>
                <th className="px-3 py-3 font-medium">Phone</th>
                <th className="px-3 py-3 font-medium">Email</th>
                <th className="px-3 py-3 font-medium">Occupation</th>
                <th className="px-3 py-3 font-medium">Role</th>
                <th className="px-3 py-3 font-medium">User type</th>
                <th className="px-3 py-3 font-medium">Model</th>
                <th className="px-3 py-3 font-medium">Company</th>
                <th className="px-3 py-3 font-medium">Pass / payment</th>
                <th className="px-3 py-3 font-medium">Enrolled</th>
                <th className="px-3 py-3 font-medium">Completed</th>
                <th className="px-3 py-3 font-medium">Cert status</th>
                <th className="px-3 py-3 font-medium">Issue mode</th>
                <th className="px-3 py-3 font-medium">Cert access</th>
                <th className="px-3 py-3 font-medium">Amount</th>
                <th className="px-3 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {displayRows.length === 0 ? (
                <tr>
                  <td className="px-4 py-8 text-sm text-gray-500" colSpan={18}>
                    No entries yet for <span className="font-mono text-gray-400">{workspaceCourseSlug}</span>. Add
                    enrollments and this table will auto-fill.
                  </td>
                </tr>
              ) : (
                displayRows.map((row, i) => (
                  <tr key={`${row.learnerEmail}-${row.enrolledAt}-${i}`} className="text-gray-200">
                    <td className="px-4 py-3 text-xs text-gray-500">{i + 1}</td>
                    <td className="px-4 py-3 font-mono text-xs text-amber-200">
                      {row.registrationId != null ? row.registrationId : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className="block truncate" title={row.learnerName?.trim() || "—"}>
                        {row.learnerName?.trim() || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-300 whitespace-nowrap">{row.phone?.trim() || "—"}</td>
                    <td className="px-4 py-3 font-mono text-xs text-violet-200/90">
                      <span className="block truncate" title={row.learnerEmail}>
                        {row.learnerEmail}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-300">
                      <span className="block truncate" title={row.occupation?.trim() || "—"}>
                        {row.occupation?.trim() || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-300 whitespace-nowrap">{row.userRole?.trim() || "learner"}</td>
                    <td className="px-4 py-3 text-xs text-gray-300 whitespace-nowrap">{row.userType?.trim() || "individual"}</td>
                    <td className="px-4 py-3 text-xs">
                      <span
                        className={`rounded-full px-2 py-1 ${
                          row.enrollmentModel === "organization"
                            ? "bg-cyan-500/20 text-cyan-200"
                            : "bg-white/10 text-gray-300"
                        }`}
                      >
                        {row.enrollmentModel}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-300">
                      <span className="block truncate" title={row.companyName?.trim() || "—"}>
                        {row.companyName?.trim() || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <span
                        className={`rounded-full px-2 py-1 ${
                          row.paymentPath === "company-pass"
                            ? "bg-emerald-500/20 text-emerald-200"
                            : "bg-amber-500/20 text-amber-200"
                        }`}
                      >
                        {row.paymentPath === "company-pass" ? "Company pass" : "Direct payment"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">
                      {new Date(row.enrolledAt).toLocaleString(undefined, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <span
                        className={`rounded-full px-2 py-1 ${
                          row.completed ? "bg-emerald-500/20 text-emerald-200" : "bg-white/10 text-gray-300"
                        }`}
                      >
                        {row.completed ? "Completed" : "In progress"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <span
                        className={`rounded-full px-2 py-1 ${
                          row.certificateStatus === "ready"
                            ? "bg-emerald-500/20 text-emerald-200"
                            : row.certificateStatus === "failed"
                              ? "bg-rose-500/20 text-rose-200"
                              : row.certificateStatus === "pending"
                                ? "bg-amber-500/20 text-amber-200"
                                : "bg-white/10 text-gray-300"
                        }`}
                      >
                        {row.certificateStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <span
                        className={`rounded-full px-2 py-1 ${
                          row.certificateMode === "manual-needed"
                            ? "bg-rose-500/20 text-rose-200"
                            : "bg-violet-500/25 text-violet-200"
                        }`}
                      >
                        {row.certificateMode === "manual-needed" ? "Manual pass" : "Automation"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <span
                        className={`rounded-full px-2 py-1 ${
                          row.certificateVisible ? "bg-violet-500/25 text-violet-200" : "bg-white/10 text-gray-300"
                        }`}
                      >
                        {row.certificateVisible ? "Allowed" : "Blocked"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">{row.amountPaidLabel}</td>
                    <td className="px-4 py-3 text-xs">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => void runAction(row, "bypass-access")}
                          disabled={rowBusyKey === `${row.learnerEmail}:bypass-access`}
                          className="rounded bg-emerald-600 px-2 py-1 font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                        >
                          Bypass
                        </button>
                        <button
                          type="button"
                          onClick={() => void runAction(row, "manual-certificate-pass")}
                          disabled={rowBusyKey === `${row.learnerEmail}:manual-certificate-pass`}
                          className="rounded bg-green-600 px-2 py-1 font-semibold text-white hover:bg-green-500 disabled:opacity-50"
                        >
                          Manual pass
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      </div>
    </AdminCourseTabShell>
  );
}
