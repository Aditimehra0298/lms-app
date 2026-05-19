"use client";

import Link from "next/link";
import { Lock } from "lucide-react";
import { useLearnerPricing } from "@/lib/hooks/useLearnerPricing";
import { loginRedirectHref, registerRedirectHref } from "@/lib/learner-session-client";

type Props = {
  /** Tutor-led numeric price in INR */
  inr?: number;
  /** Catalog price string e.g. "$49.00" or "₹12,999" */
  label?: string;
  className?: string;
  /** Button-style lock CTA for hero / cards */
  variant?: "text" | "button" | "hero";
};

export function CoursePrice({ inr, label, className = "", variant = "text" }: Props) {
  const { showPrices, formatInr, formatPriceLabel, ready, countryLabel } = useLearnerPricing();

  if (!ready) {
    return (
      <span
        className={`inline-block h-7 min-w-[5rem] animate-pulse rounded-md bg-zinc-800/90 ${className}`}
        aria-hidden
      />
    );
  }

  if (showPrices) {
    const text =
      inr != null ? formatInr(inr) : label ? formatPriceLabel(label) : null;
    if (!text) return null;
    return (
      <span className={className} title={countryLabel ?? undefined}>
        {text}
      </span>
    );
  }

  const loginHref = loginRedirectHref();
  const registerHref = registerRedirectHref();

  if (variant === "hero") {
    return (
      <div className={`rounded-xl border border-[#FFB800]/30 bg-[#FFB800]/5 p-4 ${className}`}>
        <Lock className="h-6 w-6 text-[#FFB800]" aria-hidden />
        <p className="mt-2 text-sm font-semibold text-white">Sign in to see your price</p>
        <p className="mt-1 text-xs text-zinc-400">
          We use your IP address at login to detect your country and show localized pricing.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            href={loginHref}
            className="rounded-lg bg-[#FFB800] px-4 py-2 text-xs font-bold text-black hover:bg-[#e5a600]"
          >
            Login
          </Link>
          <Link
            href={registerHref}
            className="rounded-lg border border-zinc-600 px-4 py-2 text-xs font-semibold text-zinc-200"
          >
            Register
          </Link>
        </div>
      </div>
    );
  }

  if (variant === "button") {
    return (
      <Link
        href={loginHref}
        className={`inline-flex items-center gap-1.5 rounded-lg border border-[#FFB800]/40 bg-[#FFB800]/10 px-3 py-2 text-xs font-bold text-[#FFB800] transition hover:bg-[#FFB800]/20 ${className}`}
      >
        <Lock className="h-3.5 w-3.5" aria-hidden />
        Sign in for price
      </Link>
    );
  }

  return (
    <Link
      href={loginHref}
      className={`inline-flex items-center gap-1 text-sm font-semibold text-[#FFB800] hover:underline ${className}`}
    >
      <Lock className="h-3.5 w-3.5 shrink-0" aria-hidden />
      Sign in for price
    </Link>
  );
}
