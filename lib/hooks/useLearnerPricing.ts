"use client";

import { useCallback, useLayoutEffect, useState } from "react";
import {
  formatInrAsRegional,
  localizePriceString,
  type PricingRegion,
} from "@/lib/country-pricing";
import {
  getCachedPricingRegion,
  isLearnerLoggedIn,
  refreshPricingRegion,
} from "@/lib/learner-session-client";

export function useLearnerPricing() {
  const [showPrices, setShowPrices] = useState(false);
  const [region, setRegion] = useState<PricingRegion | null>(null);
  const [ready, setReady] = useState(false);

  const sync = useCallback(async () => {
    const loggedIn = isLearnerLoggedIn();
    setShowPrices(loggedIn);

    if (!loggedIn) {
      setRegion(null);
      setReady(true);
      return;
    }

    const cached = getCachedPricingRegion();
    if (cached) setRegion(cached);
    setReady(true);

    const fresh = await refreshPricingRegion();
    if (fresh) setRegion(fresh);
  }, []);

  useLayoutEffect(() => {
    void sync();
    const onAuth = () => void sync();
    window.addEventListener("sft_auth_updated", onAuth);
    window.addEventListener("storage", onAuth);
    return () => {
      window.removeEventListener("sft_auth_updated", onAuth);
      window.removeEventListener("storage", onAuth);
    };
  }, [sync]);

  const formatInr = useCallback(
    (amountInr: number) => {
      if (!region) return `₹${amountInr.toLocaleString("en-IN")}`;
      return formatInrAsRegional(amountInr, region);
    },
    [region],
  );

  const formatPriceLabel = useCallback(
    (priceStr: string) => {
      if (!region) return priceStr;
      return localizePriceString(priceStr, region);
    },
    [region],
  );

  return {
    ready,
    showPrices,
    region,
    formatInr,
    formatPriceLabel,
    countryLabel: region ? `${region.countryName} (${region.currency})` : null,
  };
}
