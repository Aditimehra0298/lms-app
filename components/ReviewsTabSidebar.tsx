"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Award,
  BookOpen,
  FileText,
  Headphones,
  Infinity,
  Star,
  Tv,
  Video,
} from "lucide-react";
import type { ManagedCourse } from "@/lib/content-schema";
import type { ResolvedCourseHero } from "@/lib/course-hero-resolve";
import { landingCourseIncludes, type CourseIncludeRow } from "@/lib/course-landing-content";
import { resolveReviewsCopy } from "@/lib/course-reviews-section";

const card = "rounded-xl border border-white/10 bg-[#141414]";

type Props = {
  course: ManagedCourse;
  hero: ResolvedCourseHero;
  lectureCount: number;
  moduleCount: number;
  includesLines?: string[];
  onWriteReview: () => void;
};

function buildIncludes(
  course: ManagedCourse,
  hero: ResolvedCourseHero,
  lectureCount: number,
  moduleCount: number,
  customLines?: string[],
): CourseIncludeRow[] {
  if (customLines?.length) {
    return landingCourseIncludes(course, hero, lectureCount, customLines);
  }
  const duration = course.duration?.trim() || "4h 30m";
  const access =
    hero.access?.toLowerCase() === "lifetime" ? "Full lifetime access" : `Full ${hero.access} access`;

  return [
    { icon: BookOpen, text: `${moduleCount || lectureCount || 18} Lessons` },
    { icon: Video, text: `${duration} on-demand video` },
    { icon: FileText, text: "Downloadable resources" },
    { icon: Infinity, text: access },
    { icon: Award, text: "Certificate of completion" },
    { icon: Tv, text: "Access on mobile and TV" },
  ];
}

export default function ReviewsTabSidebar({
  course,
  hero,
  lectureCount,
  moduleCount,
  includesLines,
  onWriteReview,
}: Props) {
  const [hoverStars, setHoverStars] = useState(0);
  const copy = resolveReviewsCopy(course);
  const includes = buildIncludes(course, hero, lectureCount, moduleCount, includesLines);

  return (
    <aside className="space-y-4 lg:sticky lg:top-28 lg:self-start">
      <div className={card + " p-5"}>
        <h3 className="text-sm font-bold text-white">This course includes</h3>
        <ul className="mt-4 space-y-3">
          {includes.map((row) => (
            <li key={row.text} className="flex items-start gap-3 text-sm text-zinc-300">
              <row.icon className="mt-0.5 h-4 w-4 shrink-0 text-violet-400" strokeWidth={1.75} />
              <span className="leading-snug">{row.text}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className={card + " p-5"}>
        <h3 className="text-sm font-bold text-white">{copy.writeReviewTitle}</h3>
        <p className="mt-2 text-sm text-zinc-500">{copy.writeReviewSubtitle}</p>
        <div className="mt-4 flex justify-center gap-1.5" role="group" aria-label="Rate this course">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onMouseEnter={() => setHoverStars(n)}
              onMouseLeave={() => setHoverStars(0)}
              onClick={onWriteReview}
              className="rounded p-0.5 transition"
              aria-label={`${n} stars`}
            >
              <Star
                className={`h-7 w-7 ${
                  n <= hoverStars
                    ? "fill-violet-500 text-violet-500"
                    : "text-violet-500/40"
                }`}
                strokeWidth={1.5}
              />
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onWriteReview}
          className="mt-5 flex w-full items-center justify-center rounded-lg bg-violet-600 py-3 text-sm font-bold text-white shadow-[0_8px_24px_rgba(124,58,237,0.35)] transition hover:bg-violet-500"
        >
          {copy.writeReviewTitle}
        </button>
      </div>

      <div className={card + " p-5"}>
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-violet-600/25">
            <Headphones className="h-5 w-5 text-violet-300" aria-hidden />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">{copy.needHelpTitle}</h3>
            <p className="mt-2 text-xs leading-relaxed text-zinc-500">{copy.needHelpText}</p>
          </div>
        </div>
        <Link
          href="/#organisation"
          className="mt-4 inline-flex w-full items-center justify-center rounded-lg border border-violet-500/50 py-2.5 text-sm font-semibold text-violet-200 transition hover:bg-violet-500/10"
        >
          {copy.contactSupportLabel}
        </Link>
      </div>
    </aside>
  );
}
