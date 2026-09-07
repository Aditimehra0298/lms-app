"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Award,
  BookOpen,
  ChevronDown,
  ChevronUp,
  KeyRound,
  Loader2,
  RefreshCw,
  Search,
  Shield,
  User,
  Users,
} from "lucide-react";
import type { AdminUserListRow, AdminUserListStats } from "@/lib/admin-user-types";

type RoleFilter = "all" | "learner" | "admin";
type AccountFilter = "all" | "individual" | "organisation" | "self" | "unset";

const USER_COLUMNS = [
  "Reg ID",
  "Registered",
  "Name",
  "Email",
  "Phone",
  "Company / Org",
  "Country",
  "IP",
  "Industry",
  "Account",
  "DB role",
  "Panel",
  "Courses",
  "Certs",
  "Verified",
  "Joined",
  "Last login",
  "",
] as const;

function formatWhen(iso: string | null, short = false): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: short ? "2-digit" : "numeric",
    ...(short ? {} : { hour: "2-digit", minute: "2-digit" }),
  });
}

function cellMuted(v: string | null | undefined) {
  return v?.trim() || "—";
}

export default function AdminUsersWorkspace() {
  const [users, setUsers] = useState<AdminUserListRow[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<AdminUserListStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [accountFilter, setAccountFilter] = useState<AccountFilter>("all");
  const [expandedEmail, setExpandedEmail] = useState<string | null>(null);
  const [busyEmail, setBusyEmail] = useState<string | null>(null);
  const [roleDraft, setRoleDraft] = useState<Record<string, string>>({});
  const [saveNotice, setSaveNotice] = useState<string | null>(null);

  const adminHeaders = useCallback((): Record<string, string> => {
    return {
      "Content-Type": "application/json",
    };
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const params = new URLSearchParams({ limit: "100" });
      if (searchQuery.trim()) params.set("q", searchQuery.trim());
      if (roleFilter !== "all") params.set("role", roleFilter);
      if (accountFilter !== "all") params.set("accountType", accountFilter);

      const res = await fetch(`/api/admin/users?${params}`, {
        cache: "no-store",
        headers: adminHeaders(),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        users?: AdminUserListRow[];
        total?: number;
        stats?: AdminUserListStats;
        message?: string;
      };
      if (!res.ok || !data.ok) {
        setLoadError(data.message ?? "Could not load users.");
        setUsers([]);
        return;
      }
      setUsers(data.users ?? []);
      setTotal(data.total ?? 0);
      setStats(data.stats ?? null);
      setRoleDraft((prev) => {
        const next = { ...prev };
        for (const u of data.users ?? []) {
          if (!next[u.email]) next[u.email] = u.role;
        }
        return next;
      });
    } catch {
      setLoadError("Network error while loading users.");
    } finally {
      setLoading(false);
    }
  }, [searchQuery, roleFilter, accountFilter, adminHeaders]);

  useEffect(() => {
    void load();
  }, [load]);

  const roleSummaryRows = useMemo(() => {
    if (!stats?.byRole) return [];
    return Object.entries(stats.byRole).sort((a, b) => b[1] - a[1]);
  }, [stats]);

  const accountSummaryRows = useMemo(() => {
    if (!stats?.byAccountType) return [];
    return Object.entries(stats.byAccountType).sort((a, b) => b[1] - a[1]);
  }, [stats]);

  const saveRole = async (row: AdminUserListRow) => {
    const nextRole = roleDraft[row.email] ?? row.role;
    if (nextRole === row.role) return;
    setBusyEmail(row.email);
    setSaveNotice(null);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: adminHeaders(),
        body: JSON.stringify({ email: row.email, role: nextRole }),
      });
      const data = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !data.ok) throw new Error(data.message ?? "Update failed");
      setSaveNotice(`Updated role for ${row.email}`);
      await load();
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusyEmail(null);
    }
  };

  const sendPasswordReset = async (row: AdminUserListRow) => {
    setBusyEmail(row.email);
    setSaveNotice(null);
    setLoadError(null);
    try {
      const res = await fetch("/api/admin/users/password-reset", {
        method: "POST",
        headers: adminHeaders(),
        body: JSON.stringify({ email: row.email, learnerName: row.name }),
      });
      const data = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !data.ok) throw new Error(data.message ?? "Could not send reset email");
      setSaveNotice(data.message ?? `Password reset email sent to ${row.email}`);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Could not send reset email");
    } finally {
      setBusyEmail(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-[#0c1428] via-[#0a101c] to-[#070b14]">
        <div className="border-b border-white/[0.06] bg-blue-500/[0.07] px-4 py-5 sm:px-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex gap-4">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-blue-500/20 ring-1 ring-blue-400/30">
                <Users className="h-6 w-6 text-blue-200" aria-hidden />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-300/90">MySQL registry</p>
                <h1 className="mt-1 text-xl font-bold text-white sm:text-2xl">Users</h1>
                <p className="mt-2 max-w-2xl text-xs leading-relaxed text-gray-400">
                  Full learner registry from <span className="font-mono text-gray-500">lms_user</span> — registration
                  IDs, contact details, course progress, enrollments, and certificates.
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
              placeholder="Search email, name, phone, company, or ID…"
              className="w-full bg-transparent text-xs text-white outline-none placeholder:text-gray-600"
            />
          </label>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as RoleFilter)}
            className="rounded-lg border border-white/10 bg-black/40 px-2.5 py-1.5 text-xs text-white outline-none"
          >
            <option value="all">All roles</option>
            <option value="learner">Learner</option>
            <option value="admin">Admin</option>
          </select>
          <select
            value={accountFilter}
            onChange={(e) => setAccountFilter(e.target.value as AccountFilter)}
            className="rounded-lg border border-white/10 bg-black/40 px-2.5 py-1.5 text-xs text-white outline-none"
          >
            <option value="all">All account types</option>
            <option value="individual">Individual</option>
            <option value="organisation">Organisation</option>
            <option value="self">Self</option>
            <option value="unset">Unset</option>
          </select>
          <Link
            href="/admin?panel=roles"
            className="ml-auto text-[11px] font-medium text-blue-300 hover:text-blue-100"
          >
            Roles &amp; permissions →
          </Link>
        </div>
      </div>

      {loadError ? (
        <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
          {loadError}
        </p>
      ) : null}
      {saveNotice ? (
        <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          {saveNotice}
        </p>
      ) : null}

      {stats ? (
        <section className="overflow-hidden rounded-xl border border-white/10 bg-[#0d1528]">
          <div className="border-b border-white/10 px-4 py-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400">Registry summary</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-[11px]">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.03] text-[10px] font-bold uppercase tracking-wider text-gray-500">
                  <th className="px-4 py-2">Metric</th>
                  <th className="px-4 py-2">Count</th>
                  <th className="px-4 py-2">Breakdown</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05] text-gray-300">
                <tr>
                  <td className="px-4 py-2.5 font-medium text-white">Total users (filtered)</td>
                  <td className="px-4 py-2.5 tabular-nums">{total}</td>
                  <td className="px-4 py-2.5 text-gray-500">
                    {stats.withPurchases} with enrollments · {stats.withCertificates} with certificates
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-2.5 font-medium text-white">By DB role</td>
                  <td className="px-4 py-2.5 tabular-nums">
                    {roleSummaryRows.reduce((s, [, n]) => s + n, 0)}
                  </td>
                  <td className="px-4 py-2.5">
                    {roleSummaryRows.map(([role, count]) => (
                      <span
                        key={role}
                        className="mr-2 inline-flex rounded bg-white/5 px-2 py-0.5 capitalize text-gray-400"
                      >
                        {role}: <strong className="ml-1 text-gray-200">{count}</strong>
                      </span>
                    ))}
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-2.5 font-medium text-white">By account type</td>
                  <td className="px-4 py-2.5 tabular-nums">
                    {accountSummaryRows.reduce((s, [, n]) => s + n, 0)}
                  </td>
                  <td className="px-4 py-2.5">
                    {accountSummaryRows.map(([type, count]) => (
                      <span
                        key={type}
                        className="mr-2 inline-flex rounded bg-white/5 px-2 py-0.5 capitalize text-gray-400"
                      >
                        {type}: <strong className="ml-1 text-gray-200">{count}</strong>
                      </span>
                    ))}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {loading && users.length === 0 ? (
        <div className="flex items-center justify-center rounded-xl border border-white/10 bg-[#0b1224] px-4 py-16 text-sm text-gray-400">
          <Loader2 className="mr-2 h-5 w-5 animate-spin text-blue-400" /> Loading users…
        </div>
      ) : users.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/15 bg-[#0d1528]/60 px-6 py-14 text-center">
          <User className="mx-auto mb-3 h-10 w-10 text-blue-400/40" aria-hidden />
          <p className="text-sm font-medium text-white">No users found</p>
          <p className="mt-1 text-xs text-gray-500">
            Users appear after Google sign-in, registration, or checkout with MySQL connected.
          </p>
        </div>
      ) : (
        <section className="overflow-hidden rounded-xl border border-white/10 bg-[#0d1528]">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-4 py-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400">
              User directory <span className="font-normal text-gray-600">({users.length} shown)</span>
            </h2>
            <p className="text-[10px] text-gray-600">Scroll horizontally for all columns</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1400px] text-left text-[11px]">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.03] text-[10px] font-bold uppercase tracking-wider text-gray-500">
                  {USER_COLUMNS.map((h) => (
                    <th key={h || "actions"} className="whitespace-nowrap px-3 py-2.5">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {users.map((row) => {
                  const expanded = expandedEmail === row.email;
                  const draftRole = roleDraft[row.email] ?? row.role;
                  const roleDirty = draftRole !== row.role;
                  const orgLabel =
                    row.organization?.companyName ??
                    row.companyName ??
                    (row.accountType === "organisation" ? "—" : null);
                  const orgId = row.organization?.identificationNumber;

                  return (
                    <Fragment key={row.id}>
                      <tr className="align-top hover:bg-white/[0.02]">
                        <td className="whitespace-nowrap px-3 py-2.5 tabular-nums text-violet-200">
                          {row.identificationNumber ?? "—"}
                          {orgId ? (
                            <p className="text-[9px] text-amber-400/80">org {orgId}</p>
                          ) : null}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-gray-500">
                          {row.registrationMonthYear ?? "—"}
                        </td>
                        <td className="max-w-[120px] px-3 py-2.5">
                          <p className="truncate font-medium text-white">{cellMuted(row.name)}</p>
                        </td>
                        <td className="max-w-[180px] px-3 py-2.5">
                          <p className="truncate font-mono text-[10px] text-gray-400">{row.email}</p>
                          {row.personalEmail ? (
                            <p className="truncate text-[9px] text-gray-600">alt: {row.personalEmail}</p>
                          ) : null}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-gray-400">{cellMuted(row.phone)}</td>
                        <td className="max-w-[140px] px-3 py-2.5">
                          <p className="truncate text-gray-300">{cellMuted(orgLabel)}</p>
                          {row.companySize ? (
                            <p className="text-[9px] text-gray-600">{row.companySize} employees</p>
                          ) : null}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-gray-400">
                          {row.countryName ?? "—"}
                          {row.countryCode ? (
                            <span className="text-[9px] text-gray-600"> ({row.countryCode})</span>
                          ) : null}
                        </td>
                        <td className="max-w-[140px] px-3 py-2.5 font-mono text-[10px] text-gray-400">
                          {row.ipv4 || row.ipv6 ? (
                            <>
                              {row.ipv4 ? <p className="truncate">{row.ipv4}</p> : null}
                              {row.ipv6 ? (
                                <p className="truncate text-[9px] text-gray-600" title={row.ipv6}>
                                  {row.ipv6}
                                </p>
                              ) : null}
                            </>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="max-w-[100px] truncate px-3 py-2.5 text-gray-500">
                          {cellMuted(row.industryType ?? row.organization?.industryType)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 capitalize text-gray-400">
                          {row.accountType ?? "—"}
                        </td>
                        <td className="px-3 py-2.5">
                          <select
                            value={draftRole}
                            disabled={row.isMainAdmin || busyEmail === row.email}
                            onChange={(e) =>
                              setRoleDraft((d) => ({ ...d, [row.email]: e.target.value }))
                            }
                            className="rounded border border-white/10 bg-black/40 px-1.5 py-0.5 text-[10px] text-white outline-none disabled:opacity-60"
                          >
                            <option value="learner">learner</option>
                            <option value="admin">admin</option>
                          </select>
                          {roleDirty ? (
                            <button
                              type="button"
                              disabled={busyEmail === row.email}
                              onClick={() => void saveRole(row)}
                              className="mt-0.5 block text-[9px] font-semibold text-emerald-300"
                            >
                              Save
                            </button>
                          ) : null}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5">
                          {row.panelAccess === "full" ? (
                            <span className="inline-flex items-center gap-0.5 rounded bg-violet-500/20 px-1.5 py-0.5 text-[9px] font-bold uppercase text-violet-200">
                              <Shield className="h-3 w-3" /> Full
                            </span>
                          ) : (
                            <span className="text-[10px] text-gray-600">—</span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 tabular-nums text-gray-300">
                          {row.purchaseCount}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 tabular-nums text-amber-300/90">
                          {row.certificateCount || "—"}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5">
                          {row.emailVerifiedAt ? (
                            <span className="text-emerald-400">Yes</span>
                          ) : (
                            <span className="text-gray-600">No</span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-gray-500">
                          {formatWhen(row.createdAt, true)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-gray-500">
                          {formatWhen(row.lastLoginAt, true)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5">
                          <button
                            type="button"
                            onClick={() => setExpandedEmail(expanded ? null : row.email)}
                            className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] text-gray-400 hover:bg-white/5"
                          >
                            {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                            More
                          </button>
                        </td>
                      </tr>
                      {expanded ? (
                        <tr className="bg-black/25">
                          <td colSpan={USER_COLUMNS.length} className="px-4 py-4">
                            <div className="grid gap-4 lg:grid-cols-2">
                              <div>
                                <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                                  Profile details
                                </p>
                                <table className="w-full text-[11px]">
                                  <tbody className="divide-y divide-white/[0.06]">
                                    {[
                                      ["User ID", row.id],
                                      ["Registration month", row.registrationMonthYear ?? "—"],
                                      ["Personal email", row.personalEmail ?? "—"],
                                      ["Company (profile)", row.companyName ?? "—"],
                                      ["Industry", row.industryType ?? "—"],
                                      ["Company size", row.companySize ?? "—"],
                                      ["Email verified", row.emailVerifiedAt ? formatWhen(row.emailVerifiedAt) : "—"],
                                      ["Joined", formatWhen(row.createdAt)],
                                      ["Last login", row.lastLoginAt ? formatWhen(row.lastLoginAt) : "—"],
                                    ].map(([label, value]) => (
                                      <tr key={String(label)}>
                                        <td className="py-1.5 pr-4 text-gray-500">{label}</td>
                                        <td className="py-1.5 text-gray-300">{value}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                                <button
                                  type="button"
                                  disabled={busyEmail === row.email}
                                  onClick={() => void sendPasswordReset(row)}
                                  className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5 text-[11px] font-semibold text-amber-100 hover:bg-amber-500/20 disabled:opacity-50"
                                >
                                  {busyEmail === row.email ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <KeyRound className="h-3 w-3" />
                                  )}
                                  Send password reset email
                                </button>
                              </div>
                              <div>
                                {row.organization ? (
                                  <>
                                    <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                                      Linked organisation
                                    </p>
                                    <table className="mb-4 w-full text-[11px]">
                                      <tbody className="divide-y divide-white/[0.06]">
                                        {[
                                          ["Org ID", String(row.organization.identificationNumber)],
                                          ["Company", row.organization.companyName],
                                          ["Work email", row.organization.workEmail],
                                          ["Industry", row.organization.industryType ?? "—"],
                                          ["Size", row.organization.companySize ?? "—"],
                                          ["Registered", row.organization.registrationMonthYear ?? "—"],
                                        ].map(([label, value]) => (
                                          <tr key={String(label)}>
                                            <td className="py-1.5 pr-4 text-gray-500">{label}</td>
                                            <td className="py-1.5 text-gray-300">{value}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </>
                                ) : null}
                                <p className="mb-2 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                                  <BookOpen className="h-3 w-3" /> Course progress
                                  {row.courseProgress?.length ? (
                                    <span className="font-normal normal-case text-gray-600">
                                      ({row.courseProgress.filter((c) => c.status === "Completed").length} completed ·{" "}
                                      {row.courseProgress.length} total)
                                    </span>
                                  ) : null}
                                </p>
                                {!row.courseProgress?.length ? (
                                  <p className="text-[11px] text-gray-600">
                                    No enrollments or progress recorded yet.
                                  </p>
                                ) : (
                                  <div className="overflow-x-auto rounded-lg border border-white/10">
                                    <table className="w-full min-w-[640px] text-[11px]">
                                      <thead>
                                        <tr className="border-b border-white/10 bg-white/[0.03] text-[10px] uppercase text-gray-600">
                                          <th className="px-2 py-1.5 text-left">Course</th>
                                          <th className="px-2 py-1.5 text-left">Status</th>
                                          <th className="px-2 py-1.5 text-left">Modules</th>
                                          <th className="px-2 py-1.5 text-left">Progress</th>
                                          <th className="px-2 py-1.5 text-left">Exams</th>
                                          <th className="px-2 py-1.5 text-left">Certificate</th>
                                          <th className="px-2 py-1.5 text-left">Updated</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-white/[0.06]">
                                        {row.courseProgress.map((c) => (
                                          <tr key={c.courseSlug}>
                                            <td className="px-2 py-2">
                                              <p className="font-medium text-gray-200">{c.title}</p>
                                              <p className="font-mono text-[10px] text-gray-600">{c.courseSlug}</p>
                                              {c.enrolledAt ? (
                                                <p className="text-[10px] text-gray-600">
                                                  Enrolled {formatWhen(c.enrolledAt, true)}
                                                </p>
                                              ) : null}
                                            </td>
                                            <td className="px-2 py-2">
                                              <span
                                                className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                                                  c.status === "Completed"
                                                    ? "bg-emerald-500/20 text-emerald-300"
                                                    : c.status === "In Progress"
                                                      ? "bg-amber-500/20 text-amber-200"
                                                      : "bg-white/5 text-gray-400"
                                                }`}
                                              >
                                                {c.status}
                                              </span>
                                            </td>
                                            <td className="px-2 py-2 text-gray-300">
                                              {c.completedModules}
                                              {c.totalModules > 0 ? ` / ${c.totalModules}` : ""}
                                            </td>
                                            <td className="px-2 py-2">
                                              <div className="flex items-center gap-2">
                                                <div className="h-1.5 w-16 overflow-hidden rounded-full bg-white/10">
                                                  <div
                                                    className={`h-full rounded-full ${
                                                      c.status === "Completed" ? "bg-emerald-400" : "bg-amber-400"
                                                    }`}
                                                    style={{ width: `${Math.min(100, c.percent)}%` }}
                                                  />
                                                </div>
                                                <span className="text-gray-400">{c.percent}%</span>
                                              </div>
                                            </td>
                                            <td className="px-2 py-2 text-gray-400">
                                              {c.examAttemptCount > 0
                                                ? `${c.examPassedCount}/${c.examAttemptCount} passed${
                                                    c.lastExamPercent != null ? ` · best ${c.lastExamPercent}%` : ""
                                                  }`
                                                : "—"}
                                            </td>
                                            <td className="px-2 py-2 text-gray-400">
                                              {c.certificateStatus !== "none" ? (
                                                <span>
                                                  {c.certificateStatus}
                                                  {c.certificateNumber ? (
                                                    <span className="mt-0.5 block font-mono text-[10px] text-amber-200/80">
                                                      {c.certificateNumber}
                                                    </span>
                                                  ) : null}
                                                </span>
                                              ) : (
                                                "—"
                                              )}
                                            </td>
                                            <td className="px-2 py-2 text-gray-500">
                                              {c.updatedAt ? formatWhen(c.updatedAt, true) : "—"}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                )}

                                {row.certificates?.length ? (
                                  <div className="mt-4">
                                    <p className="mb-2 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                                      <Award className="h-3 w-3" /> Certificates
                                    </p>
                                    <table className="w-full text-[11px]">
                                      <thead>
                                        <tr className="border-b border-white/10 text-[10px] uppercase text-gray-600">
                                          <th className="py-1 text-left">Course</th>
                                          <th className="py-1 text-left">Number</th>
                                          <th className="py-1 text-left">Status</th>
                                          <th className="py-1 text-left">Score</th>
                                          <th className="py-1 text-left">Issued</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-white/[0.06]">
                                        {row.certificates.map((cert) => (
                                          <tr key={cert.certificateNumber}>
                                            <td className="py-1.5 text-gray-200">{cert.courseTitle}</td>
                                            <td className="py-1.5 font-mono text-[10px] text-amber-200/80">
                                              {cert.certificateNumber}
                                            </td>
                                            <td className="py-1.5 capitalize text-gray-400">{cert.status}</td>
                                            <td className="py-1.5 text-gray-400">
                                              {cert.scorePercent != null ? `${cert.scorePercent}%` : "—"}
                                            </td>
                                            <td className="py-1.5 text-gray-500">
                                              {formatWhen(cert.issuedAt, true)}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                    <p className="mt-2 text-[10px] text-gray-600">
                                      Manage PDFs in{" "}
                                      <Link href="/admin?panel=certificates" className="underline hover:text-amber-200">
                                        Certificates
                                      </Link>
                                    </p>
                                  </div>
                                ) : (
                                  <p className="mt-3 text-[11px] text-gray-600">No certificates on file.</p>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
