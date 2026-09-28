"use client";

import { useMemo } from "react";
import type { ManagedCourse } from "@/lib/content-schema";
import { resolveCoursePrices, type ResolvedCoursePrices } from "@/lib/course-regional-pricing";
import { useLearnerPricing } from "@/lib/hooks/useLearnerPricing";

export function useResolvedCoursePrice(course: {
  price: string;
  oldPrice?: string;
  regionalPrices?: ManagedCourse["regionalPrices"];
}): ResolvedCoursePrices {
  const { region } = useLearnerPricing();
  return useMemo(() => resolveCoursePrices(course, region), [course, region]);
}
