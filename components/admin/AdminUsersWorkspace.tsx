"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Award,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Loader2,
  RefreshCw,
  Search,
  Shield,
  User,
  Users,
} from "lucide-react";
import { getLearnerEmail } from "@/lib/learner-session-client";
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
      const email = getLearnerEmail();
      const params = new URLSearchParams({ limit: "100" });
      if (searchQuery.trim()) params.set("q", searchQuery.trim());
      if (roleFilter !== "all") params.set("role", roleFilter);
      if (accountFilter !== "all") params.set("accountType", accountFilter);
      if (email) params.set("email", email);

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
                  IDs, contact details, enrollments, and certificates.
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
                                      ["Last login", formatWhen(row.lastLoginAt)],
                                    ].map(([label, value]) => (
                                      <tr key={String(label)}>
                                        <td className="py-1.5 pr-4 text-gray-500">{label}</td>
                                        <td className="py-1.5 text-gray-300">{value}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
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
                                  <BookOpen className="h-3 w-3" /> Enrollments
                                  {row.purchaseCount > row.recentPurchases.length ? (
                                    <span className="font-normal normal-case text-gray-600">
                                      (showing latest {row.recentPurchases.length} of {row.purchaseCount})
                                    </span>
                                  ) : null}
                                </p>
                                {row.recentPurchases.length === 0 ? (
                                  <p className="text-[11px] text-gray-600">No purchases in MySQL.</p>
                                ) : (
                                  <table className="w-full text-[11px]">
                                    <thead>
                                      <tr className="border-b border-white/10 text-[10px] uppercase text-gray-600">
                                        <th className="py-1 text-left">Course</th>
                                        <th className="py-1 text-left">Slug</th>
                                        <th className="py-1 text-left">Enrolled</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/[0.06]">
                                      {row.recentPurchases.map((p) => (
                                        <tr key={`${p.courseSlug}-${p.enrolledAt}`}>
                                          <td className="py-1.5 text-gray-200">{p.title}</td>
                                          <td className="py-1.5 font-mono text-[10px] text-gray-500">{p.courseSlug}</td>
                                          <td className="py-1.5 text-gray-500">{formatWhen(p.enrolledAt, true)}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                )}
                                {row.certificateCount > 0 ? (
                                  <p className="mt-3 flex items-center gap-1 text-[10px] text-amber-300/80">
                                    <Award className="h-3 w-3" />
                                    {row.certificateCount} certificate(s) on file — manage in{" "}
                                    <Link href="/admin?panel=certificates" className="underline hover:text-amber-200">
                                      Certificates
                                    </Link>
                                  </p>
                                ) : null}
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
