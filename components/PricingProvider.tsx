"use client";

import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { X, MapPin, Loader2 } from "lucide-react";
import {
  formatInrAsRegional,
  localizePriceString,
  type PricingRegion,
} from "@/lib/country-pricing";
import { countryFlagDisplays } from "@/lib/country-flag-image";
import { listCountryOptions } from "@/lib/iso-country-list";
import {
  cachePricingRegionFromCountryCode,
  fetchGuestPricingRegion,
  getCachedPricingRegion,
  isLearnerLoggedIn,
  PRICING_REGION_EVENT,
  refreshPricingRegion,
} from "@/lib/learner-session-client";
import { isPricingRevealed, setPricingRevealed } from "@/lib/pricing-reveal";

type PricingContextValue = {
  ready: boolean;
  showPrices: boolean;
  region: PricingRegion | null;
  countryLabel: string | null;
  formatInr: (amountInr: number) => string;
  formatPriceLabel: (priceStr: string) => string;
  openPricingPanel: () => void;
  closePricingPanel: () => void;
  panelOpen: boolean;
  panelCountryCode: string;
  setPanelCountryCode: (code: string) => void;
  confirmPricingRegion: () => void;
  detectLocationForPanel: () => Promise<void>;
  detectingLocation: boolean;
};

const PricingContext = createContext<PricingContextValue | null>(null);

export function usePricingContext(): PricingContextValue {
  const ctx = useContext(PricingContext);
  if (!ctx) {
    throw new Error("usePricingContext must be used within PricingProvider");
  }
  return ctx;
}

