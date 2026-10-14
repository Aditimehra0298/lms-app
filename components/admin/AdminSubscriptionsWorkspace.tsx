"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import {
  Building2,
  ChevronDown,
  ChevronRight,
  CreditCard,
  Download,
  Loader2,
  RefreshCw,
  Search,
  User,
} from "lucide-react";
import type {
  IndividualSubscriptionRow,
  OrganisationSubscriptionRow,
  SubscriptionPayment,
  SubscriptionStatus,
} from "@/app/api/admin/subscriptions/route";

type Tab = "individual" | "organisation";
type StatusFilter = "all" | SubscriptionStatus;

const STATUS_CLS: Record<SubscriptionStatus, string> = {
  active: "border-emerald-400/40 bg-emerald-500/10 text-emerald-200",
  expired: "border-gray-500/40 bg-white/5 text-gray-300",
  cancelled: "border-rose-400/40 bg-rose-500/10 text-rose-200",
};

const thCls = "px-3 py-2";
const tdCls = "whitespace-nowrap px-3 py-2.5";

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function inr(n: number): string {
  return `₹${n.toLocaleString("en-IN")}`;
}

function daysLeft(expiresAt: string, status: SubscriptionStatus): string {
  if (status !== "active") return "—";
  const days = Math.ceil((Date.parse(expiresAt) - Date.now()) / 86_400_000);
  return `${days} day${days === 1 ? "" : "s"}`;
}

