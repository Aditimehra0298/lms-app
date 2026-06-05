"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
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
  syncLearnerEmailCookie,
} from "@/lib/learner-session-client";
import {
  downloadCertificatePdf,
  fetchSavedCertificatePdf,
  savePdfBlob,
} from "@/lib/certificate-pdf-client";

export type CertificateDownloadActionsProps = {
  certificateId?: string;
  learnerEmail?: string;
  courseSlug: string;
  courseTitle: string;
  scorePercent?: number | null;
  pdfReady?: boolean;
  pdfUrl?: string | null;
  disabled?: boolean;
  disabledReason?: string;
  size?: "sm" | "md";
  onComplete?: () => void;
};

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

  const sessionEmail = useSyncExternalStore(
    subscribeLearnerAuth,
    () => getLearnerEmail()?.trim().toLowerCase() ?? "",
    () => "",
  );

  const effectiveEmail = (learnerEmail?.trim().toLowerCase() || sessionEmail).trim();

  useEffect(() => {
    setMounted(true);
    syncLearnerEmailCookie();
  }, [sessionEmail]);

  const canServePdf = pdfReady || Boolean(pdfUrl?.trim());
  const hasDirectLinks = Boolean(
    mounted && canServePdf && certificateId && effectiveEmail && !disabled,
  );

  const viewPageHref =
    certificateId && effectiveEmail
      ? `/my-learning/certificates/${encodeURIComponent(certificateId)}/view-pdf?email=${encodeURIComponent(effectiveEmail)}`
      : certificateId
        ? `/my-learning/certificates/${encodeURIComponent(certificateId)}/view-pdf`
        : null;

  const handleDownload = useCallback(async () => {
    if (!certificateId || !effectiveEmail) {
      setError("Please sign in to download your certificate.");
      return;
    }

    setError(null);
    setDownloading(true);

    try {
      const result = await fetchSavedCertificatePdf(certificateId, effectiveEmail, {
        attachment: true,
      });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      savePdfBlob(result.blob, `${courseSlug}-certificate-and-transcript.pdf`);
    } catch {
      setError("Download failed. Please try again.");
    } finally {
      setDownloading(false);
    }
  }, [certificateId, effectiveEmail, courseSlug]);

  const runGenerate = useCallback(async () => {
    if (!effectiveEmail) {
      setError("Please sign in to download your certificate.");
      return;
    }

    setError(null);
    setSuccess(false);
    setBusy(true);
    setMessage("Generating your certificate — first time takes about 10–15 seconds…");

    try {
      const result = await downloadCertificatePdf({
        certificateId,
        courseSlug,
        scorePercent,
        pdfReady: false,
        email: effectiveEmail,
        filename: `${courseSlug}-certificate-and-transcript.pdf`,
        openInNewTab: false,
      });

      if (!result.ok) {
        setError(result.message);
        return;
      }

      setSuccess(true);
      setMessage("Certificate saved! Use the buttons below to download or view.");
      onComplete?.();
      window.setTimeout(() => {
        setSuccess(false);
        setMessage(null);
      }, 8000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed.");
    } finally {
      setBusy(false);
    }
  }, [certificateId, courseSlug, scorePercent, effectiveEmail, onComplete]);

  const pad = size === "sm" ? "px-3 py-2 text-xs" : "px-4 py-2.5 text-sm";
  const btnClass = `inline-flex items-center gap-2 rounded-lg font-bold ${pad}`;
  const downloadBtnClass = `${btnClass} bg-amber-500 text-black shadow-sm hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50`;
  const viewBtnClass = `${btnClass} border border-white/20 font-semibold text-gray-100 no-underline hover:bg-white/10`;

  return (
    <div className="space-y-3">
      {disabled && disabledReason ? (
        <p className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-gray-400">
          {disabledReason}
        </p>
      ) : null}

      {!effectiveEmail ? (
        <p className="text-xs text-amber-200">Sign in to download your certificate.</p>
      ) : null}

      {(busy || success) && message ? (
        <div
          className={`rounded-lg border px-3 py-3 ${
            success
              ? "border-emerald-500/30 bg-emerald-500/10"
              : "border-amber-500/25 bg-amber-500/5"
          }`}
          role="status"
          aria-live="polite"
        >
          <p
            className={`flex items-center gap-2 text-xs ${
              success ? "text-emerald-200" : "text-amber-100"
            }`}
          >
            {busy ? (
              <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden />
            ) : (
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
            )}
            {message}
          </p>
        </div>
      ) : null}

      {error ? (
        <div
          className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2.5"
          role="alert"
        >
          <p className="flex items-start gap-2 text-xs text-red-200">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span>{error}</span>
          </p>
          <button
            type="button"
            disabled={busy || disabled}
            onClick={() => (hasDirectLinks ? void handleDownload() : void runGenerate())}
            className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-red-500/20 px-3 py-1.5 text-[11px] font-semibold text-red-100 hover:bg-red-500/30 disabled:opacity-50"
          >
            <RotateCcw className="h-3 w-3" aria-hidden />
            Try again
          </button>
        </div>
      ) : null}

      {hasDirectLinks ? (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={downloading}
            onClick={() => void handleDownload()}
            className={downloadBtnClass}
          >
            {downloading ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Download className="h-4 w-4" aria-hidden />
            )}
            {downloading ? "Downloading…" : "Download PDF"}
          </button>
          {viewPageHref ? (
            <Link
              href={viewPageHref}
              target="_blank"
              rel="noopener noreferrer"
              className={viewBtnClass}
            >
              <ExternalLink className="h-4 w-4" aria-hidden />
              View in browser
            </Link>
          ) : null}
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={disabled || busy || !effectiveEmail}
            onClick={() => void runGenerate()}
            className={`${downloadBtnClass} disabled:cursor-not-allowed disabled:opacity-50`}
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Download className="h-4 w-4" aria-hidden />
            )}
            {busy ? "Generating…" : "Generate & save certificate"}
          </button>
          {certificateId && !pdfReady ? (
            <p className="w-full text-[10px] text-gray-500">
              After generation completes, Download and View buttons will appear here instantly.
            </p>
          ) : null}
        </div>
      )}

      <p className="text-[10px] leading-relaxed text-gray-500">
        {hasDirectLinks ? (
          <>
            <FileText className="mr-1 inline h-3 w-3 text-emerald-400" aria-hidden />
            Certificate saved on server — download or view anytime.
          </>
        ) : (
          "First time: click Generate & save (~10–15s). Then use Download / View buttons."
        )}
      </p>
    </div>
  );
}

export function CertificateStatusBadge({
  status,
  visibleToLearner,
  pdfReady,
}: {
  status?: string;
  visibleToLearner?: boolean;
  pdfReady?: boolean;
}) {
  if (status === "ready" && visibleToLearner && pdfReady) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-300">
        <CheckCircle2 className="h-3 w-3" aria-hidden />
        Ready
      </span>
    );
  }
  if (status === "ready" && visibleToLearner) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-300">
        Generate to unlock download
      </span>
    );
  }
  if (status === "pending") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-300">
        <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
        Processing
      </span>
    );
  }
  if (status === "failed") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-300">
        Needs retry
      </span>
    );
  }
  if (status === "ready" && !visibleToLearner) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-gray-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
        Awaiting approval
      </span>
    );
  }
  return null;
}
