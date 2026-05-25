"use client";

import { useCallback, useEffect, useState } from "react";
import { BookOpen, Eye, EyeOff, Loader2, Play, RefreshCw } from "lucide-react";
import type { CertificateRowDto } from "@/lib/certificate-types";

type Props = {
  courseSlug: string;
};

export default function AdminCourseCertificateApprovals({ courseSlug }: Props) {
  const [rows, setRows] = useState<CertificateRowDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [manualEmail, setManualEmail] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!courseSlug) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/certificates?courseSlug=${encodeURIComponent(courseSlug)}`, {
        cache: "no-store",
      });
      const data = (await res.json()) as { ok?: boolean; certificates?: CertificateRowDto[] };
      if (data.ok && data.certificates) setRows(data.certificates);
    } finally {
      setLoading(false);
    }
  }, [courseSlug]);

  useEffect(() => {
    void load();
  }, [load]);

  const patchCert = async (
    id: string,
    body: Record<string, unknown>,
  ): Promise<boolean> => {
    setBusyId(id);
    setMsg("");
    const res = await fetch(`/api/admin/certificates/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await res.json()) as { ok?: boolean; message?: string };
    setBusyId(null);
    if (data.ok) {
      void load();
      return true;
    }
    setMsg(data.message ?? "Update failed.");
    return false;
  };

  const triggerN8n = async () => {
    if (!manualEmail.trim() || !courseSlug) return;
    setMsg("Sending to n8n…");
    const res = await fetch("/api/admin/certificates/trigger", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ learnerEmail: manualEmail.trim(), courseSlug }),
    });
    const data = (await res.json()) as { ok?: boolean; message?: string };
    if (data.ok) {
      setMsg(data.message ?? "Sent to n8n. Refresh list when PDF is ready.");
      setManualEmail("");
      void load();
    } else {
      setMsg(data.message ?? "Could not trigger n8n.");
    }
  };

  if (!courseSlug) return null;

  return (
    <div className="mt-4 space-y-4 rounded-xl border border-white/10 bg-black/25 p-4">
      <div className="flex items-start gap-2">
        <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-violet-300" aria-hidden />
        <div>
          <h3 className="text-sm font-semibold text-white">Review &amp; approve (n8n + manual)</h3>
          <ol className="mt-2 list-decimal space-y-1 pl-4 text-[11px] leading-relaxed text-gray-400">
            <li>
              <strong className="text-gray-300">n8n</strong> builds the PDF (name, ID, design).
            </li>
            <li>
              <strong className="text-gray-300">You review</strong> here — open PDF link, check number.
            </li>
            <li>
              <strong className="text-gray-300">Allow download</strong> = learner can see it on their dashboard.
            </li>
          </ol>
          <p className="mt-2 text-[10px] text-gray-600">
            Manual issue is a good idea for corrections, VIP learners, or when n8n failed. Use “Send to n8n” or paste
            PDF URL below.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-2 rounded-lg border border-violet-500/20 bg-violet-500/5 p-3">
        <label className="min-w-[200px] flex-1">
          <span className="text-[10px] text-gray-500">Manual: learner email → n8n</span>
          <input
            value={manualEmail}
            onChange={(e) => setManualEmail(e.target.value)}
            placeholder="learner@example.com"
            className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-xs text-white"
          />
        </label>
        <button
          type="button"
          onClick={() => void triggerN8n()}
          className="inline-flex items-center gap-1 rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-500"
        >
          <Play className="h-3.5 w-3.5" aria-hidden />
          Send to n8n
        </button>
        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex items-center gap-1 rounded-lg border border-white/15 px-3 py-2 text-xs text-gray-300 hover:bg-white/5"
        >
          <RefreshCw className="h-3.5 w-3.5" aria-hidden />
          Refresh
        </button>
      </div>

      {loading ? (
        <p className="flex items-center gap-2 text-xs text-gray-500">
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          Loading…
        </p>
      ) : rows.length === 0 ? (
        <p className="text-xs text-gray-600">No certificates yet. Learner passes exam or you use “Send to n8n”.</p>
      ) : (
        <ul className="max-h-[420px] space-y-3 overflow-y-auto">
          {rows.map((c) => (
            <li
              key={c.id}
              className="rounded-lg border border-white/10 bg-black/30 p-3 text-xs"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-white">{c.learnerName}</p>
                  <p className="text-gray-500">{c.learnerEmail}</p>
                  <p className="mt-1 text-[10px] text-gray-600">
                    Status: <span className="text-gray-300">{c.status}</span>
                    {c.issuedVia ? ` · via ${c.issuedVia}` : ""}
                  </p>
                </div>
                {c.pdfUrl ? (
                  <a
                    href={c.pdfUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] font-medium text-violet-300 underline"
                  >
                    Preview PDF
                  </a>
                ) : null}
              </div>

              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <label>
                  <span className="text-[10px] text-gray-500">Certificate number</span>
                  <input
                    defaultValue={c.certificateNumber.startsWith("TEMP-") ? "" : c.certificateNumber}
                    placeholder="101/05-2026/001"
                    className="mt-0.5 w-full rounded border border-white/10 bg-black/40 px-2 py-1 font-mono text-[10px] text-white"
                    onBlur={(e) => {
                      const v = e.target.value.trim();
                      if (v && v !== c.certificateNumber) {
                        void patchCert(c.id, { certificateNumber: v, status: "ready" });
                      }
                    }}
                  />
                </label>
                <label>
                  <span className="text-[10px] text-gray-500">PDF URL (manual upload)</span>
                  <input
                    defaultValue={c.pdfUrl ?? ""}
                    placeholder="https://..."
                    className="mt-0.5 w-full rounded border border-white/10 bg-black/40 px-2 py-1 font-mono text-[10px] text-white"
                    onBlur={(e) => {
                      const v = e.target.value.trim();
                      if (v !== (c.pdfUrl ?? "")) {
                        void patchCert(c.id, { pdfUrl: v, status: "ready" });
                      }
                    }}
                  />
                </label>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {c.status !== "ready" ? (
                  <button
                    type="button"
                    disabled={busyId === c.id}
                    onClick={() =>
                      void patchCert(c.id, {
                        status: "ready",
                        pdfUrl: c.pdfUrl ?? undefined,
                      })
                    }
                    className="rounded-lg bg-slate-600/40 px-2.5 py-1.5 text-[10px] font-semibold text-gray-200 hover:bg-slate-600/60"
                  >
                    Mark ready (no n8n)
                  </button>
                ) : null}
                {c.status === "ready" ? (
                  <button
                    type="button"
                    disabled={busyId === c.id}
                    onClick={() =>
                      void patchCert(c.id, {
                        allowDownload: !c.visibleToLearner,
                      })
                    }
                    className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[10px] font-semibold ${
                      c.visibleToLearner
                        ? "bg-emerald-600/25 text-emerald-200"
                        : "bg-amber-600/20 text-amber-200"
                    }`}
                  >
                    {c.visibleToLearner ? (
                      <>
                        <Eye className="h-3 w-3" aria-hidden />
                        Download allowed
                      </>
                    ) : (
                      <>
                        <EyeOff className="h-3 w-3" aria-hidden />
                        Allow download
                      </>
                    )}
                  </button>
                ) : (
                  <span className="text-[10px] text-gray-500">Waiting for n8n or paste PDF URL</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      {msg ? <p className="text-[11px] text-gray-400">{msg}</p> : null}
    </div>
  );
}
