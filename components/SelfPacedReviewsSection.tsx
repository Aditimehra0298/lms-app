"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, ChevronDown, Star, ThumbsUp } from "lucide-react";
import type { ManagedCourse } from "@/lib/content-schema";
import type { ResolvedCourseHero } from "@/lib/course-hero-resolve";
import { getCurriculumForCourse } from "@/lib/course-detail-template";
import { qaApiHeaders } from "@/lib/course-qa-client";
import {
  buildReviewsSectionFromApi,
  resolveReviewsCopy,
  resolveReviewsSection,
  type CourseReview,
} from "@/lib/course-reviews-section";
import { getLearnerEmail } from "@/lib/learner-session-client";
import { readJsonResponse } from "@/lib/safe-json";
import ReviewsTabSidebar from "@/components/ReviewsTabSidebar";

type StarFilter = "all" | 1 | 2 | 3 | 4 | 5;
type SortKey = "recent" | "helpful" | "highest" | "lowest";

const card = "rounded-xl border border-white/10 bg-[#141414]";

type Props = {
  course: ManagedCourse;
  hero: ResolvedCourseHero;
  ratingCountLabel?: string;
  lectureCount: number;
  includesLines?: string[];
  onWriteReview: () => void;
};

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function StarRow({ rating, size = "sm" }: { rating: number; size?: "sm" | "md" }) {
  const cls = size === "md" ? "h-5 w-5" : "h-4 w-4";
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`${cls} ${n <= Math.round(rating) ? "fill-amber-400 text-amber-400" : "text-zinc-600"}`}
          aria-hidden
        />
      ))}
    </div>
  );
}

