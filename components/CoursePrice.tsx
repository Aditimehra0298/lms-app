"use client";

import { useLearnerPricing } from "@/lib/hooks/useLearnerPricing";
import { KnowPriceButton } from "@/components/KnowPriceButton";

type Props = {
  /** Tutor-led numeric price in INR */
  inr?: number;
  /** Catalog price string e.g. "$49.00" or "₹12,999" */
  label?: string;
  className?: string;
  /** Button-style lock CTA for hero / cards */
  variant?: "text" | "button" | "hero";
};

export function CoursePrice({ inr, label, className = "", variant = "text" }: Props) {
  const { showPrices, formatInr, formatPriceLabel, ready } = useLearnerPricing();

  if (!ready) {
    return (
      <span
        className={`inline-block h-7 min-w-[5rem] animate-pulse rounded-md bg-zinc-800/90 ${className}`}
        aria-hidden
      />
    );
  }

  if (showPrices) {
    const text = inr != null ? formatInr(inr) : label ? formatPriceLabel(label) : null;
    if (!text) return null;
    return <span className={className}>{text}</span>;
  }

  if (variant === "hero" || variant === "button") {
    return <KnowPriceButton className={className} />;
  }

  return <KnowPriceButton className={className} />;
}
