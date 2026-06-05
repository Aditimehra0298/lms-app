"use client";

import Image from "next/image";
import Link from "next/link";
import { Download, Share2, ShieldCheck } from "lucide-react";
import type { IssuedCertificateDto } from "@/lib/certificate-types";
import {
  buildBadgeShareText,
  buildCertificateEarnedPageUrl,
  buildCertificatePublicPdfUrl,
} from "@/lib/certificate-share-url";
import { ShareCredentialButtons } from "@/components/ShareCredentialButtons";

type Props = {
  certificate: IssuedCertificateDto | null;
  /** Share links open certificate only — never transcript. */
  certificateOnly?: boolean;
};

export default function CertificateEarnedClient({ certificate, certificateOnly = true }: Props) {
  if (!certificate) {
    return (
      <div className="rounded-2xl border border-white/10 bg-[#141414] p-10 text-center">
        <p className="text-gray-400">Certificate not found or not yet published.</p>
        <Link href="/certificates/verify" className="mt-4 inline-block text-sm text-amber-300 hover:underline">
          Verify a certificate
        </Link>
      </div>
    );
  }

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const sharePageUrl = origin ? buildCertificateEarnedPageUrl(origin, certificate) : "";
  const pdfUrl = origin ? buildCertificatePublicPdfUrl(origin, certificate) : "";
  const shareText = buildBadgeShareText({
    learnerName: certificate.learnerName,
    courseTitle: certificate.courseTitle,
  });
  const badgeSrc = certificate.badgeImage?.trim() || "";
  const issuedOn = new Date(certificate.issuedAt).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const hasStoredPdf = Boolean(certificate.pdfReady && pdfUrl);
  const pdfPreviewSrc = hasStoredPdf ? `${pdfUrl}#page=1&view=FitH` : "";

  return (
    <div className="space-y-6">
      <div
        className="relative overflow-hidden rounded-2xl border border-amber-500/20 px-6 py-10 text-center"
        style={{
          background:
            "radial-gradient(ellipse at 50% 0%, rgba(245,158,11,0.12) 0%, transparent 55%), #141414",
        }}
      >
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-emerald-300/90">
          <ShieldCheck size={12} className="mr-1 inline" aria-hidden />
          Verified certificate
        </p>

        {badgeSrc ? (
          <div className="relative mx-auto mt-6 h-36 w-36 overflow-hidden rounded-full border-2 border-amber-400/45 bg-[#0d1118] shadow-[0_12px_40px_rgba(245,158,11,0.25)]">
            <Image
              src={badgeSrc}
              alt={`${certificate.courseTitle} badge`}
              fill
              unoptimized
              className="object-contain p-1.5"
            />
          </div>
        ) : null}

        <h2 className="mt-6 text-xl font-bold text-white">{certificate.learnerName}</h2>
        <p className="mt-1 text-sm text-amber-200/90">{certificate.courseTitle}</p>
        <p className="mt-1 text-xs text-gray-500">Issued {issuedOn}</p>
        {certificate.delegateNumber ? (
          <p className="mt-3 font-mono text-[11px] text-violet-300/90">{certificate.delegateNumber}</p>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0a0a0a] p-4">
        <p className="mb-3 text-center text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500">
          Official certificate {certificateOnly ? "" : "+ documents"}
        </p>

        {hasStoredPdf ? (
          <div className="overflow-hidden rounded-xl border border-white/10 bg-white">
            <iframe
              src={pdfPreviewSrc}
              title={`${certificate.learnerName} — ${certificate.courseTitle} certificate`}
              className="aspect-[1.414/1] w-full border-0"
            />
          </div>
        ) : (
          <p className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-6 text-center text-sm text-amber-100">
            The official certificate PDF is being prepared. Check back shortly.
          </p>
        )}

        {pdfUrl ? (
          <div className="mt-4 flex flex-wrap justify-center gap-2 border-t border-white/10 pt-4">
            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
            >
              <Download size={16} aria-hidden />
              Open certificate PDF
            </a>
          </div>
        ) : null}
      </div>

      {sharePageUrl ? (
        <div className="rounded-2xl border border-white/10 bg-[#141414] p-5">
          <p className="mb-3 flex items-center justify-center gap-2 text-sm font-semibold text-white">
            <Share2 size={16} className="text-violet-300" aria-hidden />
            Share certificate
          </p>
          <p className="mb-3 text-center text-xs text-gray-500">
            Link shows the course badge and the official certificate PDF — transcript is not included.
          </p>
          <ShareCredentialButtons
            url={sharePageUrl}
            title={certificate.courseTitle}
            text={shareText}
            badgeImageUrl={badgeSrc}
          />
        </div>
      ) : null}
    </div>
  );
}
