"use client";

import type { ManagedCourse } from "@/lib/content-schema";
import { useResolvedCoursePrice } from "@/lib/hooks/useResolvedCoursePrice";
import CourseCardActions from "@/components/CourseCardActions";

type Props = {
  course: Pick<ManagedCourse, "price" | "oldPrice" | "regionalPrices" | "slug">;
  descriptionHref: string;
  className?: string;
};

/** Course grid footer with region-aware sale + list prices. */
export default function CourseResolvedCardActions({ course, descriptionHref, className }: Props) {
  const resolved = useResolvedCoursePrice(course);
  return (
    <CourseCardActions
      descriptionHref={descriptionHref}
      priceLabel={resolved.price}
      oldPriceLabel={resolved.oldPrice || undefined}
      discountPercent={resolved.discountPercent}
      exactPriceLabels
      className={className}
    />
  );
}
