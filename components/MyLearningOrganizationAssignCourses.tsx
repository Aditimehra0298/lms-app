"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, BookOpen, CheckCircle2, Users } from "lucide-react";
import type { ManagedCourse } from "@/lib/content-schema";
import {
  formatOrgEmployeeUserId,
  readOrgEmployeeRoster,
  type OrgEmployeeRosterEntry,
} from "@/lib/organization-employee-roster";
import {
  countUniqueAssignedEmployees,
  employeeCourseAssignmentCount,
  ORG_COURSE_ASSIGNMENTS_EVENT,
  planTypeLabel,
  readOrgCourseAssignments,
  seedOrgPurchasedCoursesFromCatalog,
  setOrgCourseAssignees,
  type OrgPurchasedCourse,
} from "@/lib/organization-course-assignments-store";
import { ORG_EMPLOYEE_ROSTER_EVENT } from "@/lib/organization-employee-roster";
import {
  getActiveOrgPremiumPlan,
  orgPremiumPlanLearningRule,
  ORG_PREMIUM_PLAN_EVENT,
} from "@/lib/organization-premium-plans";

type Props = {
  courses: ManagedCourse[];
  companySize?: string | null;
  seatsTotal?: number;
};

export function MyLearningOrganizationAssignCourses({
  courses,
  companySize,
  seatsTotal: seatsTotalProp,
}: Props) {
  const [activePlan, setActivePlan] = useState(() => getActiveOrgPremiumPlan());
  const [purchased, setPurchased] = useState<OrgPurchasedCourse[]>([]);
  const [assignments, setAssignments] = useState<Record<string, string[]>>({});
  const [employees, setEmployees] = useState<OrgEmployeeRosterEntry[]>([]);
  const [activeCourse, setActiveCourse] = useState<string>("");
  const [saved, setSaved] = useState(false);

  const seatTotal = activePlan.seatLimit;

  const refresh = useCallback(() => {
    const plan = getActiveOrgPremiumPlan();
    const total = plan.seatLimit;
    setActivePlan(plan);
    setPurchased(seedOrgPurchasedCoursesFromCatalog(courses));
    setAssignments(readOrgCourseAssignments());
    setEmployees(readOrgEmployeeRoster(total));
  }, [courses]);

  useEffect(() => {
    refresh();
    const onUpdate = () => refresh();
    window.addEventListener(ORG_COURSE_ASSIGNMENTS_EVENT, onUpdate);
    window.addEventListener(ORG_EMPLOYEE_ROSTER_EVENT, onUpdate);
    window.addEventListener(ORG_PREMIUM_PLAN_EVENT, onUpdate);
    return () => {
      window.removeEventListener(ORG_COURSE_ASSIGNMENTS_EVENT, onUpdate);
      window.removeEventListener(ORG_EMPLOYEE_ROSTER_EVENT, onUpdate);
      window.removeEventListener(ORG_PREMIUM_PLAN_EVENT, onUpdate);
    };
  }, [refresh]);

  useEffect(() => {
    if (!activeCourse && purchased[0]?.slug) setActiveCourse(purchased[0].slug);
  }, [purchased, activeCourse]);

  const invitedEmployees = useMemo(
    () => employees.filter((e) => e.invited),
    [employees],
  );

  const selectedIds = assignments[activeCourse] ?? [];
  const uniqueLearners = countUniqueAssignedEmployees(assignments);

  const toggleEmployee = (employeeId: string) => {
    const set = new Set(selectedIds);
    if (set.has(employeeId)) set.delete(employeeId);
    else set.add(employeeId);
    setAssignments((prev) => ({ ...prev, [activeCourse]: [...set] }));
  };

  const saveAssignments = () => {
    setOrgCourseAssignees(activeCourse, selectedIds);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2000);
  };

  const activePurchased = purchased.find((c) => c.slug === activeCourse);

  return (
    <section className="space-y-5">
      <div>
        <Link
          href="/my-learning?tab=dashboard"
          className="mb-3 inline-flex items-center gap-1.5 text-xs font-semibold text-amber-300 hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          Back to organisation dashboard
        </Link>
        <h1 className="text-3xl font-bold text-white md:text-4xl">Assign Courses</h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-400">
          <strong className="text-amber-200">{activePlan.name}</strong> — full catalog access.{" "}
          {orgPremiumPlanLearningRule(activePlan)} Pick a course, then check which invited employees
          should take it.
        </p>
      </div>

      <article className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-500/25 bg-amber-500/5 px-4 py-3 text-xs">
        <span className="text-zinc-400">
          Invited learners:{" "}
          <strong className="text-white">
            {invitedEmployees.length}/{seatTotal}
          </strong>
        </span>
        <span className="text-zinc-400">
          Assigned to at least one course:{" "}
          <strong className="text-white">{uniqueLearners}</strong>
        </span>
        <Link href="/my-learning?tab=subscriptions" className="font-semibold text-amber-200 hover:underline">
          Change plan / seats
        </Link>
      </article>

      <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
        <article className="rounded-xl border border-white/10 bg-black/30 p-4">
          <h2 className="inline-flex items-center gap-2 text-lg font-bold text-white">
            <BookOpen className="h-5 w-5 text-amber-300" aria-hidden />
            Your organisation courses
          </h2>
          <p className="mt-1 text-xs text-zinc-500">
            Buy more from{" "}
            <Link href="/my-learning?tab=org-courses" className="text-amber-200 hover:underline">
              Team Courses
            </Link>{" "}
            or{" "}
            <Link href="/my-learning?tab=subscriptions" className="text-amber-200 hover:underline">
              Team Plans
            </Link>
            .
          </p>
          <ul className="mt-4 space-y-2">
            {purchased.map((course) => {
              const count = (assignments[course.slug] ?? []).length;
              const active = activeCourse === course.slug;
              return (
                <li key={course.slug}>
                  <button
                    type="button"
                    onClick={() => setActiveCourse(course.slug)}
                    className={`w-full rounded-xl border p-3 text-left transition ${
                      active
                        ? "border-amber-500/40 bg-amber-500/10"
                        : "border-white/10 bg-black/20 hover:border-white/20"
                    }`}
                  >
                    <p className="text-sm font-semibold text-white">{course.title}</p>
                    <p className="mt-1 text-[10px] text-zinc-500">
                      {planTypeLabel(course.planType)}
                      {course.category ? ` · ${course.category}` : ""}
                    </p>
                    <p className="mt-1 text-[10px] font-medium text-amber-200/90">
                      {count} employee{count === 1 ? "" : "s"} assigned
                    </p>
                  </button>
                </li>
              );
            })}
          </ul>
        </article>

        <article className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-4">
          <h2 className="inline-flex items-center gap-2 text-lg font-bold text-white">
            <Users className="h-5 w-5 text-amber-300" aria-hidden />
            Assign employees
          </h2>
          {activePurchased ? (
            <p className="mt-1 text-xs text-zinc-400">
              Selecting for: <span className="text-amber-200">{activePurchased.title}</span>
            </p>
          ) : null}

          {invitedEmployees.length === 0 ? (
            <div className="mt-4 rounded-xl border border-dashed border-white/15 p-6 text-center text-sm text-zinc-500">
              No employees invited yet.{" "}
              <Link href="/my-learning?tab=invite-employees" className="text-amber-200 hover:underline">
                Invite employees
              </Link>{" "}
              first.
            </div>
          ) : (
            <ul className="mt-4 max-h-[360px] space-y-2 overflow-y-auto pr-1">
              {invitedEmployees.map((emp) => {
                const checked = selectedIds.includes(emp.id);
                const courseCount = employeeCourseAssignmentCount(assignments, emp.id);
                return (
                  <li key={emp.id}>
                    <label
                      className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 ${
                        checked
                          ? "border-emerald-500/35 bg-emerald-500/10"
                          : "border-white/10 bg-black/30"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleEmployee(emp.id)}
                        className="h-4 w-4 rounded border-white/20"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium text-white">{emp.name}</span>
                        <span className="block text-[10px] text-zinc-500">
                          {formatOrgEmployeeUserId(emp.id)} · {emp.position || "—"} · {emp.email}
                        </span>
                        {courseCount > 0 ? (
                          <span className="mt-0.5 block text-[10px] text-amber-200/80">
                            {courseCount} course{courseCount === 1 ? "" : "s"} assigned total
                          </span>
                        ) : null}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={saveAssignments}
              disabled={!activeCourse || invitedEmployees.length === 0}
              className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-bold text-black hover:bg-amber-400 disabled:opacity-50"
            >
              <CheckCircle2 className="h-4 w-4" aria-hidden />
              Save assignments
            </button>
            {saved ? (
              <span className="self-center text-xs text-emerald-300">Assignments saved</span>
            ) : null}
            <Link
              href="/my-learning?tab=org-report"
              className="inline-flex items-center rounded-lg border border-white/15 px-4 py-2.5 text-sm font-semibold text-zinc-200 hover:border-amber-400/40"
            >
              Download report
            </Link>
          </div>
        </article>
      </div>
    </section>
  );
}
