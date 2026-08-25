"use client";

import { useLearnerPricing } from "@/lib/hooks/useLearnerPricing";

type Props = {
  /** Tutor-led numeric price in INR */
  inr?: number;
  /** Catalog price string e.g. "$49.00" or "₹12,999" */
  label?: string;
  /** Show label as-is (already regional / formatted) */
  exactLabel?: boolean;
  className?: string;
};

/** Renders the amount only. Sign-in CTA lives in `KnowPriceButton` / `PriceDescriptionButtonRow` so it is not duplicated. */
export function CoursePrice({ inr, label, exactLabel = false, className = "" }: Props) {
  const { showPrices, formatInr, formatPriceLabel, ready } = useLearnerPricing();

  if (!ready) {
    return (
      <span
        className={`inline-block h-7 min-w-[5rem] animate-pulse rounded-md bg-zinc-800/90 ${className}`}
        aria-hidden
      />
    );
  }

  if (!showPrices) return null;

  const text =
    inr != null ? formatInr(inr) : label ? (exactLabel ? label : formatPriceLabel(label)) : null;
  if (!text) return null;

  return <span className={className}>{text}</span>;
}
