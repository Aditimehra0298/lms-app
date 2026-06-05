"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { Copy, Download, Share2, ShieldCheck, ShieldX } from "lucide-react";
import type { IssuedCertificateDto } from "@/lib/certificate-types";
import { buildLinkedInShareUrl } from "@/lib/certificate-verify-url";
import { readJsonResponse } from "@/lib/safe-json";

type VerifyResponse = {
  ok?: boolean;
  verified?: boolean;
  certificate?: IssuedCertificateDto;
};

function VerifyContent() {
  const searchParams = useSearchParams();
  const initialDelegate = searchParams.get("delegate")?.trim() ?? "";
  const initialNumber = searchParams.get("number")?.trim() ?? "";
  const [query, setQuery] = useState(initialDelegate || initialNumber);
  const [certificate, setCertificate] = useState<IssuedCertificateDto | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "fail">("idle");
  const [copied, setCopied] = useState(false);

  const runVerify = useCallback(async (raw: string) => {
    const q = raw.trim();
    if (!q) {
      setStatus("idle");
      setCertificate(null);
      return;
    }
    setStatus("loading");
    const isDelegate = /^\d{4}-\d+-\d+(-org)?$/i.test(q);
    const path = isDelegate
      ? `/api/certificates/verify?delegate=${encodeURIComponent(q)}`
      : `/api/certificates/verify?number=${encodeURIComponent(q)}`;
    try {
      const res = await fetch(path, { cache: "no-store" });
      const data = await readJsonResponse(res, {} as VerifyResponse);
      if (data.ok && data.certificate) {
        setCertificate(data.certificate);
        setStatus("ok");
      } else {
        setCertificate(null);
        setStatus("fail");
      }
    } catch {
      setCertificate(null);
      setStatus("fail");
    }
  }, []);

  useEffect(() => {
    if (initialDelegate || initialNumber) void runVerify(initialDelegate || initialNumber);
  }, [initialDelegate, initialNumber, runVerify]);

  const verifyPageUrl =
    typeof window !== "undefined" && certificate?.verifyUrl
      ? certificate.verifyUrl
      : certificate?.delegateNumber
        ? `${typeof window !== "undefined" ? window.location.origin : ""}/certificates/verify?delegate=${encodeURIComponent(certificate.delegateNumber)}`
        : "";
  const certificateDownloadUrl =
    certificate?.id && certificate?.learnerEmail
      ? `/api/certificates/${encodeURIComponent(certificate.id)}/pdf?email=${encodeURIComponent(
          certificate.learnerEmail,
        )}`
      : "";

  const copyLink = async () => {
    if (!verifyPageUrl) return;
    await navigator.clipboard.writeText(verifyPageUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <form
        className="rounded-2xl border border-white/10 bg-[#141414] p-6"
        onSubmit={(e) => {
          e.preventDefault();
          void runVerify(query);
        }}
      >
        <label className="block text-sm text-gray-400">
          Scan QR or enter delegate / certificate number
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. 2026-0042-123"
            className="mt-2 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 font-mono text-sm text-white outline-none focus:border-emerald-500/40"
          />
        </label>
        <button
          type="submit"
          className="mt-3 w-full rounded-lg bg-emerald-600 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
        >
          Verify certificate
        </button>
        <p className="mt-2 text-[10px] text-gray-600">
          Delegate format: <span className="font-mono text-gray-500">YYYY-verifyNumber-userId</span>
        </p>
      </form>

      <div className="rounded-2xl border border-white/10 bg-[#141414] p-8 text-center">
        {status === "loading" ? (
          <p className="text-gray-400">Verifying…</p>
        ) : status === "ok" && certificate ? (
          <>
            <ShieldCheck className="mx-auto h-12 w-12 text-emerald-400" aria-hidden />
            <h2 className="mt-4 text-xl font-bold text-emerald-200">Certificate verified</h2>
            <p className="mt-1 text-xs text-gray-500">SFT certificate tracker</p>
            {certificate.delegateNumber ? (
              <p className="mt-3 font-mono text-sm text-amber-200">{certificate.delegateNumber}</p>
            ) : null}
            <p className="mt-1 font-mono text-[11px] text-gray-500">{certificate.certificateNumber}</p>
            <dl className="mt-6 space-y-2 text-left text-sm text-gray-300">
              <div className="flex justify-between gap-4">
                <dt className="text-gray-500">Learner</dt>
                <dd className="font-medium text-white">{certificate.learnerName}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-gray-500">Course</dt>
                <dd className="text-right">{certificate.courseTitle}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-gray-500">Issued</dt>
                <dd>{new Date(certificate.issuedAt).toLocaleDateString()}</dd>
              </div>
              {certificate.scorePercent != null ? (
                <div className="flex justify-between gap-4">
                  <dt className="text-gray-500">Grade</dt>
                  <dd>{certificate.scorePercent}%</dd>
                </div>
              ) : null}
            </dl>
            {verifyPageUrl ? (
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                {certificateDownloadUrl ? (
                  <a
                    href={certificateDownloadUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-500"
                  >
                    <Download className="h-3.5 w-3.5" aria-hidden />
                    Download certificate PDF
                  </a>
                ) : null}
                <button
                  type="button"
                  onClick={() => void copyLink()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold text-gray-200 hover:bg-white/5"
                >
                  <Copy className="h-3.5 w-3.5" aria-hidden />
                  {copied ? "Copied!" : "Copy verify link"}
                </button>
                <a
                  href={buildLinkedInShareUrl(verifyPageUrl)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#0a66c2] px-3 py-2 text-xs font-semibold text-white hover:bg-[#004182]"
                >
                  <Share2 className="h-3.5 w-3.5" aria-hidden />
                  Share on LinkedIn
                </a>
              </div>
            ) : null}
          </>
        ) : status === "fail" ? (
          <>
            <ShieldX className="mx-auto h-12 w-12 text-rose-400" aria-hidden />
            <h2 className="mt-4 text-xl font-bold text-rose-200">Not verified</h2>
            <p className="mt-2 text-sm text-gray-400">
              No published certificate matches{" "}
              <span className="font-mono text-gray-300">{query || "—"}</span>
            </p>
          </>
        ) : (
          <p className="text-sm text-gray-500">Enter a delegate or certificate number to verify.</p>
        )}
      </div>
    </div>
  );
}

export default function VerifyCertificatePage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] px-4 py-16 text-white">
      <h1 className="mb-2 text-center text-2xl font-bold">Certificate tracker</h1>
      <p className="mb-8 text-center text-sm text-gray-500">
        Scan the QR on your certificate or paste your unique delegate number
      </p>
      <Suspense fallback={<p className="text-center text-gray-400">Loading…</p>}>
        <VerifyContent />
      </Suspense>
    </div>
  );
}
