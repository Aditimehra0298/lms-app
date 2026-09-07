"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Download, Loader2 } from "lucide-react";
import { fetchSavedCertificatePdf, savePdfBlob } from "@/lib/certificate-pdf-client";
import {
  getLearnerEmail,
  subscribeLearnerAuth,
  clearLearnerPiiCookies,
} from "@/lib/learner-session-client";

export default function CertificatePdfViewerPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const [downloading, setDownloading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pdfObjectUrl, setPdfObjectUrl] = useState<string | null>(null);

  const sessionEmail = useSyncExternalStore(
    subscribeLearnerAuth,
    () => getLearnerEmail()?.trim().toLowerCase() ?? "",
    () => "",
  );

  const effectiveEmail = sessionEmail;

  useEffect(() => {
    clearLearnerPiiCookies();
  }, [sessionEmail]);

  useEffect(() => {
    if (!id || !effectiveEmail) {
      setLoading(false);
      return;
    }

    let objectUrl: string | null = null;
    setLoading(true);
    setError("");

    void fetchSavedCertificatePdf(id, effectiveEmail, { attachment: false })
      .then((result) => {
        if (!result.ok) {
          setError(result.message);
          return;
        }
        objectUrl = URL.createObjectURL(result.blob);
        setPdfObjectUrl(objectUrl);
      })
      .catch(() => setError("Could not load certificate PDF."))
      .finally(() => setLoading(false));

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [id, effectiveEmail]);

  const handleDownload = async () => {
    if (!id || !effectiveEmail) return;
    setDownloading(true);
    setError("");
    try {
      const result = await fetchSavedCertificatePdf(id, effectiveEmail, { attachment: true });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      savePdfBlob(result.blob, `certificate-${id}.pdf`);
    } catch {
      setError("Could not download certificate.");
    } finally {
      setDownloading(false);
    }
  };

  if (!id) {
    return <p className="p-8 text-white">Invalid certificate.</p>;
  }

  if (!effectiveEmail) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 p-8 text-white">
        <p className="text-amber-200">Please sign in to view your certificate.</p>
        <Link href="/account?mode=login" className="mt-4 text-sm text-amber-400 underline">
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-white">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
        <Link
          href="/my-learning?tab=certificates"
          className="text-sm text-amber-300 hover:text-amber-200"
        >
          ← Back
        </Link>
        <button
          type="button"
          disabled={downloading || loading}
          onClick={() => void handleDownload()}
          className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-black hover:bg-amber-400 disabled:opacity-50"
        >
          {downloading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          ) : (
            <Download className="h-3.5 w-3.5" aria-hidden />
          )}
          Download
        </button>
      </header>

      {error ? (
        <p className="px-4 py-3 text-sm text-red-300" role="alert">
          {error}
        </p>
      ) : null}

      {loading ? (
        <div className="flex flex-1 items-center justify-center gap-2 text-gray-400">
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
          Loading certificate…
        </div>
      ) : pdfObjectUrl ? (
        <iframe
          src={pdfObjectUrl}
          title="Certificate PDF"
          className="min-h-0 flex-1 border-0 bg-slate-900"
          style={{ width: "100%", height: "calc(100vh - 52px)" }}
        />
      ) : (
        <p className="p-8 text-gray-400">Certificate not available.</p>
      )}
    </div>
  );
}
