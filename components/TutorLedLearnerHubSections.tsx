"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { TutorLedProgramStored } from "@/lib/default-tutor-led-programs";
import { TutorLedCurriculumExplorer } from "@/components/TutorLedCurriculumExplorer";
import { CoursePlayerFeedbackSection } from "@/components/CoursePlayerFeedbackSection";
import { TutorLedLearningToolsPanel } from "@/components/TutorLedLearningToolsPanel";
import { TUTOR_LED_CLASSROOM_IMAGE_SRC } from "@/lib/tutor-led-marketing-assets";
import {
  tlCard,
  tlCardGold,
  tlGoldOutline,
  tlGoldSolid,
  tlGreenBadge,
} from "@/lib/tutor-led-learner-theme";
import {
  resolveLearnerSection,
  type TutorLedLearnerResourceTileType,
} from "@/lib/tutor-led-learner-section";
import { tutorLedIcon } from "@/lib/tutor-led-program-map";
import {
  Award,
  BookOpen,
  CheckCircle2,
  Download,
  FileText,
  Hand,
  Headphones,
  HelpCircle,
  Link2,
  Lock,
  MessageSquare,
  Play,
  Presentation,
  Star,
  Users,
  Video,
} from "lucide-react";

export type SessionRecordingItem = {
  title: string;
  duration: string;
  thumb: string;
  playUrl: string;
  dateLabel?: string;
};

type Props = {
  program: TutorLedProgramStored;
  nextSessionTitle: string;
  zoomJoinUrl: string | null;
  progressPercent: number;
  sessionRecordings: SessionRecordingItem[];
  weekProgress: { done: number; total: number; label: string | null }[];
  completedSessions: number;
  examUnlocked: boolean;
};

const RESOURCE_TILE_STYLES: Record<
  TutorLedLearnerResourceTileType,
  { bg: string; border: string; iconColor: string; icon: typeof FileText }
> = {
  pdf: { bg: "bg-red-500/20", border: "border-red-500/40", iconColor: "text-red-400", icon: FileText },
  slides: {
    bg: "bg-orange-500/20",
    border: "border-orange-500/40",
    iconColor: "text-orange-400",
    icon: Presentation,
  },
  workbook: { bg: "bg-[#FFC107]/20", border: "border-[#FFC107]/40", iconColor: "text-[#FFC107]", icon: BookOpen },
  podcast: { bg: "bg-[#4CAF50]/20", border: "border-[#4CAF50]/40", iconColor: "text-[#66BB6A]", icon: Headphones },
  links: { bg: "bg-sky-500/20", border: "border-sky-500/40", iconColor: "text-sky-400", icon: Link2 },
};

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    /* ignore */
  }
}

