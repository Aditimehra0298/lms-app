"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  Award,
  Building2,
  Loader2,
  RefreshCw,
  ShoppingCart,
  Users,
} from "lucide-react";
import { getLearnerEmail } from "@/lib/learner-session-client";
import { AdminCyberHero } from "@/components/admin/AdminCyberHero";

type Overview = {
  generatedAt: string;
  security: { score: number; paymentsReady: boolean };
  totals: {
    users: number;
    organisations: number;
    enrollments: number;
    courses: number;
    tutorLed: number;
    workshops: number;
    paidPayments: number;
    pendingPayments: number;
    refundedPayments: number;
    failedPayments: number;
    certificatesVisible: number;
    certificatesPending: number;
    certificatesHidden: number;
  };
  trends: {
    newUsers7d: number;
    newPayments7d: number;
    revenue7dPaise: number;
    revenue7dCount: number;
    revenue30dPaise: number;
    revenue30dCount: number;
  };
};

function rupees(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

type Props = {
  onNavigate?: (menu: string) => void;
};

export default function AdminAnalyticsWorkspace({ onNavigate }: Props) {
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const email = getLearnerEmail();
      const res = await fetch("/api/admin/overview", {
        cache: "no-store",
        headers: {},
      });
      const json = (await res.json()) as Overview & { ok?: boolean; message?: string };
      if (!res.ok || !json.ok) throw new Error(json.message ?? "Could not load analytics");
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load analytics");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-5">
      <AdminCyberHero
        eyebrow="Control centre · Other"
        title="Live analytics"
        description="Real-time LMS health: learners, money collected, programs, and certificates — updated from your live records."
        accent="emerald"
        chips={["Live counts", "7-day trends", "30-day revenue"]}
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

      {error ? (
        <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </p>
      ) : null}

      {loading && !data ? (
        <p className="flex items-center gap-2 text-sm text-gray-400">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading live analytics…
        </p>
      ) : null}

      {data ? (
        <>
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              {
                label: "Money · last 7 days",
                value: rupees(data.trends.revenue7dPaise),
                sub: `${data.trends.revenue7dCount} paid checkouts`,
                icon: Activity,
              },
              {
                label: "Money · last 30 days",
                value: rupees(data.trends.revenue30dPaise),
                sub: `${data.trends.revenue30dCount} paid checkouts`,
                icon: ShoppingCart,
              },
              {
                label: "New learners · 7 days",
                value: String(data.trends.newUsers7d),
                sub: `${data.totals.users} total users`,
                icon: Users,
              },
              {
                label: "Security score",
                value: String(data.security.score),
                sub: data.security.paymentsReady ? "Payments ready" : "Payments unavailable",
                icon: Award,
              },
            ].map((card) => (
              <article key={card.label} className="rounded-xl border border-emerald-400/15 bg-[#0d1528] p-4">
                <div className="mb-2 inline-flex rounded-md bg-emerald-500/10 p-1.5 text-emerald-300">
                  <card.icon size={14} />
                </div>
                <p className="text-[11px] text-gray-400">{card.label}</p>
                <p className="mt-1 text-2xl font-semibold text-white">{card.value}</p>
                <p className="text-[11px] text-gray-500">{card.sub}</p>
              </article>
            ))}
          </section>

          <section className="grid gap-3 lg:grid-cols-3">
            <article className="rounded-2xl border border-white/10 bg-[#0d1528] p-4">
              <div className="mb-3 flex items-center gap-2">
                <Users className="h-4 w-4 text-sky-300" />
                <h2 className="text-sm font-semibold text-white">People</h2>
              </div>
              <dl className="space-y-2 text-xs">
                {[
                  ["Learners & staff", data.totals.users],
                  ["Organisations", data.totals.organisations],
                  ["Course enrollments", data.totals.enrollments],
                  ["New users (7 days)", data.trends.newUsers7d],
                ].map(([k, v]) => (
                  <div key={String(k)} className="flex justify-between border-b border-white/5 pb-2">
                    <dt className="text-gray-500">{k}</dt>
                    <dd className="font-semibold text-white">{v}</dd>
                  </div>
                ))}
              </dl>
              <button
                type="button"
                onClick={() => onNavigate?.("Users")}
                className="mt-3 text-[11px] text-sky-300 hover:underline"
              >
                Open Users →
              </button>
            </article>

            <article className="rounded-2xl border border-white/10 bg-[#0d1528] p-4">
              <div className="mb-3 flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-amber-300" />
                <h2 className="text-sm font-semibold text-white">Commerce</h2>
              </div>
              <dl className="space-y-2 text-xs">
                {[
                  ["Paid", data.totals.paidPayments],
                  ["Waiting", data.totals.pendingPayments],
                  ["Refunded", data.totals.refundedPayments],
                  ["Unsuccessful", data.totals.failedPayments],
                  ["New payments (7 days)", data.trends.newPayments7d],
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
            </article>

            <article className="rounded-2xl border border-white/10 bg-[#0d1528] p-4">
              <div className="mb-3 flex items-center gap-2">
                <Building2 className="h-4 w-4 text-violet-300" />
                <h2 className="text-sm font-semibold text-white">Programs & certificates</h2>
              </div>
              <dl className="space-y-2 text-xs">
                {[
                  ["Self-paced / catalog", data.totals.courses],
                  ["Tutor-led", data.totals.tutorLed],
                  ["Workshops", data.totals.workshops],
                  ["Certificates visible", data.totals.certificatesVisible],
                  ["Processing", data.totals.certificatesPending],
                  ["Hidden from learners", data.totals.certificatesHidden],
                ].map(([k, v]) => (
                  <div key={String(k)} className="flex justify-between border-b border-white/5 pb-2">
                    <dt className="text-gray-500">{k}</dt>
                    <dd className="font-semibold text-white">{v}</dd>
                  </div>
                ))}
              </dl>
              <button
                type="button"
                onClick={() => onNavigate?.("Certificates")}
                className="mt-3 text-[11px] text-violet-300 hover:underline"
              >
                Open Certificates →
              </button>
            </article>
          </section>

          <p className="text-[10px] text-gray-600">
            Updated {new Date(data.generatedAt).toLocaleString("en-IN")}
          </p>
        </>
      ) : null}
    </div>
  );
}
