"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Compass,
  Play,
  Rocket,
  Sparkles,
  Video,
} from "lucide-react";
import type { ManagedCourse } from "@/lib/content-schema";
import type { PurchasedCourseRow } from "@/lib/learner-course-progress";
import type { TutorLedExploreCard, TutorLedLiveHubRow } from "@/lib/tutor-led-live-hub-enrich";
import { liveTutorCourseHref, tutorLedLearnerLiveJoinHref } from "@/lib/tutor-led-routes";

type Props = {
  selfPacedCourses: PurchasedCourseRow[];
  tutorLedCourses: TutorLedLiveHubRow[];
  exploreSelfPaced: ManagedCourse[];
  exploreTutorLed: TutorLedExploreCard[];
  recommendedSelfPacedSlugs?: Set<string>;
  recommendedTutorSlugs?: Set<string>;
  learningHrefFor: (course: { title: string; slug?: string; action?: string; status?: string }) => string;
};

function CourseThumb({ image, title }: { image?: string; title: string }) {
  if (image?.trim()) {
    return (
      <div className="relative h-24 overflow-hidden rounded-lg border border-white/10 bg-black/30">
        <Image src={image.trim()} alt={title} fill className="object-cover" sizes="200px" />
      </div>
    );
  }
  return (
    <div className="flex h-24 items-center justify-center rounded-lg border border-dashed border-white/15 bg-black/30 text-[10px] text-gray-500">
      No image
    </div>
  );
}

function ProgressBar({ completed, total }: { completed: number; total: number }) {
  const safe = Math.max(1, total);
  const pct = Math.round((completed / safe) * 100);
  return (
    <div className="mt-2">
      <div className="h-1.5 rounded-full bg-white/10">
        <div className="h-1.5 rounded-full bg-violet-400" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-1 text-[11px] text-gray-400">
        {completed}/{total} modules · {pct}%
      </p>
    </div>
  );
}

