"use client";

import { type ReactNode } from "react";
import { CheckCircle2 } from "lucide-react";
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
  /** Show list price in INR only — no regional conversion or change-region control. */
  fixedInrOnly?: boolean;
  children?: ReactNode;
  className?: string;
};

export default function CourseEnrollActions({
  courseTitle: _courseTitle,
  description: _description,
  descriptionHref,
  extraParagraphs: _extraParagraphs = [],
  highlights = [],
  priceLabel,
  oldPriceLabel,
  priceInr,
  oldPriceInr,
  discountPct,
  discountBadge,
  exactPriceLabels = false,
  fixedInrOnly = false,
  children,
  className = "",
}: Props) {
  const { showPrices, ready } = useLearnerPricing();
  const hasCatalogPrice = priceLabel != null;
  const hasInrPrice = priceInr != null;
  const showPriceBlock = fixedInrOnly ? hasInrPrice || hasCatalogPrice : showPrices && (hasCatalogPrice || hasInrPrice);

  const formatFixedInr = (amount: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);

  return (
    <div className={className}>
      {!ready && !fixedInrOnly ? (
        <div className="mb-3 h-8 animate-pulse rounded-lg bg-zinc-800/80" aria-hidden />
      ) : showPriceBlock ? (
        <div className="mb-2 flex flex-wrap items-end gap-2">
          {hasInrPrice ? (
            fixedInrOnly ? (
              <span className="text-2xl font-extrabold text-white sm:text-3xl">{formatFixedInr(priceInr)}</span>
            ) : (
              <CoursePrice inr={priceInr} className="text-2xl font-extrabold text-white sm:text-3xl" />
            )
          ) : (
            <CoursePrice
              label={priceLabel}
              exactLabel={exactPriceLabels}
              className="text-2xl font-extrabold text-white"
            />
          )}
          {hasInrPrice && oldPriceInr != null ? (
            fixedInrOnly ? (
              <span className="text-sm text-zinc-500 line-through">{formatFixedInr(oldPriceInr)}</span>
            ) : (
              <CoursePrice inr={oldPriceInr} className="text-sm text-zinc-500 line-through" />
            )
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

      {fixedInrOnly && highlights.length > 0 ? (
        <ul className="grid gap-1.5 sm:grid-cols-2">
          {highlights.slice(0, 6).map((item) => (
            <li key={item} className="flex items-start gap-1.5 text-[11px] leading-snug text-zinc-400">
              <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-[#FFB800]" aria-hidden />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      ) : (
        <PriceDescriptionButtonRow descriptionHref={descriptionHref} hideKnowPrice={fixedInrOnly} />
      )}

      {children ? <div className="mt-4">{children}</div> : null}
    </div>
  );
}
