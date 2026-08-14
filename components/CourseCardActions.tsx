"use client";

import { type MouseEvent, type ReactNode } from "react";
import { CoursePrice } from "@/components/CoursePrice";
import { PriceDescriptionButtonRow } from "@/components/CourseActionButtons";
import { useLearnerPricing } from "@/lib/hooks/useLearnerPricing";

function stopBubble(e: MouseEvent) {
  e.stopPropagation();
}

type Props = {
  /** Course landing / detail page URL */
  descriptionHref: string;
  priceLabel?: string;
  priceInr?: number;
  oldPriceLabel?: string;
  oldPriceInr?: number;
  /** Shown as badge when list price is above sale */
  discountPercent?: number | null;
  /** Prices already formatted for the learner region */
  exactPriceLabels?: boolean;
  className?: string;
  trailing?: ReactNode;
};

/** Price + Description buttons for course grid cards (equal-height footers). */
export default function CourseCardActions({
  descriptionHref,
  priceLabel,
  priceInr,
  oldPriceLabel,
  oldPriceInr,
  discountPercent,
  exactPriceLabels = false,
  className = "",
  trailing,
}: Props) {
  const { ready } = useLearnerPricing();
  const hasCatalogPrice = priceLabel != null && priceLabel !== "";
  const hasInrPrice = priceInr != null;

  return (
    <div
      className={`mt-auto flex min-h-[88px] flex-col justify-end border-t border-white/5 pt-3 ${className}`}
      onClick={stopBubble}
    >
      {!ready ? (
        <div className="mb-2 h-6 animate-pulse rounded bg-zinc-800/80" aria-hidden />
      ) : hasCatalogPrice || hasInrPrice ? (
        <div className="mb-2 min-h-[1.75rem]">
          {hasInrPrice ? (
            <CoursePrice inr={priceInr} className="text-base font-bold text-amber-400 sm:text-lg" />
          ) : (
            <CoursePrice
              label={priceLabel}
              exactLabel={exactPriceLabels}
              className="text-base font-bold text-amber-400 sm:text-lg"
            />
          )}
          {hasInrPrice && oldPriceInr != null ? (
            <CoursePrice inr={oldPriceInr} className="ml-2 text-xs text-zinc-500 line-through" />
          ) : oldPriceLabel ? (
            <CoursePrice
              label={oldPriceLabel}
              exactLabel={exactPriceLabels}
              className="ml-2 text-xs text-zinc-500 line-through"
            />
          ) : null}
          {discountPercent != null ? (
            <span className="ml-1 rounded bg-violet-600/90 px-1.5 py-0.5 text-[10px] font-bold text-white">
              {discountPercent}% OFF
            </span>
          ) : null}
        </div>
      ) : (
        <p className="mb-2 min-h-[1.75rem] text-xs text-zinc-500">Price on request</p>
      )}

      <PriceDescriptionButtonRow descriptionHref={descriptionHref} />

      {trailing ? <div className="mt-2 flex justify-end">{trailing}</div> : null}
    </div>
  );
}
