"use client";

import Link from "next/link";
import { Lock } from "lucide-react";

type Props = {
  redirectPath?: string;
  className?: string;
  compact?: boolean;
};

export function SignInToViewPrices({ redirectPath, className = "", compact = false }: Props) {
  const redirect =
    redirectPath ??
    (typeof window !== "undefined" ? window.location.pathname + window.location.search : "/");

  const loginHref = `/account?mode=login&redirect=${encodeURIComponent(redirect)}`;
  const registerHref = `/account?mode=register&redirect=${encodeURIComponent(redirect)}`;

  if (compact) {
    return (
      <p className={`text-sm text-zinc-400 ${className}`}>
        <Lock className="mr-1 inline h-3.5 w-3.5 text-[#FFB800]" aria-hidden />
        <Link href={loginHref} className="font-semibold text-[#FFB800] hover:underline">
          Sign in
        </Link>{" "}
        to see pricing for your country
      </p>
    );
  }

  return (
    <div
      className={`rounded-xl border border-[#FFB800]/25 bg-[#FFB800]/5 px-4 py-5 text-center ${className}`}
    >
      <Lock className="mx-auto h-8 w-8 text-[#FFB800]/80" aria-hidden />
      <p className="mt-2 text-sm font-semibold text-white">Pricing available after sign-in</p>
      <p className="mt-1 text-xs leading-relaxed text-zinc-400">
        We detect your country from your IP address when you register or log in, then show localized
        course prices.
      </p>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        <Link
          href={loginHref}
          className="inline-flex rounded-lg bg-[#FFB800] px-4 py-2 text-sm font-bold text-black hover:bg-[#e5a600]"
        >
          Sign in
        </Link>
        <Link
          href={registerHref}
          className="inline-flex rounded-lg border border-zinc-600 px-4 py-2 text-sm font-semibold text-zinc-200 hover:border-zinc-500"
        >
          Register
        </Link>
      </div>
    </div>
  );
}