export function TutorLedLearnerHubSections({
  program,
  nextSessionTitle,
  zoomJoinUrl,
  progressPercent,
  sessionRecordings,
  weekProgress,
  completedSessions,
  examUnlocked,
}: Props) {
  const [forumTab, setForumTab] = useState<"recent" | "unanswered">("recent");
  const [copied, setCopied] = useState(false);
  const section = useMemo(() => resolveLearnerSection(program), [program]);

  const lastRecording = sessionRecordings[sessionRecordings.length - 1] ?? sessionRecordings[0];
  const thumb = program.learnerHeroSrc?.trim() || program.heroSrc?.trim() || TUTOR_LED_CLASSROOM_IMAGE_SRC;
  const continueTitle = program.curriculum[completedSessions]?.topic ?? nextSessionTitle;

  const resourceTiles = section.resourceTiles.map((tile) => {
    const style = RESOURCE_TILE_STYLES[tile.type];
    return { ...tile, ...style };
  });

  const materials = program.learningMaterials ?? [];
  const materialsByKind = {
    pdf: materials.filter((m) => m.kind === "pad-notes"),
    slides: materials.filter((m) => m.kind === "ppt"),
    workbook: materials.filter((m) => m.kind === "webbook"),
  };

  return (
    <div className="mt-4 space-y-4 pb-24">
      {/* Live classroom + quick links */}
      <div className="grid gap-4 lg:grid-cols-[1.55fr_1fr]">
        <article id="zoom-live" className={`${tlCard} relative scroll-mt-24 border-[#2D8CFF]/25`}>
          {section.showLiveNowBadge ? (
            <span className="absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-full border border-red-500/50 bg-red-500/20 px-2.5 py-1 text-[10px] font-bold uppercase text-red-300 shadow-[0_0_12px_rgba(239,68,68,0.3)]">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-400" aria-hidden />
              Live now
            </span>
          ) : null}
          <h2 className="text-lg font-bold text-white">{section.liveClassroomTitle}</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-[1fr_1fr]">
            <div className="rounded-xl border border-[#2D8CFF]/30 bg-[#0a1628]/90 p-4">
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-[#2D8CFF] px-2 py-0.5 text-[10px] font-bold text-white shadow-[0_0_10px_rgba(45,140,255,0.4)]">zoom</span>
                <span className="text-xs font-semibold text-sky-200">Live Zoom session</span>
              </div>
              {zoomJoinUrl ? (
                <a href={zoomJoinUrl} target="_blank" rel="noopener noreferrer" className={`${tlGoldSolid} mt-4 w-full`}>
                  <Video className="h-4 w-4" aria-hidden />
                  Join now
                </a>
              ) : (
                <div className="mt-4 rounded-lg border border-dashed border-amber-500/30 bg-amber-500/10 px-3 py-3 text-center">
                  <p className="text-xs font-semibold text-amber-100">Zoom link not set yet</p>
                  <p className="mt-1 text-[10px] text-zinc-400">
                    Your trainer will publish the join link for this batch in Admin → Tutor Led / Batches.
                  </p>
                </div>
              )}
              {(program.zoomMeetingId?.trim() || program.zoomPasscode?.trim()) && zoomJoinUrl ? (
                <dl className="mt-3 space-y-1 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-[11px]">
                  {program.zoomMeetingId?.trim() ? (
                    <div className="flex justify-between gap-2">
                      <dt className="text-zinc-500">Meeting ID</dt>
                      <dd className="font-mono font-semibold text-sky-200">{program.zoomMeetingId}</dd>
                    </div>
                  ) : null}
                  {program.zoomPasscode?.trim() ? (
                    <div className="flex justify-between gap-2">
                      <dt className="text-zinc-500">Passcode</dt>
                      <dd className="font-mono font-semibold text-sky-200">{program.zoomPasscode}</dd>
                    </div>
                  ) : null}
                </dl>
              ) : null}
              <div className="mt-4 grid grid-cols-2 gap-2">
                {[
                  { icon: Link2, label: "Meeting link", action: () => zoomJoinUrl && void copyText(zoomJoinUrl).then(() => setCopied(true)) },
                  { icon: MessageSquare, label: "Chat", href: zoomJoinUrl ?? "#zoom-live" },
                  { icon: Hand, label: "Raise hand", href: zoomJoinUrl ?? "#zoom-live" },
                  { icon: HelpCircle, label: "Q&A", href: "/my-learning?tab=community" },
                ].map((item) =>
                  item.action ? (
                    <button
                      key={item.label}
                      type="button"
                      onClick={item.action}
                      className="flex flex-col items-center gap-1 rounded-lg border border-white/10 bg-black/30 px-2 py-2.5 text-[10px] text-zinc-400 hover:border-[#FFC107]/30"
                    >
                      <item.icon className="h-4 w-4 text-[#FFC107]" aria-hidden />
                      {copied && item.label === "Meeting link" ? "Copied!" : item.label}
                    </button>
                  ) : (
                    <Link
                      key={item.label}
                      href={item.href!}
                      className="flex flex-col items-center gap-1 rounded-lg border border-white/10 bg-black/30 px-2 py-2.5 text-[10px] text-zinc-400 hover:border-[#FFC107]/30"
                    >
                      <item.icon className="h-4 w-4 text-[#FFC107]" aria-hidden />
                      {item.label}
                    </Link>
                  ),
                )}
              </div>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/30 p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">Session details</p>
              <dl className="mt-3 space-y-2 text-sm">
                <div>
                  <dt className="text-zinc-500">Topic</dt>
                  <dd className="font-medium text-white">{nextSessionTitle}</dd>
                </div>
                <div>
                  <dt className="text-zinc-500">Time</dt>
                  <dd className="text-zinc-300">{program.schedule}</dd>
                </div>
                <div>
                  <dt className="text-zinc-500">Trainer</dt>
                  <dd className="text-zinc-300">{program.trainer.name}</dd>
                </div>
                <div>
                  <dt className="text-zinc-500">Participants</dt>
                  <dd className="inline-flex items-center gap-1 text-zinc-300">
                    <Users className="h-3.5 w-3.5" aria-hidden />
                    Cohort enrolled
                  </dd>
                </div>
              </dl>
              <Link href="#live-curriculum" className={`${tlGoldOutline} mt-4 w-full text-xs`}>
                View session agenda
              </Link>
            </div>
          </div>
        </article>

        <aside className={`${tlCard} flex flex-col gap-2`}>
          <h2 className="text-lg font-bold text-white">{section.quickLinksTitle}</h2>
          {section.quickLinks.map((link) => {
            const LinkIcon = tutorLedIcon(link.icon);
            return (
              <Link
                key={link.label + link.href}
                href={link.href}
                className="flex items-center gap-3 rounded-xl border border-[#FFC107]/12 bg-black/40 px-4 py-3 text-sm font-medium text-zinc-200 transition hover:border-[#FFC107]/35 hover:bg-[#FFC107]/5 hover:text-[#FFC107]"
              >
                <LinkIcon className="h-4 w-4 text-[#FFC107]" aria-hidden />
                {link.label}
              </Link>
            );
          })}
          <Link href="#certificate-center" className={`${tlGoldOutline} mt-auto w-full`}>
            <Award className="h-4 w-4" aria-hidden />
            Download certificate guide
          </Link>
        </aside>
      </div>

      {/* Recordings + forum */}
      <div className="grid gap-4 lg:grid-cols-[1.55fr_1fr]">
        <article id="session-recordings" className={`${tlCard} scroll-mt-24`}>
          <div className="mb-4 flex items-center justify-between gap-2">
            <h2 className="text-lg font-bold">{section.recordingsTitle}</h2>
            {sessionRecordings.length > 0 ? (
              <Link href="#session-recordings" className="text-xs font-semibold text-[#FFC107] hover:underline">
                View all recordings
              </Link>
            ) : null}
          </div>
          {sessionRecordings.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/15 bg-black/20 px-4 py-8 text-center">
              <Video className="mx-auto h-8 w-8 text-zinc-600" aria-hidden />
              <p className="mt-3 text-sm font-semibold text-zinc-300">No recordings yet</p>
              <p className="mt-1 text-xs text-zinc-500">
                Cloud recordings appear here after your Zoom sessions are synced by the trainer.
              </p>
            </div>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-1">
              {sessionRecordings.map((rec, i) => {
                const locked = !rec.playUrl?.trim();
                return (
                  <div
                    key={rec.title + String(i)}
                    className={`w-[200px] shrink-0 overflow-hidden rounded-xl border bg-black/25 ${
                      locked ? "border-white/10 opacity-70" : "border-white/10"
                    }`}
                  >
                    <div className="relative aspect-video bg-black">
                      <Image src={rec.thumb} alt="" fill className="object-cover opacity-80" unoptimized sizes="200px" />
                      <span className="absolute inset-0 flex items-center justify-center bg-black/35">
                        {locked ? (
                          <Lock className="h-8 w-8 text-zinc-500" aria-hidden />
                        ) : (
                          <Play className="h-8 w-8 fill-white/90 text-white/90" aria-hidden />
                        )}
                      </span>
                    </div>
                    <div className="p-3">
                      <p className="line-clamp-2 text-xs font-semibold text-white">{rec.title}</p>
                      <p className="mt-1 text-[10px] text-zinc-500">
                        {rec.dateLabel ?? program.nextBatchDate}
                        {rec.duration ? ` · ${rec.duration}` : ""}
                      </p>
                      {locked ? (
                        <span className="mt-2 inline-block text-[10px] font-semibold text-zinc-500">Coming soon</span>
                      ) : (
                        <a href={rec.playUrl} target="_blank" rel="noopener noreferrer" className={`${tlGoldOutline} mt-2 w-full text-xs py-2`}>
                          Watch now
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </article>

        <article className={tlCard}>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold">{section.forumTitle}</h2>
            <Link href="/my-learning?tab=community" className="text-xs text-[#FFC107] hover:underline">
              View all
            </Link>
          </div>
          <div className="mb-3 flex gap-2">
            {(["recent", "unanswered"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setForumTab(tab)}
                className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${
                  forumTab === tab ? "bg-[#FFC107]/20 text-[#FFC107]" : "border border-white/10 text-zinc-400"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
          <ul className="space-y-2">
            {section.forumPosts.map((post) => (
              <li key={post.title} className="rounded-lg border border-white/10 bg-black/25 px-3 py-2.5">
                <p className="text-sm font-medium text-zinc-200">{post.title}</p>
                <p className="mt-0.5 text-[10px] text-zinc-500">
                  {post.user} · {post.replies} replies
                </p>
              </li>
            ))}
          </ul>
          <Link href="/my-learning?tab=community" className={`${tlGoldSolid} mt-4 w-full`}>
            Ask a question
          </Link>
        </article>
      </div>

      {/* Learning resources */}
      <article id="learning-materials" className={`${tlCard} scroll-mt-24`}>
        <h2 className="text-lg font-bold">{section.resourcesTitle}</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {resourceTiles.map((tile) => {
            const kindFiles =
              tile.type === "pdf"
                ? materialsByKind.pdf
                : tile.type === "slides"
                  ? materialsByKind.slides
                  : tile.type === "workbook"
                    ? materialsByKind.workbook
                    : [];
            const firstUrl = kindFiles.find((m) => m.downloadUrl?.trim())?.downloadUrl?.trim();
            const countLabel =
              kindFiles.length > 0 ? `${kindFiles.length} file${kindFiles.length === 1 ? "" : "s"}` : tile.count;
            const className = `flex flex-col items-center rounded-xl border p-4 text-center transition hover:brightness-110 ${tile.bg} ${tile.border}`;
            if (firstUrl) {
              return (
                <a
                  key={tile.label}
                  href={firstUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                  className={className}
                >
                  <tile.icon className={`h-8 w-8 ${tile.iconColor}`} aria-hidden />
                  <p className="mt-2 text-xs font-bold text-white">{tile.label}</p>
                  <p className="mt-0.5 text-[10px] opacity-80">{countLabel}</p>
                </a>
              );
            }
            return (
              <div key={tile.label} className={`${className} opacity-80`}>
                <tile.icon className={`h-8 w-8 ${tile.iconColor}`} aria-hidden />
                <p className="mt-2 text-xs font-bold text-white">{tile.label}</p>
                <p className="mt-0.5 text-[10px] opacity-80">{countLabel}</p>
              </div>
            );
          })}
        </div>
        <div className="mt-4">
          <TutorLedLearningToolsPanel programSlug={program.slug} materials={materials} tone="neutral" />
        </div>
      </article>

      {/* Final certification assessment */}
      <article id="final-exam" className={`${tlCardGold} scroll-mt-24 tl-gold-glow`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-white">{section.finalExamTitle}</h2>
            <p className="mt-1 text-sm text-zinc-400">{section.finalExamDescription}</p>
          </div>
          {examUnlocked ? (
            <span className={tlGreenBadge}>
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
              Exam unlocked
            </span>
          ) : (
            <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[10px] font-semibold text-zinc-400">
              Locked until sessions complete
            </span>
          )}
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {[
            [String(section.examQuestions), "Questions"],
            [String(section.examMinutes), "Minutes"],
            [`${section.examPassingScore}%`, "Passing score"],
          ].map(([value, label]) => (
            <div key={label} className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-center">
              <p className="text-2xl font-bold text-[#FFC107]">{value}</p>
              <p className="text-xs text-zinc-500">{label}</p>
            </div>
          ))}
        </div>
        {examUnlocked ? (
          <Link
            href={`/my-learning/course/${program.slug}/exam?module=final`}
            className={`${tlGoldSolid} mt-4`}
          >
            {section.startExamLabel}
          </Link>
        ) : (
          <p className="mt-4 rounded-lg border border-dashed border-white/15 px-4 py-3 text-center text-sm text-zinc-500">
            {section.examLockedHint}
          </p>
        )}
      </article>

      {/* Feedback & reviews */}
      <article className={tlCard}>
        <h2 className="text-lg font-bold">{section.feedbackTitle}</h2>
        <div className="mt-4 rounded-xl border border-white/10 bg-black/25 p-4">
          <p className="text-sm font-semibold text-zinc-200">Today&apos;s session feedback</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {["Trainer knowledge", "Session quality", "Content relevance"].map((label) => (
              <div key={label} className="rounded-lg border border-white/10 bg-black/30 p-2 text-center">
                <p className="text-[10px] text-zinc-500">{label}</p>
                <div className="mt-1 flex justify-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className="h-3.5 w-3.5 fill-[#FFC107] text-[#FFC107]" aria-hidden />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-4 rounded-xl border border-white/10 bg-black/25 p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-zinc-200">Student reviews</p>
            <p className="text-sm font-bold text-[#FFC107]">
              {section.reviewRating}{" "}
              <span className="font-normal text-zinc-500">({section.reviewCount} reviews)</span>
            </p>
          </div>
          <ul className="mt-3 space-y-1.5">
            {[
              [5, 89],
              [4, 8],
              [3, 2],
              [2, 1],
              [1, 0],
            ].map(([stars, pct]) => (
              <li key={stars} className="flex items-center gap-2 text-[10px] text-zinc-500">
                <span className="w-8">{stars} ★</span>
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-800">
                  <span className="block h-full rounded-full bg-[#FFC107]" style={{ width: `${pct}%` }} />
                </span>
                <span className="w-8 text-right">{pct}%</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="mt-4">
          <CoursePlayerFeedbackSection
            courseSlug={program.slug}
            courseTitle={program.title}
            activeModuleTitle={nextSessionTitle}
          />
        </div>
      </article>

      {/* Continue learning + achievements */}
      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <article className={tlCard}>
          <h2 className="text-lg font-bold">{section.continueLearningTitle}</h2>
          <div className="mt-3 flex gap-3">
            <div className="relative h-20 w-28 shrink-0 overflow-hidden rounded-lg border border-white/10">
              <Image src={thumb} alt="" fill className="object-cover" unoptimized sizes="112px" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-white">{continueTitle}</p>
              <div className="mt-2">
                <div className="flex justify-between text-[10px] text-zinc-500">
                  <span>Progress</span>
                  <span>{progressPercent}%</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-zinc-800">
                  <div className="h-full rounded-full bg-[#FFC107]" style={{ width: `${progressPercent}%` }} />
                </div>
              </div>
              <Link href="#live-curriculum" className={`${tlGoldOutline} mt-3 text-xs py-2`}>
                Continue watching
              </Link>
            </div>
          </div>
        </article>

        <article className={tlCard}>
          <h2 className="text-lg font-bold">{section.achievementsTitle}</h2>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {section.achievements.map((badge) => {
              const BadgeIcon = tutorLedIcon(badge.icon);
              return (
                <div
                  key={badge.label}
                  className="tl-achievement-badge flex flex-col items-center rounded-xl border border-[#FFC107]/30 px-2 py-3 text-center"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-full border border-[#FFC107]/40 text-[#FFC107]">
                    <BadgeIcon className="h-5 w-5" aria-hidden />
                  </span>
                  <p className="mt-2 text-[9px] font-semibold leading-tight text-zinc-300">{badge.label}</p>
                </div>
              );
            })}
          </div>
        </article>
      </div>

      {/* Curriculum (agenda) */}
      <article id="live-curriculum" className={`${tlCard} scroll-mt-24`}>
        <TutorLedCurriculumExplorer
          program={program}
          variant="learner"
          weekProgress={weekProgress}
          liveJoinAnchor="#zoom-live"
          liveJoinUrl={zoomJoinUrl}
          embedded
        />
      </article>

      {/* Sticky bottom action bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-[#FFC107]/20 bg-black/92 px-4 py-3 shadow-[0_-8px_32px_rgba(0,0,0,0.6)] backdrop-blur-md">
        <div className="mx-auto flex max-w-[1760px] flex-wrap items-center justify-center gap-3 md:justify-between">
          <div className="flex flex-wrap justify-center gap-2">
            {zoomJoinUrl ? (
              <a
                href={zoomJoinUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-[#4CAF50] px-4 py-2.5 text-xs font-bold text-white shadow-[0_0_16px_rgba(76,175,80,0.35)] hover:bg-[#66BB6A]"
              >
                <Video className="h-4 w-4" aria-hidden />
                {section.footerJoinLabel}
              </a>
            ) : null}
            {lastRecording?.playUrl ? (
              <a
                href={lastRecording.playUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-[#FFC107] px-4 py-2.5 text-xs font-bold text-black shadow-[0_0_16px_rgba(255,193,7,0.35)] hover:bg-[#FFD54F]"
              >
                <Play className="h-4 w-4" aria-hidden />
                {section.footerRecordingLabel}
              </a>
            ) : (
              <Link href="#session-recordings" className="inline-flex items-center gap-2 rounded-lg bg-[#FFC107] px-4 py-2.5 text-xs font-bold text-black shadow-[0_0_16px_rgba(255,193,7,0.35)]">
                <Play className="h-4 w-4" aria-hidden />
                {section.footerRecordingLabel}
              </Link>
            )}
            <Link href="#learning-materials" className="inline-flex items-center gap-2 rounded-lg bg-[#2196F3] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#42A5F5]">
              <Download className="h-4 w-4" aria-hidden />
              {section.footerNotesLabel}
            </Link>
            <Link
              href="/my-learning?tab=community"
              className="inline-flex items-center gap-2 rounded-lg bg-[#7C4DFF] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#9575FF]"
            >
              <HelpCircle className="h-4 w-4" aria-hidden />
              {section.footerTrainerLabel}
            </Link>
          </div>
          <p className="hidden text-[10px] text-zinc-600 md:block">
            <Link href="/privacy" className="hover:text-zinc-400">
              Privacy policy
            </Link>
            {" · "}
            <Link href="/terms" className="hover:text-zinc-400">
              Terms &amp; conditions
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
