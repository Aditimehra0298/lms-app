"use client";

import { useState } from "react";
import {
  Award,
  Building2,
  Download,
  FileSpreadsheet,
  Loader2,
  ShoppingCart,
  Users,
} from "lucide-react";
import { getLearnerEmail } from "@/lib/learner-session-client";
import { AdminCyberHero } from "@/components/admin/AdminCyberHero";

type ReportKind = "payments" | "users" | "certificates" | "organisations";

const REPORTS: {
  kind: ReportKind;
  title: string;
  desc: string;
  icon: typeof Users;
  accent: string;
}[] = [
  {
    kind: "payments",
    title: "Payments report",
    desc: "Checkout history — amounts, status, learners, and courses.",
    icon: ShoppingCart,
    accent: "from-emerald-500/20 to-transparent border-emerald-400/25",
  },
  {
    kind: "users",
    title: "Users report",
    desc: "Learner and staff accounts with roles and join dates.",
    icon: Users,
    accent: "from-sky-500/20 to-transparent border-sky-400/25",
  },
  {
    kind: "certificates",
    title: "Certificates report",
    desc: "Issued certificates, visibility, and scores.",
    icon: Award,
    accent: "from-amber-500/20 to-transparent border-amber-400/25",
  },
  {
    kind: "organisations",
    title: "Organisations report",
    desc: "Company accounts added for team learning.",
    icon: Building2,
    accent: "from-violet-500/20 to-transparent border-violet-400/25",
  },
];

function toCsv(columns: string[], rows: string[][]): string {
  const esc = (v: string) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  return [columns.map(esc).join(","), ...rows.map((r) => r.map(esc).join(","))].join("\n");
}

function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AdminReportsWorkspace() {
  const [busy, setBusy] = useState<ReportKind | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runReport = async (kind: ReportKind) => {
    setBusy(kind);
    setNotice(null);
    setError(null);
    try {
      const email = getLearnerEmail();
      const res = await fetch(`/api/admin/overview?report=${encodeURIComponent(kind)}`, {
        cache: "no-store",
        headers: {},
      });
      const data = (await res.json()) as {
        ok?: boolean;
        message?: string;
        columns?: string[];
        rows?: string[][];
      };
      if (!res.ok || !data.ok || !data.columns || !data.rows) {
        throw new Error(data.message ?? "Could not build report");
      }
      const stamp = new Date().toISOString().slice(0, 10);
      downloadCsv(`sft-${kind}-${stamp}.csv`, toCsv(data.columns, data.rows));
      setNotice(`${data.rows.length} row(s) downloaded for ${kind}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not download report");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-5">
      <AdminCyberHero
        eyebrow="Control centre · Other"
        title="Secure reports"
        description="Download CSV reports for audits and leadership reviews. Only the main administrator can export these files."
        accent="violet"
        chips={["CSV export", "Admin-only", "Up to 500 rows"]}
      />

      {notice ? (
        <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          {notice}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </p>
      ) : null}

      <section className="grid gap-3 md:grid-cols-2">
        {REPORTS.map((report) => (
          <article
            key={report.kind}
            className={`rounded-2xl border bg-gradient-to-br ${report.accent} from-[#0d1528] p-5`}
          >
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/5 ring-1 ring-white/10">
                <report.icon className="h-5 w-5 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-sm font-semibold text-white">{report.title}</h2>
                <p className="mt-1 text-xs text-gray-400">{report.desc}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => void runReport(report.kind)}
              disabled={busy !== null}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-white/15 bg-black/30 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/5 disabled:opacity-50"
            >
              {busy === report.kind ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Download CSV
            </button>
          </article>
        ))}
      </section>

      <p className="flex items-start gap-2 text-[11px] text-gray-500">
        <FileSpreadsheet className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        Reports include business fields only (emails, amounts, statuses). System secrets and payment keys are never
        exported.
      </p>
    </div>
  );
}
