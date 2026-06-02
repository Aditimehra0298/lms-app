"use client";

import { usePricingContext } from "@/components/PricingProvider";

/** Regional pricing visibility — prices show only after the learner signs in (country from profile / IP). */
export function useLearnerPricing() {
  return usePricingContext();
}
