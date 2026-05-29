"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import CertificatePrintView from "@/components/CertificatePrintView";
import type { IssuedCertificateDto } from "@/lib/server/certificate-service";
import { readJsonResponse } from "@/lib/safe-json";

export default function MyCertificateViewPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const [certificate, setCertificate] = useState<IssuedCertificateDto | null>(null);
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
          <div className="mt-6">
            <CertificatePrintView certificate={certificate} />
          </div>
        )}
      </div>
    </div>
  );
}
