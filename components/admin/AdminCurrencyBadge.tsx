"use client";

import { Coins, DollarSign, Euro, IndianRupee, PoundSterling } from "lucide-react";
import type { CurrencyDisplay } from "@/lib/price-currency-detect";

type Props = {
  currency: CurrencyDisplay;
  size?: "sm" | "md";
  showCode?: boolean;
  showName?: boolean;
  className?: string;
};

const TONE: Record<string, string> = {
  INR: "border-amber-500/35 bg-amber-500/15 text-amber-200",
  USD: "border-emerald-500/35 bg-emerald-500/15 text-emerald-200",
  EUR: "border-sky-500/35 bg-sky-500/15 text-sky-200",
  GBP: "border-indigo-500/35 bg-indigo-500/15 text-indigo-200",
  AED: "border-teal-500/35 bg-teal-500/15 text-teal-200",
  SAR: "border-cyan-500/35 bg-cyan-500/15 text-cyan-200",
  AUD: "border-lime-500/35 bg-lime-500/15 text-lime-200",
  CAD: "border-red-500/35 bg-red-500/15 text-red-200",
  SGD: "border-rose-500/35 bg-rose-500/15 text-rose-200",
};

function CurrencyIcon({ code, className }: { code: string; className?: string }) {
  const cn = className ?? "h-3.5 w-3.5 shrink-0";
  switch (code) {
    case "INR":
      return <IndianRupee className={cn} aria-hidden />;
    case "USD":
    case "AUD":
    case "CAD":
    case "SGD":
      return <DollarSign className={cn} aria-hidden />;
    case "EUR":
      return <Euro className={cn} aria-hidden />;
    case "GBP":
      return <PoundSterling className={cn} aria-hidden />;
    default:
      return <Coins className={cn} aria-hidden />;
  }
}

export default function AdminCurrencyBadge({
  currency,
  size = "sm",
  showCode = true,
  showName = false,
  className = "",
}: Props) {
  const tone = TONE[currency.code] ?? "border-violet-500/35 bg-violet-500/15 text-violet-200";
  const pad = size === "md" ? "px-2.5 py-1 text-xs" : "px-2 py-0.5 text-[10px]";

  return (
    <span
      className={`inline-flex max-w-full items-center gap-1 rounded-full border font-semibold tabular-nums ${tone} ${pad} ${className}`}
      title={currency.name}
    >
      <CurrencyIcon code={currency.code} />
      <span className="font-bold">{currency.symbol}</span>
      {showCode ? <span className="opacity-90">{currency.code}</span> : null}
      {showName ? <span className="hidden font-normal opacity-75 sm:inline">{currency.name}</span> : null}
    </span>
  );
}