function StatusBadge({ status }: { status: SubscriptionStatus }) {
  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize ${STATUS_CLS[status]}`}>
      {status}
    </span>
  );
}

function PaymentsTable({ payments }: { payments: SubscriptionPayment[] }) {
  if (payments.length === 0) return <p className="text-[11px] text-gray-500">No linked payments found.</p>;
  return (
    <table className="w-full min-w-[480px] text-[11px]">
      <thead>
        <tr className="border-b border-white/10 bg-white/[0.03] text-[10px] uppercase text-gray-500">
          <th className="px-2 py-1.5 text-left">Order ID</th>
          <th className="px-2 py-1.5 text-left">Amount</th>
          <th className="px-2 py-1.5 text-left">Status</th>
          <th className="px-2 py-1.5 text-left">Paid on</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-white/[0.05]">
        {payments.map((p) => (
          <tr key={p.orderId}>
            <td className="px-2 py-1.5 font-mono text-gray-300">{p.orderId}</td>
            <td className="px-2 py-1.5 tabular-nums text-amber-200">{inr(p.amountInr)}</td>
            <td className="px-2 py-1.5 capitalize text-gray-300">{p.status}</td>
            <td className="px-2 py-1.5 text-gray-400">{fmtDate(p.paidAt)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function csvCell(value: string | number | null | undefined): string {
  const s = value === null || value === undefined ? "" : String(value);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function downloadCsv(name: string, header: string[], rows: (string | number | null)[][]) {
  const text = [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type: "text/csv;charset=utf-8" }));
  a.download = `${name}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

export default function AdminSubscriptionsWorkspace() {
  const [tab, setTab] = useState<Tab>("individual");
  const [individual, setIndividual] = useState<IndividualSubscriptionRow[]>([]);
  const [organisations, setOrganisations] = useState<OrganisationSubscriptionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/subscriptions", { cache: "no-store", credentials: "include" });
      const data = (await res.json()) as {
        ok?: boolean;
        message?: string;
        individual?: IndividualSubscriptionRow[];
        organisations?: OrganisationSubscriptionRow[];
      };
      if (!data.ok) throw new Error(data.message || "Could not load subscriptions");
      setIndividual(data.individual ?? []);
      setOrganisations(data.organisations ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load subscriptions");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const q = search.trim().toLowerCase();
  const filteredIndividual = useMemo(
    () =>
      individual.filter(
        (s) =>
          (statusFilter === "all" || s.status === statusFilter) &&
          (!q ||
            s.email.includes(q) ||
            (s.name ?? "").toLowerCase().includes(q) ||
            s.planTitle.toLowerCase().includes(q) ||
            (s.categoryTitle ?? "").toLowerCase().includes(q)),
      ),
    [individual, statusFilter, q],
  );
  const filteredOrgs = useMemo(
    () =>
      organisations.filter(
        (o) =>
          (statusFilter === "all" || o.status === statusFilter) &&
          (!q ||
            o.companyName.toLowerCase().includes(q) ||
            o.workEmail.includes(q) ||
            (o.ownerName ?? "").toLowerCase().includes(q) ||
            o.employees.some((e) => e.name.toLowerCase().includes(q) || e.email.toLowerCase().includes(q))),
      ),
    [organisations, statusFilter, q],
  );

  const summary = useMemo(() => {
    const activeInd = individual.filter((s) => s.status === "active");
    const activeOrg = organisations.filter((o) => o.status === "active");
    return [
      { label: "Active individual", value: String(activeInd.length), sub: `${individual.length} total` },
      { label: "Active organisations", value: String(activeOrg.length), sub: `${organisations.length} total` },
      {
        label: "Seats in use (active orgs)",
        value: `${activeOrg.reduce((s, o) => s + o.employeesUsed, 0)} / ${activeOrg.reduce((s, o) => s + o.seats, 0)}`,
        sub: "employees / seats",
      },
      {
        label: "Plan revenue (paid)",
        value: inr(
          individual.reduce((s, r) => s + r.totalPaidInr, 0) + organisations.reduce((s, r) => s + r.totalPaidInr, 0),
        ),
        sub: "individual + organisation",
      },
    ];
  }, [individual, organisations]);

  const exportCsv = () => {
    if (tab === "individual") {
      downloadCsv(
        "individual-subscriptions",
        ["Name", "Email", "Phone", "Plan", "Access", "Status", "Start", "Expiry", "Courses unlocked", "Paid (INR)"],
        filteredIndividual.map((s) => [
          s.name,
          s.email,
          s.phone,
          s.planTitle,
          s.scope === "all" ? "All self-paced courses" : `Category: ${s.categoryTitle ?? ""}`,
          s.status,
          s.startsAt.slice(0, 10),
          s.expiresAt.slice(0, 10),
          s.coursesUnlocked,
          s.totalPaidInr,
        ]),
      );
    } else {
      downloadCsv(
        "organisation-subscriptions",
        ["Org ID", "Company", "Work email", "Owner", "Seats", "Employees", "Status", "Start", "Expiry", "Paid (INR)"],
        filteredOrgs.map((o) => [
          o.identificationNumber,
          o.companyName,
          o.workEmail,
          o.ownerName,
          o.seats,
          o.employeesUsed,
          o.status,
          o.startsAt.slice(0, 10),
          o.expiresAt.slice(0, 10),
          o.totalPaidInr,
        ]),
      );
    }
  };

  const rowCount = tab === "individual" ? filteredIndividual.length : filteredOrgs.length;

  return (
    <div className="space-y-5">
      <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-[#0c1428] via-[#0a101c] to-[#070b14]">
        <div className="border-b border-white/[0.06] bg-amber-500/[0.06] px-4 py-5 sm:px-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex gap-4">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-amber-500/20 ring-1 ring-amber-400/30">
                <CreditCard className="h-6 w-6 text-amber-200" aria-hidden />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-300/90">Plans</p>
                <h1 className="mt-1 text-xl font-bold text-white sm:text-2xl">Subscriptions</h1>
                <p className="mt-2 max-w-2xl text-xs leading-relaxed text-gray-400">
                  Individual plan subscriptions and organisation all-access subscriptions — who bought what, validity,
                  seats, and payments.
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
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {summary.map((s) => (
              <div key={s.label} className="rounded-xl border border-white/10 bg-black/30 px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{s.label}</p>
                <p className="mt-1 text-lg font-bold tabular-nums text-white">{s.value}</p>
                <p className="text-[10px] text-gray-500">{s.sub}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 px-4 py-3 sm:px-6">
          <div className="inline-flex rounded-lg border border-white/10 bg-black/30 p-0.5">
            {(
              [
                ["individual", `Individual (${individual.length})`, User],
                ["organisation", `Organisation (${organisations.length})`, Building2],
              ] as const
            ).map(([id, label, Icon]) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setTab(id);
                  setExpanded(null);
                }}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[11px] font-semibold transition ${
                  tab === id ? "bg-amber-500/25 text-white" : "text-gray-400 hover:text-gray-200"
                }`}
              >
                <Icon className="h-3.5 w-3.5" /> {label}
              </button>
            ))}
          </div>
          <label className="flex min-w-[14rem] flex-1 items-center gap-2 rounded-lg border border-white/10 bg-black/30 px-3 py-1.5">
            <Search className="h-3.5 w-3.5 shrink-0 text-gray-500" aria-hidden />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={tab === "individual" ? "Search name, email, plan…" : "Search company, owner, employee…"}
              className="w-full bg-transparent text-xs text-white outline-none placeholder:text-gray-600"
            />
          </label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="rounded-lg border border-white/10 bg-black/40 px-2.5 py-1.5 text-xs text-white outline-none"
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="expired">Expired</option>
            <option value="cancelled">Cancelled / refunded</option>
          </select>
          <button
            type="button"
            onClick={exportCsv}
            disabled={rowCount === 0}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-1.5 text-[11px] font-semibold text-gray-200 hover:bg-white/5 disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5" /> CSV
          </button>
        </div>
      </div>

      {error ? (
        <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">{error}</p>
      ) : null}

      <section className="overflow-hidden rounded-xl border border-white/10 bg-[#0d1528]">
        <div className="overflow-x-auto">
          {tab === "individual" ? (
            <table className="w-full min-w-[1100px] text-left text-[11px]">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.03] text-[10px] font-bold uppercase tracking-wider text-gray-500">
                  <th className="w-8 px-3 py-2" />
                  <th className={thCls}>Learner</th>
                  <th className={thCls}>Plan</th>
                  <th className={thCls}>Access</th>
                  <th className={thCls}>Status</th>
                  <th className={thCls}>Start</th>
                  <th className={thCls}>Expiry</th>
                  <th className={thCls}>Days left</th>
                  <th className={thCls}>Courses</th>
                  <th className={thCls}>Paid</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05] text-gray-300">
                {loading && individual.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-10 text-center text-gray-400">
                      <Loader2 className="mr-2 inline h-4 w-4 animate-spin" /> Loading subscriptions…
                    </td>
                  </tr>
                ) : filteredIndividual.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-10 text-center text-gray-500">
                      No individual subscriptions found.
                    </td>
                  </tr>
                ) : (
                  filteredIndividual.map((s) => {
                    const open = expanded === s.id;
                    return (
                      <Fragment key={s.id}>
                        <tr className="cursor-pointer hover:bg-amber-500/[0.04]" onClick={() => setExpanded(open ? null : s.id)}>
                          <td className="px-3 py-2.5 text-gray-500">
                            {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                          </td>
                          <td className="px-3 py-2.5">
                            <p className="font-medium text-white">{s.name || "—"}</p>
                            <p className="text-[10px] text-gray-500">{s.email}</p>
                            {s.phone ? <p className="text-[10px] text-gray-500">{s.phone}</p> : null}
                          </td>
                          <td className={tdCls}>{s.planTitle}</td>
                          <td className={tdCls}>
                            {s.scope === "all" ? "All self-paced courses" : `Category: ${s.categoryTitle ?? "—"}`}
                          </td>
                          <td className={tdCls}>
                            <StatusBadge status={s.status} />
                          </td>
                          <td className={`${tdCls} text-gray-400`}>{fmtDate(s.startsAt)}</td>
                          <td className={`${tdCls} text-gray-400`}>{fmtDate(s.expiresAt)}</td>
                          <td className={`${tdCls} tabular-nums`}>{daysLeft(s.expiresAt, s.status)}</td>
                          <td className={`${tdCls} tabular-nums`}>{s.coursesUnlocked}</td>
                          <td className={`${tdCls} tabular-nums text-amber-200`}>{inr(s.totalPaidInr)}</td>
                        </tr>
                        {open ? (
                          <tr className="bg-black/30">
                            <td />
                            <td colSpan={9} className="px-3 py-3">
                              <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-gray-500">Payments</p>
                              <div className="overflow-x-auto rounded-lg border border-white/10">
                                <PaymentsTable payments={s.payments} />
                              </div>
                            </td>
                          </tr>
                        ) : null}
                      </Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full min-w-[1100px] text-left text-[11px]">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.03] text-[10px] font-bold uppercase tracking-wider text-gray-500">
                  <th className="w-8 px-3 py-2" />
                  <th className={thCls}>Org ID</th>
                  <th className={thCls}>Company</th>
                  <th className={thCls}>Owner / work email</th>
                  <th className={thCls}>Employees / seats</th>
                  <th className={thCls}>Status</th>
                  <th className={thCls}>Start</th>
                  <th className={thCls}>Expiry</th>
                  <th className={thCls}>Days left</th>
                  <th className={thCls}>Paid</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05] text-gray-300">
                {loading && organisations.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-10 text-center text-gray-400">
                      <Loader2 className="mr-2 inline h-4 w-4 animate-spin" /> Loading subscriptions…
                    </td>
                  </tr>
                ) : filteredOrgs.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-10 text-center text-gray-500">
                      No organisation subscriptions found.
                    </td>
                  </tr>
                ) : (
                  filteredOrgs.map((o) => {
                    const open = expanded === o.workEmail;
                    return (
                      <Fragment key={o.workEmail}>
                        <tr
                          className="cursor-pointer hover:bg-amber-500/[0.04]"
                          onClick={() => setExpanded(open ? null : o.workEmail)}
                        >
                          <td className="px-3 py-2.5 text-gray-500">
                            {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                          </td>
                          <td className={`${tdCls} tabular-nums text-violet-200`}>{o.identificationNumber ?? "—"}</td>
                          <td className={`${tdCls} font-semibold text-white`}>{o.companyName}</td>
                          <td className="px-3 py-2.5">
                            <p className="text-gray-200">{o.ownerName || "—"}</p>
                            <p className="text-[10px] text-gray-500">{o.workEmail}</p>
                            {o.ownerPhone ? <p className="text-[10px] text-gray-500">{o.ownerPhone}</p> : null}
                          </td>
                          <td className={`${tdCls} tabular-nums`}>
                            {o.employeesUsed} / {o.seats}
                          </td>
                          <td className={tdCls}>
                            <StatusBadge status={o.status} />
                          </td>
                          <td className={`${tdCls} text-gray-400`}>{fmtDate(o.startsAt)}</td>
                          <td className={`${tdCls} text-gray-400`}>{fmtDate(o.expiresAt)}</td>
                          <td className={`${tdCls} tabular-nums`}>{daysLeft(o.expiresAt, o.status)}</td>
                          <td className={`${tdCls} tabular-nums text-amber-200`}>{inr(o.totalPaidInr)}</td>
                        </tr>
                        {open ? (
                          <tr className="bg-black/30">
                            <td />
                            <td colSpan={9} className="space-y-4 px-3 py-3">
                              <div>
                                <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                                  Employees ({o.employeesUsed} of {o.seats} seats)
                                </p>
                                {o.employees.length === 0 ? (
                                  <p className="text-[11px] text-gray-500">No employees added yet.</p>
                                ) : (
                                  <div className="overflow-x-auto rounded-lg border border-white/10">
                                    <table className="w-full min-w-[560px] text-[11px]">
                                      <thead>
                                        <tr className="border-b border-white/10 bg-white/[0.03] text-[10px] uppercase text-gray-500">
                                          <th className="px-2 py-1.5 text-left">#</th>
                                          <th className="px-2 py-1.5 text-left">Name</th>
                                          <th className="px-2 py-1.5 text-left">Email</th>
                                          <th className="px-2 py-1.5 text-left">Position</th>
                                          <th className="px-2 py-1.5 text-left">Login</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-white/[0.05]">
                                        {o.employees.map((e, i) => (
                                          <tr key={`${e.email}-${i}`}>
                                            <td className="px-2 py-1.5 tabular-nums text-gray-500">{i + 1}</td>
                                            <td className="px-2 py-1.5 font-medium text-white">{e.name || "—"}</td>
                                            <td className="px-2 py-1.5 text-gray-300">{e.email || "—"}</td>
                                            <td className="px-2 py-1.5 text-gray-400">{e.position || "—"}</td>
                                            <td className="px-2 py-1.5 text-gray-300">{e.hasLogin ? "Yes" : "Not yet"}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                )}
                              </div>
                              <div>
                                <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-gray-500">Payments</p>
                                <div className="overflow-x-auto rounded-lg border border-white/10">
                                  <PaymentsTable payments={o.payments} />
                                </div>
                              </div>
                            </td>
                          </tr>
                        ) : null}
                      </Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}
