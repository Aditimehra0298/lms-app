"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  Activity,
  Award,
  Building2,
  Loader2,
  RefreshCw,
  ShoppingCart,
  TrendingUp,
  User,
  Users,
} from "lucide-react";
import { AdminCyberHero } from "@/components/admin/AdminCyberHero";

type Audience = "individual" | "organisation";

type CourseRow = {
  slug: string;
  title: string;
  enrollments?: number;
  sales?: number;
  revenuePaise: number;
  barPct: number;
};

type EngagedIndividual = {
  email: string;
  name: string;
  id: number | null;
  country: string | null;
  lastLoginAt: string | null;
  enrollments: number;
  certificates: number;
  payments: number;
  revenuePaise: number;
  engagementScore: number;
  barPct: number;
};

type EngagedOrg = {
  company: string;
  email: string;
  orgId: number;
  members: number;
  seatLimit: number | null;
  certificates: number;
  revenuePaise: number;
  engagementScore: number;
  planId: string | null;
  barPct: number;
};

type IndividualPayload = {
  ok: true;
  audience: "individual";
  title: string;
  generatedAt: string;
  kpis: {
    learners: number;
    newLearners7d: number;
    activeLogins30d: number;
    enrollments: number;
    enrollments7d: number;
    certificatesReady: number;
    certificatesPending: number;
    certificatesVisible: number;
    paidPayments: number;
    pendingPayments: number;
    failedPayments: number;
    revenue7dPaise: number;
    revenue7dCount: number;
    revenue30dPaise: number;
    revenue30dCount: number;
    revenueAllPaise: number;
    avgOrderPaise: number;
    conversionPct: number;
  };
  popularCourses: CourseRow[];
  topEarningCourses: CourseRow[];
  mostEngaged: EngagedIndividual[];
  topSpenders: Array<{ email: string; name: string; revenuePaise: number; payments: number }>;
  recentLearners: Array<{
    name: string | null;
    email: string;
    id: number | null;
    country: string | null;
    registeredAt: string;
    lastLoginAt: string | null;
  }>;
  recentPayments: Array<{
    id: string;
    email: string;
    amountPaise: number;
    status: string;
    at: string;
    itemCount: number;
  }>;
};

type OrganisationPayload = {
  ok: true;
  audience: "organisation";
  title: string;
  generatedAt: string;
  kpis: {
    organisations: number;
    orgAccounts: number;
    newOrganisations7d: number;
    teamSeatsCapacity: number;
    teamSeatsAssigned: number;
    seatUtilizationPct: number;
    studentsLinked: number;
    certificatesReady: number;
    certificatesPending: number;
    paidPayments: number;
    pendingPayments: number;
    revenue7dPaise: number;
    revenue7dCount: number;
    revenue30dPaise: number;
    revenue30dCount: number;
    revenueAllPaise: number;
    avgOrderPaise: number;
  };
  popularCourses: CourseRow[];
  topEarningCourses: CourseRow[];
  mostEngaged: EngagedOrg[];
  topSpenders: Array<{
    email: string;
    company: string;
    revenuePaise: number;
    payments: number;
  }>;
  organisationDirectory: Array<{
    id: string;
    name: string;
    email: string;
    industry: string | null;
    size: string | null;
    orgId: number;
    registeredAt: string;
    planId: string | null;
    seatLimit: number | null;
    members: number;
  }>;
  recentPayments: Array<{
    id: string;
    email: string;
    amountPaise: number;
    status: string;
    at: string;
    itemCount: number;
  }>;
};

function rupees(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

function fmtWhen(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

type Props = {
  initialAudience?: Audience;
  onNavigate?: (menu: string) => void;
};

function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  sub: string;
  icon: typeof Activity;
  tone: "amber" | "sky" | "emerald" | "violet" | "rose";
}) {
  const tones = {
    amber: "border-amber-400/20 bg-amber-500/10 text-amber-200",
    sky: "border-sky-400/20 bg-sky-500/10 text-sky-200",
    emerald: "border-emerald-400/20 bg-emerald-500/10 text-emerald-200",
    violet: "border-violet-400/20 bg-violet-500/10 text-violet-200",
    rose: "border-rose-400/20 bg-rose-500/10 text-rose-200",
  };
  return (
    <article className="rounded-xl border border-white/10 bg-[#0b1224] p-4">
      <div className={`mb-2 inline-flex rounded-md border p-1.5 ${tones[tone]}`}>
        <Icon size={14} />
      </div>
      <p className="text-[11px] text-gray-400">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight text-white">{value}</p>
      <p className="text-[11px] text-gray-500">{sub}</p>
    </article>
  );
}

