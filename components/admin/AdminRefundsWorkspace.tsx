"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Loader2,
  RefreshCw,
  RotateCcw,
  Search,
  Undo2,
} from "lucide-react";
import { getLearnerEmail } from "@/lib/learner-session-client";
import type { AdminPaymentRow } from "@/lib/payment-types";
import {
  commerceMethodLabel,
  commerceStatusLabel,
  commerceStatusTone,
  formatCommerceWhen,
  isRefundablePayment,
  orderIdForPayment,
} from "@/lib/admin-commerce-ui";

type ViewFilter = "eligible" | "refunded" | "all";

const COLUMNS = [
  "Date",
  "Learner",
  "Course(s)",
  "Amount",
  "Payment type",
  "Status",
  "Reference",
  "Actions",
] as const;

export default function AdminRefundsWorkspace() {
  const [payments, setPayments] = useState<AdminPaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewFilter, setViewFilter] = useState<ViewFilter>("eligible");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [refundTarget, setRefundTarget] = useState<AdminPaymentRow | null>(null);
  const [refundNote, setRefundNote] = useState("");
  const [revokeAccess, setRevokeAccess] = useState(true);
  const [viaGateway, setViaGateway] = useState(true);
  const [razorpayConfigured, setRazorpayConfigured] = useState(false);

  const adminHeaders = useCallback((): Record<string, string> => {
    const email = getLearnerEmail();
    return {
      "Content-Type": "application/json",
      ...(email ? { "x-admin-email": email } : {}),
    };
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.set("q", searchQuery.trim());
      const res = await fetch(`/api/admin/payments?${params.toString()}`, {
        headers: adminHeaders(),
        cache: "no-store",
      });
      const data = (await res.json()) as {
        ok?: boolean;
        message?: string;
        payments?: AdminPaymentRow[];
        razorpay?: { configured?: boolean };
      };
      if (!res.ok || !data.ok) throw new Error(data.message ?? "Could not load refunds");
      setPayments(data.payments ?? []);
      setRazorpayConfigured(Boolean(data.razorpay?.configured));
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Could not load refunds");
      setPayments([]);
    } finally {
      setLoading(false);
    }
  }, [adminHeaders, searchQuery]);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = useMemo(() => {
    return payments.filter((row) => {
      if (viewFilter === "eligible") return isRefundablePayment(row);
      if (viewFilter === "refunded") return row.status === "refunded";
      return isRefundablePayment(row) || row.status === "refunded";
    });
  }, [payments, viewFilter]);

  const stats = useMemo(
    () => ({
      eligible: payments.filter(isRefundablePayment).length,
      refunded: payments.filter((r) => r.status === "refunded").length,
      refundedAmount: payments
        .filter((r) => r.status === "refunded" && r.method === "razorpay")
        .reduce((sum, r) => sum + r.amount, 0),
    }),
    [payments],
  );

  const submitRefund = async () => {
    if (!refundTarget) return;
    setBusyId(refundTarget.id);
    setNotice(null);
    setLoadError(null);
    try {
      const res = await fetch("/api/admin/payments", {
        method: "POST",
        headers: adminHeaders(),
        body: JSON.stringify({
          action: "refund",
          paymentId: refundTarget.id,
          refundNote: refundNote.trim() || undefined,
          revokeAccess,
          viaGateway:
            viaGateway &&
            refundTarget.method === "razorpay" &&
            refundTarget.status === "paid" &&
            Boolean(refundTarget.razorpayPaymentId),
        }),
      });
      const data = (await res.json()) as { ok?: boolean; message?: string; razorpayRefundId?: string };
      if (!res.ok || !data.ok) throw new Error(data.message ?? "Refund failed");
      setNotice(data.message ?? "Refund recorded.");
      setRefundTarget(null);
      setRefundNote("");
      setRevokeAccess(true);
      setViaGateway(true);
      await load();
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Refund failed");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-[#0c1428] via-[#0a101c] to-[#070b14]">
        <div className="border-b border-white/[0.06] bg-orange-500/[0.07] px-4 py-5 sm:px-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex gap-4">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-orange-500/20 ring-1 ring-orange-400/30">
                <Undo2 className="h-6 w-6 text-orange-200" aria-hidden />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-orange-300/90">
                  Orders &amp; payments
                </p>
                <h1 className="mt-1 text-xl font-bold text-white sm:text-2xl">Refunds</h1>
                <p className="mt-2 max-w-2xl text-xs leading-relaxed text-gray-400">
                  Return money to learners when needed, and remove their course access if you want.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => void load()}
              disabled={loading}
              className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1 text-[11px] text-gray-300 hover:bg-white/5 disabled:opacity-50"
            >
              <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} /> Refresh
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 px-4 py-3 sm:px-6">
          <label className="flex min-w-[14rem] flex-1 items-center gap-2 rounded-lg border border-white/10 bg-black/30 px-3 py-1.5">
            <Search className="h-3.5 w-3.5 shrink-0 text-gray-500" aria-hidden />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search email, order ID, course…"
              className="w-full bg-transparent text-xs text-white outline-none placeholder:text-gray-600"
            />
          </label>
          <select
            value={viewFilter}
            onChange={(e) => setViewFilter(e.target.value as ViewFilter)}
            className="rounded-lg border border-white/10 bg-black/40 px-2.5 py-1.5 text-xs text-white outline-none"
          >
            <option value="eligible">Eligible for refund</option>
            <option value="refunded">Already refunded</option>
            <option value="all">Eligible + refunded</option>
          </select>
        </div>
      </div>

      {loadError ? (
        <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
          {loadError}
        </p>
      ) : null}
      {notice ? (
        <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          {notice}
        </p>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-3">
        <article className="rounded-xl border border-white/10 bg-[#0d1528] p-4">
          <p className="text-[11px] text-gray-400">Eligible</p>
          <p className="mt-1 text-2xl font-semibold text-white">{stats.eligible}</p>
        </article>
        <article className="rounded-xl border border-white/10 bg-[#0d1528] p-4">
          <p className="text-[11px] text-gray-400">Refunded</p>
          <p className="mt-1 text-2xl font-semibold text-white">{stats.refunded}</p>
        </article>
        <article className="rounded-xl border border-white/10 bg-[#0d1528] p-4">
          <p className="text-[11px] text-gray-400">Money refunded</p>
          <p className="mt-1 text-2xl font-semibold text-white">
            ₹{(stats.refundedAmount / 100).toFixed(2)}
          </p>
        </article>
      </section>

      <section className="overflow-hidden rounded-xl border border-white/10 bg-[#0d1528]">
        <div className="border-b border-white/10 px-4 py-3 sm:px-5">
          <h3 className="text-sm font-semibold text-white">Refund desk</h3>
          <p className="text-[11px] text-gray-500">
            {loading ? "Loading…" : `${visible.length} row(s)`}
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-xs">
            <thead className="bg-black/20 text-[10px] uppercase tracking-wide text-gray-500">
              <tr>
                {COLUMNS.map((col) => (
                  <th key={col} className="whitespace-nowrap px-3 py-2.5 font-semibold">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {loading ? (
                <tr>
                  <td colSpan={COLUMNS.length} className="px-3 py-10 text-center text-gray-500">
                    <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                  </td>
                </tr>
              ) : visible.length === 0 ? (
                <tr>
                  <td colSpan={COLUMNS.length} className="px-3 py-10 text-center text-gray-500">
                    No matching refund records.
                  </td>
                </tr>
              ) : (
                visible.map((row) => (
                  <tr key={row.id} className="hover:bg-white/[0.02]">
                    <td className="whitespace-nowrap px-3 py-2.5 text-gray-300">
                      {formatCommerceWhen(row.paidAt ?? row.createdAt)}
                    </td>
                    <td className="px-3 py-2.5">
                      <p className="font-medium text-white">{row.learnerEmail}</p>
                    </td>
                    <td className="max-w-[12rem] truncate px-3 py-2.5 text-gray-300" title={row.courseSummary}>
                      {row.courseSummary}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 font-medium text-white">{row.amountLabel}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-gray-300">
                      {commerceMethodLabel(row.method)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ring-1 ${commerceStatusTone(row.status)}`}
                      >
                        {commerceStatusLabel(row.status)}
                      </span>
                    </td>
                    <td className="max-w-[8rem] truncate px-3 py-2.5 text-[11px] text-gray-400">
                      {orderIdForPayment(row)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5">
                      {isRefundablePayment(row) ? (
                        <button
                          type="button"
                          onClick={() => {
                            setRefundTarget(row);
                            setRefundNote("");
                            setRevokeAccess(true);
                            setViaGateway(row.method === "razorpay" && row.status === "paid");
                          }}
                          disabled={busyId === row.id}
                          className="inline-flex items-center gap-1 rounded-md border border-orange-400/30 bg-orange-500/10 px-2 py-1 text-[10px] font-semibold text-orange-200 hover:bg-orange-500/20 disabled:opacity-50"
                        >
                          {busyId === row.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <RotateCcw className="h-3 w-3" />
                          )}
                          Refund
                        </button>
                      ) : (
                        <span className="text-[10px] text-gray-500">Done</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {refundTarget ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setRefundTarget(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0d1528] p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-white">Confirm refund</h2>
            <p className="mt-2 text-xs text-gray-400">
              {refundTarget.learnerEmail} · {refundTarget.courseSummary} · {refundTarget.amountLabel}
            </p>
            <label className="mt-4 block text-xs text-gray-400">
              Reason
              <input
                value={refundNote}
                onChange={(e) => setRefundNote(e.target.value)}
                placeholder="Why are you refunding?"
                className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none"
              />
            </label>
            <label className="mt-3 flex items-center gap-2 text-xs text-gray-300">
              <input
                type="checkbox"
                checked={revokeAccess}
                onChange={(e) => setRevokeAccess(e.target.checked)}
                className="rounded border-white/20"
              />
              Remove this learner&apos;s course access
            </label>
            {refundTarget.method === "razorpay" && refundTarget.status === "paid" ? (
              <label className="mt-2 flex items-start gap-2 text-xs text-gray-300">
                <input
                  type="checkbox"
                  checked={viaGateway}
                  onChange={(e) => setViaGateway(e.target.checked)}
                  disabled={!razorpayConfigured || !refundTarget.razorpayPaymentId}
                  className="mt-0.5 rounded border-white/20"
                />
                <span>
                  Also return the money to the learner
                  {!razorpayConfigured ? (
                    <span className="mt-0.5 block text-[10px] text-amber-300">
                      Online refunds are unavailable right now. Ask your technical team for help.
                    </span>
                  ) : !refundTarget.razorpayPaymentId ? (
                    <span className="mt-0.5 block text-[10px] text-amber-300">
                      Update this order first, then try the refund again.
                    </span>
                  ) : (
                    <span className="mt-0.5 block text-[10px] text-gray-500">
                      The payment is sent back to the learner&apos;s original payment method.
                    </span>
                  )}
                </span>
              </label>
            ) : (
              <p className="mt-2 text-[10px] text-gray-500">
                This was free or practice access — only course access will be updated.
              </p>
            )}
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => void submitRefund()}
                disabled={busyId === refundTarget.id}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-orange-500 px-3 py-2 text-sm font-semibold text-white hover:bg-orange-400 disabled:opacity-50"
              >
                {busyId === refundTarget.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Undo2 className="h-4 w-4" />
                )}
                Confirm refund
              </button>
              <button
                type="button"
                onClick={() => setRefundTarget(null)}
                className="flex-1 rounded-lg border border-white/10 py-2 text-sm text-gray-300 hover:bg-white/5"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
