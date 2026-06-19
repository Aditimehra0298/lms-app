"use client";

import Image from "next/image";
import { Award } from "lucide-react";
import { resolveCertificateTemplateLayout } from "@/lib/certificate-template-layout";
import type { ReactNode } from "react";

type Props = {
  templateImage: string;
  badgeImage?: string;
  learnerName: string;
  certificateNumber: string;
  courseTitle: string;
  issuedAt: string;
  scorePercent?: number | null;
  layout?: {
    nameTopPercent?: number;
    numberTopPercent?: number;
    dateTopPercent?: number;
    overlayCourseTitle?: boolean;
    overlayScore?: boolean;
    overlayBadge?: boolean;
  };
  className?: string;
  overlay?: ReactNode;
};

/** On-screen preview matching the admin certificate template with learner text overlaid. */
export function CertificateTemplatePreview({
  templateImage,
  badgeImage,
  learnerName,
  certificateNumber,
  courseTitle,
  issuedAt,
  scorePercent,
  layout,
  className = "",
  overlay,
}: Props) {
  const positions = resolveCertificateTemplateLayout(layout);
  const issuedDate = new Date(issuedAt).toLocaleDateString(undefined, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className={`relative aspect-[297/210] w-full overflow-hidden bg-white ${className}`}>
      <Image src={templateImage} alt="" fill unoptimized className="object-contain" priority />
      {positions.overlayBadge ? (
        badgeImage ? (
          <div className="absolute right-[8%] top-[8%] aspect-square h-[14%] overflow-hidden rounded-full border-2 border-amber-400/50 bg-white shadow-lg">
            <Image
              src={badgeImage}
              alt="Badge"
              fill
              unoptimized
              className="object-contain p-[2%]"
            />
          </div>
        ) : (
          <div className="absolute right-[8%] top-[8%] flex aspect-square h-[14%] items-center justify-center overflow-hidden rounded-full border-2 border-amber-400/50 bg-amber-500 text-black shadow-lg">
            <Award className="h-[55%] w-[55%]" aria-hidden />
          </div>
        )
      ) : null}
      <div
        className="absolute left-0 right-0 px-[10%] text-center"
        style={{ top: `${positions.nameTopPercent}%` }}
      >
        <p className="font-serif text-lg font-bold text-[#1a1a2e] md:text-2xl lg:text-3xl">
          {learnerName}
        </p>
      </div>
      <div
        className="absolute left-0 right-0 px-[10%] text-center"
        style={{ top: `${positions.numberTopPercent}%` }}
      >
        <p className="font-mono text-sm font-semibold text-[#333] md:text-lg">
          {certificateNumber}
        </p>
      </div>
      <div
        className="absolute left-0 right-0 px-[10%] text-center"
        style={{ top: `${positions.dateTopPercent}%` }}
      >
        <p className="text-xs text-[#444] md:text-sm">
          {positions.overlayCourseTitle ? courseTitle : null}
        </p>
        <p className="mt-0.5 text-[10px] text-[#666] md:text-xs">Issued {issuedDate}</p>
        {positions.overlayScore && scorePercent != null ? (
          <p className="mt-0.5 text-[10px] text-[#666] md:text-xs">
            Final grade: {scorePercent}%
          </p>
        ) : null}
      </div>
      {overlay}
    </div>
  );
}