export function PricingProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [region, setRegion] = useState<PricingRegion | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelCountryCode, setPanelCountryCode] = useState("IN");
  const [detectingLocation, setDetectingLocation] = useState(false);

  const applyRegion = useCallback((next: PricingRegion | null) => {
    setRegion(next);
    if (next) setPanelCountryCode(next.countryCode);
  }, []);

  const sync = useCallback(async () => {
    const loggedIn = isLearnerLoggedIn();
    const cached = getCachedPricingRegion();
    const wasRevealed = isPricingRevealed();

    if (cached) applyRegion(cached);
    setRevealed(wasRevealed);

    if (loggedIn) {
      const fresh = await refreshPricingRegion();
      if (fresh) {
        applyRegion(fresh);
        setPricingRevealed(true);
        setRevealed(true);
      }
      setReady(true);
      return;
    }

    setReady(true);
  }, [applyRegion]);

  useLayoutEffect(() => {
    void sync();
    const onUpdate = () => {
      setRevealed(isPricingRevealed());
      applyRegion(getCachedPricingRegion());
    };
    window.addEventListener("sft_auth_updated", () => void sync());
    window.addEventListener(PRICING_REGION_EVENT, onUpdate);
    window.addEventListener("sft_pricing_reveal_updated", onUpdate);
    window.addEventListener("storage", onUpdate);
    return () => {
      window.removeEventListener("sft_auth_updated", () => void sync());
      window.removeEventListener(PRICING_REGION_EVENT, onUpdate);
      window.removeEventListener("sft_pricing_reveal_updated", onUpdate);
      window.removeEventListener("storage", onUpdate);
    };
  }, [sync, applyRegion]);

  const openPricingPanel = useCallback(() => {
    const cached = getCachedPricingRegion();
    if (cached) setPanelCountryCode(cached.countryCode);
    setPanelOpen(true);
  }, []);

  const closePricingPanel = useCallback(() => setPanelOpen(false), []);

  const confirmPricingRegion = useCallback(() => {
    const next = cachePricingRegionFromCountryCode(panelCountryCode);
    if (next) applyRegion(next);
    setPricingRevealed(true);
    setRevealed(true);
    setPanelOpen(false);
  }, [panelCountryCode, applyRegion]);

  const detectLocationForPanel = useCallback(async () => {
    setDetectingLocation(true);
    try {
      const detected = await fetchGuestPricingRegion();
      if (detected) setPanelCountryCode(detected.countryCode);
    } finally {
      setDetectingLocation(false);
    }
  }, []);

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

  const showPrices = revealed && region !== null;

  const value = useMemo(
    () => ({
      ready,
      showPrices,
      region,
      countryLabel: region ? `${region.countryName} (${region.currency})` : null,
      formatInr,
      formatPriceLabel,
      openPricingPanel,
      closePricingPanel,
      panelOpen,
      panelCountryCode,
      setPanelCountryCode,
      confirmPricingRegion,
      detectLocationForPanel,
      detectingLocation,
    }),
    [
      ready,
      showPrices,
      region,
      formatInr,
      formatPriceLabel,
      openPricingPanel,
      closePricingPanel,
      panelOpen,
      panelCountryCode,
      confirmPricingRegion,
      detectLocationForPanel,
      detectingLocation,
    ],
  );

  const countryOptions = useMemo(() => listCountryOptions(), []);
  const panelFlag = countryFlagDisplays(panelCountryCode, 32);

  return (
    <PricingContext.Provider value={value}>
      {children}
      {panelOpen ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-[2px]"
            aria-label="Close pricing panel"
            onClick={closePricingPanel}
          />
          <aside
            className="fixed inset-y-0 right-0 z-[201] flex w-full max-w-md flex-col border-l border-[#FFB800]/30 bg-zinc-950 shadow-[-12px_0_48px_rgba(0,0,0,0.55)]"
            role="dialog"
            aria-labelledby="pricing-panel-title"
          >
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <div>
                <p id="pricing-panel-title" className="text-lg font-bold text-white">
                  Know the price
                </p>
                <p className="mt-0.5 text-xs text-zinc-400">Choose your location to see localized pricing</p>
              </div>
              <button
                type="button"
                onClick={closePricingPanel}
                className="rounded-lg p-2 text-zinc-400 transition hover:bg-white/5 hover:text-white"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              <button
                type="button"
                onClick={() => void detectLocationForPanel()}
                disabled={detectingLocation}
                className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900/80 px-4 py-2.5 text-sm font-semibold text-zinc-200 transition hover:border-[#FFB800]/40 hover:text-white disabled:opacity-60"
              >
                {detectingLocation ? (
                  <Loader2 size={16} className="animate-spin text-[#FFB800]" />
                ) : (
                  <MapPin size={16} className="text-[#FFB800]" />
                )}
                {detectingLocation ? "Detecting location…" : "Use my current location"}
              </button>

              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Country / region
              </label>
              <div className="mb-3 flex items-center gap-2 rounded-xl border border-[#FFB800]/25 bg-[#FFB800]/5 px-3 py-2">
                {panelFlag[0]?.kind === "image" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={panelFlag[0].url} alt="" className="h-5 w-7 rounded object-cover" />
                ) : (
                  <span className="text-lg">{panelFlag[0]?.text ?? "🏳️"}</span>
                )}
                <span className="text-sm font-medium text-white">
                  {countryOptions.find((c) => c.code === panelCountryCode)?.name ?? panelCountryCode}
                </span>
              </div>
              <select
                value={panelCountryCode}
                onChange={(e) => setPanelCountryCode(e.target.value)}
                className="w-full rounded-xl border border-zinc-700 bg-black px-3 py-3 text-sm text-white outline-none focus:border-[#FFB800]/60"
              >
                {countryOptions.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name}
                  </option>
                ))}
              </select>
              <p className="mt-3 text-xs leading-relaxed text-zinc-500">
                Course descriptions stay visible without pricing. Prices appear on this page after you confirm your
                region — before you enroll or add to cart.
              </p>
            </div>

            <div className="border-t border-white/10 p-5">
              <button
                type="button"
                onClick={confirmPricingRegion}
                className="w-full rounded-xl bg-[#FFB800] py-3 text-sm font-extrabold text-black transition hover:bg-[#e5a500]"
              >
                Show prices for my region
              </button>
            </div>
          </aside>
        </>
      ) : null}
    </PricingContext.Provider>
  );
}
