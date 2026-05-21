"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { markCourseLandingViewed } from "@/lib/course-landing";

/** Call on course / tutor-led marketing pages so checkout can verify the learner saw the landing first. */
export function useCourseLandingVisit(slug: string) {
  const searchParams = useSearchParams();
  const enrollIntent = searchParams.get("enroll") === "1";

  useEffect(() => {
    if (slug.trim()) markCourseLandingViewed(slug);
  }, [slug]);

  return { enrollIntent };
}