export function MyLearningDashboardCourses({
  selfPacedCourses,
  tutorLedCourses,
  exploreSelfPaced,
  exploreTutorLed,
  recommendedSelfPacedSlugs,
  recommendedTutorSlugs,
  learningHrefFor,
}: Props) {
  const hasEnrolled = selfPacedCourses.length > 0 || tutorLedCourses.length > 0;
  const hasExplore = exploreSelfPaced.length > 0 || exploreTutorLed.length > 0;

  return (
    <div className="mt-4 space-y-4">
      <article className="rounded-xl border border-white/10 bg-black/30 p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="inline-flex items-center gap-2 text-xl font-bold">
            <BookOpen size={20} className="text-amber-300" />
            My Courses
          </h3>
          <Link href="/my-learning?tab=learning" className="text-xs text-amber-200 hover:text-amber-100">
            View all progress →
          </Link>
        </div>

        {selfPacedCourses.length === 0 ? (
          <p className="rounded-lg border border-dashed border-white/15 bg-black/20 p-4 text-sm text-gray-400">
            No self-paced courses enrolled yet.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {selfPacedCourses.map((course) => (
              <article
                key={`sp-${(course.slug ?? course.title).toLowerCase()}`}
                className="flex flex-col rounded-xl border border-white/10 bg-black/25 p-3"
              >
                <CourseThumb image={course.image} title={course.title} />
                <p className="mt-2 line-clamp-2 text-sm font-semibold">{course.title}</p>
                <p className="mt-0.5 text-[11px] text-gray-400">
                  {course.modules} modules · {course.duration}
                </p>
                <span
                  className={`mt-2 inline-flex w-fit rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    course.status.toLowerCase() === "completed"
                      ? "bg-emerald-500/20 text-emerald-200"
                      : course.status.toLowerCase().includes("not started")
                        ? "bg-rose-500/20 text-rose-200"
                        : "bg-amber-500/20 text-amber-200"
                  }`}
                >
                  {course.status}
                </span>
                <ProgressBar completed={course.completed} total={course.modules} />
                <Link
                  href={learningHrefFor(course)}
                  className="mt-3 inline-flex w-full items-center justify-center rounded-md bg-amber-500 py-2 text-xs font-bold text-black hover:bg-amber-400"
                >
                  {course.action || "Continue"}
                </Link>
              </article>
            ))}
          </div>
        )}
      </article>

      <article className="rounded-xl border border-[#FFC107]/25 bg-black/30 p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="inline-flex items-center gap-2 text-xl font-bold">
            <Video size={20} className="text-[#FFC107]" />
            My Tutor-Led Programs
          </h3>
          <Link href="/my-learning?tab=live" className="text-xs text-[#FFC107] hover:underline">
            Live hub →
          </Link>
        </div>

        {tutorLedCourses.length === 0 ? (
          <p className="rounded-lg border border-dashed border-white/15 bg-black/20 p-4 text-sm text-gray-400">
            No tutor-led programs enrolled yet. Join live Zoom training from Explore below.
          </p>
        ) : (
          <div className="space-y-2">
            {tutorLedCourses.map((course) => (
              <article
                key={`tl-${course.slug}`}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/25 p-3"
              >
                <div className="flex min-w-0 flex-1 gap-3">
                  <div className="relative h-16 w-20 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-black/30">
                    {course.image?.trim() ? (
                      <Image
                        src={course.image.trim()}
                        alt={course.title}
                        fill
                        className="object-cover"
                        sizes="80px"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-[9px] text-gray-500">
                        Live
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold">{course.title}</p>
                    <p className="mt-0.5 text-xs text-gray-400">
                      {course.trainingDays} training days · {course.duration}
                    </p>
                    <p className="mt-1 text-[11px] text-sky-300/90">
                      Day {Math.min(course.completedDays + 1, course.trainingDays)} of {course.trainingDays} ·{" "}
                      {course.progressPercent}% complete
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={tutorLedLearnerLiveJoinHref(course.slug)}
                    className="inline-flex items-center gap-1 rounded-md bg-[#FFC107] px-3 py-1.5 text-xs font-bold text-black"
                  >
                    <Play className="h-3 w-3 fill-black" />
                    Join live
                  </Link>
                  <Link
                    href={`/my-learning/course/${encodeURIComponent(course.slug)}`}
                    className="rounded-md border border-white/15 px-3 py-1.5 text-xs text-amber-200"
                  >
                    Program hub
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </article>

      <article className="rounded-xl border border-white/10 bg-linear-to-br from-[#15163a]/80 to-black/40 p-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h3 className="inline-flex items-center gap-2 text-xl font-bold">
            <Compass size={20} className="text-amber-300" />
            Explore Other Courses
          </h3>
          <Link href="/courses" className="inline-flex items-center gap-1 text-xs font-semibold text-amber-200 hover:text-amber-100">
            Browse full catalog
            <ArrowRight size={14} />
          </Link>
        </div>

        {!hasExplore ? (
          <p className="rounded-lg border border-dashed border-white/15 bg-black/20 p-6 text-center text-sm text-gray-400">
            {hasEnrolled
              ? "You are enrolled in all published courses. Check back when new programs launch."
              : "Browse the catalog and enroll to start learning."}
          </p>
        ) : (
          <div className="space-y-4">
            {exploreSelfPaced.length > 0 ? (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Self-paced courses
                </p>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {exploreSelfPaced.map((course) => {
                    const slug = course.slug?.trim() ?? "";
                    const isRecommended = recommendedSelfPacedSlugs?.has(slug.toLowerCase());
                    return (
                    <article
                      key={`explore-sp-${course.slug}`}
                      className="flex flex-col overflow-hidden rounded-xl border border-white/10 bg-black/25 transition hover:border-amber-400/30"
                    >
                      <div className="relative">
                        <CourseThumb image={course.image} title={course.title} />
                        {isRecommended ? (
                          <span className="absolute right-2 top-2 inline-flex items-center gap-0.5 rounded-md border border-violet-400/40 bg-violet-500/25 px-2 py-0.5 text-[9px] font-bold text-violet-100">
                            <Sparkles size={10} />
                            Recommended
                          </span>
                        ) : null}
                      </div>
                      <div className="flex flex-1 flex-col p-3">
                        <p className="line-clamp-2 text-sm font-semibold">{course.title}</p>
                        <p className="mt-1 text-[11px] text-gray-400">
                          {course.duration?.trim() || "Self-paced"}
                        </p>
                        <Link
                          href={`/courses/${encodeURIComponent(course.slug ?? "")}`}
                          className="mt-3 inline-flex w-full items-center justify-center gap-1 rounded-lg bg-amber-500 py-2 text-xs font-bold text-black hover:bg-amber-400"
                        >
                          View & enroll
                          <ArrowRight size={14} />
                        </Link>
                      </div>
                    </article>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {exploreTutorLed.length > 0 ? (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Tutor-led live programs
                </p>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {exploreTutorLed.map((course) => {
                    const isRecommended = recommendedTutorSlugs?.has(course.slug.toLowerCase());
                    return (
                    <article
                      key={`explore-tl-${course.slug}`}
                      className="flex flex-col overflow-hidden rounded-xl border border-white/10 bg-black/25 transition hover:border-[#FFC107]/35"
                    >
                      <div className="relative">
                        <CourseThumb image={course.image} title={course.title} />
                        <span className="absolute left-2 top-2 rounded-md bg-[#FFC107] px-2 py-0.5 text-[9px] font-bold uppercase text-black">
                          Tutor led
                        </span>
                        {isRecommended ? (
                          <span className="absolute right-2 top-2 inline-flex items-center gap-0.5 rounded-md border border-violet-400/40 bg-violet-500/25 px-2 py-0.5 text-[9px] font-bold text-violet-100">
                            <Sparkles size={10} />
                            Recommended
                          </span>
                        ) : null}
                      </div>
                      <div className="flex flex-1 flex-col p-3">
                        <p className="line-clamp-2 text-sm font-semibold">{course.title}</p>
                        <p className="mt-1 line-clamp-2 text-[11px] text-gray-500">{course.subtitle}</p>
                        <p className="mt-1 text-[10px] text-gray-400">
                          {course.trainingDays} days · {course.nextBatchDate}
                        </p>
                        <Link
                          href={liveTutorCourseHref(course.slug)}
                          className="mt-3 inline-flex w-full items-center justify-center gap-1 rounded-lg bg-[#FFC107] py-2 text-xs font-bold text-black hover:bg-[#FFD54F]"
                        >
                          View & enroll
                          <Rocket size={14} />
                        </Link>
                      </div>
                    </article>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>
        )}
      </article>
    </div>
  );
}
