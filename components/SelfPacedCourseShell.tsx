"use client";

import { Suspense } from "react";
import type { ManagedCourse } from "@/lib/content-schema";
import { resolveSelfPacedLandingCourse } from "@/lib/food-safety-masterclass-page";
import CourseLandingVisit from "@/components/CourseLandingVisit";
import SelfPacedCourseLanding from "@/components/SelfPacedCourseLanding";

type Props = { course: ManagedCourse };

function SelfPacedCourseLandingFallback() {
  return <div className="min-h-screen animate-pulse bg-[#0a0a0a]" aria-hidden />;
}

/**
 * Pre-payment self-paced marketing page — Udemy-style layout
 * (hero, floating enroll card, stats bar, tabs, sidebar, bottom CTA).
 */
export default function SelfPacedCourseShell({ course }: Props) {
  const displayCourse = resolveSelfPacedLandingCourse(course);

  return (
    <>
      <CourseLandingVisit slug={displayCourse.slug} />
      <Suspense fallback={<SelfPacedCourseLandingFallback />}>
        <SelfPacedCourseLanding course={displayCourse} />
      </Suspense>
    </>
  );
}
