"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Eye, EyeOff, Loader2, RefreshCw } from "lucide-react";
import type { AdminCertificateRowDto } from "@/lib/certificate-types";
import { getLearnerEmail } from "@/lib/learner-session-client";
import { certificatePdfDownloadHref } from "@/lib/certificate-pdf-client";
import CertificatePrintView from "@/components/CertificatePrintView";
import { ShareableBadgeCard } from "@/components/ShareableBadgeCard";

export type AdminCertificateCourseOption = { slug: string; title: string };

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
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [learnerQuery, setLearnerQuery] = useState("");

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
        headers: (() => {
          const email = getLearnerEmail();
          return email ? { "x-admin-email": email } : {};
        })(),
      });
      const data = (await res.json()) as { ok?: boolean; certificates?: AdminCertificateRowDto[] };
      if (data.ok && data.certificates) {
        setRows(data.certificates);
        setSelectedId((prev) =>
          prev && data.certificates!.some((c) => c.id === prev) ? prev : data.certificates![0]?.id ?? null,
        );
      }
    } finally {
      setLoading(false);
    }
  }, [courseFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const selected = useMemo(
    () => rows.find((c) => c.id === selectedId) ?? null,
    [rows, selectedId],
  );

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
      headers: {
        "Content-Type": "application/json",
        ...(getLearnerEmail() ? { "x-admin-email": getLearnerEmail()! } : {}),
      },
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
        <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(280px,380px)]">
          <div className="max-h-[480px] overflow-y-auto rounded-lg border border-white/10">
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
                {filteredRows.map((c) => {
                  const active = c.id === selectedId;
                  return (
                    <tr
                      key={c.id}
                      className={`cursor-pointer border-b border-white/5 transition-colors ${
                        active ? "bg-violet-600/15" : "hover:bg-white/5"
                      }`}
                      onClick={() => setSelectedId(c.id)}
                    >
                      <td className="px-3 py-2.5 font-medium text-white">{c.learnerName}</td>
                      <td className="px-3 py-2.5 font-mono text-[10px] text-violet-200/90">{c.learnerEmail}</td>
                      <td className="px-3 py-2.5 text-gray-300">{c.phone?.trim() || "—"}</td>
                      <td className="px-3 py-2.5 font-mono text-violet-200">{formatCertNumber(c.certificateNumber)}</td>
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
                      </td>
                      <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                        <div className="flex flex-col gap-1.5">
                          {c.pdfUrl || c.pdfReady ? (
                            <a
                              href={
                                certificatePdfDownloadHref(
                                  c.pdfUrl ?? `/api/certificates/${encodeURIComponent(c.id)}/pdf`,
                                  getLearnerEmail() ?? c.learnerEmail,
                                ) ?? c.pdfUrl ?? undefined
                              }
                              target="_blank"
                              rel="noreferrer"
                              className="text-[10px] font-semibold text-violet-300 hover:text-violet-200"
                            >
                              PDF
                            </a>
                          ) : null}
                          {c.status === "ready" ? (
                            <button
                              type="button"
                              disabled={busyId === c.id}
                              onClick={() =>
                                void patchCert(c.id, { allowDownload: !c.visibleToLearner })
                              }
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
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="rounded-lg border border-white/10 bg-black/30 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
              Preview (shared template)
            </p>
            {selected ? (
              <div className="mt-2 space-y-3">
                <dl className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px]">
                  <dt className="text-gray-500">Name</dt>
                  <dd className="text-gray-200">{selected.learnerName}</dd>
                  <dt className="text-gray-500">Email</dt>
                  <dd className="font-mono text-violet-200/90">{selected.learnerEmail}</dd>
                  <dt className="text-gray-500">Phone</dt>
                  <dd className="text-gray-300">{selected.phone?.trim() || "—"}</dd>
                  <dt className="text-gray-500">Certificate #</dt>
                  <dd className="font-mono text-violet-200">{formatCertNumber(selected.certificateNumber)}</dd>
                  <dt className="text-gray-500">Delegate #</dt>
                  <dd className="font-mono text-gray-200">{selected.delegateNumber?.trim() || "—"}</dd>
                  <dt className="text-gray-500">Course</dt>
                  <dd className="text-gray-300">{selected.courseTitle}</dd>
                  <dt className="text-gray-500">Access</dt>
                  <dd>
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 font-semibold ${accessBadgeClass(selected.learnerAccess)}`}
                    >
                      {accessLabel(selected.learnerAccess)}
                    </span>
                  </dd>
                  {selected.verifyUrl ? (
                    <>
                      <dt className="text-gray-500">Verify</dt>
                      <dd className="truncate">
                        <a
                          href={selected.verifyUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-emerald-300 hover:underline"
                        >
                          Open tracker
                        </a>
                      </dd>
                    </>
                  ) : null}
                </dl>
                {selected.badgeImage?.trim() ? (
                  <div
                    className="relative overflow-hidden rounded-xl border border-amber-500/15 px-3 py-5"
                    style={{
                      background:
                        "radial-gradient(ellipse at 50% 0%, rgba(245,158,11,0.08) 0%, transparent 60%)",
                    }}
                  >
                    <p className="text-center text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500">
                      Course badge
                    </p>
                    <ShareableBadgeCard
                      variant="inline"
                      title={selected.courseTitle}
                      subtitle={selected.learnerName}
                      imageUrl={selected.badgeImage.trim()}
                      shareUrl={
                        selected.verifyUrl?.trim() ||
                        (typeof window !== "undefined"
                          ? `${window.location.origin}/certificates/verify?number=${encodeURIComponent(selected.certificateNumber)}`
                          : `/certificates/verify?number=${encodeURIComponent(selected.certificateNumber)}`)
                      }
                      shareText={`${selected.learnerName} earned a certificate in ${selected.courseTitle} at SF Trainings!`}
                      className="mx-auto"
                    />
                  </div>
                ) : null}
                <div className="max-h-[360px] overflow-y-auto rounded-lg border border-white/10 bg-white/5 p-2">
                  <CertificatePrintView certificate={selected} showActions={false} />
                </div>
              </div>
            ) : (
              <p className="mt-3 text-xs text-gray-600">Select a row to preview the certificate layout.</p>
            )}
          </div>
        </div>
      )}
      {msg ? <p className="mt-3 text-[11px] text-rose-300">{msg}</p> : null}
    </div>
  );
}
