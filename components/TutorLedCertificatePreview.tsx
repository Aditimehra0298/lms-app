"use client";

import Image from "next/image";
import { BadgeCheck, Download, Share2, Shield } from "lucide-react";

const CERTIFICATE_SAMPLE_SRC = "/certificates/sample-tutor-led-certificate.jpg";

type Props = {
  programTitle: string;
  trainerName?: string;
  learnerPlaceholder?: string;
  issuedLabel?: string;
  /** compact = sidebar / CTA; full = main marketing block */
  layout?: "full" | "compact";
  /** When true, show only the sample image (no title or footer copy below). */
  hideTitle?: boolean;
};

export function TutorLedCertificatePreview({
  programTitle,
  trainerName = "Program Trainer",
  issuedLabel = "Upon successful completion of all live sessions",
  layout = "full",
  hideTitle = false,
}: Props) {
  const isCompact = layout === "compact";
  const imageOnly = hideTitle || isCompact;

  const wrapperClass = isCompact
    ? "mx-auto w-full max-w-[110px]"
    : hideTitle
      ? "w-full"
      : "relative mx-auto w-full max-w-[300px] sm:max-w-[340px]";

  return (
    <div className={wrapperClass}>
      {!hideTitle && !isCompact ? (
        <div className="mb-4 text-center lg:text-left">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#FFB800]">Included with enrollment</p>
          <h3 className="mt-1 text-xl font-bold text-white md:text-2xl">Your Certificate of Attainment</h3>
          <p className="mt-1 text-sm text-zinc-400">
            IEB-accredited credential personalized with your name, program title, and verification QR code.
          </p>
        </div>
      ) : !hideTitle && isCompact ? (
        <p className="mb-2 text-center text-[10px] font-semibold uppercase tracking-wider text-amber-200/90">
          Certificate included
        </p>
      ) : null}

      <div
        className={`relative overflow-hidden rounded-sm border border-[#c9a227]/20 bg-white ${
          isCompact
            ? "shadow-[0_12px_32px_rgba(0,0,0,0.45)]"
            : "shadow-[0_28px_70px_rgba(0,0,0,0.55),0_0_48px_rgba(255,184,0,0.14)]"
        }`}
        style={{ aspectRatio: "794 / 1123" }}
      >
        <Image
          src={CERTIFICATE_SAMPLE_SRC}
          alt={`Sample Certificate of Attainment — ${programTitle}`}
          fill
          className="object-contain object-center"
          sizes={isCompact ? "110px" : hideTitle ? "360px" : "340px"}
          priority={!isCompact}
        />
        <span
          className={`pointer-events-none absolute rounded bg-black/60 font-semibold uppercase tracking-wider text-zinc-300 ${
            isCompact ? "right-1 top-1 px-1 py-px text-[7px]" : "right-2 top-2 px-2 py-0.5 text-[9px]"
          }`}
        >
          Sample
        </span>
      </div>
      {hideTitle && !isCompact ? (
        <p className="mt-2 text-center text-[10px] leading-relaxed text-zinc-500 lg:text-left">
          IEB-accredited · scan QR to verify
        </p>
      ) : null}

      {!imageOnly ? (
        <>
          <ul className="mt-4 space-y-2 text-sm text-zinc-400">
            <li className="flex items-start gap-2">
              <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" aria-hidden />
              {issuedLabel}
            </li>
            <li className="flex items-start gap-2">
              <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" aria-hidden />
              Accredited by IEB, London (UK) · scan QR to verify · signed by Program Director
            </li>
            <li className="flex items-start gap-2">
              <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" aria-hidden />
              Mode: Tutor Led Training · trainer: {trainerName}
            </li>
          </ul>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2 lg:justify-start">
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-[9px] font-medium text-emerald-200/90">
              <Shield className="h-3 w-3 text-emerald-400" aria-hidden />
              IEB accredited
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[9px] text-zinc-400">
              <Share2 className="h-3 w-3" aria-hidden />
              Share on LinkedIn
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[9px] text-zinc-400">
              <Download className="h-3 w-3" aria-hidden />
              PDF download
            </span>
          </div>
          <p className="mt-3 text-center text-[10px] leading-relaxed text-zinc-500 lg:text-left">
            Sample preview — enroll to earn your personalized Certificate of Attainment.
          </p>
        </>
      ) : null}
    </div>
  );
}
