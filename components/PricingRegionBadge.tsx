"use client";

import { CountryFlagImg } from "@/components/CountryFlagImg";
import { useLearnerPricing } from "@/lib/hooks/useLearnerPricing";

type Props = {
  className?: string;
  compact?: boolean;
};

/** Country flag only — pricing region applies in the background. */
export function PricingRegionBadge({ className = "", compact = false }: Props) {
  const { showPrices, region } = useLearnerPricing();

  if (!showPrices || !region) return null;

  const flagClass = compact
    ? "h-9 w-9 rounded-full ring-1 ring-white/15"
    : "h-8 w-8 rounded-full ring-1 ring-white/15";

  return (
    <span
      title={`${region.countryName}`}
      aria-label={region.countryName}
      className={`inline-flex shrink-0 items-center justify-center ${className}`}
    >
      <CountryFlagImg code={region.countryCode} width={48} className={flagClass} />
    </span>
  );
}
