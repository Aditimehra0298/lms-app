"use client";

import Link from "next/link";
import {
  ArrowRight,
  Award,
  BookOpen,
  Compass,
  Play,
  Rocket,
  Sparkles,
  Video,
} from "lucide-react";
import type { ManagedCourse } from "@/lib/content-schema";
import type { PurchasedCourseRow } from "@/lib/learner-course-progress";
import { readCompletedModules } from "@/lib/learner-course-progress";
import { countLearnerCurriculumModules } from "@/lib/curriculum-learner-filter";
import type { TutorLedExploreCard, TutorLedLiveHubRow } from "@/lib/tutor-led-live-hub-enrich";
import { liveTutorCourseHref, tutorLedLearnerLiveJoinHref } from "@/lib/tutor-led-routes";
import { CourseListThumbnail } from "@/components/CourseListThumbnail";
import { resolveCourseListThumbnail } from "@/lib/course-thumbnail";

const ACTIVE_SELF_PACED_VISIBLE = 3;
const EXPLORE_SELF_PACED_VISIBLE = 4;
const EXPLORE_TUTOR_VISIBLE = 2;

type Props = {
  selfPacedCourses: PurchasedCourseRow[];
  tutorLedCourses: TutorLedLiveHubRow[];
  exploreSelfPaced: ManagedCourse[];
  exploreTutorLed: TutorLedExploreCard[];
  /** Full catalog — used for real covers + accurate module counts on cards. */
  catalogCourses?: ManagedCourse[];
  recommendedSelfPacedSlugs?: Set<string>;
  recommendedTutorSlugs?: Set<string>;
  completedCount?: number;
  learningHrefFor: (course: { title: string; slug?: string; action?: string; status?: string }) => string;
};

function formatCardDuration(raw: string | undefined): string {
  const s = (raw ?? "").trim();
  if (!s || s === "—") return "";
  if (/^h\s*\d*m?$/i.test(s) || /^h\s/i.test(s)) return "";
  return s;
}

function cardStats(course: PurchasedCourseRow, catalog?: ManagedCourse[]) {
  const slug = course.slug?.trim() ?? "";
  const cat = slug
    ? catalog?.find((c) => c.slug === slug)
    : catalog?.find((c) => c.title.trim().toLowerCase() === course.title.trim().toLowerCase());
  const modulesFromCatalog = cat ? countLearnerCurriculumModules(cat.curriculum) : 0;
  const modules = Math.max(1, modulesFromCatalog || course.modules || 1);
  const doneList = slug ? readCompletedModules(slug) : [];
  const completed = doneList.filter((n) => n >= 1 && n <= modules).length;
  const image = (cat ? resolveCourseListThumbnail(cat) : "") || course.image?.trim() || "";
  const duration = formatCardDuration(cat?.duration || course.duration);
  return { modules, completed, image, duration, slug };
}

function CourseThumb({
  image,
  title,
  courseSlug,
}: {
  image?: string;
  title: string;
  courseSlug?: string;
}) {
  return (
    <CourseListThumbnail
      image={image}
      title={title}
      courseSlug={courseSlug}
      fit="contain"
      className="relative aspect-[16/9] w-full overflow-hidden rounded-lg border border-white/10 bg-[#0a0f1c]"
    />
  );
}

function ProgressBar({ completed, total }: { completed: number; total: number }) {
  const safeTotal = Math.max(1, Number(total) || 1);
  const done = Math.max(0, Math.min(safeTotal, Number(completed) || 0));
  const pct = Math.round((done / safeTotal) * 100);
  return (
    <div className="mt-2">
      <div className="h-1.5 rounded-full bg-white/10">
        <div className="h-1.5 rounded-full bg-violet-400" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-1 text-[11px] text-gray-400">
        {done}/{safeTotal} modules · {pct}%
      </p>
    </div>
  );
}

function statusBadgeClass(status: string) {
  if (status.toLowerCase() === "completed") return "bg-emerald-500/20 text-emerald-200";
  if (status.toLowerCase().includes("not started")) return "bg-rose-500/20 text-rose-200";
  return "bg-amber-500/20 text-amber-200";
}

