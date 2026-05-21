"use client";

import { useEffect } from "react";
import { useCourseLandingVisit } from "@/lib/hooks/useCourseLandingVisit";

type Props = {
  slug: string;
  /** Element id to scroll to when URL has ?enroll=1 */
  enrollAnchorId?: string;
};

/** Marks landing as viewed; scrolls to enroll block after redirect from checkout/cart. */
export default function CourseLandingVisit({ slug, enrollAnchorId = "course-enroll" }: Props) {
  const { enrollIntent } = useCourseLandingVisit(slug);

  useEffect(() => {
    if (!enrollIntent || !enrollAnchorId) return;
    const t = window.setTimeout(() => {
      document.getElementById(enrollAnchorId)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 120);
    return () => window.clearTimeout(t);
  }, [enrollIntent, enrollAnchorId]);

  return null;
}
