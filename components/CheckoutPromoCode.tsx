"use client";

import { useEffect, useState } from "react";

export const PROMO_STORAGE_KEY = "sft_promo_code";

type Props = {
  slugs: string[];
  subtotal: number;
  currency: string;
  appliedLabel?: string;
  onApplied: (discount: number, label: string, code: string) => void;
  onCleared: () => void;
};

export default function CheckoutPromoCode({
  slugs,
  subtotal,
  currency,
  appliedLabel,
  onApplied,
  onCleared,
}: Props) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const applyCode = async (raw: string) => {
    const next = raw.trim().toUpperCase();
    if (!next || subtotal <= 0) return;
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/promotions/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: next, slugs, subtotal, currency }),
      });
      const data = (await res.json()) as { ok?: boolean; discount?: number; label?: string; error?: string };
      if (!data.ok) {
        setError(data.error ?? "Invalid code");
        window.sessionStorage.removeItem(PROMO_STORAGE_KEY);
        onCleared();
        return;
      }
      window.sessionStorage.setItem(PROMO_STORAGE_KEY, next);
      onApplied(Number(data.discount) || 0, data.label ?? next, next);
    } catch {
      setError("Could not apply code.");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (appliedLabel || subtotal <= 0) return;
    const saved = window.sessionStorage.getItem(PROMO_STORAGE_KEY)?.trim().toUpperCase() ?? "";
    if (saved) {
      setCode(saved);
      void applyCode(saved);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- restore once when totals are ready
  }, [subtotal]);

  return (
    <div className="mt-3 rounded-lg border border-white/10 bg-black/20 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Coupon / referral code</p>
      {appliedLabel ? (
        <div className="mt-2 flex items-center justify-between gap-2 text-xs">
          <span className="font-semibold text-emerald-300">{appliedLabel} applied</span>
          <button
            type="button"
            className="text-gray-400 hover:text-white"
            onClick={() => {
              window.sessionStorage.removeItem(PROMO_STORAGE_KEY);
              setCode("");
              onCleared();
            }}
          >
            Remove
          </button>
        </div>
      ) : (
        <div className="mt-2 flex gap-2">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="WELCOME10"
            className="min-w-0 flex-1 rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-amber-400/40"
          />
          <button
            type="button"
            disabled={busy || !code.trim()}
            onClick={() => void applyCode(code)}
            className="rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
          >
            {busy ? "…" : "Apply"}
          </button>
        </div>
      )}
      {error ? <p className="mt-1 text-[11px] text-rose-300">{error}</p> : null}
    </div>
  );
}
