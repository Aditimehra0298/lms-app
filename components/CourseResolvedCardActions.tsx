"use client";

import type { ManagedCourse } from "@/lib/content-schema";
import { useResolvedCoursePrice } from "@/lib/hooks/useResolvedCoursePrice";
import CourseCardActions from "@/components/CourseCardActions";
import { liveCatalogBatchCopy } from "@/lib/tutor-led-catalog-landings";

type Props = {
  course: {
    slug: string;
    price: string;
    oldPrice?: string;
    regionalPrices?: ManagedCourse["regionalPrices"];
    catalogBatchCount?: number;
    buyAllSlugs?: string[];
  };
  descriptionHref: string;
  className?: string;
};

/** Course grid footer with region-aware sale + list prices. */
export default function CourseResolvedCardActions({ course, descriptionHref, className }: Props) {
  const resolved = useResolvedCoursePrice(course);
  const batchCopy = liveCatalogBatchCopy(course.catalogBatchCount ?? 0);
  return (
    <CourseCardActions
      descriptionHref={descriptionHref}
      priceLabel={batchCopy ? undefined : resolved.price}
      oldPriceLabel={batchCopy ? undefined : resolved.oldPrice || undefined}
      discountPercent={batchCopy ? null : resolved.discountPercent}
      exactPriceLabels
      priceNote={batchCopy?.note}
      priceNoteHint={batchCopy?.hint}
      buyAllSlugs={course.buyAllSlugs}
      className={className}
    />
  );
}
