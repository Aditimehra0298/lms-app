"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { TutorLedExploreCard, TutorLedLiveHubRow } from "@/lib/tutor-led-live-hub-enrich";
import { liveTutorCourseHref, tutorLedLearnerLiveJoinHref } from "@/lib/tutor-led-routes";
import {
  ArrowRight,
  BookOpen,
  Calendar,
  CheckCircle2,
  CircleDot,
  Clock3,
  Compass,
  GraduationCap,
  IndianRupee,
  Lock,
  Play,
  Video,
} from "lucide-react";

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

function courseRowKey(c: { title: string; slug: string }) {
  return (c.slug?.trim() || c.title.trim()).toLowerCase();
}

function dayDotClass(dayIndex: number, completedDays: number, trainingDays: number): string {
  if (dayIndex < completedDays) {
    return "bg-[#4CAF50]/35 text-[#66BB6A] ring-1 ring-[#4CAF50]/50";
  }
  if (dayIndex === completedDays && completedDays < trainingDays) {
    return "border-2 border-[#FFC107] bg-[#FFC107]/15 text-[#FFC107] ring-2 ring-[#FFC107]/30";
  }
  return "border border-white/15 text-gray-500";
}

type Props = {
  enrollments: TutorLedLiveHubRow[];
  exploreCourses?: TutorLedExploreCard[];
};

