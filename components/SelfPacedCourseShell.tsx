"use client";

import { Suspense } from "react";
import type { ManagedCourse } from "@/lib/content-schema";
import SelfPacedCourseLanding from "@/components/SelfPacedCourseLanding";

type Props = { course: ManagedCourse };

function SelfPacedCourseLandingFallback() {
  return <div className="min-h-screen animate-pulse bg-[#0a0a0a]" aria-hidden />;
}

/**
 * Pre-payment self-paced landing — the designed Udemy-style page
 * (Overview / Curriculum / Instructor / Reviews / Q&A), not the tutor-led template.
 */
export default function SelfPacedCourseShell({ course }: Props) {
  return (
    <Suspense fallback={<SelfPacedCourseLandingFallback />}>
      <SelfPacedCourseLanding course={course} />
    </Suspense>
  );
}
