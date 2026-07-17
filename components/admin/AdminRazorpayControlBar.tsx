"use client";

import { useState } from "react";
import { Loader2, RefreshCw, ShieldAlert, ShieldCheck } from "lucide-react";

export type RazorpayAdminStatus = {
  configured: boolean;
  mode: string;
  keyIdMasked: string | null;
  dashboardUrl: string;
};

type Props = {
  razorpay: RazorpayAdminStatus | null;
  pendingCount?: number;
  onSyncPending: () => Promise<void>;
  busy?: boolean;
};

export default function AdminRazorpayControlBar({
  razorpay,
  pendingCount = 0,
  onSyncPending,
  busy = false,
}: Props) {
  const [localBusy, setLocalBusy] = useState(false);
  const working = busy || localBusy;

  const runSync = async () => {
    setLocalBusy(true);
    try {
      await onSyncPending();
    } finally {
      setLocalBusy(false);
    }
  };

  const ready = Boolean(razorpay?.configured);

  return (
    <section className="rounded-xl border border-sky-500/25 bg-sky-500/[0.07] p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex gap-3">
          <div
            className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ring-1 ${
              ready
                ? "bg-emerald-500/20 ring-emerald-400/30 text-emerald-200"
                : "bg-amber-500/20 ring-amber-400/30 text-amber-200"
            }`}
          >
            {ready ? <ShieldCheck className="h-5 w-5" /> : <ShieldAlert className="h-5 w-5" />}
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">Payment updates</h2>
            <p className="mt-1 max-w-xl text-xs text-gray-400">
              Refresh waiting checkouts so paid learners get access, and unfinished ones are cleared.
            </p>
            <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
              <span
                className={`rounded-full px-2 py-0.5 font-semibold ring-1 ${
                  ready
                    ? "bg-emerald-500/15 text-emerald-200 ring-emerald-400/25"
                    : "bg-amber-500/15 text-amber-200 ring-amber-400/25"
                }`}
              >
                {ready ? "Online payments ready" : "Online payments unavailable"}
              </span>
              {ready ? (
                <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-amber-200 ring-1 ring-amber-400/20">
                  Waiting: {pendingCount}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void runSync()}
          disabled={working || !ready}
          className="inline-flex items-center gap-1.5 rounded-lg border border-sky-400/30 bg-sky-500/15 px-3 py-1.5 text-xs font-semibold text-sky-100 hover:bg-sky-500/25 disabled:opacity-50"
        >
          {working ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          Update waiting payments
        </button>
      </div>
      {!ready ? (
        <p className="mt-3 text-[11px] text-amber-100/90">
          Online payment updates are temporarily unavailable. Ask your technical team to enable payments, then try
          again.
        </p>
      ) : null}
    </section>
  );
}
