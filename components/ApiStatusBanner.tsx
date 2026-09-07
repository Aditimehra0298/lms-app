"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  API_NOTICE_EVENT,
  type ApiNoticeDetail,
} from "@/lib/api-error";
import { loginRedirectHrefForCurrentPage } from "@/lib/learner-session-client";

/**
 * Global banner for session expiry, CSRF refresh, and network/server failures.
 */
export default function ApiStatusBanner() {
  const [notice, setNotice] = useState<ApiNoticeDetail | null>(null);

  useEffect(() => {
    const onNotice = (event: Event) => {
      const detail = (event as CustomEvent<ApiNoticeDetail>).detail;
      if (!detail?.message) return;
      setNotice(detail);
    };
    window.addEventListener(API_NOTICE_EVENT, onNotice);
    return () => window.removeEventListener(API_NOTICE_EVENT, onNotice);
  }, []);

  if (!notice) return null;

  return (
    <div
      role="alert"
      className="sticky top-0 z-[80] border-b border-amber-500/30 bg-[#1a1408] px-4 py-3 text-amber-50 shadow-lg"
    >
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
        <p className="text-sm leading-snug">{notice.message}</p>
        <div className="flex flex-wrap items-center gap-2">
          {notice.needsRefresh ? (
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-md bg-amber-500 px-3 py-1.5 text-xs font-semibold text-black hover:bg-amber-400"
            >
              Refresh page
            </button>
          ) : null}
          {notice.needsSignIn ? (
            <Link
              href={loginRedirectHrefForCurrentPage()}
              className="rounded-md bg-white px-3 py-1.5 text-xs font-semibold text-black hover:bg-zinc-200"
            >
              Sign in
            </Link>
          ) : null}
          <button
            type="button"
            onClick={() => setNotice(null)}
            className="rounded-md border border-white/20 px-3 py-1.5 text-xs text-white/80 hover:bg-white/10"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
