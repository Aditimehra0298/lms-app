"use client";

import { IndianRupee } from "lucide-react";
import { useLearnerPricing } from "@/lib/hooks/useLearnerPricing";

export function KnowPriceButton({ className = "" }: { className?: string }) {
  const { openPricingPanel } = useLearnerPricing();

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        openPricingPanel();
      }}
      className={`inline-flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg border border-[#FFB800]/40 bg-[#FFB800]/10 px-2 py-2.5 text-xs font-bold text-[#FFB800] transition hover:bg-[#FFB800]/20 sm:px-3 sm:text-sm ${className}`}
    >
      <IndianRupee className="h-3.5 w-3.5 shrink-0" aria-hidden />
      Price
    </button>
  );
}
