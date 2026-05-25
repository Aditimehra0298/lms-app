"use client";

import { usePricingContext } from "@/components/PricingProvider";

/** Regional pricing visibility — prices show only after the user confirms location in the side panel (or signs in). */
export function useLearnerPricing() {
  return usePricingContext();
}
