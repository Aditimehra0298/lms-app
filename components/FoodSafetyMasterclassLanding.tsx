"use client";

import { useState } from "react";
import type { ManagedCourse } from "@/lib/content-schema";
import {
  foodSafetyMasterclassPostHero,
  mergeFoodSafetyCourseForLanding,
} from "@/lib/food-safety-masterclass-page";
import CourseLandingVisit from "@/components/CourseLandingVisit";
import SelfPacedCourseHero from "@/components/SelfPacedCourseHero";
import TutorLedPostHeroSections from "@/components/TutorLedPostHeroSections";

type Props = { course: ManagedCourse };

/**
 * Hardcoded pre-payment page for food-safety-masterclass only.
 * Hero + gold all-modules curriculum + original post-hero sections.
 */
export default function FoodSafetyMasterclassLanding({ course }: Props) {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const displayCourse = mergeFoodSafetyCourseForLanding(course);
  const postHero = foodSafetyMasterclassPostHero(course);

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
          highlightsImageSrc="/course-food-safety.png"
          classroomImageSrc="/h3.png"
        />
      </div>

      <div className="h-8" />
    </div>
  );
}
