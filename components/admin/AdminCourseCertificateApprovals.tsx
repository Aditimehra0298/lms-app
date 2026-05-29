"use client";

import { useCallback, useEffect, useState } from "react";
import { Eye, EyeOff, Loader2, RefreshCw } from "lucide-react";
import type { CertificateRowDto } from "@/lib/certificate-types";
import { getLearnerEmail } from "@/lib/learner-session-client";
import { certificatePdfDownloadHref } from "@/lib/certificate-pdf-client";

type Props = {
  courseSlug: string;
};

function statusLabel(status: string): string {
  switch (status) {
    case "ready":
      return "Ready";
    case "pending":
      return "Processing";
    case "failed":
      return "Needs attention";
    default:
      return status;
  }
}

export default function AdminCourseCertificateApprovals({ courseSlug }: Props) {
  const [rows, setRows] = useState<CertificateRowDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
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

  const patchCert = async (id: string, body: Record<string, unknown>): Promise<boolean> => {
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
    setMsg(data.message ?? "Could not update. Try again.");
    return false;
  };

  if (!courseSlug) return null;

  return (
    <div className="rounded-xl border border-white/10 bg-black/25 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-gray-500">{rows.length} certificate{rows.length === 1 ? "" : "s"}</p>
        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex items-center gap-1 rounded-lg border border-white/15 px-3 py-1.5 text-xs text-gray-300 hover:bg-white/5"
        >
          <RefreshCw className="h-3.5 w-3.5" aria-hidden />
          Refresh
        </button>
      </div>

      {loading ? (
        <p className="mt-4 flex items-center gap-2 text-xs text-gray-500">
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          Loading…
        </p>
      ) : rows.length === 0 ? (
        <p className="mt-4 text-xs text-gray-600">No certificates yet. They appear here after learners pass the exam.</p>
      ) : (
        <ul className="mt-4 max-h-[420px] space-y-3 overflow-y-auto">
          {rows.map((c) => (
            <li key={c.id} className="rounded-lg border border-white/10 bg-black/30 p-3 text-xs">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-white">{c.learnerName}</p>
                  <p className="text-gray-500">{c.learnerEmail}</p>
                  <p className="mt-1 text-[10px] text-gray-600">
                    Status: <span className="text-gray-300">{statusLabel(c.status)}</span>
                  </p>
                </div>
                {c.pdfUrl ? (
                  <a
                    href={certificatePdfDownloadHref(c.pdfUrl, getLearnerEmail() ?? c.learnerEmail) ?? c.pdfUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-lg bg-violet-600/20 px-2.5 py-1.5 text-[10px] font-semibold text-violet-200 hover:bg-violet-600/30"
                  >
                    View PDF
                  </a>
                ) : null}
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
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
                        Learner can download
                      </>
                    ) : (
                      <>
                        <EyeOff className="h-3 w-3" aria-hidden />
                        Allow download
                      </>
                    )}
                  </button>
                ) : (
                  <span className="text-[10px] text-gray-500">Certificate is still being prepared…</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      {msg ? <p className="mt-3 text-[11px] text-rose-300">{msg}</p> : null}
    </div>
  );
}
