"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { ShieldCheck, ShieldX } from "lucide-react";
import type { IssuedCertificateDto } from "@/lib/server/certificate-service";

function VerifyContent() {
  const searchParams = useSearchParams();
  const number = searchParams.get("number")?.trim() ?? "";
  const [certificate, setCertificate] = useState<IssuedCertificateDto | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "fail">("idle");

  useEffect(() => {
    if (!number) return;
    setStatus("loading");
    void fetch(`/api/certificates/verify?number=${encodeURIComponent(number)}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((data: { ok?: boolean; verified?: boolean; certificate?: IssuedCertificateDto }) => {
        if (data.ok && data.certificate) {
          setCertificate(data.certificate);
          setStatus("ok");
        } else {
          setStatus("fail");
        }
      })
      .catch(() => setStatus("fail"));
  }, [number]);

  return (
    <div className="mx-auto max-w-lg rounded-2xl border border-white/10 bg-[#141414] p-8 text-center">
      {status === "loading" ? (
        <p className="text-gray-400">Verifying…</p>
      ) : status === "ok" && certificate ? (
        <>
          <ShieldCheck className="mx-auto h-12 w-12 text-emerald-400" aria-hidden />
          <h1 className="mt-4 text-xl font-bold text-emerald-200">Certificate verified</h1>
          <p className="mt-2 font-mono text-sm text-amber-200">{certificate.certificateNumber}</p>
          <dl className="mt-6 space-y-2 text-left text-sm text-gray-300">
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500">Learner</dt>
              <dd className="font-medium text-white">{certificate.learnerName}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500">Learner ID</dt>
              <dd>{certificate.identificationNumber}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500">Course</dt>
              <dd className="text-right">{certificate.courseTitle}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500">Issued</dt>
              <dd>{new Date(certificate.issuedAt).toLocaleDateString()}</dd>
            </div>
          </dl>
        </>
      ) : (
        <>
          <ShieldX className="mx-auto h-12 w-12 text-rose-400" aria-hidden />
          <h1 className="mt-4 text-xl font-bold text-rose-200">Not found</h1>
          <p className="mt-2 text-sm text-gray-400">
            No certificate matches <span className="font-mono text-gray-300">{number || "—"}</span>
          </p>
        </>
      )}
    </div>
  );
}

export default function VerifyCertificatePage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] px-4 py-16 text-white">
      <h1 className="mb-8 text-center text-2xl font-bold">Certificate verification</h1>
      <Suspense fallback={<p className="text-center text-gray-400">Loading…</p>}>
        <VerifyContent />
      </Suspense>
    </div>
  );
}
