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
  syncLearnerEmailCookie,
} from "@/lib/learner-session-client";
import {
  fetchSavedCertificatePdf,
  savePdfBlob,
} from "@/lib/certificate-pdf-client";
import {
  generateCertificateFromTemplate,
} from "@/lib/certificate-generator-client";
import { requestCourseCertificateClient } from "@/lib/request-course-certificate-client";

export type CertificateDownloadActionsProps = {
  certificateId?: string;
  learnerEmail?: string;
  courseSlug: string;
  courseTitle: string;
  scorePercent?: number | null;
  pdfReady?: boolean;
  pdfUrl?: string | null;
  templateImageUrl?: string;
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
  templateImageUrl,
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
    setMessage(
      templateImageUrl
        ? "Generating your certificate using this course's uploaded templates…"
        : "Generating your certificate…",
    );

    try {
      let certId = certificateId?.trim() ?? "";

      if (!certId) {
        const requested = await requestCourseCertificateClient({
          learnerEmail: effectiveEmail,
          courseSlug,
          scorePercent: scorePercent ?? undefined,
          forceRetry: true,
        });
        if (!requested.ok || !requested.certificateId) {
          setError(
            requested.message ??
              "Could not create certificate record. Complete the course and upload certificate samples in admin.",
          );
          return;
        }
        certId = requested.certificateId;
      }

      const generated = await generateCertificateFromTemplate(certId, effectiveEmail, {
        forceRegenerate: true,
      });
      if (!generated.ok) {
        setError(
          generated.message ??
            "Could not build certificate from your uploaded template. Re-upload the certificate sample in Admin → Course → Certificates, then try again.",
        );
        return;
      }
      if (generated.templateImage) {
        setMessage("Certificate built from your uploaded course template. Saving PDF…");
      }

      setMessage("Saving your certificate PDF…");
      const result = await fetchSavedCertificatePdf(certId, effectiveEmail, {
        attachment: true,
      });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      savePdfBlob(result.blob, `${courseSlug}-certificate-and-transcript.pdf`);

      setSuccess(true);
      setMessage("Certificate ready! Use Download or View below.");
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
  }, [
    certificateId,
    courseSlug,
    scorePercent,
    effectiveEmail,
    onComplete,
    templateImageUrl,
  ]);

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
        <p className="text-xs text-amber-300">Sign in to generate or download your certificate.</p>
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
        {hasDirectLinks ? (
          <>
            <button
              type="button"
              disabled={downloading}
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
              disabled={busy}
              onClick={() => void runGenerate()}
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
            onClick={() => void runGenerate()}
            className={downloadBtnClass}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
            Generate certificate
          </button>
        )}
      </div>

      {!hasDirectLinks && !disabled ? (
        <p className="text-[11px] leading-relaxed text-gray-500">
          Uses certificate + transcript templates uploaded for this course in admin. First generation takes about
          10–15 seconds.
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
      <span className="inline-flex items-center rounded-full border border-emerald-500/35 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-200">
        Ready
      </span>
    );
  }

  if (normalized === "ready" && !visibleToLearner) {
    return (
      <span className="inline-flex items-center rounded-full border border-amber-500/35 bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-200">
        Awaiting approval
      </span>
    );
  }

  if (normalized === "ready") {
    return (
      <span className="inline-flex items-center rounded-full border border-emerald-500/35 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-200">
        Issued
      </span>
    );
  }

  if (normalized === "failed") {
    return (
      <span className="inline-flex items-center rounded-full border border-red-500/35 bg-red-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-200">
        Failed
      </span>
    );
  }

  return (
    <span className="inline-flex items-center rounded-full border border-violet-500/35 bg-violet-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-200">
      Generating…
    </span>
  );
}
