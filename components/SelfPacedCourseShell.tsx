"use client";

import { Suspense, useState } from "react";
import type { ManagedCourse } from "@/lib/content-schema";
import {
  foodSafetyMasterclassPostHero,
  isFoodSafetyMasterclassSlug,
  resolveSelfPacedLandingCourse,
} from "@/lib/food-safety-masterclass-page";
import { managedCourseToPostHero } from "@/lib/managed-course-to-post-hero";
import CourseLandingVisit from "@/components/CourseLandingVisit";
import SelfPacedCourseHero from "@/components/SelfPacedCourseHero";
import TutorLedPostHeroSections from "@/components/TutorLedPostHeroSections";

type Props = { course: ManagedCourse };

function SelfPacedCourseLandingFallback() {
  return <div className="min-h-screen animate-pulse bg-[#0a0a0a]" aria-hidden />;
}

/**
 * Pre-payment self-paced page — hero + program details.
 * (Udemy-style tabbed landing with Reviews/Q&A removed.)
 */
function SelfPacedSimpleLanding({ course }: Props) {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const displayCourse = resolveSelfPacedLandingCourse(course);
  const postHero = isFoodSafetyMasterclassSlug(displayCourse.slug)
    ? foodSafetyMasterclassPostHero(course)
    : managedCourseToPostHero(displayCourse);

  return (
    <div className="min-h-screen bg-black text-white">
      <CourseLandingVisit slug={displayCourse.slug} />
      <SelfPacedCourseHero course={displayCourse} />

      <div id="course-details" className="scroll-mt-24">
        <TutorLedPostHeroSections
          variant="self-paced"
          course={postHero}
          openFaq={openFaq}
          setOpenFaq={setOpenFaq}
          highlightsImageSrc={
            displayCourse.image?.trim() || "/course-food-safety.png"
          }
          classroomImageSrc="/h3.png"
        />
      </div>

      <div className="h-8" />
    </div>
  );
}

export default function SelfPacedCourseShell({ course }: Props) {
  return (
    <Suspense fallback={<SelfPacedCourseLandingFallback />}>
      <SelfPacedSimpleLanding course={course} />
    </Suspense>
  );
}