export default function SelfPacedReviewsSection({
  course,
  hero,
  ratingCountLabel,
  lectureCount,
  includesLines,
  onWriteReview,
}: Props) {
  const [liveReviews, setLiveReviews] = useState<CourseReview[] | null>(null);
  const reviewsCopy = useMemo(() => resolveReviewsCopy(course), [course]);
  const [starFilter, setStarFilter] = useState<StarFilter>("all");
  const [sort, setSort] = useState<SortKey>("recent");

  const loadReviews = useCallback(async () => {
    try {
      const email = getLearnerEmail();
      const qs = email ? `?email=${encodeURIComponent(email)}` : "";
      const res = await fetch(`/api/courses/${encodeURIComponent(course.slug)}/reviews${qs}`, {
        cache: "no-store",
        headers: qaApiHeaders(),
      });
      const data = await readJsonResponse(
        res,
        {} as {
          ok?: boolean;
          reviews?: Array<{
            id: string;
            name: string;
            rating: number;
            body: string;
            daysAgo: string;
            helpful?: number;
            verified?: boolean;
          }>;
        },
      );
      if (res.ok && Array.isArray(data.reviews)) {
        setLiveReviews(
          data.reviews.map((r) => ({
            id: r.id,
            name: r.name,
            rating: r.rating,
            daysAgo: r.daysAgo,
            body: r.body,
            helpful: r.helpful ?? 0,
            verified: r.verified ?? true,
          })),
        );
      } else {
        setLiveReviews([]);
      }
    } catch {
      setLiveReviews([]);
    }
  }, [course.slug]);

  useEffect(() => {
    void loadReviews();
  }, [loadReviews]);

  useEffect(() => {
    const refresh = () => {
      void loadReviews();
    };
    window.addEventListener("sft_course_review_submitted", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener("sft_course_review_submitted", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [loadReviews]);

  const data = useMemo(() => {
    if (liveReviews === null) {
      return { ...resolveReviewsSection(course, ratingCountLabel), reviews: [] as CourseReview[] };
    }
    return buildReviewsSectionFromApi(course, liveReviews, ratingCountLabel);
  }, [course, ratingCountLabel, liveReviews]);

  const moduleCount = useMemo(
    () =>
      getCurriculumForCourse(course.slug, course.category, course.title, course.curriculum).length,
    [course],
  );

  const filtered = useMemo(() => {
    let list = [...data.reviews];
    if (starFilter !== "all") {
      list = list.filter((r) => Math.round(r.rating) === starFilter);
    }
    if (sort === "helpful") list.sort((a, b) => b.helpful - a.helpful);
    if (sort === "highest") list.sort((a, b) => b.rating - a.rating);
    if (sort === "lowest") list.sort((a, b) => a.rating - b.rating);
    return list;
  }, [data.reviews, starFilter, sort]);

  const avgNum = parseFloat(data.averageRating) || 4.8;

  return (
    <div
      id="sp-reviews"
      className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(260px,320px)] xl:grid-cols-[minmax(0,1fr)_340px]"
    >
      <div className="min-w-0 space-y-6">
        <h2 className="text-2xl font-bold tracking-tight text-white">Learner reviews</h2>

        <div className={`${card} p-5 md:p-6`}>
          <div className="grid gap-8 lg:grid-cols-[minmax(130px,170px)_minmax(0,1fr)_minmax(180px,240px)]">
            <div className="text-center lg:text-left">
              <p className="text-4xl font-extrabold text-white md:text-[2.75rem]">
                {data.averageRating}
                <span className="text-xl font-semibold text-zinc-500 md:text-2xl"> / 5</span>
              </p>
              <div className="mt-2 flex justify-center lg:justify-start">
                <StarRow rating={avgNum} size="md" />
              </div>
              <p className="mt-2 text-sm text-zinc-500">{data.totalReviews}</p>
            </div>

            <div className="space-y-2.5">
              {data.distribution.map((row) => (
                <div key={row.stars} className="flex items-center gap-3 text-xs">
                  <span className="w-11 shrink-0 text-zinc-400">{row.stars} Star</span>
                  <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-zinc-800">
                    <div
                      className="h-full rounded-full bg-violet-600"
                      style={{ width: `${row.percent}%` }}
                    />
                  </div>
                  <span className="w-9 shrink-0 text-right text-zinc-500">{row.percent}%</span>
                </div>
              ))}
            </div>

            <div>
              <p className="text-sm font-semibold text-white">{reviewsCopy.learnersLoveTitle}</p>
              <ul className="mt-3 space-y-2.5">
                {data.highlyRatedFor.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-zinc-300">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-violet-400" aria-hidden />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            {(
              [
                { key: "all" as const, label: "All Reviews" },
                { key: 5 as const, label: "5 Star" },
                { key: 4 as const, label: "4 Star" },
                { key: 3 as const, label: "3 Star" },
                { key: 2 as const, label: "2 Star" },
                { key: 1 as const, label: "1 Star" },
              ] as const
            ).map(({ key, label }) => (
              <button
                key={label}
                type="button"
                onClick={() => setStarFilter(key)}
                className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
                  starFilter === key
                    ? "border-violet-500 bg-violet-500/15 text-violet-200"
                    : "border-white/15 text-zinc-400 hover:border-white/30 hover:text-zinc-200"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <label className="relative shrink-0">
            <span className="sr-only">Sort reviews</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="appearance-none rounded-lg border border-white/15 bg-[#141414] py-2 pl-3 pr-9 text-xs font-medium text-zinc-200 outline-none focus:border-violet-500/50"
            >
              <option value="recent">Most Recent</option>
              <option value="helpful">Most Helpful</option>
              <option value="highest">Highest Rated</option>
              <option value="lowest">Lowest Rated</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          </label>
        </div>

        <div className="space-y-4">
          {liveReviews === null ? (
            <p className={`${card} px-4 py-8 text-center text-sm text-zinc-500`}>Loading reviews…</p>
          ) : filtered.length === 0 ? (
            <p className={`${card} px-4 py-8 text-center text-sm text-zinc-500`}>
              {liveReviews.length === 0
                ? "No reviews yet — be the first to share feedback after you enroll."
                : "No reviews match this filter yet."}
            </p>
          ) : (
            filtered.map((review) => (
              <article key={review.id} className={`${card} p-5 md:p-6`}>
                <div className="flex flex-wrap items-start gap-3">
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-violet-600/50 text-sm font-bold text-white">
                    {initials(review.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-white">{review.name}</span>
                      {review.verified ? (
                        <span className="rounded-md border border-emerald-500/50 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-400">
                          Verified Learner
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <StarRow rating={review.rating} />
                      <span className="text-xs text-zinc-500">{review.daysAgo}</span>
                    </div>
                  </div>
                </div>
                <p className="mt-4 text-sm leading-relaxed text-zinc-300">{review.body}</p>
                <div className="mt-4 flex items-center justify-end gap-5 text-xs">
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 font-medium text-violet-400 transition hover:text-violet-300"
                  >
                    <ThumbsUp className="h-3.5 w-3.5" aria-hidden />
                    Helpful ({review.helpful})
                  </button>
                  <button type="button" className="text-zinc-500 transition hover:text-zinc-300">
                    Report
                  </button>
                </div>
              </article>
            ))
          )}
        </div>
      </div>

      <ReviewsTabSidebar
        course={course}
        hero={hero}
        lectureCount={lectureCount}
        moduleCount={moduleCount}
        includesLines={includesLines}
        onWriteReview={onWriteReview}
      />
    </div>
  );
}
