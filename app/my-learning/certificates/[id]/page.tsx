"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import type { IssuedCertificateDto } from "@/lib/server/certificate-service";
import { fetchSavedCertificatePdf } from "@/lib/certificate-pdf-client";
import { getLearnerEmail } from "@/lib/learner-session-client";
import { readJsonResponse } from "@/lib/safe-json";

export default function MyCertificateViewPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const [certificate, setCertificate] = useState<IssuedCertificateDto | null>(null);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    void fetch(`/api/certificates/${encodeURIComponent(id)}`, { cache: "no-store" })
      .then(async (r) =>
        readJsonResponse(r, {} as {
          ok?: boolean;
          certificate?: IssuedCertificateDto;
          message?: string;
        }),
      )
      .then((data) => {
        if (data.ok && data.certificate) {
          setCertificate(data.certificate);
        } else {
          setError(data.message ?? "Certificate not found.");
        }
      })
      .catch(() => setError("Could not load certificate."));
  }, [id]);

  useEffect(() => {
    if (!certificate?.id || !certificate.pdfReady) {
      setPdfPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      return;
    }

    const email =
      certificate.learnerEmail?.trim().toLowerCase() || getLearnerEmail()?.trim().toLowerCase() || "";
    if (!email) return;

    let objectUrl: string | null = null;
    let cancelled = false;
    setPdfLoading(true);

    void fetchSavedCertificatePdf(certificate.id, email, { attachment: false })
      .then((result) => {
        if (cancelled) return;
        if (!result.ok) {
          setError(result.message);
          return;
        }
        objectUrl = URL.createObjectURL(result.blob);
        setPdfPreviewUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return objectUrl;
        });
      })
      .catch(() => {
        if (!cancelled) setError("Could not load your certificate PDF.");
      })
      .finally(() => {
        if (!cancelled) setPdfLoading(false);
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [certificate?.id, certificate?.learnerEmail, certificate?.pdfReady]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] px-4 py-8 text-white">
      <div className="mx-auto max-w-4xl">
        <Link href="/my-learning?tab=certificates" className="text-sm text-amber-300 hover:text-amber-200">
          ← Back to My Certificates
        </Link>
        {error ? (
          <p className="mt-8 text-rose-300">{error}</p>
        ) : !certificate ? (
          <p className="mt-8 text-gray-400">Loading certificate…</p>
        ) : (
          <div className="mt-6 space-y-4">
            <div className="text-center">
              <h1 className="text-xl font-bold text-white">{certificate.courseTitle}</h1>
              <p className="mt-1 text-sm text-gray-400">{certificate.certificateNumber}</p>
            </div>

            {pdfLoading ? (
              <div className="flex aspect-[1.414/1] w-full flex-col items-center justify-center gap-2 rounded-xl border border-white/10 bg-[#141414] text-gray-400">
                <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
                <p className="text-xs">Loading your official certificate…</p>
              </div>
            ) : pdfPreviewUrl ? (
              <div className="overflow-hidden rounded-xl border border-white/10 bg-white">
                <iframe
                  src={pdfPreviewUrl}
                  title={`${certificate.courseTitle} certificate`}
                  className="aspect-[1.414/1] w-full border-0"
                />
              </div>
            ) : (
              <p className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-6 text-center text-sm text-amber-100">
                Your official certificate PDF is not ready yet. Open the course completion page and tap
                Get certificate PDF.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
