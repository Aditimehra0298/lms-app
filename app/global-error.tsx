"use client";

import { useEffect } from "react";
import { COMPANY_DISPLAY_NAME } from "@/lib/contact-site-data";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[global-error]", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen bg-[#0a0a0a] text-white antialiased">
        <div className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
            {COMPANY_DISPLAY_NAME}
          </p>
          <h1 className="mt-3 text-3xl font-bold">LMS temporarily unavailable</h1>
          <p className="mt-3 text-sm text-zinc-400">
            A critical error stopped this page from loading. Refresh, or try again in a moment.
          </p>
          {error.digest ? (
            <p className="mt-2 font-mono text-[11px] text-zinc-600">Ref: {error.digest}</p>
          ) : null}
          <button
            type="button"
            onClick={reset}
            className="mt-8 rounded-lg bg-amber-500 px-5 py-2.5 text-sm font-semibold text-black hover:bg-amber-400"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