export function MyLearningDashboardCourses({
  selfPacedCourses,
  tutorLedCourses,
  exploreSelfPaced,
  exploreTutorLed,
  catalogCourses,
  recommendedSelfPacedSlugs,
  recommendedTutorSlugs,
  completedCount = 0,
  learningHrefFor,
}: Props) {
  const catalog = catalogCourses?.length ? catalogCourses : exploreSelfPaced;
  const visibleSelfPaced = selfPacedCourses.slice(0, ACTIVE_SELF_PACED_VISIBLE);
  const moreSelfPaced = Math.max(0, selfPacedCourses.length - visibleSelfPaced.length);
  const previewExploreSelf = exploreSelfPaced.slice(0, EXPLORE_SELF_PACED_VISIBLE);
  const previewExploreTutor = exploreTutorLed.slice(0, EXPLORE_TUTOR_VISIBLE);
  const hasActive = selfPacedCourses.length > 0 || tutorLedCourses.length > 0;
  const hasExplore = exploreSelfPaced.length > 0 || exploreTutorLed.length > 0;

  return (
    <div className="mt-4 grid gap-4 xl:grid-cols-12 xl:items-start">
      {/* Left: continue learning */}
      <div className="space-y-4 xl:col-span-8">
        <article className="rounded-xl border border-white/10 bg-black/30 p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="inline-flex items-center gap-2 text-xl font-bold">
                <BookOpen size={20} className="text-amber-300" />
                Continue learning
              </h3>
              <p className="mt-1 text-xs text-gray-400">
                Active enrollments only — start or pick up where you left off.
              </p>
            </div>
            <Link
              href="/my-learning?tab=learning"
              className="text-xs font-semibold text-amber-200 hover:text-amber-100"
            >
              All my courses →
            </Link>
          </div>

          {!hasActive ? (
            <div className="rounded-lg border border-dashed border-white/15 bg-black/20 p-5 text-center">
              <p className="text-sm text-gray-300">No active courses right now.</p>
              <p className="mt-1 text-xs text-gray-500">
                {completedCount > 0
                  ? "Your completed courses are in Certificates. Pick a new program from Explore →"
                  : "Enroll from Explore on the right to begin."}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {visibleSelfPaced.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {visibleSelfPaced.map((course) => {
                    const stats = cardStats(course, catalog);
                    return (
                    <article
                      key={`sp-${(course.slug ?? course.title).toLowerCase()}`}
                      className="flex flex-col rounded-xl border border-white/10 bg-black/25 p-3"
                    >
                      <CourseThumb image={stats.image} title={course.title} courseSlug={stats.slug || course.slug} />
                      <p className="mt-2 line-clamp-2 text-sm font-semibold">{course.title}</p>
                      <p className="mt-0.5 text-[11px] text-gray-400">
                        {stats.modules} modules{stats.duration ? ` · ${stats.duration}` : ""}
                      </p>
                      <span
                        className={`mt-2 inline-flex w-fit rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusBadgeClass(course.status)}`}
                      >
                        {course.status}
                      </span>
                      <ProgressBar completed={stats.completed} total={stats.modules} />
                      <Link
                        href={learningHrefFor(course)}
                        className="mt-3 inline-flex w-full items-center justify-center rounded-md bg-amber-500 py-2 text-xs font-bold text-black hover:bg-amber-400"
                      >
                        {course.action || "Continue"}
                      </Link>
                    </article>
                    );
                  })}
                </div>
              ) : null}

              {moreSelfPaced > 0 ? (
                <Link
                  href="/my-learning?tab=learning"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-amber-200 hover:text-amber-100"
                >
                  +{moreSelfPaced} more active course{moreSelfPaced === 1 ? "" : "s"}
                  <ArrowRight size={14} />
                </Link>
              ) : null}

              {tutorLedCourses.length > 0 ? (
                <div className="rounded-lg border border-[#FFC107]/20 bg-[#FFC107]/5 p-3">
                  <p className="mb-2 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[#FFC107]">
                    <Video size={14} />
                    Live programs
                  </p>
                  <div className="space-y-2">
                    {tutorLedCourses.map((course) => (
                      <article
                        key={`tl-${course.slug}`}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/10 bg-black/25 p-3"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold">{course.title}</p>
                          <p className="mt-0.5 text-[11px] text-gray-400">
                            Day {Math.min(course.completedDays + 1, course.trainingDays)} of{" "}
                            {course.trainingDays} · {course.progressPercent}% complete
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Link
                            href={tutorLedLearnerLiveJoinHref(course.slug)}
                            className="inline-flex items-center gap-1 rounded-md bg-[#FFC107] px-3 py-1.5 text-xs font-bold text-black"
                          >
                            <Play className="h-3 w-3 fill-black" />
                            Join live
                          </Link>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {completedCount > 0 ? (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2">
              <p className="inline-flex items-center gap-2 text-xs text-emerald-200">
                <Award size={14} />
                {completedCount} completed course{completedCount === 1 ? "" : "s"}
              </p>
              <Link
                href="/my-learning?tab=certificates"
                className="text-xs font-semibold text-amber-200 hover:text-amber-100"
              >
                View certificates →
              </Link>
            </div>
          ) : null}
        </article>
      </div>

      {/* Right: explore sidebar */}
      <aside className="xl:col-span-4">
        <article className="sticky top-4 rounded-xl border border-white/10 bg-linear-to-b from-[#15163a]/90 to-black/50 p-4 shadow-[0_8px_32px_rgba(0,0,0,0.35)]">
          <div className="mb-4 border-b border-white/10 pb-3">
            <h3 className="inline-flex items-center gap-2 text-lg font-bold">
              <Compass size={18} className="text-amber-300" />
              Explore courses
            </h3>
            <p className="mt-1 text-[11px] leading-relaxed text-gray-400">
              Recommended programs you have not enrolled in yet.
            </p>
          </div>

          {!hasExplore ? (
            <p className="rounded-lg border border-dashed border-white/15 bg-black/20 p-4 text-center text-xs text-gray-400">
              {hasActive
                ? "You are enrolled in all published catalog courses."
                : "Browse the catalog and enroll to start."}
            </p>
          ) : (
            <div className="space-y-4">
              {previewExploreSelf.length > 0 ? (
                <div>
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                    Self-paced
                  </p>
                  <ul className="space-y-2">
                    {previewExploreSelf.map((course) => {
                      const slug = course.slug?.trim() ?? "";
                      const isRecommended = recommendedSelfPacedSlugs?.has(slug.toLowerCase());
                      return (
                        <li key={`explore-sp-${course.slug}`}>
                          <Link
                            href={`/courses/${encodeURIComponent(slug)}`}
                            className="group flex gap-3 rounded-lg border border-white/10 bg-black/25 p-2 transition hover:border-amber-400/35 hover:bg-black/40"
                          >
                            <div className="relative h-14 w-16 shrink-0 overflow-hidden rounded-md border border-white/10 bg-black/30">
                              <CourseListThumbnail
                                image={resolveCourseListThumbnail(course)}
                                title={course.title}
                                courseSlug={course.slug}
                                className="relative h-14 w-16 overflow-hidden rounded-md border border-white/10 bg-black/30"
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="line-clamp-2 text-xs font-semibold leading-snug group-hover:text-amber-100">
                                {course.title}
                              </p>
                              <p className="mt-0.5 text-[10px] text-gray-500">
                                {course.duration?.trim() || "Self-paced"}
                              </p>
                              {isRecommended ? (
                                <span className="mt-1 inline-flex items-center gap-0.5 text-[9px] font-semibold text-violet-300">
                                  <Sparkles size={9} />
                                  Recommended
                                </span>
                              ) : null}
                            </div>
                            <ArrowRight
                              size={14}
                              className="mt-1 shrink-0 text-gray-600 group-hover:text-amber-300"
                            />
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                  {exploreSelfPaced.length > previewExploreSelf.length ? (
                    <Link
                      href="/courses"
                      className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-amber-200/90 hover:text-amber-100"
                    >
                      +{exploreSelfPaced.length - previewExploreSelf.length} more self-paced
                      <ArrowRight size={12} />
                    </Link>
                  ) : null}
                </div>
              ) : null}

              {previewExploreTutor.length > 0 ? (
                <div>
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                    Tutor-led live
                  </p>
                  <ul className="space-y-2">
                    {previewExploreTutor.map((course) => {
                      const isRecommended = recommendedTutorSlugs?.has(course.slug.toLowerCase());
                      return (
                        <li key={`explore-tl-${course.slug}`}>
                          <Link
                            href={liveTutorCourseHref(course.slug)}
                            className="group flex gap-3 rounded-lg border border-white/10 bg-black/25 p-2 transition hover:border-[#FFC107]/40 hover:bg-black/40"
                          >
                            <div className="relative h-14 w-16 shrink-0 overflow-hidden rounded-md border border-white/10 bg-black/30">
                              {course.image?.trim() ? (
                                <CourseListThumbnail
                                  image={course.image}
                                  title={course.title}
                                  courseSlug={course.slug}
                                  className="relative h-14 w-16 overflow-hidden rounded-md border border-white/10 bg-black/30"
                                />
                              ) : (
                                <div className="flex h-full items-center justify-center text-[8px] text-[#FFC107]">
                                  Live
                                </div>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="line-clamp-2 text-xs font-semibold leading-snug group-hover:text-[#FFC107]">
                                {course.title}
                              </p>
                              <p className="mt-0.5 text-[10px] text-gray-500">
                                {course.trainingDays} days · {course.nextBatchDate}
                              </p>
                              {isRecommended ? (
                                <span className="mt-1 inline-flex items-center gap-0.5 text-[9px] font-semibold text-violet-300">
                                  <Sparkles size={9} />
                                  Recommended
                                </span>
                              ) : null}
                            </div>
                            <Rocket
                              size={14}
                              className="mt-1 shrink-0 text-gray-600 group-hover:text-[#FFC107]"
                            />
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : null}
            </div>
          )}

          <Link
            href="/courses"
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-amber-400/30 bg-amber-500/10 py-2.5 text-xs font-bold text-amber-100 transition hover:bg-amber-500/20"
          >
            Browse full catalog
            <ArrowRight size={14} />
          </Link>
        </article>
      </aside>
    </div>
  );
}
