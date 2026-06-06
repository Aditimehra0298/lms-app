"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { PurchasedCourseRow } from "@/lib/learner-course-progress";
import { liveTutorCourseHref, tutorLedLearnerLiveJoinHref } from "@/lib/tutor-led-routes";
import { TutorLedLearningToolsPanel } from "@/components/TutorLedLearningToolsPanel";
import {
  BookOpen,
  CalendarDays,
  CheckCircle2,
  CircleDot,
  Clock3,
  ListChecks,
  Play,
  Video,
} from "lucide-react";

export type LiveEnrollmentRow = PurchasedCourseRow & { slug: string };

function CoursePoster({ image, title }: { image?: string; title: string }) {
  if (image?.trim()) {
    return (
      <div className="relative h-20 w-28 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-black/30">
        <Image src={image.trim()} alt={title} fill className="object-cover" sizes="112px" />
      </div>
    );
  }
  return (
    <div className="flex h-20 w-28 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-black/30 px-1 text-center text-[10px] leading-tight text-gray-500">
      No image
    </div>
  );
}

function courseRowKey(c: { title: string; slug?: string }) {
  return (c.slug?.trim() || c.title.trim()).toLowerCase();
}

export function MyLearningLiveHub({ enrollments }: { enrollments: LiveEnrollmentRow[] }) {
  const [courseFilter, setCourseFilter] = useState<"all" | "in-progress" | "completed" | "not-started">("all");
  const [courseSort, setCourseSort] = useState<"recent" | "title">("recent");

  const totalEnrolled = enrollments.length;
  const totalCompleted = enrollments.filter(
    (c) =>
      c.status.toLowerCase() === "completed" ||
      (Number.isFinite(c.modules) && c.modules > 0 && c.completed >= c.modules),
  ).length;
  const totalNotStarted = enrollments.filter((c) => c.status.toLowerCase().includes("not started")).length;
  const totalInProgress = Math.max(0, totalEnrolled - totalCompleted - totalNotStarted);

  const filteredCourses = useMemo(() => {
    if (courseFilter === "all") return enrollments;
    if (courseFilter === "completed") {
      return enrollments.filter((c) => c.status.toLowerCase() === "completed");
    }
    if (courseFilter === "not-started") {
      return enrollments.filter((c) => c.status.toLowerCase().includes("not started"));
    }
    return enrollments.filter((c) => c.status.toLowerCase() === "in progress");
  }, [enrollments, courseFilter]);

  const sortedCourses = useMemo(() => {
    const list = [...filteredCourses];
    if (courseSort === "title") {
      list.sort((a, b) => a.title.localeCompare(b.title));
    }
    return list;
  }, [filteredCourses, courseSort]);

  const primarySlug = enrollments[0]?.slug;

  return (
    <section className="rounded-2xl border border-white/10 bg-[#0a0a0a] p-4 shadow-[0_0_24px_rgba(0,0,0,0.35)]">
      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <div>
          <h1 className="text-4xl font-bold">Tutor Led Programs</h1>
          <p className="mt-1 text-sm text-gray-300">
            Join live Zoom sessions, watch recordings, and download course resources from your program hub.
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {[
            [BookOpen, String(totalEnrolled), "Enrolled Programs", "violet"],
            [CheckCircle2, String(totalCompleted), "Completed", "green"],
            [Clock3, String(totalInProgress), "In Progress", "amber"],
            [CircleDot, String(totalNotStarted), "Not Started", "rose"],
          ].map(([Icon, value, label, tone]) => (
            <article key={label as string} className="rounded-xl border border-white/10 bg-black/30 p-3">
              <p className="inline-flex items-center gap-2 text-sm">
                <Icon
                  size={14}
                  className={
                    tone === "green"
                      ? "text-emerald-300"
                      : tone === "amber"
                        ? "text-amber-300"
                        : tone === "rose"
                          ? "text-rose-300"
                          : "text-amber-300"
                  }
                />
                <span className="text-2xl font-bold">{value as string}</span>
              </p>
              <p className="text-xs text-gray-400">{label as string}</p>
            </article>
          ))}
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-white/10 bg-black/30 p-3">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex gap-2 text-xs">
            {(
              [
                ["all", "All Programs"],
                ["in-progress", "In Progress"],
                ["completed", "Completed"],
                ["not-started", "Not Started"],
              ] as const
            ).map(([id, filter]) => (
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
                {filter}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setCourseSort((s) => (s === "recent" ? "title" : "recent"))}
            className="rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-gray-300 hover:border-amber-400/30 hover:text-amber-100"
          >
            Sort by: {courseSort === "recent" ? "Recent Activity" : "Program Title"}
          </button>
        </div>

        <div className="space-y-2">
          {sortedCourses.length === 0 ? (
            <p className="rounded-xl border border-dashed border-white/15 bg-black/20 p-6 text-center text-sm text-gray-400">
              {enrollments.length === 0
                ? "You have not enrolled in any tutor-led programs yet. Register for live training to join Zoom sessions from here."
                : "No programs match this filter."}
            </p>
          ) : (
            sortedCourses.map((course) => {
              const safeModules = Math.max(1, course.modules);
              const percentage = Math.round((course.completed / safeModules) * 100);
              const hubHref = `/my-learning/course/${encodeURIComponent(course.slug)}`;

              return (
                <article
                  key={courseRowKey(course)}
                  className="grid gap-3 rounded-xl border border-white/10 bg-black/20 p-3 xl:grid-cols-[320px_1fr_150px]"
                >
                  <div className="flex gap-3">
                    <CoursePoster image={course.image} title={course.title} />
                    <div>
                      <p className="text-lg font-semibold">{course.title}</p>
                      <p className="mt-1 text-xs text-gray-400">
                        {safeModules} Sessions • {course.duration}
                      </p>
                      <p className="mt-1 inline-flex items-center gap-1 text-[11px] text-sky-300/90">
                        <Video className="h-3 w-3" aria-hidden />
                        Live on Zoom
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-gray-400">Session Progress</p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {Array.from({ length: safeModules }).map((_, idx) => (
                        <span
                          key={`${course.slug}-${idx}`}
                          className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[10px] ${
                            idx < course.completed
                              ? "bg-emerald-500/30 text-emerald-200"
                              : "border border-white/15 text-gray-400"
                          }`}
                        >
                          {idx + 1}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col items-end justify-between">
                    <div className="text-right">
                      <p className="text-4xl font-bold">{percentage}%</p>
                      <p className="text-xs text-gray-400">
                        {course.completed} / {safeModules} Sessions
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[11px] ${
                          course.status === "Completed"
                            ? "bg-emerald-500/20 text-emerald-200"
                            : course.status === "Not Started"
                              ? "bg-rose-500/20 text-rose-200"
                              : "bg-amber-500/20 text-amber-200"
                        }`}
                      >
                        {course.status}
                      </span>
                      <div className="flex flex-wrap justify-end gap-1">
                        <Link
                          href={tutorLedLearnerLiveJoinHref(course.slug)}
                          className="inline-flex items-center gap-1 rounded-md bg-amber-500 px-2.5 py-1 text-xs font-semibold text-black"
                        >
                          <Play className="h-3 w-3 fill-black" aria-hidden />
                          Join live
                        </Link>
                        <Link
                          href={hubHref}
                          className="rounded-md border border-white/15 px-2.5 py-1 text-xs text-amber-200"
                        >
                          Program hub
                        </Link>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </div>

      {enrollments.length === 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href={liveTutorCourseHref()}
            className="rounded-md bg-amber-500 px-4 py-2 text-sm font-semibold text-black"
          >
            Browse tutor-led programs
          </Link>
          <Link
            href="/courses"
            className="rounded-md border border-white/20 bg-white/5 px-4 py-2 text-sm text-gray-200"
          >
            View all courses
          </Link>
        </div>
      ) : null}

      <article className="mt-4 rounded-xl border border-white/10 bg-black/30 p-3">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="inline-flex items-center gap-2 text-lg font-bold text-white">
            <ListChecks size={18} className="text-amber-300" />
            Course resources &amp; tools
          </h2>
          <Link
            href="/my-learning/calendar"
            className="inline-flex items-center gap-1 text-xs text-amber-200/90 underline-offset-2 hover:underline"
          >
            <CalendarDays className="h-3.5 w-3.5" aria-hidden />
            View calendar
          </Link>
        </div>
        <TutorLedLearningToolsPanel programSlug={primarySlug} compact />
        <ul className="mt-3 space-y-1.5 text-xs text-gray-400">
          <li>Join Zoom 5–10 minutes before each live session.</li>
          <li>Recordings and pad notes appear in your program hub after class.</li>
        </ul>
      </article>
    </section>
  );
}
