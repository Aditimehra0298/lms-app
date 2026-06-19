"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Download, FileSpreadsheet } from "lucide-react";
import type { ManagedCourse } from "@/lib/content-schema";
import {
  formatOrgEmployeeUserId,
  readOrgEmployeeRoster,
  rosterSeatTotal,
} from "@/lib/organization-employee-roster";
import {
  buildOrgAssignmentReportRows,
  downloadOrgAssignmentReportCsv,
  ORG_COURSE_ASSIGNMENTS_EVENT,
  readOrgCourseAssignments,
  seedOrgPurchasedCoursesFromCatalog,
} from "@/lib/organization-course-assignments-store";
import { ORG_EMPLOYEE_ROSTER_EVENT } from "@/lib/organization-employee-roster";
import { getActiveOrgPremiumPlan, ORG_PREMIUM_PLAN_EVENT } from "@/lib/organization-premium-plans";

type Props = {
  companyName?: string | null;
  companySize?: string | null;
  courses: ManagedCourse[];
  seatsTotal?: number;
};

export function MyLearningOrganizationTeamReport({
  companyName,
  companySize,
  courses,
  seatsTotal: seatsTotalProp,
}: Props) {
  const seatTotal = seatsTotalProp ?? rosterSeatTotal(companySize);
  const displayCompany = companyName?.trim() || "Organisation";
  const [tick, setTick] = useState(0);
  const [activePlan, setActivePlan] = useState(() => getActiveOrgPremiumPlan());

  const refresh = useCallback(() => {
    setTick((t) => t + 1);
    setActivePlan(getActiveOrgPremiumPlan());
  }, []);

  useEffect(() => {
    window.addEventListener(ORG_COURSE_ASSIGNMENTS_EVENT, refresh);
    window.addEventListener(ORG_EMPLOYEE_ROSTER_EVENT, refresh);
    window.addEventListener(ORG_PREMIUM_PLAN_EVENT, refresh);
    return () => {
      window.removeEventListener(ORG_COURSE_ASSIGNMENTS_EVENT, refresh);
      window.removeEventListener(ORG_EMPLOYEE_ROSTER_EVENT, refresh);
      window.removeEventListener(ORG_PREMIUM_PLAN_EVENT, refresh);
    };
  }, [refresh]);

  const reportRows = useMemo(() => {
    void tick;
    const purchased = seedOrgPurchasedCoursesFromCatalog(courses);
    const assignments = readOrgCourseAssignments();
    const roster = readOrgEmployeeRoster(seatTotal).filter((e) => e.invited);
    return buildOrgAssignmentReportRows({
      purchased,
      assignments,
      employees: roster.map((e) => ({
        id: e.id,
        name: e.name,
        email: e.email,
        position: e.position,
        userId: formatOrgEmployeeUserId(e.id),
      })),
    });
  }, [tick, courses, seatTotal]);

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/my-learning?tab=dashboard"
            className="mb-3 inline-flex items-center gap-1.5 text-xs font-semibold text-amber-300 hover:underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
            Back to organisation dashboard
          </Link>
          <h1 className="text-3xl font-bold text-white md:text-4xl">Team Assignment Report</h1>
          <p className="mt-2 max-w-2xl text-sm text-zinc-400">
            {activePlan.name} — up to {seatTotal} learners, any course. Export who is assigned to
            which program (employees may appear on multiple rows). Update from{" "}
            <Link href="/my-learning?tab=assign-courses" className="text-amber-200 hover:underline">
              Assign Courses
            </Link>
            .
          </p>
        </div>
        <button
          type="button"
          onClick={() => downloadOrgAssignmentReportCsv(reportRows, displayCompany)}
          disabled={reportRows.length === 0}
          className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-5 py-3 text-sm font-bold text-black hover:bg-amber-400 disabled:opacity-50"
        >
          <Download className="h-4 w-4" aria-hidden />
          Download CSV
        </button>
      </div>

      <article className="rounded-xl border border-white/10 bg-black/30 p-4">
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 className="inline-flex items-center gap-2 text-lg font-bold text-white">
            <FileSpreadsheet className="h-5 w-5 text-emerald-300" aria-hidden />
            {displayCompany} — course assignments
          </h2>
          <span className="text-xs text-zinc-500">{reportRows.length} rows</span>
        </div>

        {reportRows.length === 0 ? (
          <p className="rounded-xl border border-dashed border-white/15 py-10 text-center text-sm text-zinc-500">
            No assignments yet.{" "}
            <Link href="/my-learning?tab=assign-courses" className="text-amber-200 hover:underline">
              Assign courses to employees
            </Link>{" "}
            to generate this report.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-white/10 text-xs uppercase tracking-wide text-zinc-500">
                <tr>
                  <th className="px-3 py-2 font-semibold">Employee</th>
                  <th className="px-3 py-2 font-semibold">User ID</th>
                  <th className="px-3 py-2 font-semibold">Email</th>
                  <th className="px-3 py-2 font-semibold">Position</th>
                  <th className="px-3 py-2 font-semibold">Course</th>
                  <th className="px-3 py-2 font-semibold">Plan</th>
                </tr>
              </thead>
              <tbody>
                {reportRows.map((row, i) => (
                  <tr key={`${row.employeeId}-${row.courseSlug}-${i}`} className="border-b border-white/5">
                    <td className="px-3 py-2.5 font-medium text-white">{row.employeeName}</td>
                    <td className="px-3 py-2.5 font-mono text-xs text-amber-200/90">{row.employeeId}</td>
                    <td className="px-3 py-2.5 text-xs text-zinc-400">{row.email}</td>
                    <td className="px-3 py-2.5 text-xs text-zinc-400">{row.position}</td>
                    <td className="px-3 py-2.5 text-zinc-300">{row.courseTitle}</td>
                    <td className="px-3 py-2.5 text-xs text-zinc-500">{row.planType}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </article>
    </section>
  );
}
