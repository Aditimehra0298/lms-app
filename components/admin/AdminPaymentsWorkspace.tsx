"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BadgeIndianRupee,
  CreditCard,
  Gift,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
} from "lucide-react";
import { getLearnerEmail } from "@/lib/learner-session-client";
import type { AdminPaymentRow } from "@/lib/payment-types";
import { commerceStatusLabel } from "@/lib/admin-commerce-ui";
import AdminRazorpayControlBar, {
  type RazorpayAdminStatus,
} from "@/components/admin/AdminRazorpayControlBar";

type StatusFilter = "all" | "pending" | "paid" | "demo" | "waived" | "failed" | "refunded";
type MethodFilter = "all" | "razorpay" | "demo" | "admin_grant";

type GrantableOffering = {
  slug: string;
  title: string;
  kind: string;
  kindLabel: string;
};

type PaymentStats = {
  total: number;
  byStatus: Record<string, number>;
  byMethod: Record<string, number>;
  razorpayPaidCount: number;
  razorpayPaidAmount: number;
  pendingRazorpay?: number;
};

const COLUMNS = [
  "Date",
  "Learner",
  "Course(s)",
  "Amount",
  "Payment type",
  "Status",
  "Reference",
  "Note",
] as const;

function formatWhen(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusTone(status: string): string {
  if (status === "paid") return "text-emerald-300 bg-emerald-500/15 ring-emerald-400/25";
  if (status === "waived") return "text-violet-300 bg-violet-500/15 ring-violet-400/25";
  if (status === "demo") return "text-amber-300 bg-amber-500/15 ring-amber-400/25";
  if (status === "pending") return "text-sky-300 bg-sky-500/15 ring-sky-400/25";
  if (status === "failed") return "text-rose-300 bg-rose-500/15 ring-rose-400/25";
  if (status === "refunded") return "text-orange-300 bg-orange-500/15 ring-orange-400/25";
  return "text-gray-300 bg-white/10 ring-white/10";
}

function methodLabel(method: string): string {
  if (method === "razorpay") return "Online payment";
  if (method === "demo") return "Practice checkout";
  if (method === "admin_grant") return "Free access";
  return method;
}

function formatRupees(paise: number): string {
  return `₹${(paise / 100).toFixed(2)}`;
}

export default function AdminPaymentsWorkspace() {
  const [payments, setPayments] = useState<AdminPaymentRow[]>([]);
  const [stats, setStats] = useState<PaymentStats | null>(null);
  const [offerings, setOfferings] = useState<GrantableOffering[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [methodFilter, setMethodFilter] = useState<MethodFilter>("all");
  const [grantEmail, setGrantEmail] = useState("");
  const [grantCourseSlug, setGrantCourseSlug] = useState("");
  const [grantNote, setGrantNote] = useState("");
  const [grantBusy, setGrantBusy] = useState(false);
  const [grantNotice, setGrantNotice] = useState<string | null>(null);
  const [razorpay, setRazorpay] = useState<RazorpayAdminStatus | null>(null);
  const [syncBusy, setSyncBusy] = useState(false);

  const adminHeaders = useCallback((): Record<string, string> => {
    const email = getLearnerEmail();
    return {
      "Content-Type": "application/json",
    };
  }, []);

  const loadOfferings = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/payments?offerings=1", {
        headers: adminHeaders(),
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = (await res.json()) as { ok?: boolean; offerings?: GrantableOffering[] };
      setOfferings(Array.isArray(data.offerings) ? data.offerings : []);
    } catch {
      setOfferings([]);
    }
  }, [adminHeaders]);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.set("q", searchQuery.trim());
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (methodFilter !== "all") params.set("method", methodFilter);
      const res = await fetch(`/api/admin/payments?${params.toString()}`, {
        headers: adminHeaders(),
        cache: "no-store",
      });
      const data = (await res.json()) as {
        ok?: boolean;
        message?: string;
        payments?: AdminPaymentRow[];
        stats?: PaymentStats;
        razorpay?: RazorpayAdminStatus;
      };
      if (!res.ok || !data.ok) throw new Error(data.message ?? "Could not load payments");
      setPayments(data.payments ?? []);
      setStats(data.stats ?? null);
      setRazorpay(data.razorpay ?? null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Could not load payments");
      setPayments([]);
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, [adminHeaders, methodFilter, searchQuery, statusFilter]);

  useEffect(() => {
    void loadOfferings();
  }, [loadOfferings]);

  useEffect(() => {
    void load();
  }, [load]);

  const offeringsByKind = useMemo(() => {
    const groups = new Map<string, GrantableOffering[]>();
    for (const row of offerings) {
      const key = row.kindLabel || "Other";
      const list = groups.get(key) ?? [];
      list.push(row);
      groups.set(key, list);
    }
    return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [offerings]);

  const grantCourseTitle = useMemo(() => {
    const match = offerings.find((c) => c.slug === grantCourseSlug);
    return match?.title?.trim() || grantCourseSlug;
  }, [grantCourseSlug, offerings]);

  const submitGrant = async () => {
    setGrantBusy(true);
    setGrantNotice(null);
    setLoadError(null);
    try {
      const res = await fetch("/api/admin/payments", {
        method: "POST",
        headers: adminHeaders(),
        body: JSON.stringify({
          action: "grant-access",
          learnerEmail: grantEmail.trim(),
          courseSlug: grantCourseSlug,
          courseTitle: grantCourseTitle,
          adminNote: grantNote.trim() || undefined,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !data.ok) throw new Error(data.message ?? "Grant failed");
      setGrantNotice(data.message ?? "Course access granted.");
      setGrantEmail("");
      setGrantCourseSlug("");
      setGrantNote("");
      await load();
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Grant failed");
    } finally {
      setGrantBusy(false);
    }
  };

  const syncPending = async () => {
    setSyncBusy(true);
    setGrantNotice(null);
    setLoadError(null);
    try {
      const res = await fetch("/api/admin/payments", {
        method: "POST",
        headers: adminHeaders(),
        body: JSON.stringify({ action: "sync-pending", limit: 30 }),
      });
      const data = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !data.ok) throw new Error(data.message ?? "Could not update payments");
      setGrantNotice(data.message ?? "Waiting payments updated.");
      await load();
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Could not update payments");
    } finally {
      setSyncBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-[#0c1428] via-[#0a101c] to-[#070b14]">
        <div className="border-b border-white/[0.06] bg-emerald-500/[0.07] px-4 py-5 sm:px-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex gap-4">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-emerald-500/20 ring-1 ring-emerald-400/30">
                <CreditCard className="h-6 w-6 text-emerald-200" aria-hidden />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-300/90">
                  Orders &amp; payments
                </p>
                <h1 className="mt-1 text-xl font-bold text-white sm:text-2xl">Payments</h1>
                <p className="mt-2 max-w-2xl text-xs leading-relaxed text-gray-400">
                  See learner payments, practice checkouts, and free access you granted — all in one place.
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
              placeholder="Search email, order ID, payment ID, course…"
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
          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value as MethodFilter)}
            className="rounded-lg border border-white/10 bg-black/40 px-2.5 py-1.5 text-xs text-white outline-none"
          >
            <option value="all">All methods</option>
            <option value="razorpay">Online payment</option>
            <option value="demo">Practice checkout</option>
            <option value="admin_grant">Free access</option>
          </select>
        </div>
      </div>

      {loadError ? (
        <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
          {loadError}
        </p>
      ) : null}
      {grantNotice ? (
        <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          {grantNotice}
        </p>
      ) : null}

      <AdminRazorpayControlBar
        razorpay={razorpay}
        pendingCount={stats?.pendingRazorpay ?? stats?.byStatus?.pending ?? 0}
        onSyncPending={syncPending}
        busy={syncBusy}
      />

      {stats ? (
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: "Money collected",
              value: formatRupees(stats.razorpayPaidAmount),
              sub: `${stats.razorpayPaidCount} successful payments`,
              icon: BadgeIndianRupee,
              tone: "text-emerald-300",
            },
            {
              label: "Paid",
              value: String(stats.byStatus.paid ?? 0),
              sub: "Completed online checkouts",
              icon: ShieldCheck,
              tone: "text-sky-300",
            },
            {
              label: "Free access",
              value: String(stats.byMethod.admin_grant ?? 0),
              sub: "Access without payment",
              icon: Gift,
              tone: "text-violet-300",
            },
            {
              label: "Practice checkouts",
              value: String(stats.byMethod.demo ?? 0),
              sub: "No real charge",
              icon: CreditCard,
              tone: "text-amber-300",
            },
          ].map((card) => (
            <article key={card.label} className="rounded-xl border border-white/10 bg-[#0d1528] p-4">
              <div className={`mb-2 inline-flex rounded-md bg-white/5 p-1.5 ${card.tone}`}>
                <card.icon size={14} />
              </div>
              <p className="text-[11px] text-gray-400">{card.label}</p>
              <p className="mt-1 text-2xl font-semibold text-white">{card.value}</p>
              <p className="text-[11px] text-gray-500">{card.sub}</p>
            </article>
          ))}
        </section>
      ) : null}

      <section className="rounded-xl border border-violet-500/20 bg-violet-500/[0.06] p-4 sm:p-5">
        <div className="mb-4 flex items-center gap-2">
          <Gift className="h-4 w-4 text-violet-300" />
          <h2 className="text-sm font-semibold text-white">Give free access (no payment)</h2>
        </div>
        <p className="mb-4 text-xs text-gray-400">
          Enroll a learner in any program without charging them. When certificates are enabled for the
          program, the learner can download their certificate right away.
        </p>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="block text-xs text-gray-400">
            Learner email
            <input
              type="email"
              value={grantEmail}
              onChange={(e) => setGrantEmail(e.target.value)}
              placeholder="learner@example.com"
              className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none"
            />
          </label>
          <label className="block text-xs text-gray-400">
            Program / course
            <select
              value={grantCourseSlug}
              onChange={(e) => setGrantCourseSlug(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none"
            >
              <option value="">Select program…</option>
              {offeringsByKind.map(([kindLabel, rows]) => (
                <optgroup key={kindLabel} label={kindLabel}>
                  {rows.map((row) => (
                    <option key={`${row.kind}-${row.slug}`} value={row.slug}>
                      {row.title}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
          <label className="block text-xs text-gray-400 md:col-span-2 xl:col-span-1">
            Note (optional)
            <input
              value={grantNote}
              onChange={(e) => setGrantNote(e.target.value)}
              placeholder="Scholarship / partner access"
              className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none"
            />
          </label>
          <div className="flex items-end">
            <button
              type="button"
              onClick={() => void submitGrant()}
              disabled={grantBusy || !grantEmail.trim() || !grantCourseSlug}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-violet-500 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-400 disabled:opacity-50"
            >
              {grantBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Gift className="h-4 w-4" />}
              Grant access
            </button>
          </div>
        </div>
        {offerings.length === 0 ? (
          <p className="mt-3 text-[11px] text-amber-200/90">
            No programs found yet. Add self-paced courses, tutor-led programs, or workshops in the admin menus first.
          </p>
        ) : (
          <p className="mt-3 text-[11px] text-gray-500">
            {offerings.length} program(s) available · grouped by type in the list above
          </p>
        )}
      </section>

      <section className="overflow-hidden rounded-xl border border-white/10 bg-[#0d1528]">
        <div className="border-b border-white/10 px-4 py-3 sm:px-5">
          <h3 className="text-sm font-semibold text-white">Payment records</h3>
          <p className="text-[11px] text-gray-500">
            {loading ? "Loading…" : `${payments.length} row(s) shown`}
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
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan={COLUMNS.length} className="px-3 py-10 text-center text-gray-500">
                    No payment records yet. Learner checkouts and free access grants will appear here.
                  </td>
                </tr>
              ) : (
                payments.map((row) => (
                  <tr key={row.id} className="hover:bg-white/[0.02]">
                    <td className="whitespace-nowrap px-3 py-2.5 text-gray-300">
                      {formatWhen(row.paidAt ?? row.createdAt)}
                    </td>
                    <td className="px-3 py-2.5">
                      <p className="font-medium text-white">{row.learnerEmail}</p>
                      {row.learnerName ? <p className="text-[10px] text-gray-500">{row.learnerName}</p> : null}
                    </td>
                    <td className="max-w-[12rem] px-3 py-2.5 text-gray-300">
                      <p className="truncate" title={row.courseSummary}>
                        {row.courseSummary}
                      </p>
                      {row.items.length > 1 ? (
                        <p className="text-[10px] text-gray-500">{row.items.length} courses</p>
                      ) : null}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 font-medium text-white">{row.amountLabel}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-gray-300">{methodLabel(row.method)}</td>
                    <td className="whitespace-nowrap px-3 py-2.5">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ring-1 ${statusTone(row.status)}`}
                      >
                        {commerceStatusLabel(row.status)}
                      </span>
                    </td>
                    <td className="max-w-[10rem] truncate px-3 py-2.5 text-[11px] text-gray-400">
                      {row.razorpayOrderId ?? row.receipt ?? (row.method === "admin_grant" ? "Free access" : "—")}
                    </td>
                    <td className="max-w-[14rem] px-3 py-2.5 text-gray-400">
                      {row.adminNote ? <p className="truncate" title={row.adminNote}>{row.adminNote}</p> : null}
                      {row.grantedByEmail ? (
                        <p className="truncate text-[10px] text-violet-300/90">by {row.grantedByEmail}</p>
                      ) : null}
                      {!row.adminNote && !row.grantedByEmail ? "—" : null}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