export function MyLearningLiveHub({ enrollments, exploreCourses = [] }: Props) {
  const [courseFilter, setCourseFilter] = useState<"all" | "in-progress" | "completed" | "not-started">("all");
  const [courseSort, setCourseSort] = useState<"recent" | "title">("recent");

  const totalEnrolled = enrollments.length;
  const totalCompleted = enrollments.filter((c) => c.status.toLowerCase() === "completed").length;
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

  const enrolledSlugs = useMemo(
    () => new Set(enrollments.map((c) => c.slug.trim().toLowerCase())),
    [enrollments],
  );

  return (
    <section className="rounded-2xl border border-white/10 bg-[#0a0a0a] p-4 shadow-[0_0_24px_rgba(0,0,0,0.35)]">
      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <div>
          <h1 className="text-4xl font-bold">Tutor Led Programs</h1>
          <p className="mt-1 text-sm text-gray-300">
            All your live programs — training days, Zoom sessions, recordings, and final exam status.
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
              const hubHref = `/my-learning/course/${encodeURIComponent(course.slug)}`;
              const examHref = `/my-learning/course/${encodeURIComponent(course.slug)}/exam?module=final`;

              return (
                <article
                  key={courseRowKey(course)}
                  className="grid gap-3 rounded-xl border border-white/10 bg-black/20 p-3 xl:grid-cols-[minmax(0,300px)_1fr_minmax(0,170px)]"
                >
                  <div className="flex gap-3">
                    <CoursePoster image={course.image} title={course.title} />
                    <div className="min-w-0">
                      <p className="text-lg font-semibold leading-snug">{course.title}</p>
                      <p className="mt-1 text-xs text-gray-400">
                        {course.trainingDays} training day{course.trainingDays === 1 ? "" : "s"} •{" "}
                        {course.duration}
                      </p>
                      <p className="mt-1 inline-flex items-center gap-1 text-[11px] text-sky-300/90">
                        <Video className="h-3 w-3 shrink-0" aria-hidden />
                        Live on Zoom
                      </p>
                      {course.examUnlocked ? (
                        <Link
                          href={examHref}
                          className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-[#FFC107]/55 bg-[#FFC107]/15 px-2.5 py-1 text-[10px] font-bold text-[#FFC107] shadow-[0_0_12px_rgba(255,193,7,0.25)] transition hover:bg-[#FFC107]/25"
                        >
                          <GraduationCap className="h-3.5 w-3.5" aria-hidden />
                          Final exam active
                        </Link>
                      ) : (
                        <span
                          className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] text-zinc-500"
                          title="Attend live sessions to unlock the final exam"
                        >
                          <Lock className="h-3 w-3" aria-hidden />
                          Exam locked
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="min-w-0">
                    <p className="text-xs font-medium text-gray-400">
                      Training days{" "}
                      <span className="text-zinc-500">
                        ({course.completedDays}/{course.trainingDays} complete)
                      </span>
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {Array.from({ length: course.trainingDays }).map((_, idx) => (
                        <span
                          key={`${course.slug}-day-${idx}`}
                          title={
                            idx < course.completedDays
                              ? `Day ${idx + 1} completed`
                              : idx === course.completedDays
                                ? `Day ${idx + 1} in progress`
                                : `Day ${idx + 1} upcoming`
                          }
                          className={`inline-flex h-7 min-w-[1.75rem] items-center justify-center rounded-full px-1 text-[11px] font-bold ${dayDotClass(
                            idx,
                            course.completedDays,
                            course.trainingDays,
                          )}`}
                        >
                          {idx + 1}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col items-end justify-between gap-2">
                    <div className="text-right">
                      <p className="text-4xl font-bold tabular-nums">{course.progressPercent}%</p>
                      <p className="text-xs text-gray-400">
                        {course.completedDays} / {course.trainingDays} days
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
                          className="inline-flex items-center gap-1 rounded-md bg-[#FFC107] px-2.5 py-1 text-xs font-semibold text-black"
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

      <article className="mt-4 rounded-xl border border-[#FFC107]/20 bg-black/30 p-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="inline-flex items-center gap-2 text-xl font-bold text-white">
            <Compass className="h-5 w-5 text-[#FFC107]" aria-hidden />
            Explore courses
          </h2>
          <Link
            href={liveTutorCourseHref()}
            className="inline-flex items-center gap-1 text-xs font-semibold text-[#FFC107] hover:underline"
          >
            View all tutor-led programs
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </div>

        {exploreCourses.length === 0 ? (
          <p className="rounded-lg border border-dashed border-white/15 bg-black/20 p-6 text-center text-sm text-gray-400">
            No tutor-led programs are published yet. Check back soon or browse the full catalog.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {exploreCourses.map((course) => {
              const enrolled = enrolledSlugs.has(course.slug.toLowerCase());
              const href = liveTutorCourseHref(course.slug);

              return (
                <article
                  key={course.slug}
                  className="flex flex-col overflow-hidden rounded-xl border border-white/10 bg-black/25 transition hover:border-[#FFC107]/35"
                >
                  <div className="relative h-32 bg-black/40">
                    {course.image ? (
                      <Image
                        src={course.image}
                        alt={course.title}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 50vw, 25vw"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-[10px] text-gray-500">
                        Live training
                      </div>
                    )}
                    <span className="absolute left-2 top-2 rounded-md bg-[#FFC107] px-2 py-0.5 text-[9px] font-bold uppercase text-black">
                      Tutor led
                    </span>
                    {enrolled ? (
                      <span className="absolute right-2 top-2 rounded-md border border-[#4CAF50]/50 bg-[#4CAF50]/20 px-2 py-0.5 text-[9px] font-bold text-[#66BB6A]">
                        Enrolled
                      </span>
                    ) : null}
                  </div>
                  <div className="flex flex-1 flex-col p-3">
                    <p className="line-clamp-2 text-sm font-semibold leading-snug text-white">{course.title}</p>
                    <p className="mt-1 line-clamp-2 text-[11px] text-gray-500">{course.subtitle}</p>
                    <ul className="mt-2 space-y-1 text-[10px] text-gray-400">
                      <li className="flex items-center gap-1.5">
                        <Calendar className="h-3 w-3 shrink-0 text-[#FFC107]/80" aria-hidden />
                        {course.nextBatchDate}
                      </li>
                      <li>
                        {course.trainingDays} day{course.trainingDays === 1 ? "" : "s"} • {course.duration}
                      </li>
                      <li className="inline-flex items-center gap-1 font-semibold text-[#FFC107]">
                        <IndianRupee className="h-3 w-3" aria-hidden />
                        {course.price.toLocaleString("en-IN")}
                      </li>
                    </ul>
                    <Link
                      href={enrolled ? `/my-learning/course/${encodeURIComponent(course.slug)}` : href}
                      className={`mt-3 inline-flex w-full items-center justify-center gap-1 rounded-lg py-2 text-xs font-bold ${
                        enrolled
                          ? "border border-white/15 text-amber-200 hover:bg-white/5"
                          : "bg-[#FFC107] text-black hover:bg-[#FFD54F]"
                      }`}
                    >
                      {enrolled ? "Open program hub" : "View & enroll"}
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </article>
    </section>
  );
}
