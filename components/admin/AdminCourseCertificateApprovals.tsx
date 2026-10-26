"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Eye, EyeOff, FileText, Loader2, RefreshCw, X } from "lucide-react";
import type { AdminCertificateRowDto } from "@/lib/certificate-types";
import { adminApiErrorMessage, adminMutationHeaders } from "@/lib/admin-csrf-client";

export type AdminCertificateCourseOption = { slug: string; title: string };

function certificatePdfEmbedSrc(base: string): string {
  const params = "page=1&view=Fit&toolbar=0&navpanes=0&scrollbar=0";
  return base.includes("#") ? `${base}&${params}` : `${base}#${params}`;
}

type Props = {
  courses: AdminCertificateCourseOption[];
  /** From parent course picker — empty = all courses. */
  courseSlug?: string;
  /** Hide duplicate course dropdown when parent already chose the course. */
  hideCourseFilter?: boolean;
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

function formatCertNumber(n: string): string {
  const t = n.trim();
  if (!t || t.startsWith("TEMP-")) return "Pending";
  return t;
}

function accessLabel(access: AdminCertificateRowDto["learnerAccess"]): string {
  switch (access) {
    case "allowed":
      return "Allowed";
    case "blocked":
      return "Blocked";
    default:
      return "Pending";
  }
}

function accessBadgeClass(access: AdminCertificateRowDto["learnerAccess"]): string {
  switch (access) {
    case "allowed":
      return "bg-emerald-500/20 text-emerald-200";
    case "blocked":
      return "bg-white/10 text-gray-300";
    default:
      return "bg-amber-500/20 text-amber-200";
  }
}

function adminPdfHref(certificateId: string): string {
  return `/api/certificates/${encodeURIComponent(certificateId)}/pdf`;
}

export default function AdminCourseCertificateApprovals({
  courses,
  courseSlug: courseSlugProp = "",
  hideCourseFilter = false,
}: Props) {
  const [rows, setRows] = useState<AdminCertificateRowDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [localCourseFilter, setLocalCourseFilter] = useState("");
  const [learnerQuery, setLearnerQuery] = useState("");
  const [preview, setPreview] = useState<AdminCertificateRowDto | null>(null);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState("");

  const courseFilter = hideCourseFilter ? courseSlugProp : localCourseFilter;

  const sortedCourses = useMemo(
    () => [...courses].sort((a, b) => a.title.localeCompare(b.title)),
    [courses],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const q = courseFilter.trim()
        ? `?courseSlug=${encodeURIComponent(courseFilter.trim())}`
        : "";
      const res = await fetch(`/api/admin/certificates${q}`, {
        cache: "no-store",
        credentials: "include",
      });
      const data = (await res.json()) as { ok?: boolean; certificates?: AdminCertificateRowDto[] };
      if (data.ok && data.certificates) {
        setRows(data.certificates);
      }
    } finally {
      setLoading(false);
    }
  }, [courseFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredRows = useMemo(() => {
    const q = learnerQuery.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const hay = [
        r.learnerEmail,
        r.learnerName ?? "",
        r.courseTitle ?? "",
        r.courseSlug ?? "",
        r.certificateNumber ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [rows, learnerQuery]);

  const patchCert = async (id: string, body: Record<string, unknown>): Promise<boolean> => {
    setBusyId(id);
    setMsg("");
    const res = await fetch(`/api/admin/certificates/${id}`, {
      method: "PATCH",
      headers: adminMutationHeaders(),
      credentials: "include",
      body: JSON.stringify(body),
    });
    const data = (await res.json()) as { ok?: boolean; message?: string };
    setBusyId(null);
    if (data.ok) {
      void load();
      return true;
    }
    setMsg(adminApiErrorMessage(data, "Could not update. Try again."));
    return false;
  };

  const openPdfPreview = async (row: AdminCertificateRowDto) => {
    setPreview(row);
    setPreviewSrc(null);
    setPreviewError("");
    setPreviewLoading(true);
    setBusyId(row.id);
    try {
      const tryDownload = async (forceRegenerate: boolean) => {
        const downloadRes = await fetch(`/api/certificates/${encodeURIComponent(row.id)}/download`, {
          method: "POST",
          headers: adminMutationHeaders(),
          credentials: "include",
          body: JSON.stringify({ attachment: false, forceRegenerate }),
        });
        const contentType = downloadRes.headers.get("content-type") ?? "";
        if (contentType.includes("pdf")) {
          const blob = await downloadRes.blob();
          if (blob.size > 0) {
            return { ok: true as const, blob };
          }
        }
        const errBody = (await downloadRes.json().catch(() => ({}))) as {
          ok?: boolean;
          message?: string;
          status?: string;
        };
        return {
          ok: false as const,
          status: downloadRes.status,
          pending: downloadRes.status === 202 || errBody.status === "pending",
          message: errBody.message || `Download failed (${downloadRes.status})`,
        };
      };

      // First try: force n8n regenerate so a missing / placeholder PDF is replaced.
      await fetch(`/api/certificates/${encodeURIComponent(row.id)}/prepare`, {
        method: "POST",
        headers: adminMutationHeaders(),
        credentials: "include",
        body: JSON.stringify({ forceRegenerate: !row.pdfReady, triggerN8n: !row.pdfReady }),
      }).catch(() => undefined);

      let lastMessage = "";
      for (let attempt = 0; attempt < 4; attempt += 1) {
        const result = await tryDownload(attempt === 0 && !row.pdfReady);
        if (result.ok) {
          const objectUrl = URL.createObjectURL(result.blob);
          setPreviewSrc(certificatePdfEmbedSrc(objectUrl));
          void load();
          return;
        }
        lastMessage = result.message;
        if (!result.pending && result.status !== 202) break;
        setPreviewError(
          `${result.message} (retry ${attempt + 1}/4…)`,
        );
        await new Promise((r) => window.setTimeout(r, 8000));
      }

      // Last resort: open the PDF route in the iframe (admin session cookie).
      const href = `${adminPdfHref(row.id)}?t=${Date.now()}`;
      const probe = await fetch(href, { credentials: "include", cache: "no-store" });
      const probeType = probe.headers.get("content-type") ?? "";
      if (probe.ok && probeType.includes("pdf")) {
        setPreviewSrc(certificatePdfEmbedSrc(href));
        void load();
        return;
      }

      setPreviewError(
        lastMessage ||
          "PDF is not ready yet. Check n8n webhook / course certificate template assets, then try View PDF again.",
      );
    } catch {
      setPreviewError("Could not load certificate PDF.");
    } finally {
      setPreviewLoading(false);
      setBusyId(null);
    }
  };

  const closePreview = () => {
    setPreview(null);
    setPreviewSrc((prev) => {
      if (prev?.startsWith("blob:")) {
        try {
          URL.revokeObjectURL(prev.split("#")[0] ?? prev);
        } catch {
          /* ignore */
        }
      }
      return null;
    });
    setPreviewError("");
  };

  return (
    <div className="rounded-xl border border-white/10 bg-black/25 p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        {!hideCourseFilter ? (
          <div className="min-w-[200px] flex-1">
            <label className="block text-[10px] font-semibold uppercase tracking-wide text-gray-500">
              Filter by course
            </label>
            <select
              value={localCourseFilter}
              onChange={(e) => setLocalCourseFilter(e.target.value)}
              className="mt-1 w-full max-w-md rounded-lg border border-white/15 bg-[#0a1020] px-3 py-2 text-xs text-white"
            >
              <option value="">All courses</option>
              {sortedCourses.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        <div className="min-w-[200px] flex-1">
          <label className="block text-[10px] font-semibold uppercase tracking-wide text-gray-500">
            Find learner
          </label>
          <input
            value={learnerQuery}
            onChange={(e) => setLearnerQuery(e.target.value)}
            placeholder="Email, name, certificate #…"
            className="mt-1 w-full max-w-md rounded-lg border border-white/15 bg-[#0a1020] px-3 py-2 text-xs text-white outline-none focus:border-amber-400/40"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xs text-gray-500">
            {filteredRows.length} certificate{filteredRows.length === 1 ? "" : "s"}
            {courseFilter || learnerQuery.trim() ? " (filtered)" : ""}
          </p>
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex items-center gap-1 rounded-lg border border-white/15 px-3 py-1.5 text-xs text-gray-300 hover:bg-white/5"
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden />
            Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <p className="mt-4 flex items-center gap-2 text-xs text-gray-500">
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          Loading…
        </p>
      ) : filteredRows.length === 0 ? (
        <p className="mt-4 text-xs text-gray-600">
          No certificates match{courseFilter || learnerQuery.trim() ? " these filters" : " yet"}.
        </p>
      ) : (
        <div className="mt-4 max-h-[640px] overflow-auto rounded-lg border border-white/10">
          <table className="w-full min-w-[720px] border-collapse text-left text-[11px]">
            <thead className="sticky top-0 z-10 bg-[#0c1324] text-[10px] uppercase tracking-wide text-gray-500">
              <tr>
                <th className="border-b border-white/10 px-3 py-2 font-semibold">Name</th>
                <th className="border-b border-white/10 px-3 py-2 font-semibold">Email</th>
                <th className="border-b border-white/10 px-3 py-2 font-semibold">Phone</th>
                <th className="border-b border-white/10 px-3 py-2 font-semibold">Certificate #</th>
                <th className="border-b border-white/10 px-3 py-2 font-semibold">Delegate #</th>
                <th className="border-b border-white/10 px-3 py-2 font-semibold">Course</th>
                <th className="border-b border-white/10 px-3 py-2 font-semibold">Access</th>
                <th className="border-b border-white/10 px-3 py-2 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((c) => (
                <tr key={c.id} className="border-b border-white/5 transition-colors hover:bg-white/5">
                  <td className="px-3 py-2.5 font-medium text-white">{c.learnerName}</td>
                  <td className="px-3 py-2.5 font-mono text-[10px] text-violet-200/90">{c.learnerEmail}</td>
                  <td className="px-3 py-2.5 text-gray-300">{c.phone?.trim() || "—"}</td>
                  <td className="px-3 py-2.5 font-mono text-violet-200">
                    {formatCertNumber(c.certificateNumber)}
                  </td>
                  <td className="px-3 py-2.5 font-mono text-gray-300">
                    {c.delegateNumber?.trim() || "—"}
                  </td>
                  <td className="px-3 py-2.5 text-gray-300">{c.courseTitle}</td>
                  <td className="px-3 py-2.5">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${accessBadgeClass(c.learnerAccess)}`}
                    >
                      {accessLabel(c.learnerAccess)}
                    </span>
                    <p className="mt-0.5 text-[10px] text-gray-500">{statusLabel(c.status)}</p>
                    {!c.pdfReady ? (
                      <p className="mt-0.5 text-[10px] text-amber-300/80">PDF pending from n8n</p>
                    ) : (
                      <p className="mt-0.5 text-[10px] text-emerald-300/80">PDF on file</p>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex flex-col gap-1.5">
                      <button
                        type="button"
                        disabled={busyId === c.id}
                        onClick={() => void openPdfPreview(c)}
                        className="inline-flex items-center gap-1 text-[10px] font-semibold text-violet-300 hover:text-violet-200 disabled:opacity-50"
                      >
                        <FileText className="h-3 w-3" aria-hidden />
                        {busyId === c.id && preview?.id === c.id ? "Opening…" : "View PDF"}
                      </button>
                      <a
                        href={adminPdfHref(c.id)}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] font-semibold text-gray-400 hover:text-gray-200"
                      >
                        Open in tab
                      </a>
                      {c.status === "ready" || c.status === "pending" || c.status === "failed" ? (
                        <button
                          type="button"
                          disabled={busyId === c.id}
                          onClick={() => void patchCert(c.id, { allowDownload: !c.visibleToLearner })}
                          className={`inline-flex items-center gap-1 text-[10px] font-semibold ${
                            c.visibleToLearner ? "text-emerald-300" : "text-amber-300"
                          }`}
                        >
                          {c.visibleToLearner ? (
                            <>
                              <Eye className="h-3 w-3" aria-hidden />
                              Visible
                            </>
                          ) : (
                            <>
                              <EyeOff className="h-3 w-3" aria-hidden />
                              Allow
                            </>
                          )}
                        </button>
                      ) : (
                        <span className="text-[10px] text-gray-500">Preparing…</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {msg ? <p className="mt-3 text-[11px] text-rose-300">{msg}</p> : null}

      {preview ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 p-4">
          <div className="flex h-[min(90vh,900px)] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-white/15 bg-[#0c1324] shadow-2xl">
            <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">
                  {preview.learnerName} — certificate PDF
                </p>
                <p className="truncate text-[11px] text-gray-400">
                  {preview.courseTitle} · {formatCertNumber(preview.certificateNumber)}
                </p>
              </div>
              <button
                type="button"
                onClick={closePreview}
                className="rounded-lg border border-white/15 p-2 text-gray-300 hover:bg-white/5"
                aria-label="Close PDF preview"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="relative min-h-0 flex-1 bg-white">
              {previewLoading ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[#111827] text-gray-300">
                  <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
                  <p className="text-xs">Loading PDF (may call n8n if missing)…</p>
                </div>
              ) : previewSrc ? (
                <iframe
                  src={previewSrc}
                  title={`Certificate PDF for ${preview.learnerName}`}
                  className="absolute inset-0 h-full w-full border-0"
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#111827] px-6 text-center">
                  <p className="max-w-md text-sm text-amber-100">
                    {previewError || "Certificate PDF is not on file yet."}
                  </p>
                  <button
                    type="button"
                    onClick={() => void openPdfPreview(preview)}
                    className="rounded-lg bg-amber-400 px-4 py-2 text-xs font-bold text-black hover:bg-amber-300"
                  >
                    Try again
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
