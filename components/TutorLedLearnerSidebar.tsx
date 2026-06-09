"use client";

import { useMemo } from "react";
import Link from "next/link";
import type { TutorLedProgramStored } from "@/lib/default-tutor-led-programs";
import { TutorLedCertificatePreview } from "@/components/TutorLedCertificatePreview";
import { buildLinkedInShareUrl } from "@/lib/certificate-verify-url";
import {
  tlCard,
  tlCardGold,
  tlGoldBadge,
  tlGoldOutline,
  tlGoldSolid,
  tlGreenBadge,
} from "@/lib/tutor-led-learner-theme";
import { resolveLearnerSection } from "@/lib/tutor-led-learner-section";
import {
  Calendar,
  CalendarPlus,
  Clock,
  Download,
  ExternalLink,
  Trophy,
  User,
  Video,
} from "lucide-react";

type Props = {
  program: TutorLedProgramStored;
  nextSessionTitle: string;
  zoomJoinUrl: string | null;
  certificateEarned: boolean;
};

export function TutorLedLearnerSidebar({
  program,
  nextSessionTitle,
  zoomJoinUrl,
  certificateEarned,
}: Props) {
  const section = useMemo(() => resolveLearnerSection(program), [program]);
  const verifyUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/certificates/verify?number=SFT-${program.slug.toUpperCase().slice(0, 8)}`
      : "/certificates/verify";

  return (
    <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
      <article className={`${tlCardGold} tl-gold-glow`}>
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-lg font-bold text-white">{section.upcomingSessionTitle}</h2>
          <span className={tlGoldBadge}>{section.upcomingSessionBadge}</span>
        </div>
        <p className="mt-3 text-base font-semibold leading-snug text-white">{nextSessionTitle}</p>
        <ul className="mt-4 space-y-2.5 text-sm text-zinc-400">
          <li className="flex items-start gap-2">
            <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-[#FFC107]/70" aria-hidden />
            <span>{program.nextBatchDate}</span>
          </li>
          <li className="flex items-start gap-2">
            <Clock className="mt-0.5 h-4 w-4 shrink-0 text-[#FFC107]/70" aria-hidden />
            <span>{program.schedule}</span>
          </li>
          <li className="flex items-start gap-2">
            <User className="mt-0.5 h-4 w-4 shrink-0 text-[#FFC107]/70" aria-hidden />
            <span>{program.trainer.name}</span>
          </li>
        </ul>
        <div className="mt-5 space-y-2">
          {zoomJoinUrl ? (
            <a href={zoomJoinUrl} target="_blank" rel="noopener noreferrer" className={`${tlGoldSolid} w-full`}>
              <Video className="h-4 w-4" aria-hidden />
              Join Zoom Session
            </a>
          ) : (
            <button type="button" disabled className="w-full cursor-not-allowed rounded-lg bg-zinc-800 py-2.5 text-sm font-bold text-zinc-500">
              Join Zoom Session
            </button>
          )}
          <Link href="/my-learning/calendar" className={`${tlGoldOutline} w-full`}>
            <CalendarPlus className="h-4 w-4" aria-hidden />
            Add to Calendar
          </Link>
        </div>
      </article>

      <article id="certificate-center" className={`${tlCard} scroll-mt-24 border-[#FFC107]/22 tl-gold-glow`}>
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-bold text-white">{section.certificateCenterTitle}</h2>
          <span className={certificateEarned ? tlGreenBadge : tlGoldBadge}>
            {certificateEarned ? "Earned" : "Eligible"}
          </span>
        </div>
        <p className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-[#FFC107]">
          <Trophy className="h-4 w-4" aria-hidden />
          {certificateEarned ? "Certificate earned" : "Certificate on completion"}
        </p>
        <div className="mt-4 flex justify-center rounded-lg border border-[#FFC107]/20 bg-black/50 p-2">
          <TutorLedCertificatePreview
            programTitle={program.title}
            trainerName={program.trainer.name}
            layout="panel"
            hideTitle
          />
        </div>
        <dl className="mt-3 space-y-1.5 text-[10px] text-zinc-500">
          <div className="flex justify-between gap-2 border-b border-white/5 pb-1">
            <dt>Certificate ID</dt>
            <dd className="font-mono text-[#FFC107]/90">SFT-{program.slug.slice(0, 8).toUpperCase()}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt>Issue date</dt>
            <dd className="text-zinc-400">{program.nextBatchDate}</dd>
          </div>
        </dl>
        <div className="mt-4 grid gap-2">
          <Link href={`/my-learning/course/${program.slug}#credentials`} className={`${tlGoldOutline} text-xs`}>
            <Download className="h-3.5 w-3.5" aria-hidden />
            Download PDF
          </Link>
          <Link href="/certificates/verify" className={`${tlGoldOutline} text-xs`}>
            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            Verify certificate
          </Link>
          <a
            href={buildLinkedInShareUrl(verifyUrl)}
            target="_blank"
            rel="noopener noreferrer"
            className={`${tlGoldSolid} w-full text-xs`}
          >
            Share on LinkedIn
          </a>
        </div>
      </article>
    </aside>
  );
}
