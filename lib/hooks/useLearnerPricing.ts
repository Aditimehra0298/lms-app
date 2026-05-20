"use client";

import { useCallback, useLayoutEffect, useState } from "react";
import {
  formatInrAsRegional,
  localizePriceString,
  type PricingRegion,
} from "@/lib/country-pricing";
import {
  fetchGuestPricingRegion,
  getCachedPricingRegion,
  isLearnerLoggedIn,
  PRICING_REGION_EVENT,
  refreshPricingRegion,
} from "@/lib/learner-session-client";

export function useLearnerPricing() {
  const [showPrices, setShowPrices] = useState(false);
  const [region, setRegion] = useState<PricingRegion | null>(null);
  const [ready, setReady] = useState(false);

  const applyRegion = useCallback((next: PricingRegion | null) => {
    setRegion(next);
    setShowPrices(Boolean(next));
  }, []);

  const sync = useCallback(async () => {
    const loggedIn = isLearnerLoggedIn();
    const cached = getCachedPricingRegion();

    if (cached) applyRegion(cached);

    if (loggedIn) {
      setReady(true);
      const fresh = await refreshPricingRegion();
      if (fresh) applyRegion(fresh);
      return;
    }

    if (cached) {
      setReady(true);
      return;
    }

    const guest = await fetchGuestPricingRegion();
    applyRegion(guest);
    setReady(true);
  }, [applyRegion]);

  useLayoutEffect(() => {
    void sync();
    const onAuthUpdate = () => void sync();
    const onPricingCached = () => applyRegion(getCachedPricingRegion());
    window.addEventListener("sft_auth_updated", onAuthUpdate);
    window.addEventListener(PRICING_REGION_EVENT, onPricingCached);
    window.addEventListener("storage", onAuthUpdate);
    return () => {
      window.removeEventListener("sft_auth_updated", onAuthUpdate);
      window.removeEventListener(PRICING_REGION_EVENT, onPricingCached);
      window.removeEventListener("storage", onAuthUpdate);
    };
  }, [sync, applyRegion]);

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
