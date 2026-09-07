"use client";

import { useEffect } from "react";
import Link from "next/link";
import { COMPANY_DISPLAY_NAME } from "@/lib/contact-site-data";

type Props = {
  error: Error & { digest?: string };
  reset: () => void;
};

/** Shared recovery UI for app/error.tsx and admin/error.tsx */
export default function RouteErrorPanel({ error, reset }: Props) {
  useEffect(() => {
    console.error("[route-error]", error);
  }, [error]);

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center bg-[#0a0a0a] px-6 py-16 text-center text-white">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
        {COMPANY_DISPLAY_NAME}
      </p>
      <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
        Something went wrong
      </h1>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-zinc-400">
        This page hit an unexpected error. You can try again, or go back to a safe page.
        Your learning progress is saved on the server when you are signed in.
      </p>
      {error.digest ? (
        <p className="mt-2 font-mono text-[11px] text-zinc-600">Ref: {error.digest}</p>
      ) : null}
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-lg bg-amber-500 px-5 py-2.5 text-sm font-semibold text-black hover:bg-amber-400"
        >
          Try again
        </button>
        <Link
          href="/"
          className="rounded-lg border border-white/20 px-5 py-2.5 text-sm font-medium text-white hover:bg-white/5"
        >
          Home
        </Link>
        <Link
          href="/my-learning"
          className="rounded-lg border border-white/20 px-5 py-2.5 text-sm font-medium text-white hover:bg-white/5"
        >
          My learning
        </Link>
      </div>
    </div>
  );
}
