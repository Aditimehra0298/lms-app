"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ShoppingBag, Star } from "lucide-react";
import type { ManagedCourse } from "@/lib/content-schema";
import { catalogCourseLandingHref } from "@/lib/course-landing";
import CourseResolvedCardActions from "@/components/CourseResolvedCardActions";
import { readPurchasedCourses } from "@/lib/tutor-led-enrollment-client";
import { readJsonResponse } from "@/lib/safe-json";

const CARD_FALLBACK_IMAGE = "/c1.png";

function resolveCourseCardImage(image: string | undefined): string {
  const raw = image?.trim() ?? "";
  if (!raw) return CARD_FALLBACK_IMAGE;
  if (raw.startsWith("/") || /^https?:\/\//i.test(raw)) return raw;
  return CARD_FALLBACK_IMAGE;
}

type Props = {
  excludeSlug: string;
  className?: string;
};

export function CompletionSuggestedCourses({ excludeSlug, className = "" }: Props) {
  const [courses, setCourses] = useState<ManagedCourse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void fetch("/api/courses", { cache: "no-store" })
      .then((res) => readJsonResponse(res, {} as { courses?: ManagedCourse[] }))
      .then((data) => {
        if (cancelled) return;
        setCourses(Array.isArray(data.courses) ? data.courses : []);
      })
      .catch(() => {
        if (!cancelled) setCourses([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const suggestions = useMemo(() => {
    const purchased = new Set(
      readPurchasedCourses().map((row) => (row.slug ?? "").trim()).filter(Boolean),
    );
    const exclude = excludeSlug.trim();

    const published = courses.filter((course) => {
      const slug = course.slug?.trim() ?? "";
      if (!slug || slug === exclude) return false;
      if (course.published === false) return false;
      if (course.settings?.showInCatalog === false) return false;
      return true;
    });

    const unpurchased = published
      .filter((course) => !purchased.has(course.slug.trim()))
      .sort((a, b) => (a.title ?? "").localeCompare(b.title ?? ""));

    if (unpurchased.length > 0) return unpurchased;

    return published.sort((a, b) => (a.title ?? "").localeCompare(b.title ?? ""));
  }, [courses, excludeSlug]);

  if (loading) {
    return (
      <div
        className={`grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 ${className}`}
      >
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={`sk-${i}`}
            className="h-[280px] animate-pulse rounded-xl border border-white/[0.06] bg-black/25"
          />
        ))}
      </div>
    );
  }

  if (suggestions.length === 0) {
    return (
      <div
        className={`rounded-xl border border-dashed border-white/10 bg-black/20 px-6 py-8 text-center ${className}`}
      >
        <ShoppingBag className="mx-auto h-8 w-8 text-amber-400/70" aria-hidden />
        <p className="mt-3 text-sm font-semibold text-gray-200">You&apos;re caught up on our catalog</p>
        <Link
          href="/courses"
          className="mt-4 inline-flex rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500"
        >
          Browse all courses
        </Link>
      </div>
    );
  }

  const tutorLedSlugs = new Set<string>();

  return (
    <div
      className={`grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 ${className}`}
    >
      {suggestions.map((course) => {
        const href = catalogCourseLandingHref(course.slug, tutorLedSlugs, course.learningFormat);
        return (
          <article
            key={course.slug}
            className="flex flex-col overflow-hidden rounded-xl border border-amber-500/25 bg-gradient-to-b from-[#1b1305] via-[#141820] to-[#0a0a0a] transition hover:border-amber-300/50 hover:shadow-[0_0_24px_rgba(245,158,11,0.15)]"
          >
            <Link href={href} className="block">
              <div className="relative aspect-[16/10] bg-black/40">
                <Image
                  src={resolveCourseCardImage(course.image)}
                  alt={course.title}
                  width={640}
                  height={400}
                  unoptimized
                  className="h-full w-full object-cover"
                />
              </div>
            </Link>
            <div className="flex flex-col p-3.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-200/75">
                {course.level || "Self-paced"} · {course.duration || "Flexible"}
              </p>
              <h3 className="mt-1 line-clamp-2 text-sm font-bold leading-snug text-white">
                {course.title}
              </h3>
              {course.rating ? (
                <div className="mt-1.5 flex items-center gap-1 text-[11px] text-amber-200/90">
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" aria-hidden />
                  {course.rating}
                </div>
              ) : null}
              <CourseResolvedCardActions course={course} descriptionHref={href} className="px-0" />
            </div>
          </article>
        );
      })}
    </div>
  );
}
