"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Download,
  ExternalLink,
  FileText,
  Loader2,
  AlertCircle,
  RotateCcw,
} from "lucide-react";
import {
  getLearnerEmail,
  subscribeLearnerAuth,
  clearLearnerPiiCookies,
} from "@/lib/learner-session-client";
import {
  fetchSavedCertificatePdf,
  savePdfBlob,
} from "@/lib/certificate-pdf-client";
import { requestCourseCertificateClient } from "@/lib/request-course-certificate-client";

export type CertificateDownloadActionsProps = {
  certificateId?: string;
  learnerEmail?: string;
  courseSlug: string;
  courseTitle: string;
  scorePercent?: number | null;
  pdfReady?: boolean;
  pdfUrl?: string | null;
  /** @deprecated Preview only — official PDF is generated server-side. */
  templateImageUrl?: string;
  disabled?: boolean;
  disabledReason?: string;
  size?: "sm" | "md";
  onComplete?: () => void;
};

function hasPermanentPdfUrl(pdfUrl?: string | null, pdfReady?: boolean): boolean {
  return Boolean(pdfReady || pdfUrl?.trim().startsWith("/api/certificates/"));
}

export function CertificateDownloadActions({
  certificateId,
  learnerEmail,
  courseSlug,
  courseTitle,
  scorePercent,
  pdfReady = false,
  pdfUrl,
  disabled = false,
  disabledReason,
  size = "md",
  onComplete,
}: CertificateDownloadActionsProps) {
  const [busy, setBusy] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [localPdfReady, setLocalPdfReady] = useState(false);

  const sessionEmail = useSyncExternalStore(
    subscribeLearnerAuth,
    () => getLearnerEmail()?.trim().toLowerCase() ?? "",
    () => "",
  );

  const effectiveEmail = (learnerEmail?.trim().toLowerCase() || sessionEmail).trim();
  const storedPdf = hasPermanentPdfUrl(pdfUrl, pdfReady) || localPdfReady;

  useEffect(() => {
    setMounted(true);
    clearLearnerPiiCookies();
  }, [sessionEmail]);

  useEffect(() => {
    if (hasPermanentPdfUrl(pdfUrl, pdfReady)) {
      setLocalPdfReady(true);
    }
  }, [pdfReady, pdfUrl]);

  const viewPageHref = certificateId
      ? `/my-learning/certificates/${encodeURIComponent(certificateId)}/view-pdf`
      : null;

  const resolveCertificateId = useCallback(async (): Promise<string | null> => {
    const existing = certificateId?.trim();
    if (existing) return existing;
    if (!effectiveEmail) return null;

    const requested = await requestCourseCertificateClient({
      learnerEmail: effectiveEmail,
      courseSlug,
      scorePercent: scorePercent ?? undefined,
      forceRetry: false,
    });
    if (!requested.ok || !requested.certificateId) {
      setError(
        requested.message ??
          "Could not create your certificate record. Complete the course and pass all exams first.",
      );
      return null;
    }
    return requested.certificateId;
  }, [certificateId, courseSlug, effectiveEmail, scorePercent]);

  const downloadPdf = useCallback(
    async (options?: { forceRegenerate?: boolean; attachment?: boolean }) => {
      if (!effectiveEmail) {
        setError("Please sign in to download your certificate.");
        return false;
      }

      setError(null);
      const certId = await resolveCertificateId();
      if (!certId) return false;

      const result = await fetchSavedCertificatePdf(certId, effectiveEmail, {
        attachment: options?.attachment !== false,
        forceRegenerate: options?.forceRegenerate === true,
      });

      if (!result.ok) {
        setError(result.message);
        return false;
      }

      if (options?.attachment !== false) {
        savePdfBlob(result.blob, `${courseSlug}-certificate-and-transcript.pdf`);
      }

      setLocalPdfReady(true);
      setSuccess(true);
      setMessage(
        options?.forceRegenerate
          ? "Certificate regenerated successfully."
          : storedPdf
            ? "Certificate downloaded."
            : "Official certificate ready. You can download it anytime.",
      );
      onComplete?.();
      window.setTimeout(() => {
        setSuccess(false);
        setMessage(null);
      }, 8000);
      return true;
    },
    [courseSlug, effectiveEmail, onComplete, resolveCertificateId, storedPdf],
  );

  const handleDownload = useCallback(async () => {
    setDownloading(true);
    try {
      await downloadPdf({ attachment: true });
    } catch {
      setError("Download failed. Please try again.");
    } finally {
      setDownloading(false);
    }
  }, [downloadPdf]);

  const handleFirstGenerate = useCallback(async () => {
    setSuccess(false);
    setBusy(true);
    setMessage(
      storedPdf
        ? "Loading your saved certificate…"
        : "Generating your official certificate… First time only (~15 seconds).",
    );

    try {
      await downloadPdf({ attachment: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not generate certificate.");
    } finally {
      setBusy(false);
    }
  }, [downloadPdf, storedPdf]);

  const handleRegenerate = useCallback(async () => {
    setError(null);
    setBusy(true);
    setMessage("Regenerating your certificate…");
    try {
      await downloadPdf({ attachment: true, forceRegenerate: true });
    } catch {
      setError("Regeneration failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }, [downloadPdf]);

  const pad = size === "sm" ? "px-3 py-2 text-xs" : "px-4 py-2.5 text-sm";
  const btnClass = `inline-flex items-center gap-2 rounded-lg font-bold ${pad}`;
  const downloadBtnClass = `${btnClass} bg-amber-500 text-black shadow-sm hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50`;
  const viewBtnClass = `${btnClass} border border-white/20 font-semibold text-gray-100 no-underline hover:bg-white/10`;

  const canAct = mounted && effectiveEmail && !disabled;

  return (
    <div className="space-y-3">
      {disabled && disabledReason ? (
        <p className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-gray-400">
          {disabledReason}
        </p>
      ) : null}

      {!effectiveEmail ? (
        <p className="text-xs text-amber-300">Sign in to get your certificate PDF.</p>
      ) : null}

      {message ? (
        <p className="flex items-center gap-2 rounded-lg border border-violet-400/25 bg-violet-500/10 px-3 py-2 text-xs text-violet-100">
          <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
          {message}
        </p>
      ) : null}

      {error ? (
        <p className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      ) : null}

      {success ? (
        <p className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
          {message}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {storedPdf && canAct ? (
          <>
            <button
              type="button"
              disabled={downloading || busy}
              onClick={() => void handleDownload()}
              className={downloadBtnClass}
            >
              {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Download PDF
            </button>
            {viewPageHref ? (
              <Link href={viewPageHref} target="_blank" rel="noopener noreferrer" className={viewBtnClass}>
                <ExternalLink className="h-4 w-4" /> View PDF
              </Link>
            ) : null}
            <button
              type="button"
              disabled={busy || downloading}
              onClick={() => void handleRegenerate()}
              className={`${btnClass} border border-white/15 text-gray-300 hover:bg-white/5 disabled:opacity-50`}
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
              Regenerate
            </button>
          </>
        ) : (
          <button
            type="button"
            disabled={busy || disabled || !effectiveEmail}
            onClick={() => void handleFirstGenerate()}
            className={downloadBtnClass}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
            Get certificate PDF
          </button>
        )}
      </div>

      {!storedPdf && !disabled ? (
        <p className="text-[11px] leading-relaxed text-gray-500">
          Your official certificate is generated once and reused on every download — no repeat
          generation unless you choose Regenerate.
        </p>
      ) : storedPdf ? (
        <p className="text-[11px] leading-relaxed text-gray-500">
          Ready — instant download anytime.
        </p>
      ) : null}
    </div>
  );
}

export type CertificateStatusBadgeProps = {
  status?: string;
  visibleToLearner?: boolean;
  pdfReady?: boolean;
};

/** Small status chip for certificate rows (ready / pending / failed). */
export function CertificateStatusBadge({
  status,
  visibleToLearner = true,
  pdfReady = false,
}: CertificateStatusBadgeProps) {
  const normalized = (status ?? "pending").toLowerCase();

  if (normalized === "ready" && pdfReady && visibleToLearner) {
    return (
      <span className="certificate-status-badge inline-flex items-center rounded-full border border-emerald-500/35 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-200">
        Ready
      </span>
    );
  }

  if (normalized === "ready" && !visibleToLearner) {
    return (
      <span className="certificate-status-badge inline-flex items-center rounded-full border border-amber-500/35 bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-200">
        Awaiting approval
      </span>
    );
  }

  if (normalized === "ready") {
    return (
      <span className="certificate-status-badge inline-flex items-center rounded-full border border-emerald-500/35 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-200">
        Issued
      </span>
    );
  }

  if (normalized === "failed") {
    return (
      <span className="certificate-status-badge inline-flex items-center rounded-full border border-red-500/35 bg-red-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-200">
        Failed
      </span>
    );
  }

  return (
    <span className="certificate-status-badge inline-flex items-center rounded-full border border-violet-500/35 bg-violet-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-200">
      Generating…
    </span>
  );
}
