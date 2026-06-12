"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import { Lock } from "lucide-react";
import { useLearnerPricing } from "@/lib/hooks/useLearnerPricing";
import {
  isLearnerLoggedIn,
  loginRedirectHref,
  subscribeLearnerAuth,
} from "@/lib/learner-session-client";

export function KnowPriceButton({ className = "" }: { className?: string }) {
  const { showPrices, ready } = useLearnerPricing();
  const pathname = usePathname();
  const loggedIn = useSyncExternalStore(
    subscribeLearnerAuth,
    () => isLearnerLoggedIn(),
    () => false,
  );

  /** Match SSR — auth/pricing load only on the client after PricingProvider sync. */
  if (!ready) return null;

  if (!loggedIn) {
    return (
      <Link
        href={loginRedirectHref(pathname || "/")}
        onClick={(e) => e.stopPropagation()}
        className={`inline-flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg border border-[#FFB800]/40 bg-[#FFB800]/10 px-2 py-2.5 text-xs font-bold text-[#FFB800] transition hover:bg-[#FFB800]/20 sm:px-3 sm:text-sm ${className}`}
      >
        <Lock className="h-3.5 w-3.5 shrink-0" aria-hidden />
        Sign in for price
      </Link>
    );
  }

  if (!showPrices) return null;

  /** Signed-in learners see regional prices automatically — no manual region control. */
  return null;
}
