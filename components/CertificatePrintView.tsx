"use client";

import Image from "next/image";
import { Award, Download, ShieldCheck } from "lucide-react";
import type { IssuedCertificateDto } from "@/lib/server/certificate-service";

type Props = {
  certificate: IssuedCertificateDto;
  showActions?: boolean;
};

export default function CertificatePrintView({ certificate, showActions = true }: Props) {
  const issuedDate = new Date(certificate.issuedAt).toLocaleDateString(undefined, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const template = certificate.templateImage || "/certificates/haccp-certificate-template.jpg";

  return (
    <div className="space-y-6">
      <div className="certificate-print-root mx-auto max-w-4xl">
        <div className="relative aspect-[297/210] w-full overflow-hidden rounded-lg border border-amber-500/30 bg-white shadow-2xl print:rounded-none print:border-0 print:shadow-none">
          <Image src={template} alt="" fill unoptimized className="object-contain" priority />
          {certificate.badgeImage ? (
            <div className="absolute right-[8%] top-[8%] aspect-square h-[14%] overflow-hidden rounded-full border-2 border-amber-400/50 bg-white shadow-lg">
              <Image
                src={certificate.badgeImage}
                alt="Badge"
                fill
                unoptimized
                className="object-contain p-[2%]"
              />
            </div>
          ) : (
            <div className="absolute right-[8%] top-[8%] flex aspect-square h-[14%] items-center justify-center overflow-hidden rounded-full border-2 border-amber-400/50 bg-amber-500/90 text-black shadow-lg print:bg-amber-400">
              <Award className="h-[55%] w-[55%]" aria-hidden />
            </div>
          )}
          <div
            className="absolute left-0 right-0 px-[10%] text-center"
            style={{ top: `${certificate.nameTopPercent ?? 38}%` }}
          >
            <p className="font-serif text-2xl font-bold tracking-wide text-[#1a1a2e] md:text-4xl print:text-3xl">
              {certificate.learnerName}
            </p>
          </div>
          <div
            className="absolute left-0 right-0 px-[10%] text-center"
            style={{ top: `${certificate.numberTopPercent ?? 52}%` }}
          >
            <p className="font-mono text-sm font-semibold text-[#333] md:text-lg print:text-base">
              {certificate.certificateNumber.startsWith("TEMP-")
                ? "Certificate number pending"
                : certificate.certificateNumber}
            </p>
            {certificate.delegateNumber ? (
              <p className="mt-1 font-mono text-[10px] text-[#444] md:text-xs">
                Delegate {certificate.delegateNumber}
              </p>
            ) : null}
            <p className="mt-1 text-[10px] uppercase tracking-widest text-[#555] md:text-xs">
              Learner ID {certificate.identificationNumber}
            </p>
          </div>
          <div
            className="absolute left-0 right-0 px-[10%] text-center"
            style={{ top: `${certificate.dateTopPercent ?? 62}%` }}
          >
            <p className="text-xs text-[#444] md:text-sm">{certificate.courseTitle}</p>
            <p className="mt-1 text-[11px] text-[#666]">Issued {issuedDate}</p>
            {certificate.scorePercent != null ? (
              <p className="mt-0.5 text-[11px] text-[#666]">Score: {certificate.scorePercent}%</p>
            ) : null}
          </div>
        </div>
      </div>

      {certificate.supplementaryDocs.length > 0 ? (
        <div className="rounded-xl border border-white/10 bg-[#141414] p-4 print:hidden">
          <h3 className="text-sm font-semibold text-white">Included documents</h3>
          <ul className="mt-2 space-y-2">
            {certificate.supplementaryDocs.map((doc) => (
              <li key={doc.url}>
                <a
                  href={doc.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-violet-300 underline hover:text-violet-200"
                >
                  {doc.title}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {showActions ? (
        <div className="flex flex-wrap gap-3 print:hidden">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-bold text-black hover:bg-amber-400"
          >
            <Download className="h-4 w-4" aria-hidden />
            Download / Print PDF
          </button>
          <a
            href={`/certificates/verify?number=${encodeURIComponent(certificate.certificateNumber)}`}
            className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-2.5 text-sm font-semibold text-emerald-200 hover:bg-emerald-500/20"
          >
            <ShieldCheck className="h-4 w-4" aria-hidden />
            Verify online
          </a>
        </div>
      ) : null}

      <style
        dangerouslySetInnerHTML={{
          __html: `@media print{body *{visibility:hidden}.certificate-print-root,.certificate-print-root *{visibility:visible}.certificate-print-root{position:absolute;left:0;top:0;width:100%}}`,
        }}
      />
    </div>
  );
}
