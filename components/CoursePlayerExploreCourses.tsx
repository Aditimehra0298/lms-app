"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState, type RefObject } from "react";
import { ArrowRight, Compass } from "lucide-react";
import type { AdminContent, ManagedCourse } from "@/lib/content-schema";
import { readLearnerProfileFromStorage } from "@/lib/auth-profile";
import { readLearningPreferences } from "@/lib/learner-learning-preferences";
import { rankExploreCourses } from "@/lib/learner-course-recommendations";
import { readPurchasedCourses } from "@/lib/tutor-led-enrollment-client";
import { readJsonResponse } from "@/lib/safe-json";

const GAP_THRESHOLD_PX = 140;
const PREVIEW_LIMIT = 3;

type Props = {
  currentSlug: string;
  leftColumnRef: RefObject<HTMLElement | null>;
  sidebarRef: RefObject<HTMLElement | null>;
  layoutVersion?: number;
};

function useSidebarHasGap(
  leftColumnRef: RefObject<HTMLElement | null>,
  sidebarRef: RefObject<HTMLElement | null>,
  layoutVersion: number,
) {
  const [hasGap, setHasGap] = useState(false);

  useEffect(() => {
    const measure = () => {
      const left = leftColumnRef.current;
      const aside = sidebarRef.current;
      if (!left || !aside || window.innerWidth < 1280) {
        setHasGap(false);
        return;
      }
      setHasGap(aside.offsetHeight - left.offsetHeight > GAP_THRESHOLD_PX);
    };

    measure();
    const left = leftColumnRef.current;
    const aside = sidebarRef.current;
    const observer = new ResizeObserver(measure);
    if (left) observer.observe(left);
    if (aside) observer.observe(aside);
    window.addEventListener("resize", measure);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [leftColumnRef, sidebarRef, layoutVersion]);

  return hasGap;
}

export function CoursePlayerExploreCourses({
  currentSlug,
  leftColumnRef,
  sidebarRef,
  layoutVersion = 0,
}: Props) {
  const hasGap = useSidebarHasGap(leftColumnRef, sidebarRef, layoutVersion);
  const [catalog, setCatalog] = useState<ManagedCourse[]>([]);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/admin/content", { cache: "no-store" })
      .then(async (res) => (res.ok ? readJsonResponse(res, null) : null))
      .then((data) => {
        if (cancelled || !data) return;
        const courses = (data as AdminContent).managedCourses ?? [];
        setCatalog(Array.isArray(courses) ? courses : []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const exploreCourses = useMemo(() => {
    const current = currentSlug.trim().toLowerCase();
    const enrolled = new Set<string>();
    for (const row of readPurchasedCourses()) {
      const slug = row.slug?.trim().toLowerCase();
      if (slug) enrolled.add(slug);
    }
    enrolled.add(current);

    const available = catalog.filter(
      (course) =>
        course.slug?.trim() &&
        course.published !== false &&
        course.settings?.showInCatalog !== false &&
        !enrolled.has(course.slug.trim().toLowerCase()),
    );

    const ranked = rankExploreCourses(available, {
      profile: readLearnerProfileFromStorage(),
      preferences: readLearningPreferences(),
      enrolledSlugs: enrolled,
    });

    return ranked.slice(0, PREVIEW_LIMIT).map((row) => row.course);
  }, [catalog, currentSlug]);

  if (!hasGap || exploreCourses.length === 0) return null;

  return (
    <article className="rounded-xl border border-white/10 bg-[#0c1324] p-4">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <h3 className="inline-flex items-center gap-2 text-lg font-bold">
            <Compass size={18} className="text-amber-300" />
            Explore courses
          </h3>
          <p className="mt-1 text-xs text-gray-400">Recommended programs you have not enrolled in yet.</p>
        </div>
        <Link
          href="/courses"
          className="shrink-0 text-xs font-semibold text-violet-300 hover:text-violet-200"
        >
          View all
        </Link>
      </div>
      <ul className="space-y-2">
        {exploreCourses.map((course) => {
          const slug = course.slug?.trim() ?? "";
          return (
            <li key={slug}>
              <Link
                href={`/courses/${encodeURIComponent(slug)}`}
                className="group flex gap-3 rounded-lg border border-white/10 bg-black/25 p-2 transition hover:border-amber-400/35 hover:bg-black/40"
              >
                <div className="relative h-14 w-16 shrink-0 overflow-hidden rounded-md border border-white/10 bg-black/30">
                  {course.image?.trim() ? (
                    <Image
                      src={course.image.trim()}
                      alt={course.title}
                      fill
                      className="object-cover"
                      sizes="64px"
                      unoptimized={course.image.trim().startsWith("http")}
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-[8px] text-gray-600">—</div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-xs font-semibold leading-snug group-hover:text-amber-100">
                    {course.title}
                  </p>
                  <p className="mt-0.5 text-[10px] text-gray-500">
                    {course.duration?.trim() || course.level?.trim() || "Self-paced"}
                  </p>
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
    </article>
  );
}
