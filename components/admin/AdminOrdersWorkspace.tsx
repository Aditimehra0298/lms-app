"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Loader2,
  Package,
  RefreshCw,
  Search,
  ShoppingCart,
  Wifi,
  XCircle,
} from "lucide-react";
import { getLearnerEmail } from "@/lib/learner-session-client";
import type { AdminPaymentRow } from "@/lib/payment-types";
import {
  commerceMethodLabel,
  commerceStatusLabel,
  commerceStatusTone,
  formatCommerceWhen,
  orderIdForPayment,
} from "@/lib/admin-commerce-ui";
import AdminRazorpayControlBar, {
  type RazorpayAdminStatus,
} from "@/components/admin/AdminRazorpayControlBar";

type StatusFilter = "all" | "pending" | "paid" | "demo" | "waived" | "failed" | "refunded";

type GatewaySnapshot = {
  order: {
    id: string;
    amount: number;
    currency: string;
    status: string;
    receipt: string | null;
    attempts: number;
    amountPaid: number;
  } | null;
  payment: {
    id: string;
    status: string;
    method: string | null;
    amount: number;
    currency: string;
    email: string | null;
    errorDescription: string | null;
    refundStatus: string | null;
    amountRefunded: number;
    captured: boolean;
  } | null;
};

const COLUMNS = [
  "Reference",
  "Date",
  "Learner",
  "Course(s)",
  "Amount",
  "Payment type",
  "Status",
  "Actions",
] as const;

