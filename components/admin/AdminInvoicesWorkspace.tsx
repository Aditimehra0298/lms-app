"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FileText, Loader2, Printer, RefreshCw, Search } from "lucide-react";
import { getLearnerEmail } from "@/lib/learner-session-client";
import type { AdminPaymentRow } from "@/lib/payment-types";
import {
  commerceMethodLabel,
  commerceStatusLabel,
  commerceStatusTone,
  formatCommerceWhen,
  invoiceNumberForPayment,
  orderIdForPayment,
} from "@/lib/admin-commerce-ui";

type StatusFilter = "all" | "paid" | "demo" | "waived" | "refunded";

const COLUMNS = [
  "Invoice #",
  "Date",
  "Learner",
  "Course(s)",
  "Amount",
  "Status",
  "Reference",
  "Actions",
] as const;

const INVOICE_STATUSES = new Set(["paid", "demo", "waived", "refunded"]);

export default function AdminInvoicesWorkspace() {
  const [rows, setRows] = useState<AdminPaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [preview, setPreview] = useState<AdminPaymentRow | null>(null);

  const adminHeaders = useCallback((): Record<string, string> => {
    const email = getLearnerEmail();
    return {
      "Content-Type": "application/json",
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
      };
      if (!res.ok || !data.ok) throw new Error(data.message ?? "Could not load invoices");
      const list = (data.payments ?? []).filter((row) => INVOICE_STATUSES.has(row.status));
      setRows(list);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Could not load invoices");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [adminHeaders, searchQuery, statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const totalCollected = useMemo(
    () => rows.filter((r) => r.status === "paid").reduce((sum, r) => sum + r.amount, 0),
    [rows],
  );

  const printInvoice = (row: AdminPaymentRow) => {
    const inv = invoiceNumberForPayment(row);
    const win = window.open("", "_blank", "noopener,noreferrer,width=720,height=900");
    if (!win) return;
    const lines = row.items
      .map(
        (item) =>
          `<tr><td style="padding:8px;border-bottom:1px solid #ddd">${item.title || item.slug}</td><td style="padding:8px;border-bottom:1px solid #ddd">${item.qty}</td><td style="padding:8px;border-bottom:1px solid #ddd;text-align:right">${item.price || "—"}</td></tr>`,
      )
      .join("");
    win.document.write(`<!doctype html><html><head><title>${inv}</title>
      <style>body{font-family:Segoe UI,Arial,sans-serif;padding:32px;color:#111}h1{margin:0 0 4px}table{width:100%;border-collapse:collapse;margin-top:24px}</style>
      </head><body>
      <h1>Invoice ${inv}</h1>
      <p>SecureFutureTech LMS</p>
      <p><strong>Learner:</strong> ${row.learnerEmail}${row.learnerName ? ` (${row.learnerName})` : ""}</p>
      <p><strong>Date:</strong> ${formatCommerceWhen(row.paidAt ?? row.createdAt)}</p>
      <p><strong>Reference:</strong> ${orderIdForPayment(row)}</p>
      <p><strong>Status:</strong> ${row.status === "paid" ? "Paid" : row.status === "waived" ? "Free access" : row.status === "demo" ? "Practice" : row.status === "refunded" ? "Refunded" : row.status} · ${commerceMethodLabel(row.method)}</p>
      <table><thead><tr><th align="left">Course</th><th align="left">Qty</th><th align="right">Price</th></tr></thead>
      <tbody>${lines || `<tr><td colspan="3" style="padding:8px">${row.courseSummary}</td></tr>`}</tbody></table>
      <p style="margin-top:24px;font-size:18px"><strong>Total: ${row.amountLabel}</strong></p>
      </body></html>`);
    win.document.close();
    win.focus();
    win.print();
  };

  return (
    <div className="space-y-5">
      <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-[#0c1428] via-[#0a101c] to-[#070b14]">
        <div className="border-b border-white/[0.06] bg-violet-500/[0.07] px-4 py-5 sm:px-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex gap-4">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-violet-500/20 ring-1 ring-violet-400/30">
                <FileText className="h-6 w-6 text-violet-200" aria-hidden />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-violet-300/90">
                  Orders &amp; payments
                </p>
                <h1 className="mt-1 text-xl font-bold text-white sm:text-2xl">Invoices</h1>
                <p className="mt-2 max-w-2xl text-xs leading-relaxed text-gray-400">
                  View and print invoices for completed, free, practice, and refunded purchases.
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
              placeholder="Search email, invoice #, course…"
              className="w-full bg-transparent text-xs text-white outline-none placeholder:text-gray-600"
            />
          </label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="rounded-lg border border-white/10 bg-black/40 px-2.5 py-1.5 text-xs text-white outline-none"
          >
            <option value="all">All invoice statuses</option>
            <option value="paid">Paid</option>
            <option value="demo">Practice</option>
            <option value="waived">Free access</option>
            <option value="refunded">Refunded</option>
          </select>
        </div>
      </div>

      {loadError ? (
        <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
          {loadError}
        </p>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-3">
        <article className="rounded-xl border border-white/10 bg-[#0d1528] p-4">
          <p className="text-[11px] text-gray-400">Invoices shown</p>
          <p className="mt-1 text-2xl font-semibold text-white">{rows.length}</p>
        </article>
        <article className="rounded-xl border border-white/10 bg-[#0d1528] p-4">
          <p className="text-[11px] text-gray-400">Paid invoices</p>
          <p className="mt-1 text-2xl font-semibold text-white">
            {rows.filter((r) => r.status === "paid").length}
          </p>
        </article>
        <article className="rounded-xl border border-white/10 bg-[#0d1528] p-4">
          <p className="text-[11px] text-gray-400">Total collected (shown)</p>
          <p className="mt-1 text-2xl font-semibold text-white">
            ₹{(totalCollected / 100).toFixed(2)}
          </p>
        </article>
      </section>

      <section className="overflow-hidden rounded-xl border border-white/10 bg-[#0d1528]">
        <div className="border-b border-white/10 px-4 py-3 sm:px-5">
          <h3 className="text-sm font-semibold text-white">Invoice list</h3>
          <p className="text-[11px] text-gray-500">
            {loading ? "Loading…" : `${rows.length} invoice(s)`}
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
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={COLUMNS.length} className="px-3 py-10 text-center text-gray-500">
                    No invoices yet. Completed payments will appear here.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="hover:bg-white/[0.02]">
                    <td className="whitespace-nowrap px-3 py-2.5 text-[11px] text-violet-200">
                      {invoiceNumberForPayment(row)}
                    </td>
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
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => setPreview(row)}
                          className="rounded-md border border-white/10 px-2 py-1 text-[10px] text-gray-300 hover:bg-white/5"
                        >
                          View
                        </button>
                        <button
                          type="button"
                          onClick={() => printInvoice(row)}
                          className="inline-flex items-center gap-1 rounded-md border border-violet-400/30 px-2 py-1 text-[10px] text-violet-200 hover:bg-violet-500/10"
                        >
                          <Printer className="h-3 w-3" /> Print
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {preview ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setPreview(null)}
        >
          <div
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/10 bg-[#0d1528] p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-white">
              Invoice {invoiceNumberForPayment(preview)}
            </h2>
            <p className="mt-1 text-xs text-gray-400">{preview.learnerEmail}</p>
            <ul className="mt-4 space-y-2 text-xs text-gray-300">
              {preview.items.map((item) => (
                <li key={item.slug} className="flex justify-between gap-3 border-b border-white/5 pb-2">
                  <span>{item.title || item.slug}</span>
                  <span className="text-white">{item.price || "—"}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-sm font-semibold text-white">Total: {preview.amountLabel}</p>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => printInvoice(preview)}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-violet-500 px-3 py-2 text-sm font-semibold text-white hover:bg-violet-400"
              >
                <Printer className="h-4 w-4" /> Print
              </button>
              <button
                type="button"
                onClick={() => setPreview(null)}
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
