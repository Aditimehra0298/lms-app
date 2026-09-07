"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Building2,
  KeyRound,
  Loader2,
  Lock,
  RefreshCw,
  Shield,
  ShieldCheck,
  UserCog,
} from "lucide-react";

type AccessConfig = {
  panelAccess: {
    mainAdminConfigured: boolean;
    mainAdminMasked: string | null;
    delegateEmailsMasked: string[];
    note: string;
  };
  envKeys: string[];
  dbAdminUsers: {
    email: string;
    name: string | null;
    lastLoginAt: string | null;
    identificationNumber: number | null;
    isMainAdmin: boolean;
  }[];
  organizationCount: number;
  dbUnavailable?: boolean;
};

type OrgRow = {
  id: string;
  identificationNumber: number;
  companyName: string;
  workEmail: string;
  personalEmail: string | null;
  industryType: string | null;
  companySize: string | null;
  registrationMonthYear: string | null;
};

const PERMISSION_ROWS = [
  {
    area: "Admin panel (/admin)",
    learner: "No",
    dbAdmin: "No",
    mainAdmin: "Full access",
    notes: "Google sign-in must match MAIN_ADMIN_EMAIL",
  },
  {
    area: "Self-paced & tutor-led editors",
    learner: "No",
    dbAdmin: "No",
    mainAdmin: "Yes",
    notes: "Course Management menus",
  },
  {
    area: "Users & Certificates workspaces",
    learner: "No",
    dbAdmin: "No",
    mainAdmin: "Yes",
    notes: "MySQL read/write for users & certs",
  },
  {
    area: "Learner dashboard & courses",
    learner: "Yes (when enrolled)",
    dbAdmin: "Yes",
    mainAdmin: "Yes",
    notes: "Standard learner experience",
  },
  {
    area: "Certificate visibility toggle",
    learner: "View own when issued",
    dbAdmin: "No",
    mainAdmin: "Yes",
    notes: "Certificates workspace",
  },
  {
    area: "Course Q&A moderation",
    learner: "Post (pending approval)",
    dbAdmin: "No",
    mainAdmin: "Approve / official answers",
    notes: "Course Q&A panel",
  },
  {
    area: "Support tickets (AI chatbot)",
    learner: "Create via chatbot",
    dbAdmin: "No",
    mainAdmin: "View & update status",
    notes: "Support Tickets panel",
  },
  {
    area: "Profile & account settings",
    learner: "Edit own profile",
    dbAdmin: "Edit own profile",
    mainAdmin: "Edit own profile",
    notes: "/profile and /account",
  },
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

export default function AdminRolesPermissionsWorkspace() {
  const [config, setConfig] = useState<AccessConfig | null>(null);
  const [organizations, setOrganizations] = useState<OrgRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const adminHeaders = useCallback((): Record<string, string> => {
    return {};
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [configRes, orgRes] = await Promise.all([
        fetch(`/api/admin/access-config`, { cache: "no-store", headers: adminHeaders() }),
        fetch("/api/admin/organizations", { cache: "no-store" }),
      ]);
      const data = (await configRes.json()) as AccessConfig & { ok?: boolean; message?: string };
      if (!configRes.ok || !data.ok) {
        setLoadError(data.message ?? "Could not load access configuration.");
        return;
      }
      setConfig(data);

      if (orgRes.ok) {
        const orgData = (await orgRes.json()) as { organizations?: OrgRow[] };
        setOrganizations(orgData.organizations ?? []);
      } else {
        setOrganizations([]);
      }
    } catch {
      setLoadError("Network error while loading access configuration.");
    } finally {
      setLoading(false);
    }
  }, [adminHeaders]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading && !config) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-white/10 bg-[#0b1224] px-4 py-16 text-sm text-gray-400">
        <Loader2 className="mr-2 h-5 w-5 animate-spin text-violet-400" /> Loading roles &amp; permissions…
      </div>
    );
  }

  const panel = config?.panelAccess;

  const panelAccessRows = [
    {
      setting: "MAIN_ADMIN_EMAIL",
      value: panel?.mainAdminConfigured ? panel.mainAdminMasked : "Not set",
      status: panel?.mainAdminConfigured ? "active" : "missing",
      description: "Only this Google account may open /admin",
    },
    {
      setting: "ADMIN_EMAILS (legacy)",
      value:
        panel?.delegateEmailsMasked?.length ?
          panel.delegateEmailsMasked.join(", ")
        : "None",
      status: panel?.delegateEmailsMasked?.length ? "info" : "none",
      description: "Informational only — does not grant panel access",
    },
    {
      setting: "Sign-in URL",
      value: "/account?admin=1",
      status: "info",
      description: "Use Google with the main admin email",
    },
    {
      setting: "Environment keys",
      value: config?.envKeys.join(", ") ?? "—",
      status: "info",
      description: "Set in .env.local on the server",
    },
  ];

  return (
    <div className="space-y-5">
      <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-[#0c1428] via-[#0a101c] to-[#070b14]">
        <div className="border-b border-white/[0.06] bg-violet-500/[0.07] px-4 py-5 sm:px-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex gap-4">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-violet-500/20 ring-1 ring-violet-400/30">
                <Shield className="h-6 w-6 text-violet-200" aria-hidden />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-violet-300/90">
                  Access control
                </p>
                <h1 className="mt-1 text-xl font-bold text-white sm:text-2xl">Roles &amp; permissions</h1>
                <p className="mt-2 max-w-2xl text-xs leading-relaxed text-gray-400">
                  Panel access, database roles, and organisation registry — all in table form for quick review.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/admin?panel=users"
                className="rounded-lg border border-white/10 px-2.5 py-1 text-[11px] text-blue-300 hover:bg-white/5"
              >
                All users →
              </Link>
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
        </div>
      </div>

      {loadError ? (
        <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
          {loadError}
        </p>
      ) : null}

      {config?.dbUnavailable ? (
        <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-100">
          MySQL is unavailable — panel access table below still applies. Connect the database for admin user and
          organisation tables.
        </p>
      ) : null}

      <section className="overflow-hidden rounded-xl border border-violet-500/25 bg-[#0d1528]">
        <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
          <KeyRound className="h-4 w-4 text-violet-400" aria-hidden />
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-300">Admin panel access</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-[11px]">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.03] text-[10px] font-bold uppercase tracking-wider text-gray-500">
                <th className="px-4 py-2.5">Setting</th>
                <th className="px-4 py-2.5">Value</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {panelAccessRows.map((row) => (
                <tr key={row.setting} className="text-gray-400">
                  <td className="px-4 py-2.5 font-mono text-violet-200/90">{row.setting}</td>
                  <td className="px-4 py-2.5 text-gray-300">{row.value}</td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`rounded px-2 py-0.5 text-[9px] font-bold uppercase ${
                        row.status === "active"
                          ? "bg-emerald-500/20 text-emerald-300"
                          : row.status === "missing"
                            ? "bg-amber-500/20 text-amber-300"
                            : "bg-white/5 text-gray-500"
                      }`}
                    >
                      {row.status}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">{row.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="flex items-start gap-2 border-t border-white/10 px-4 py-3 text-[11px] text-gray-500">
          <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          {panel?.note}
        </p>
      </section>

      <section className="overflow-hidden rounded-xl border border-white/10 bg-[#0d1528]">
        <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
          <UserCog className="h-4 w-4 text-blue-400" aria-hidden />
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-300">
            Users with admin role in MySQL ({config?.dbAdminUsers.length ?? 0})
          </h2>
        </div>
        {(config?.dbAdminUsers.length ?? 0) === 0 ? (
          <p className="px-4 py-8 text-center text-xs text-gray-600">No users with role=admin in the database.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-[11px]">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.03] text-[10px] font-bold uppercase tracking-wider text-gray-500">
                  <th className="px-4 py-2.5">Reg ID</th>
                  <th className="px-4 py-2.5">Name</th>
                  <th className="px-4 py-2.5">Email</th>
                  <th className="px-4 py-2.5">Last login</th>
                  <th className="px-4 py-2.5">Panel access</th>
                  <th className="px-4 py-2.5">DB role meaning</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {config?.dbAdminUsers.map((u) => (
                  <tr key={u.email} className="text-gray-400">
                    <td className="px-4 py-2.5 tabular-nums text-violet-200">
                      {u.identificationNumber ?? "—"}
                    </td>
                    <td className="px-4 py-2.5 font-medium text-white">{u.name?.trim() || "—"}</td>
                    <td className="px-4 py-2.5 font-mono text-[10px]">{u.email}</td>
                    <td className="px-4 py-2.5">{formatWhen(u.lastLoginAt)}</td>
                    <td className="px-4 py-2.5">
                      {u.isMainAdmin ? (
                        <span className="inline-flex items-center gap-1 rounded bg-violet-500/20 px-2 py-0.5 text-[9px] font-bold uppercase text-violet-200">
                          <ShieldCheck className="h-3 w-3" /> Full panel
                        </span>
                      ) : (
                        <span className="text-gray-600">No /admin</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-gray-500">
                      {u.isMainAdmin ? "Owner + integrations" : "Badge / n8n only"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="overflow-hidden rounded-xl border border-white/10 bg-[#0d1528]">
        <div className="border-b border-white/10 px-4 py-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-300">Permission matrix</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-[11px]">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.03] text-[10px] font-bold uppercase tracking-wider text-gray-500">
                <th className="px-4 py-2.5">Area</th>
                <th className="px-4 py-2.5">Learner</th>
                <th className="px-4 py-2.5">DB role: admin</th>
                <th className="px-4 py-2.5">MAIN_ADMIN_EMAIL</th>
                <th className="px-4 py-2.5">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05] text-gray-400">
              {PERMISSION_ROWS.map((row) => (
                <tr key={row.area}>
                  <td className="px-4 py-2.5 font-medium text-gray-200">{row.area}</td>
                  <td className="px-4 py-2.5">{row.learner}</td>
                  <td className="px-4 py-2.5">{row.dbAdmin}</td>
                  <td className="px-4 py-2.5 text-emerald-300/90">{row.mainAdmin}</td>
                  <td className="px-4 py-2.5 text-gray-600">{row.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-white/10 bg-[#0d1528]">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-4 py-3">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-amber-400" aria-hidden />
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-300">
              Organisations <span className="font-normal text-gray-600">({organizations.length})</span>
            </h2>
          </div>
          <p className="text-[10px] text-gray-600">
            Table <span className="font-mono">lms_organization</span> · cert IDs use org registration codes
          </p>
        </div>
        {organizations.length === 0 ? (
          <p className="px-4 py-8 text-center text-xs text-gray-600">No organisation accounts in MySQL yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-left text-[11px]">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.03] text-[10px] font-bold uppercase tracking-wider text-gray-500">
                  <th className="px-4 py-2.5">Org ID</th>
                  <th className="px-4 py-2.5">Registered</th>
                  <th className="px-4 py-2.5">Company</th>
                  <th className="px-4 py-2.5">Work email</th>
                  <th className="px-4 py-2.5">Personal email</th>
                  <th className="px-4 py-2.5">Industry</th>
                  <th className="px-4 py-2.5">Size</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05] text-gray-400">
                {organizations.map((org) => (
                  <tr key={org.id}>
                    <td className="px-4 py-2.5 tabular-nums text-amber-200">{org.identificationNumber}</td>
                    <td className="px-4 py-2.5">{org.registrationMonthYear ?? "—"}</td>
                    <td className="px-4 py-2.5 font-medium text-white">{org.companyName}</td>
                    <td className="px-4 py-2.5 font-mono text-[10px]">{org.workEmail}</td>
                    <td className="px-4 py-2.5 font-mono text-[10px]">{org.personalEmail ?? "—"}</td>
                    <td className="px-4 py-2.5">{org.industryType ?? "—"}</td>
                    <td className="px-4 py-2.5">{org.companySize ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
