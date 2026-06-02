"use client";

import { CountryFlagImg } from "@/components/CountryFlagImg";
import { useLearnerPricing } from "@/lib/hooks/useLearnerPricing";

type Props = {
  className?: string;
  compact?: boolean;
};

/**
 * Country flag in the header — display only.
 * Pricing country comes from MySQL (set at login/register from IP, Google locale, or phone country).
 */
export function PricingRegionBadge({ className = "", compact = false }: Props) {
  const { showPrices, region } = useLearnerPricing();

  if (!showPrices || !region) return null;

  const label = `Prices in ${region.countryName} (${region.currency})`;
  const flagClass = compact
    ? "h-9 w-9 rounded-full ring-1 ring-white/15"
    : "h-8 w-8 rounded-full ring-1 ring-white/15";

  return (
    <span
      title={label}
      aria-label={label}
      className={`inline-flex shrink-0 items-center justify-center ${className}`}
    >
      <CountryFlagImg code={region.countryCode} width={48} className={flagClass} />
    </span>
  );
}