function Panel({
  title,
  subtitle,
  children,
  action,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <article className="rounded-2xl border border-white/10 bg-[#0d1528] p-4">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-white">{title}</h2>
          {subtitle ? <p className="mt-0.5 text-[11px] text-gray-500">{subtitle}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </article>
  );
}

function RankBar({
  label,
  meta,
  valueLabel,
  pct,
  tone = "emerald",
}: {
  label: string;
  meta?: string;
  valueLabel: string;
  pct: number;
  tone?: "emerald" | "amber" | "violet" | "sky";
}) {
  const fill = {
    emerald: "bg-emerald-400",
    amber: "bg-amber-400",
    violet: "bg-violet-400",
    sky: "bg-sky-400",
  }[tone];
  return (
    <div className="space-y-1.5 border-b border-white/5 pb-2.5 last:border-0">
      <div className="flex items-start justify-between gap-3 text-[11px]">
        <div className="min-w-0">
          <p className="truncate font-medium text-gray-100">{label}</p>
          {meta ? <p className="truncate text-[10px] text-gray-500">{meta}</p> : null}
        </div>
        <p className="shrink-0 font-semibold text-amber-200">{valueLabel}</p>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
        <div className={`h-full rounded-full ${fill}`} style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
    </div>
  );
}

export default function AdminAnalyticsWorkspace({
  initialAudience = "individual",
  onNavigate,
}: Props) {
  const [audience, setAudience] = useState<Audience>(initialAudience);
  const [individual, setIndividual] = useState<IndividualPayload | null>(null);
  const [organisation, setOrganisation] = useState<OrganisationPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setAudience(initialAudience);
  }, [initialAudience]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/analytics/command-center?audience=${audience}`, {
        cache: "no-store",
        credentials: "include",
      });
      const json = (await res.json()) as
        | IndividualPayload
        | OrganisationPayload
        | { ok?: false; message?: string };
      if (!res.ok || !json.ok) {
        throw new Error(("message" in json && json.message) || "Could not load analytics");
      }
      if (json.audience === "individual") {
        setIndividual(json);
        setOrganisation(null);
      } else {
        setOrganisation(json);
        setIndividual(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load analytics");
      setIndividual(null);
      setOrganisation(null);
    } finally {
      setLoading(false);
    }
  }, [audience]);

  useEffect(() => {
    void load();
  }, [load]);

  const isOrg = audience === "organisation";
  const data = isOrg ? organisation : individual;

  return (
    <div className="space-y-5">
      <AdminCyberHero
        eyebrow="Dashboard · Analytics"
        title={isOrg ? "Organization Analytics" : "Individual Analytics"}
        description={
          isOrg
            ? "Company revenue leaders, popular courses for teams, seat utilisation, and most engaged organisations."
            : "Learner revenue, most popular courses, highest-earning programs, and most engaged individuals."
        }
        accent={isOrg ? "amber" : "emerald"}
        chips={
          isOrg
            ? ["Org revenue", "Popular courses", "Engaged companies"]
            : ["Learner revenue", "Popular courses", "Top engagers"]
        }
      >
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1 text-[11px] text-gray-300 hover:bg-white/5 disabled:opacity-50"
        >
          <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </AdminCyberHero>

      <div
        className="inline-flex rounded-xl border border-white/10 bg-black/40 p-1"
        role="tablist"
        aria-label="Analytics audience"
      >
        <button
          type="button"
          role="tab"
          aria-selected={!isOrg}
          onClick={() => setAudience("individual")}
          className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold transition ${
            !isOrg
              ? "bg-emerald-500 text-black shadow-[0_0_20px_rgba(16,185,129,0.35)]"
              : "text-gray-400 hover:bg-white/5 hover:text-white"
          }`}
        >
          <User className="h-3.5 w-3.5" /> Individual
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={isOrg}
          onClick={() => setAudience("organisation")}
          className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold transition ${
            isOrg
              ? "bg-amber-500 text-black shadow-[0_0_20px_rgba(245,158,11,0.35)]"
              : "text-gray-400 hover:bg-white/5 hover:text-white"
          }`}
        >
          <Building2 className="h-3.5 w-3.5" /> Organization
        </button>
      </div>

      {error ? (
        <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </p>
      ) : null}

      {loading && !data ? (
        <p className="flex items-center gap-2 text-sm text-gray-400">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading analytics dashboard…
        </p>
      ) : null}

      {!isOrg && individual ? (
        <>
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              label="Total revenue"
              value={rupees(individual.kpis.revenueAllPaise)}
              sub={`Avg order ${rupees(individual.kpis.avgOrderPaise)}`}
              icon={TrendingUp}
              tone="emerald"
            />
            <KpiCard
              label="Revenue · 30 days"
              value={rupees(individual.kpis.revenue30dPaise)}
              sub={`${individual.kpis.revenue30dCount} paid · 7d ${rupees(individual.kpis.revenue7dPaise)}`}
              icon={ShoppingCart}
              tone="amber"
            />
            <KpiCard
              label="Individual learners"
              value={String(individual.kpis.learners)}
              sub={`${individual.kpis.newLearners7d} new · ${individual.kpis.activeLogins30d} active (30d)`}
              icon={Users}
              tone="sky"
            />
            <KpiCard
              label="Certificates ready"
              value={String(individual.kpis.certificatesReady)}
              sub={`${individual.kpis.conversionPct}% paid / learners · ${individual.kpis.enrollments} enrollments`}
              icon={Award}
              tone="violet"
            />
          </section>

          <section className="grid gap-3 lg:grid-cols-3">
            <Panel
              title="Most popular courses"
              subtitle="By enrollments"
              action={
                <button
                  type="button"
                  onClick={() => onNavigate?.("Self-paced courses")}
                  className="text-[10px] text-emerald-300 hover:underline"
                >
                  Courses →
                </button>
              }
            >
              <div className="max-h-80 space-y-2 overflow-auto">
                {individual.popularCourses.map((c) => (
                  <RankBar
                    key={c.slug}
                    label={c.title}
                    meta={`${c.enrollments} enrollments · earned ${rupees(c.revenuePaise)}`}
                    valueLabel={String(c.enrollments)}
                    pct={c.barPct}
                    tone="emerald"
                  />
                ))}
                {!individual.popularCourses.length ? (
                  <p className="text-[11px] text-gray-600">No enrollments yet.</p>
                ) : null}
              </div>
            </Panel>

            <Panel title="Highest earning courses" subtitle="By paid revenue">
              <div className="max-h-80 space-y-2 overflow-auto">
                {individual.topEarningCourses.map((c) => (
                  <RankBar
                    key={c.slug}
                    label={c.title}
                    meta={`${c.sales ?? 0} sales`}
                    valueLabel={rupees(c.revenuePaise)}
                    pct={c.barPct}
                    tone="amber"
                  />
                ))}
                {!individual.topEarningCourses.length ? (
                  <p className="text-[11px] text-gray-600">No course revenue yet.</p>
                ) : null}
              </div>
            </Panel>

            <Panel title="Most engaged learners" subtitle="Enrollments + certificates + spend">
              <div className="max-h-80 space-y-2 overflow-auto">
                {individual.mostEngaged.map((u) => (
                  <RankBar
                    key={u.email}
                    label={u.name}
                    meta={`${u.enrollments} courses · ${u.certificates} certs · ${u.payments} payments`}
                    valueLabel={rupees(u.revenuePaise)}
                    pct={u.barPct}
                    tone="violet"
                  />
                ))}
                {!individual.mostEngaged.length ? (
                  <p className="text-[11px] text-gray-600">No engagement data yet.</p>
                ) : null}
              </div>
            </Panel>
          </section>

          <section className="grid gap-3 lg:grid-cols-3">
            <Panel title="Commerce health">
              <dl className="space-y-2 text-xs">
                {[
                  ["Paid checkouts", individual.kpis.paidPayments],
                  ["Waiting", individual.kpis.pendingPayments],
                  ["Failed", individual.kpis.failedPayments],
                  ["Enrollments (7d)", individual.kpis.enrollments7d],
                  ["Certs processing", individual.kpis.certificatesPending],
                  ["Certs visible", individual.kpis.certificatesVisible],
                ].map(([k, v]) => (
                  <div key={String(k)} className="flex justify-between border-b border-white/5 pb-2">
                    <dt className="text-gray-500">{k}</dt>
                    <dd className="font-semibold text-white">{v}</dd>
                  </div>
                ))}
              </dl>
              <button
                type="button"
                onClick={() => onNavigate?.("Orders")}
                className="mt-3 text-[11px] text-amber-300 hover:underline"
              >
                Open Orders →
              </button>
            </Panel>

            <Panel title="Top spending learners">
              <ul className="max-h-72 space-y-2 overflow-auto text-[11px]">
                {individual.topSpenders.map((s, i) => (
                  <li
                    key={s.email}
                    className="flex items-start justify-between gap-2 border-b border-white/5 pb-2"
                  >
                    <div>
                      <p className="font-medium text-white">
                        #{i + 1} {s.name}
                      </p>
                      <p className="font-mono text-[10px] text-gray-500">{s.email}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-amber-200">{rupees(s.revenuePaise)}</p>
                      <p className="text-gray-500">{s.payments} payments</p>
                    </div>
                  </li>
                ))}
              </ul>
            </Panel>

            <Panel title="Recent learners">
              <ul className="max-h-72 space-y-2 overflow-auto text-[11px]">
                {individual.recentLearners.map((u) => (
                  <li
                    key={u.email}
                    className="flex items-start justify-between gap-2 border-b border-white/5 pb-2"
                  >
                    <div>
                      <p className="font-medium text-white">{u.name?.trim() || u.email}</p>
                      <p className="font-mono text-[10px] text-gray-500">{u.email}</p>
                    </div>
                    <div className="text-right text-gray-500">
                      <p>{u.id != null ? `ID ${u.id}` : "—"}</p>
                      <p>{fmtWhen(u.registeredAt)}</p>
                    </div>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => onNavigate?.("Users")}
                className="mt-3 text-[11px] text-sky-300 hover:underline"
              >
                Open Users →
              </button>
            </Panel>
          </section>

          <Panel title="Recent individual payments" subtitle="Latest paid / recorded checkouts">
            <div className="overflow-auto">
              <table className="w-full min-w-[640px] text-left text-[11px]">
                <thead className="text-[10px] uppercase text-gray-500">
                  <tr>
                    <th className="pb-2">Learner</th>
                    <th className="pb-2">Items</th>
                    <th className="pb-2">Status</th>
                    <th className="pb-2">When</th>
                    <th className="pb-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {individual.recentPayments.map((p) => (
                    <tr key={p.id}>
                      <td className="py-2 font-mono text-[10px] text-violet-200/90">{p.email}</td>
                      <td className="py-2 text-gray-400">{p.itemCount}</td>
                      <td className="py-2 capitalize text-gray-300">{p.status}</td>
                      <td className="py-2 text-gray-500">{fmtWhen(p.at)}</td>
                      <td className="py-2 text-right font-semibold text-amber-200">
                        {rupees(p.amountPaise)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </>
      ) : null}

      {isOrg && organisation ? (
        <>
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              label="Organisation revenue"
              value={rupees(organisation.kpis.revenueAllPaise)}
              sub={`Avg order ${rupees(organisation.kpis.avgOrderPaise)}`}
              icon={TrendingUp}
              tone="amber"
            />
            <KpiCard
              label="Revenue · 30 days"
              value={rupees(organisation.kpis.revenue30dPaise)}
              sub={`${organisation.kpis.revenue30dCount} paid · 7d ${rupees(organisation.kpis.revenue7dPaise)}`}
              icon={ShoppingCart}
              tone="emerald"
            />
            <KpiCard
              label="Organisations"
              value={String(organisation.kpis.organisations)}
              sub={`${organisation.kpis.newOrganisations7d} new · seats ${organisation.kpis.seatUtilizationPct}% used`}
              icon={Building2}
              tone="sky"
            />
            <KpiCard
              label="Org certificates"
              value={String(organisation.kpis.certificatesReady)}
              sub={`${organisation.kpis.teamSeatsAssigned}/${organisation.kpis.teamSeatsCapacity} seats filled`}
              icon={Award}
              tone="violet"
            />
          </section>

          <section className="grid gap-3 lg:grid-cols-3">
            <Panel title="Most popular courses" subtitle="Organisation enrollments">
              <div className="max-h-80 space-y-2 overflow-auto">
                {organisation.popularCourses.map((c) => (
                  <RankBar
                    key={c.slug}
                    label={c.title}
                    meta={`${c.enrollments} enrollments · ${rupees(c.revenuePaise)}`}
                    valueLabel={String(c.enrollments)}
                    pct={c.barPct}
                    tone="sky"
                  />
                ))}
                {!organisation.popularCourses.length ? (
                  <p className="text-[11px] text-gray-600">No organisation enrollments yet.</p>
                ) : null}
              </div>
            </Panel>

            <Panel title="Highest earning courses" subtitle="Org paid revenue">
              <div className="max-h-80 space-y-2 overflow-auto">
                {organisation.topEarningCourses.map((c) => (
                  <RankBar
                    key={c.slug}
                    label={c.title}
                    meta={`${c.sales ?? 0} sales`}
                    valueLabel={rupees(c.revenuePaise)}
                    pct={c.barPct}
                    tone="amber"
                  />
                ))}
                {!organisation.topEarningCourses.length ? (
                  <p className="text-[11px] text-gray-600">No organisation course revenue yet.</p>
                ) : null}
              </div>
            </Panel>

            <Panel title="Most engaged organisations" subtitle="Seats + certificates + spend">
              <div className="max-h-80 space-y-2 overflow-auto">
                {organisation.mostEngaged.map((o) => (
                  <RankBar
                    key={o.email}
                    label={o.company}
                    meta={`${o.members} members · ${o.certificates} certs · ${o.planId?.replace(/-/g, " ") ?? "no plan"}`}
                    valueLabel={rupees(o.revenuePaise)}
                    pct={o.barPct}
                    tone="violet"
                  />
                ))}
                {!organisation.mostEngaged.length ? (
                  <p className="text-[11px] text-gray-600">No organisation engagement yet.</p>
                ) : null}
              </div>
            </Panel>
          </section>

          <section className="grid gap-3 lg:grid-cols-2">
            <Panel title="Top spending companies">
              <ul className="max-h-80 space-y-2 overflow-auto text-[11px]">
                {organisation.topSpenders.map((s, i) => (
                  <li
                    key={s.email}
                    className="flex items-start justify-between gap-2 border-b border-white/5 pb-2"
                  >
                    <div>
                      <p className="font-medium text-white">
                        #{i + 1} {s.company}
                      </p>
                      <p className="font-mono text-[10px] text-gray-500">{s.email}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-amber-200">{rupees(s.revenuePaise)}</p>
                      <p className="text-gray-500">{s.payments} payments</p>
                    </div>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => onNavigate?.("Organization Team")}
                className="mt-3 text-[11px] text-amber-300 hover:underline"
              >
                Open Organization Team →
              </button>
            </Panel>

            <Panel title="Organisation directory">
              <div className="max-h-80 overflow-auto">
                <table className="w-full text-left text-[11px]">
                  <thead className="sticky top-0 bg-[#0d1528] text-[10px] uppercase text-gray-500">
                    <tr>
                      <th className="pb-2">Company</th>
                      <th className="pb-2">Seats</th>
                      <th className="pb-2">Plan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {organisation.organisationDirectory.map((o) => (
                      <tr key={o.id}>
                        <td className="py-2 pr-2">
                          <p className="font-medium text-white">{o.name}</p>
                          <p className="text-[10px] text-gray-500">ID {o.orgId}</p>
                        </td>
                        <td className="py-2 text-gray-300">
                          {o.members}
                          {o.seatLimit != null ? ` / ${o.seatLimit}` : ""}
                        </td>
                        <td className="py-2 capitalize text-amber-100/80">
                          {o.planId?.replace(/-/g, " ") ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          </section>

          <Panel title="Recent organisation payments">
            <div className="overflow-auto">
              <table className="w-full min-w-[640px] text-left text-[11px]">
                <thead className="text-[10px] uppercase text-gray-500">
                  <tr>
                    <th className="pb-2">Email</th>
                    <th className="pb-2">Items</th>
                    <th className="pb-2">Status</th>
                    <th className="pb-2">When</th>
                    <th className="pb-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {organisation.recentPayments.map((p) => (
                    <tr key={p.id}>
                      <td className="py-2 font-mono text-[10px] text-violet-200/90">{p.email}</td>
                      <td className="py-2 text-gray-400">{p.itemCount}</td>
                      <td className="py-2 capitalize text-gray-300">{p.status}</td>
                      <td className="py-2 text-gray-500">{fmtWhen(p.at)}</td>
                      <td className="py-2 text-right font-semibold text-amber-200">
                        {rupees(p.amountPaise)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </>
      ) : null}

      {data ? (
        <p className="text-[10px] text-gray-600">
          {isOrg ? "Organization" : "Individual"} analytics · updated{" "}
          {new Date(data.generatedAt).toLocaleString("en-IN")}
        </p>
      ) : null}
    </div>
  );
}
