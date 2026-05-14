"use client";

import { useState } from "react";
import type { ManagedCourse } from "@/lib/content-schema";
import { managedCourseToPostHero } from "@/lib/managed-course-to-post-hero";
import SelfPacedCourseHero from "@/components/SelfPacedCourseHero";
import TutorLedPostHeroSections from "@/components/TutorLedPostHeroSections";

type Props = { course: ManagedCourse };

export default function SelfPacedCourseShell({ course }: Props) {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const postHero = managedCourseToPostHero(course);

  return (
    <div className="min-h-screen bg-black text-white">
      <SelfPacedCourseHero course={course} />
      <TutorLedPostHeroSections
        variant="self-paced"
        course={postHero}
        openFaq={openFaq}
        setOpenFaq={setOpenFaq}
        highlightsImageSrc="/h2.png"
        classroomImageSrc="/h3.png"
      />
      <div className="h-8" />
    </div>
  );
}
