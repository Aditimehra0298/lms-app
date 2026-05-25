"use client";

import { type ReactNode } from "react";
import { CoursePrice } from "@/components/CoursePrice";
import { PriceDescriptionButtonRow } from "@/components/CourseActionButtons";
import { useLearnerPricing } from "@/lib/hooks/useLearnerPricing";

export { KnowPriceButton } from "@/components/KnowPriceButton";
export { DescriptionButton, PriceDescriptionButtonRow } from "@/components/CourseActionButtons";

type Props = {
  courseTitle: string;
  description: string;
  /** Link to full program details on the landing page (e.g. #course-details) */
  descriptionHref?: string;
  extraParagraphs?: string[];
  highlights?: string[];
  priceLabel?: string;
  oldPriceLabel?: string;
  priceInr?: number;
  oldPriceInr?: number;
  discountPct?: number | null;
  discountBadge?: string | null;
  exactPriceLabels?: boolean;
  children?: ReactNode;
  className?: string;
};

export default function CourseEnrollActions({
  courseTitle: _courseTitle,
  description: _description,
  descriptionHref,
  extraParagraphs: _extraParagraphs = [],
  highlights: _highlights = [],
  priceLabel,
  oldPriceLabel,
  priceInr,
  oldPriceInr,
  discountPct,
  discountBadge,
  exactPriceLabels = false,
  children,
  className = "",
}: Props) {
  const { showPrices, ready } = useLearnerPricing();
  const hasCatalogPrice = priceLabel != null;
  const hasInrPrice = priceInr != null;

  return (
    <div className={className}>
      {!ready ? (
        <div className="mb-3 h-8 animate-pulse rounded-lg bg-zinc-800/80" aria-hidden />
      ) : showPrices && (hasCatalogPrice || hasInrPrice) ? (
        <div className="mb-3 flex flex-wrap items-end gap-2">
          {hasInrPrice ? (
            <CoursePrice inr={priceInr} className="text-2xl font-extrabold text-white sm:text-3xl" />
          ) : (
            <CoursePrice
              label={priceLabel}
              exactLabel={exactPriceLabels}
              className="text-2xl font-extrabold text-white"
            />
          )}
          {hasInrPrice && oldPriceInr != null ? (
            <CoursePrice inr={oldPriceInr} className="text-sm text-zinc-500 line-through" />
          ) : oldPriceLabel ? (
            <CoursePrice
              label={oldPriceLabel}
              exactLabel={exactPriceLabels}
              className="text-sm text-zinc-500 line-through"
            />
          ) : null}
          {discountBadge ? (
            <span className="rounded-md bg-[#FFB800] px-2 py-0.5 text-[10px] font-bold text-black">{discountBadge}</span>
          ) : discountPct != null ? (
            <span className="rounded bg-[#FFB800]/15 px-2 py-0.5 text-xs font-bold text-[#FFB800]">{discountPct}% off</span>
          ) : null}
        </div>
      ) : null}

      <PriceDescriptionButtonRow descriptionHref={descriptionHref} />

      {children ? <div className="mt-4">{children}</div> : null}
    </div>
  );
}
