"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  BookOpen,
  CheckCircle2,
  Clock3,
  Compass,
  GraduationCap,
} from "lucide-react";
import { OrgTutorLedTeamRoster } from "@/components/OrgTutorLedTeamRoster";
import type { TutorLedExploreCard, TutorLedLiveHubRow } from "@/lib/tutor-led-live-hub-enrich";
import { liveTutorCourseHref } from "@/lib/tutor-led-routes";
import {
  buildOrganizationTeamTutorProgress,
  summarizeTeamTutorProgress,
} from "@/lib/organization-team-progress";

type Props = {
  enrollments: TutorLedLiveHubRow[];
  exploreCourses?: TutorLedExploreCard[];
  companySize?: string | null;
};

const surface = "rounded-xl border border-white/10 bg-black/30";

export function MyLearningOrganizationLiveHub({
  enrollments,
  exploreCourses = [],
  companySize,
}: Props) {
  const [courseFilter, setCourseFilter] = useState<"all" | "in-progress" | "completed" | "not-started">("all");

  const assignments = useMemo(
    () => buildOrganizationTeamTutorProgress(enrollments, exploreCourses, companySize),
    [enrollments, exploreCourses, companySize],
  );

  const summary = useMemo(() => summarizeTeamTutorProgress(assignments), [assignments]);

  const filtered = useMemo(() => {
    if (courseFilter === "all") return assignments;
    return assignments.filter((a) => {
      const avg =
        a.members.reduce((s, m) => s + m.progressPercent, 0) / Math.max(1, a.members.length);
      if (courseFilter === "completed") return avg >= 100;
      if (courseFilter === "not-started") return avg <= 0;
      return avg > 0 && avg < 100;
    });
  }, [assignments, courseFilter]);

  return (
    <section className="rounded-2xl border border-white/10 bg-[#0a0a0a] p-4 shadow-[0_0_24px_rgba(0,0,0,0.35)]">
      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <div>
          <h1 className="text-4xl font-bold">Team Tutor Led Programs</h1>
          <p className="mt-1 text-sm text-gray-300">
            All employees for each program live in <strong className="text-gray-200">one roster</strong> —
            everyone has their own Join live button inside the same session block.
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {[
            [BookOpen, summary.programs, "Team programs"],
            [CheckCircle2, summary.completedEnrollments, "Completed"],
            [Clock3, summary.inProgressEnrollments, "In progress"],
            [GraduationCap, summary.examsUnlocked, "Exams unlocked"],
          ].map(([Icon, value, label]) => {
            const StatIcon = Icon as typeof BookOpen;
            return (
              <article key={label as string} className={`p-3 ${surface}`}>
                <StatIcon size={14} className="text-amber-300" />
                <p className="mt-1 text-2xl font-bold">{value as number}</p>
                <p className="text-xs text-gray-400">{label as string}</p>
              </article>
            );
          })}
        </div>
      </div>

      <div className={`mt-4 p-3 ${surface}`}>
        <div className="mb-3 flex flex-wrap gap-2 text-xs">
          {(
            [
              ["all", "All Programs"],
              ["in-progress", "In Progress"],
              ["completed", "Completed"],
              ["not-started", "Not Started"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setCourseFilter(id)}
              className={`rounded-full px-3 py-1.5 ${
                courseFilter === id
                  ? "bg-amber-500/20 text-amber-100"
                  : "border border-white/10 bg-white/5 text-gray-300"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          {filtered.length === 0 ? (
            <p className="rounded-xl border border-dashed border-white/15 bg-black/20 p-6 text-center text-sm text-gray-400">
              No team tutor-led programs match this filter.
            </p>
          ) : (
            filtered.map((assignment) => (
              <OrgTutorLedTeamRoster key={assignment.programSlug} assignment={assignment} />
            ))
          )}
        </div>
      </div>

      {exploreCourses.length > 0 ? (
        <article className="mt-4 rounded-xl border border-amber-500/20 bg-black/30 p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="inline-flex items-center gap-2 text-lg font-bold">
              <Compass className="h-5 w-5 text-amber-300" />
              Explore for your team
            </h2>
            <Link href={liveTutorCourseHref()} className="text-xs font-semibold text-amber-200 hover:underline">
              View all programs →
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {exploreCourses.slice(0, 3).map((course) => (
              <Link
                key={course.slug}
                href={liveTutorCourseHref(course.slug)}
                className="rounded-xl border border-white/10 bg-black/25 p-3 transition hover:border-amber-500/30"
              >
                <p className="text-sm font-semibold text-white">{course.title}</p>
                <p className="mt-1 text-xs text-gray-500">
                  {course.trainingDays} days · {course.duration}
                </p>
              </Link>
            ))}
          </div>
        </article>
      ) : null}
    </section>
  );
}
