"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { Building2, ChevronDown, ChevronRight, Download, Loader2, RefreshCw, Search, Users } from "lucide-react";
import type { OrgDirectoryRow } from "@/app/api/admin/organizations/directory/route";

type Props = {
  /** Shows a "Manage" button per organisation (Organisation Team editor). */
  onManage?: (workEmail: string) => void;
};

const LOGIN_BADGE: Record<OrgDirectoryRow["employees"][number]["login"], { label: string; cls: string }> = {
  created: { label: "Login created", cls: "border-emerald-400/40 text-emerald-200" },
  linked: { label: "Existing account", cls: "border-sky-400/40 text-sky-200" },
  pending: { label: "No login yet", cls: "border-amber-400/40 text-amber-200" },
};

function formatDate(value: string | null): string {
  if (!value) return "—";
  if (/^\d{2}-\d{4}$/.test(value)) return value;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString();
}

function csvCell(value: string | number | null | undefined): string {
  const s = value === null || value === undefined ? "" : String(value);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function downloadCsv(rows: OrgDirectoryRow[]) {
  const lines = [
    [
      "Org ID",
      "Company",
      "Work email",
      "Owner",
      "Plan",
      "Seats",
      "Employee name",
      "Employee email",
      "Position",
      "Login",
      "Assigned courses",
    ].join(","),
  ];
  for (const org of rows) {
    const base = [
      org.identificationNumber,
      org.companyName,
      org.workEmail,
      org.ownerName,
      org.planName,
      `${org.employees.length}/${org.seatLimit}`,
    ].map(csvCell);
    if (org.employees.length === 0) {
      lines.push([...base, "", "", "", "", ""].join(","));
      continue;
    }
    for (const e of org.employees) {
      lines.push(
        [
          ...base,
          csvCell(e.name),
          csvCell(e.email),
          csvCell(e.position),
          csvCell(LOGIN_BADGE[e.login].label),
          csvCell(e.courses.map((c) => c.title).join("; ")),
        ].join(","),
      );
    }
  }
  const blob = new Blob([lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `organisations-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

export function AdminOrganizationsDirectory({ onManage }: Props) {
  const [rows, setRows] = useState<OrgDirectoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/organizations/directory", { cache: "no-store", credentials: "include" });
      const data = (await res.json()) as { ok?: boolean; organizations?: OrgDirectoryRow[]; message?: string };
      if (!data.ok) throw new Error(data.message || "Could not load organisations");
      setRows(data.organizations ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load organisations");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (o) =>
        o.companyName.toLowerCase().includes(q) ||
        o.workEmail.includes(q) ||
        (o.ownerName ?? "").toLowerCase().includes(q) ||
        String(o.identificationNumber ?? "").includes(q) ||
        o.employees.some((e) => e.name.toLowerCase().includes(q) || e.email.toLowerCase().includes(q)),
    );
  }, [rows, search]);

  const totalEmployees = rows.reduce((s, o) => s + o.employees.length, 0);

  const toggle = (email: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(email)) next.delete(email);
      else next.add(email);
      return next;
    });

  return (
    <section className="overflow-hidden rounded-xl border border-white/10 bg-[#0d1528]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
        <div>
          <h2 className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-300">
            <Building2 className="h-4 w-4 text-sky-300" /> Organisations
          </h2>
          <p className="mt-0.5 text-[11px] text-gray-500">
            {rows.length} organisations · {totalEmployees} employees. Click a row to see its employees.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-black/40 px-2.5 py-1.5">
            <Search className="h-3.5 w-3.5 text-gray-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Company, owner, employee…"
              className="w-48 bg-transparent text-xs text-white outline-none placeholder:text-gray-600"
            />
          </label>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-1.5 text-[11px] font-semibold text-gray-200 hover:bg-white/5 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
          <button
            type="button"
            onClick={() => downloadCsv(filtered)}
            disabled={filtered.length === 0}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-1.5 text-[11px] font-semibold text-gray-200 hover:bg-white/5 disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5" /> CSV
          </button>
        </div>
      </div>

      {error ? <p className="px-4 py-3 text-xs text-rose-300">{error}</p> : null}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1100px] text-left text-[11px]">
          <thead>
            <tr className="border-b border-white/10 bg-white/[0.03] text-[10px] font-bold uppercase tracking-wider text-gray-500">
              <th className="w-8 px-3 py-2" />
              <th className="px-3 py-2">Org ID</th>
              <th className="px-3 py-2">Company</th>
              <th className="px-3 py-2">Owner / work email</th>
              <th className="px-3 py-2">Industry · size</th>
              <th className="px-3 py-2">Plan</th>
              <th className="px-3 py-2">Employees / seats</th>
              <th className="px-3 py-2">Courses assigned</th>
              <th className="px-3 py-2">Registered</th>
              {onManage ? <th className="px-3 py-2" /> : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.05] text-gray-300">
            {loading && rows.length === 0 ? (
              <tr>
                <td colSpan={onManage ? 10 : 9} className="px-4 py-10 text-center text-gray-400">
                  <Loader2 className="mr-2 inline h-4 w-4 animate-spin" /> Loading organisations…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={onManage ? 10 : 9} className="px-4 py-10 text-center text-gray-500">
                  No organisations found.
                </td>
              </tr>
            ) : (
              filtered.map((org) => {
                const open = expanded.has(org.workEmail);
                return (
                  <Fragment key={org.workEmail}>
                    <tr className="cursor-pointer hover:bg-sky-500/[0.05]" onClick={() => toggle(org.workEmail)}>
                      <td className="px-3 py-2.5 text-gray-500">
                        {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                      </td>
                      <td className="px-3 py-2.5 tabular-nums text-violet-200">{org.identificationNumber ?? "—"}</td>
                      <td className="px-3 py-2.5 font-semibold text-white">{org.companyName}</td>
                      <td className="px-3 py-2.5">
                        <p className="text-gray-200">{org.ownerName || "—"}</p>
                        <p className="text-[10px] text-gray-500">{org.workEmail}</p>
                        {org.ownerPhone ? <p className="text-[10px] text-gray-500">{org.ownerPhone}</p> : null}
                      </td>
                      <td className="px-3 py-2.5 text-gray-400">
                        {[org.industryType, org.companySize].filter(Boolean).join(" · ") || "—"}
                      </td>
                      <td className="px-3 py-2.5">
                        <p>{org.planName}</p>
                        {org.allAccess ? (
                          <p className={`text-[10px] ${org.allAccess.active ? "text-emerald-300" : "text-rose-300"}`}>
                            All-access {org.allAccess.active ? "until" : "expired"} {formatDate(org.allAccess.expiresAt)}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-3 py-2.5 tabular-nums">
                        <span className="inline-flex items-center gap-1">
                          <Users className="h-3 w-3 text-sky-300" /> {org.employees.length} / {org.seatLimit}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 tabular-nums">{org.assignedCourseCount}</td>
                      <td className="px-3 py-2.5 text-gray-400">{formatDate(org.registeredAt)}</td>
                      {onManage ? (
                        <td className="px-3 py-2.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onManage(org.workEmail);
                            }}
                            className="rounded-lg border border-sky-400/40 px-2.5 py-1 text-[10px] font-semibold text-sky-100 hover:bg-sky-500/10"
                          >
                            Manage
                          </button>
                        </td>
                      ) : null}
                    </tr>
                    {open ? (
                      <tr className="bg-black/30">
                        <td />
                        <td colSpan={onManage ? 9 : 8} className="px-3 py-3">
                          {org.employees.length === 0 ? (
                            <p className="text-[11px] text-gray-500">No employees added yet.</p>
                          ) : (
                            <div className="overflow-x-auto rounded-lg border border-white/10">
                              <table className="w-full min-w-[820px] text-[11px]">
                                <thead>
                                  <tr className="border-b border-white/10 bg-white/[0.03] text-[10px] uppercase text-gray-500">
                                    <th className="px-2 py-1.5 text-left">#</th>
                                    <th className="px-2 py-1.5 text-left">Employee</th>
                                    <th className="px-2 py-1.5 text-left">Email</th>
                                    <th className="px-2 py-1.5 text-left">Position</th>
                                    <th className="px-2 py-1.5 text-left">Login</th>
                                    <th className="px-2 py-1.5 text-left">Last sign-in</th>
                                    <th className="px-2 py-1.5 text-left">Assigned courses</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-white/[0.05]">
                                  {org.employees.map((e, i) => (
                                    <tr key={`${e.slot}-${e.email}`}>
                                      <td className="px-2 py-1.5 tabular-nums text-gray-500">{i + 1}</td>
                                      <td className="px-2 py-1.5 font-medium text-white">{e.name || "—"}</td>
                                      <td className="px-2 py-1.5 text-gray-300">{e.email || "—"}</td>
                                      <td className="px-2 py-1.5 text-gray-400">{e.position || "—"}</td>
                                      <td className="px-2 py-1.5">
                                        <span
                                          className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${LOGIN_BADGE[e.login].cls}`}
                                        >
                                          {LOGIN_BADGE[e.login].label}
                                        </span>
                                      </td>
                                      <td className="px-2 py-1.5 text-gray-400">{formatDate(e.lastLoginAt)}</td>
                                      <td className="px-2 py-1.5 text-gray-300">
                                        {e.courses.length === 0
                                          ? "—"
                                          : e.courses.map((c) => (
                                              <span
                                                key={c.slug}
                                                className="mb-1 mr-1 inline-flex rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-gray-300"
                                              >
                                                {c.title}
                                              </span>
                                            ))}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
