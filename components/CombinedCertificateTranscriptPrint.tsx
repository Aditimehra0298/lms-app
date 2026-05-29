"use client";

import Image from "next/image";
import { Award } from "lucide-react";
import type { ModuleExamScore } from "@/lib/learner-exam-scores";

type CurriculumModuleLike = {
  title?: string;
  items?: Array<{ kind?: string; label?: string }>;
};

export type TranscriptRow = {
  moduleNumber: number;
  moduleTitle: string;
  status: "Completed" | "In Progress" | "Not Started";
  score?: ModuleExamScore | null;
};

export type CombinedCredentialData = {
  learnerName: string;
  courseTitle: string;
  courseDuration?: string;
  certificateNumber: string;
  issuedAt: string;
  scorePercent: number | null;
  templateImage: string;
  badgeImage?: string;
  transcriptTemplateImage?: string;
  transcriptRows: TranscriptRow[];
  nameTopPercent?: number;
  numberTopPercent?: number;
  dateTopPercent?: number;
};

type Props = {
  data: CombinedCredentialData;
  printRootId?: string;
};

export function CombinedCertificateTranscriptPrint({
  data,
  printRootId = "combined-credential-print",
}: Props) {
  const issuedDate = new Date(data.issuedAt).toLocaleDateString(undefined, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div id={printRootId} className="combined-credential-print hidden print:block">
      <div className="relative aspect-[297/210] w-full overflow-hidden bg-white">
        <Image src={data.templateImage} alt="" fill unoptimized className="object-cover" priority />
        {data.badgeImage ? (
          <div className="absolute right-[8%] top-[8%] h-[18%] w-[18%]">
            <Image src={data.badgeImage} alt="Badge" fill unoptimized className="object-contain" />
          </div>
        ) : (
          <div className="absolute right-[8%] top-[8%] flex h-14 w-14 items-center justify-center rounded-full bg-amber-500 text-black">
            <Award className="h-8 w-8" aria-hidden />
          </div>
        )}
        <div
          className="absolute left-0 right-0 px-[10%] text-center"
          style={{ top: `${data.nameTopPercent ?? 38}%` }}
        >
          <p className="font-serif text-3xl font-bold text-[#1a1a2e]">{data.learnerName}</p>
        </div>
        <div
          className="absolute left-0 right-0 px-[10%] text-center"
          style={{ top: `${data.numberTopPercent ?? 52}%` }}
        >
          <p className="font-mono text-lg font-semibold text-[#333]">{data.certificateNumber}</p>
        </div>
        <div
          className="absolute left-0 right-0 px-[10%] text-center"
          style={{ top: `${data.dateTopPercent ?? 62}%` }}
        >
          <p className="text-sm text-[#444]">{data.courseTitle}</p>
          <p className="mt-1 text-xs text-[#666]">Issued {issuedDate}</p>
          {data.scorePercent != null ? (
            <p className="mt-0.5 text-xs text-[#666]">Final grade: {data.scorePercent}%</p>
          ) : null}
        </div>
      </div>

      <div className="break-before-page bg-white p-10 text-black">
        {data.transcriptTemplateImage ? (
          <div className="relative mb-6 h-24 w-full">
            <Image
              src={data.transcriptTemplateImage}
              alt=""
              fill
              unoptimized
              className="object-contain object-left"
            />
          </div>
        ) : null}
        <h1 className="text-2xl font-bold">Official Transcript</h1>
        <p className="mt-1 text-sm text-gray-700">{data.courseTitle}</p>
        <p className="text-sm text-gray-600">Learner: {data.learnerName}</p>
        <p className="text-sm text-gray-600">Certificate: {data.certificateNumber}</p>
        <p className="text-sm text-gray-600">Issue date: {issuedDate}</p>
        {data.courseDuration ? (
          <p className="text-sm text-gray-600">Program duration: {data.courseDuration}</p>
        ) : null}
        {data.scorePercent != null ? (
          <p className="mt-1 text-sm font-semibold text-gray-800">
            Combined assessment grade: {data.scorePercent}%
          </p>
        ) : null}

        <table className="mt-6 w-full border-collapse text-sm">
          <thead>
            <tr className="border-b-2 border-gray-800">
              <th className="py-2 text-left">Module</th>
              <th className="py-2 text-left">Title</th>
              <th className="py-2 text-left">Status</th>
              <th className="py-2 text-left">Score</th>
            </tr>
          </thead>
          <tbody>
            {data.transcriptRows.map((row) => (
              <tr key={row.moduleNumber} className="border-b border-gray-300">
                <td className="py-2 pr-4">{row.moduleNumber}</td>
                <td className="py-2 pr-4">{row.moduleTitle}</td>
                <td className="py-2 pr-4">{row.status}</td>
                <td className="py-2">
                  {row.score
                    ? `${row.score.correct}/${row.score.total} (${row.score.percent}%)`
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-8 text-xs text-gray-500">
          This transcript is issued together with the certificate of completion for {data.courseTitle}.
        </p>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `@media print{
            body * { visibility: hidden !important; }
            #${printRootId}, #${printRootId} * { visibility: visible !important; }
            #${printRootId} { position: absolute; left: 0; top: 0; width: 100%; }
            .break-before-page { page-break-before: always; }
          }`,
        }}
      />
    </div>
  );
}

export function triggerCombinedCredentialPrint(printRootId = "combined-credential-print") {
  const el = document.getElementById(printRootId);
  if (!el) return;
  el.classList.remove("hidden");
  window.print();
  window.setTimeout(() => el.classList.add("hidden"), 500);
}