export default function AdminOrdersWorkspace() {
  const [orders, setOrders] = useState<AdminPaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selected, setSelected] = useState<AdminPaymentRow | null>(null);
  const [gateway, setGateway] = useState<GatewaySnapshot | null>(null);
  const [gatewayBusy, setGatewayBusy] = useState(false);
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [razorpay, setRazorpay] = useState<RazorpayAdminStatus | null>(null);
  const [pendingRazorpay, setPendingRazorpay] = useState(0);
  const [syncBusy, setSyncBusy] = useState(false);

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
      if (statusFilter !== "all") params.set("status", statusFilter);
      const res = await fetch(`/api/admin/payments?${params.toString()}`, {
        headers: adminHeaders(),
        cache: "no-store",
      });
      const data = (await res.json()) as {
        ok?: boolean;
        message?: string;
        payments?: AdminPaymentRow[];
        razorpay?: RazorpayAdminStatus;
        stats?: { pendingRazorpay?: number; byStatus?: Record<string, number> };
      };
      if (!res.ok || !data.ok) throw new Error(data.message ?? "Could not load orders");
      setOrders(data.payments ?? []);
      setRazorpay(data.razorpay ?? null);
      setPendingRazorpay(data.stats?.pendingRazorpay ?? data.stats?.byStatus?.pending ?? 0);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Could not load orders");
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [adminHeaders, searchQuery, statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const postAction = async (body: Record<string, unknown>) => {
    const res = await fetch("/api/admin/payments", {
      method: "POST",
      headers: adminHeaders(),
      body: JSON.stringify(body),
    });
    const data = (await res.json()) as { ok?: boolean; message?: string };
    if (!res.ok || !data.ok) throw new Error(data.message ?? "Action failed");
    return data;
  };

  const syncPending = async () => {
    setSyncBusy(true);
    setNotice(null);
    setLoadError(null);
    try {
      const data = await postAction({ action: "sync-pending", limit: 30 });
      setNotice(data.message ?? "Waiting payments updated.");
      await load();
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Could not update payments");
    } finally {
      setSyncBusy(false);
    }
  };

  const syncOne = async (row: AdminPaymentRow) => {
    setActionBusy(row.id);
    setNotice(null);
    setLoadError(null);
    try {
      const data = await postAction({ action: "sync", paymentId: row.id });
      setNotice(data.message ?? "Payment status updated.");
      await load();
      if (selected?.id === row.id) {
        const refreshed = (await (
          await fetch(`/api/admin/payments?q=${encodeURIComponent(row.learnerEmail)}`, {
            headers: adminHeaders(),
            cache: "no-store",
          })
        ).json()) as { payments?: AdminPaymentRow[] };
        const next = refreshed.payments?.find((p) => p.id === row.id);
        if (next) setSelected(next);
      }
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Could not update this payment");
    } finally {
      setActionBusy(null);
    }
  };

  const markFailed = async (row: AdminPaymentRow) => {
    if (!window.confirm(`Mark this order as unsuccessful for ${row.learnerEmail}?`)) return;
    setActionBusy(row.id);
    setNotice(null);
    setLoadError(null);
    try {
      const data = await postAction({ action: "mark-failed", paymentId: row.id });
      setNotice(data.message ?? "Order marked as unsuccessful.");
      setSelected(null);
      await load();
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Could not update this order");
    } finally {
      setActionBusy(null);
    }
  };

  const openGateway = async (row: AdminPaymentRow) => {
    setSelected(row);
    setGateway(null);
    setGatewayBusy(true);
    setLoadError(null);
    try {
      const res = await fetch(`/api/admin/payments?gateway=1&paymentId=${encodeURIComponent(row.id)}`, {
        headers: adminHeaders(),
        cache: "no-store",
      });
      const data = (await res.json()) as {
        ok?: boolean;
        message?: string;
        order?: GatewaySnapshot["order"];
        payment?: GatewaySnapshot["payment"];
      };
      if (!res.ok || !data.ok) throw new Error(data.message ?? "Could not load payment details");
      setGateway({ order: data.order ?? null, payment: data.payment ?? null });
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Could not load payment details");
      setGateway(null);
    } finally {
      setGatewayBusy(false);
    }
  };

  const counts = {
    total: orders.length,
    pending: orders.filter((o) => o.status === "pending").length,
    paid: orders.filter((o) => o.status === "paid").length,
    failed: orders.filter((o) => o.status === "failed").length,
  };

  return (
    <div className="space-y-5">
      <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-[#0c1428] via-[#0a101c] to-[#070b14]">
        <div className="border-b border-white/[0.06] bg-sky-500/[0.07] px-4 py-5 sm:px-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex gap-4">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-sky-500/20 ring-1 ring-sky-400/30">
                <ShoppingCart className="h-6 w-6 text-sky-200" aria-hidden />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-sky-300/90">
                  Orders &amp; payments
                </p>
                <h1 className="mt-1 text-xl font-bold text-white sm:text-2xl">Orders</h1>
                <p className="mt-2 max-w-2xl text-xs leading-relaxed text-gray-400">
                  Review learner orders, refresh waiting payments, and close unfinished checkouts.
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
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="rounded-lg border border-white/10 bg-black/40 px-2.5 py-1.5 text-xs text-white outline-none"
          >
            <option value="all">All statuses</option>
            <option value="paid">Paid</option>
            <option value="pending">Waiting</option>
            <option value="demo">Practice</option>
            <option value="waived">Free access</option>
            <option value="failed">Unsuccessful</option>
            <option value="refunded">Refunded</option>
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

      <AdminRazorpayControlBar
        razorpay={razorpay}
        pendingCount={pendingRazorpay}
        onSyncPending={syncPending}
        busy={syncBusy}
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Orders shown", value: String(counts.total), sub: "Matching filters" },
          { label: "Paid", value: String(counts.paid), sub: "Successful payments" },
          { label: "Waiting", value: String(counts.pending), sub: "Not finished yet" },
          { label: "Unsuccessful", value: String(counts.failed), sub: "Did not complete" },
        ].map((card) => (
          <article key={card.label} className="rounded-xl border border-white/10 bg-[#0d1528] p-4">
            <p className="text-[11px] text-gray-400">{card.label}</p>
            <p className="mt-1 text-2xl font-semibold text-white">{card.value}</p>
            <p className="text-[11px] text-gray-500">{card.sub}</p>
          </article>
        ))}
      </section>

      <section className="overflow-hidden rounded-xl border border-white/10 bg-[#0d1528]">
        <div className="border-b border-white/10 px-4 py-3 sm:px-5">
          <h3 className="text-sm font-semibold text-white">Order records</h3>
          <p className="text-[11px] text-gray-500">
            {loading ? "Loading…" : `${orders.length} row(s)`}
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
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={COLUMNS.length} className="px-3 py-10 text-center text-gray-500">
                    No orders yet. Learner checkouts will appear here.
                  </td>
                </tr>
              ) : (
                orders.map((row) => (
                  <tr key={row.id} className="hover:bg-white/[0.02]">
                    <td className="whitespace-nowrap px-3 py-2.5 text-[11px] text-sky-200">
                      {orderIdForPayment(row)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-gray-300">
                      {formatCommerceWhen(row.paidAt ?? row.createdAt)}
                    </td>
                    <td className="px-3 py-2.5">
                      <p className="font-medium text-white">{row.learnerEmail}</p>
                      {row.learnerName ? <p className="text-[10px] text-gray-500">{row.learnerName}</p> : null}
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
                    <td className="whitespace-nowrap px-3 py-2.5">
                      <div className="flex flex-wrap gap-1">
                        <button
                          type="button"
                          onClick={() => void openGateway(row)}
                          className="rounded-md border border-white/10 px-2 py-1 text-[10px] text-gray-300 hover:bg-white/5"
                        >
                          View
                        </button>
                        {row.method === "razorpay" ? (
                          <button
                            type="button"
                            disabled={actionBusy === row.id || !razorpay?.configured}
                            onClick={() => void syncOne(row)}
                            className="inline-flex items-center gap-1 rounded-md border border-sky-400/30 px-2 py-1 text-[10px] text-sky-200 hover:bg-sky-500/10 disabled:opacity-50"
                          >
                            {actionBusy === row.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Wifi className="h-3 w-3" />
                            )}
                            Update
                          </button>
                        ) : null}
                        {row.status === "pending" ? (
                          <button
                            type="button"
                            disabled={actionBusy === row.id}
                            onClick={() => void markFailed(row)}
                            className="inline-flex items-center gap-1 rounded-md border border-rose-400/30 px-2 py-1 text-[10px] text-rose-200 hover:bg-rose-500/10 disabled:opacity-50"
                          >
                            <XCircle className="h-3 w-3" /> Close
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {selected ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => {
            setSelected(null);
            setGateway(null);
          }}
        >
          <div
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/10 bg-[#0d1528] p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-sky-500/20">
                <Package className="h-5 w-5 text-sky-200" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Order details</h2>
                <p className="text-xs text-sky-200">{orderIdForPayment(selected)}</p>
              </div>
            </div>
            <dl className="space-y-3 text-xs">
              {[
                ["Learner", selected.learnerEmail],
                ["Name", selected.learnerName ?? "—"],
                ["Courses", selected.items.map((i) => i.title || i.slug).join(", ") || "—"],
                ["Amount", selected.amountLabel],
                ["Payment type", commerceMethodLabel(selected.method)],
                ["Status", commerceStatusLabel(selected.status)],
                ["Created", formatCommerceWhen(selected.createdAt)],
                ["Paid on", formatCommerceWhen(selected.paidAt)],
                ["Note", selected.adminNote ?? "—"],
              ].map(([label, value]) => (
                <div key={label} className="grid grid-cols-[7rem_1fr] gap-2 border-b border-white/5 pb-2">
                  <dt className="text-gray-500">{label}</dt>
                  <dd className="whitespace-pre-wrap text-gray-200">{value}</dd>
                </div>
              ))}
            </dl>

            {selected.method === "razorpay" ? (
              <div className="mt-4 rounded-xl border border-sky-500/20 bg-sky-500/[0.06] p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-sky-200">Payment status</p>
                {gatewayBusy ? (
                  <p className="mt-2 flex items-center gap-2 text-xs text-gray-400">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Checking payment…
                  </p>
                ) : gateway ? (
                  <dl className="mt-2 space-y-1.5 text-xs text-gray-300">
                    <div>
                      Checkout:{" "}
                      {gateway.order?.status === "paid"
                        ? "Completed"
                        : gateway.order?.status === "attempted"
                          ? "Started"
                          : gateway.order?.status === "created"
                            ? "Waiting"
                            : gateway.order?.status ?? "—"}
                    </div>
                    <div>
                      Payment:{" "}
                      {gateway.payment?.status === "captured"
                        ? "Successful"
                        : gateway.payment?.status === "failed"
                          ? "Unsuccessful"
                          : gateway.payment?.status === "refunded"
                            ? "Refunded"
                            : gateway.payment?.status ?? "Not received yet"}
                    </div>
                    <div>
                      Paid by:{" "}
                      {gateway.payment?.method === "upi"
                        ? "UPI"
                        : gateway.payment?.method === "card"
                          ? "Card"
                          : gateway.payment?.method === "netbanking"
                            ? "Net banking"
                            : gateway.payment?.method ?? "—"}
                    </div>
                    {gateway.payment?.amountRefunded ? (
                      <div>Amount returned: ₹{(gateway.payment.amountRefunded / 100).toFixed(2)}</div>
                    ) : null}
                    {gateway.payment?.errorDescription ? (
                      <div className="text-rose-300">Note: {gateway.payment.errorDescription}</div>
                    ) : null}
                  </dl>
                ) : (
                  <p className="mt-2 text-xs text-gray-500">Payment details are not available for this order.</p>
                )}
              </div>
            ) : null}

            <div className="mt-4 flex flex-wrap gap-2">
              {selected.method === "razorpay" ? (
                <button
                  type="button"
                  disabled={actionBusy === selected.id || !razorpay?.configured}
                  onClick={() => void syncOne(selected)}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-sky-500 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-400 disabled:opacity-50"
                >
                  {actionBusy === selected.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wifi className="h-4 w-4" />}
                  Update status
                </button>
              ) : null}
              {selected.status === "pending" ? (
                <button
                  type="button"
                  disabled={actionBusy === selected.id}
                  onClick={() => void markFailed(selected)}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-rose-400/40 px-3 py-2 text-sm text-rose-200 hover:bg-rose-500/10 disabled:opacity-50"
                >
                  <XCircle className="h-4 w-4" /> Mark unsuccessful
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => {
                  setSelected(null);
                  setGateway(null);
                }}
                className="flex-1 rounded-lg border border-white/10 py-2 text-sm text-gray-300 hover:bg-white/5"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
