"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import type { TutorLedProgramStored } from "@/lib/default-tutor-led-programs";
import { TutorLedCertificatePreview } from "@/components/TutorLedCertificatePreview";
import { TutorLedCurriculumExplorer } from "@/components/TutorLedCurriculumExplorer";
import { CoursePlayerFeedbackSection } from "@/components/CoursePlayerFeedbackSection";
import { TUTOR_LED_CLASSROOM_IMAGE_SRC } from "@/lib/tutor-led-marketing-assets";
import {
  Award,
  BookOpen,
  ClipboardList,
  Download,
  ExternalLink,
  FileText,
  Hand,
  Headphones,
  HelpCircle,
  Link2,
  Lock,
  MessageCircle,
  MessageSquare,
  Play,
  Presentation,
  Star,
  Trophy,
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
};

const card = "rounded-2xl border border-white/10 bg-zinc-950/90 p-4 md:p-5";
const goldSolid =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-[#FFB800] px-4 py-2.5 text-sm font-bold text-black transition hover:bg-[#e5a500]";
const goldOutline =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-[#FFB800]/55 px-4 py-2.5 text-sm font-semibold text-[#FFB800] transition hover:bg-[#FFB800]/10";

const MOCK_FORUM = [
  { user: "Priya S.", title: "Clarification on hazard analysis steps", replies: 4 },
  { user: "James R.", title: "Best practices for temperature logs?", replies: 2 },
  { user: "Trainer", title: "Day 2 materials uploaded — check resources", replies: 8 },
];

const ACHIEVEMENTS = [
  { label: "First Class Completed", icon: Trophy },
  { label: "Quiz Master", icon: Star },
  { label: "Active Learner", icon: Award },
  { label: "Feedback Star", icon: MessageCircle },
];

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
}: Props) {
  const [forumTab, setForumTab] = useState<"recent" | "unanswered">("recent");
  const [copied, setCopied] = useState(false);

  const lastRecording = sessionRecordings[sessionRecordings.length - 1] ?? sessionRecordings[0];
  const thumb = program.learnerHeroSrc?.trim() || program.heroSrc?.trim() || TUTOR_LED_CLASSROOM_IMAGE_SRC;
  const continueTitle = program.curriculum[completedSessions]?.topic ?? nextSessionTitle;

  const resourceTiles = [
    { label: "PDF Notes", count: "12 Files", icon: FileText, tone: "from-rose-500/25 to-rose-950/40 border-rose-500/30 text-rose-300" },
    { label: "Presentation Slides", count: "13 Files", icon: Presentation, tone: "from-orange-500/25 to-orange-950/40 border-orange-500/30 text-orange-300" },
    { label: "Workbook", count: "8 Files", icon: BookOpen, tone: "from-amber-500/25 to-amber-950/40 border-amber-500/30 text-amber-300" },
    { label: "Podcast", count: "6 Episodes", icon: Headphones, tone: "from-emerald-500/25 to-emerald-950/40 border-emerald-500/30 text-emerald-300" },
    { label: "External Resources", count: "15 Links", icon: Link2, tone: "from-sky-500/25 to-sky-950/40 border-sky-500/30 text-sky-300" },
  ];

  const recordingCards =
    sessionRecordings.length > 0
      ? sessionRecordings
      : [
          {
            title: "Session 1: Introduction",
            duration: "2:14:00",
            thumb,
            playUrl: "",
            dateLabel: program.nextBatchDate,
          },
          {
            title: "Session 2: Core concepts",
            duration: "1:58:00",
            thumb,
            playUrl: "",
            dateLabel: "Coming soon",
          },
        ];

  return (
    <div className="mt-4 space-y-4 pb-24">
      {/* Live classroom + quick links */}
      <div className="grid gap-4 lg:grid-cols-[1.55fr_1fr]">
        <article id="zoom-live" className={`${card} relative scroll-mt-24 border-[#2D8CFF]/30`}>
          <span className="absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-full border border-red-500/40 bg-red-500/15 px-2.5 py-1 text-[10px] font-bold uppercase text-red-300">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-400" aria-hidden />
            Live now
          </span>
          <h2 className="text-lg font-bold text-white">Live Classroom</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-[1fr_1fr]">
            <div className="rounded-xl border border-[#2D8CFF]/25 bg-[#0a1628]/80 p-4">
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-[#2D8CFF] px-2 py-0.5 text-[10px] font-bold text-white">zoom</span>
                <span className="text-xs font-semibold text-sky-200">Live Zoom session</span>
              </div>
              {zoomJoinUrl ? (
                <a href={zoomJoinUrl} target="_blank" rel="noopener noreferrer" className={`${goldSolid} mt-4 w-full`}>
                  <Video className="h-4 w-4" aria-hidden />
                  Join now
                </a>
              ) : (
                <button type="button" disabled className="mt-4 w-full rounded-lg bg-zinc-800 py-2.5 text-sm font-bold text-zinc-500">
                  Join now
                </button>
              )}
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
                      className="flex flex-col items-center gap-1 rounded-lg border border-white/10 bg-black/30 px-2 py-2.5 text-[10px] text-zinc-400 hover:border-[#FFB800]/30"
                    >
                      <item.icon className="h-4 w-4 text-[#FFB800]" aria-hidden />
                      {copied && item.label === "Meeting link" ? "Copied!" : item.label}
                    </button>
                  ) : (
                    <Link
                      key={item.label}
                      href={item.href!}
                      className="flex flex-col items-center gap-1 rounded-lg border border-white/10 bg-black/30 px-2 py-2.5 text-[10px] text-zinc-400 hover:border-[#FFB800]/30"
                    >
                      <item.icon className="h-4 w-4 text-[#FFB800]" aria-hidden />
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
              <Link href="#live-curriculum" className={`${goldOutline} mt-4 w-full text-xs`}>
                View session agenda
              </Link>
            </div>
          </div>
        </article>

        <aside className={`${card} flex flex-col gap-2`}>
          <h2 className="text-lg font-bold text-white">Quick links</h2>
          {[
            { icon: Download, label: "Download notes", href: "#learning-materials" },
            { icon: ClipboardList, label: "View assignments", href: "/my-learning?tab=assignments" },
            { icon: FileText, label: "Take quiz", href: "#live-curriculum" },
            { icon: MessageCircle, label: "Join discussion", href: "/my-learning?tab=community" },
          ].map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-sm font-medium text-zinc-200 transition hover:border-[#FFB800]/35 hover:text-[#FFB800]"
            >
              <link.icon className="h-4 w-4 text-[#FFB800]" aria-hidden />
              {link.label}
            </Link>
          ))}
          <Link href="#certificate-center" className={`${goldOutline} mt-auto w-full`}>
            <Award className="h-4 w-4" aria-hidden />
            Download certificate guide
          </Link>
        </aside>
      </div>

      {/* Recordings + forum */}
      <div className="grid gap-4 lg:grid-cols-[1.55fr_1fr]">
        <article id="session-recordings" className={`${card} scroll-mt-24`}>
          <div className="mb-4 flex items-center justify-between gap-2">
            <h2 className="text-lg font-bold">Session recordings</h2>
            <Link href="#session-recordings" className="text-xs font-semibold text-[#FFB800] hover:underline">
              View all recordings
            </Link>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {recordingCards.map((rec, i) => {
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
                      <a href={rec.playUrl} target="_blank" rel="noopener noreferrer" className={`${goldOutline} mt-2 w-full text-xs py-2`}>
                        Watch now
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </article>

        <article className={card}>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold">Discussion forum</h2>
            <Link href="/my-learning?tab=community" className="text-xs text-[#FFB800] hover:underline">
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
                  forumTab === tab ? "bg-[#FFB800]/20 text-[#FFB800]" : "border border-white/10 text-zinc-400"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
          <ul className="space-y-2">
            {MOCK_FORUM.map((post) => (
              <li key={post.title} className="rounded-lg border border-white/10 bg-black/25 px-3 py-2.5">
                <p className="text-sm font-medium text-zinc-200">{post.title}</p>
                <p className="mt-0.5 text-[10px] text-zinc-500">
                  {post.user} · {post.replies} replies
                </p>
              </li>
            ))}
          </ul>
          <Link href="/my-learning?tab=community" className={`${goldSolid} mt-4 w-full`}>
            Ask a question
          </Link>
        </article>
      </div>

      {/* Learning resources */}
      <article id="learning-materials" className={`${card} scroll-mt-24`}>
        <h2 className="text-lg font-bold">Learning resources</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {resourceTiles.map((tile) => (
            <Link
              key={tile.label}
              href="#learning-materials"
              className={`flex flex-col items-center rounded-xl border bg-gradient-to-br p-4 text-center transition hover:brightness-110 ${tile.tone}`}
            >
              <tile.icon className="h-8 w-8" aria-hidden />
              <p className="mt-2 text-xs font-bold text-white">{tile.label}</p>
              <p className="mt-0.5 text-[10px] opacity-80">{tile.count}</p>
            </Link>
          ))}
        </div>
      </article>

      {/* Feedback + certificate */}
      <div className="grid gap-4 lg:grid-cols-[1.55fr_1fr]">
        <article className={card}>
          <h2 className="text-lg font-bold">Feedback &amp; reviews</h2>
          <div className="mt-4">
            <CoursePlayerFeedbackSection
              courseSlug={program.slug}
              courseTitle={program.title}
              activeModuleTitle={nextSessionTitle}
            />
          </div>
        </article>

        <article id="certificate-center" className={`${card} scroll-mt-24`}>
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-bold">Certificate center</h2>
            <span className="rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
              Eligible
            </span>
          </div>
          <div className="mt-4 flex justify-center">
            <TutorLedCertificatePreview
              programTitle={program.title}
              trainerName={program.trainer.name}
              layout="panel"
              hideTitle
            />
          </div>
          <div className="mt-4 grid gap-2">
            <Link href={`/my-learning/course/${program.slug}#credentials`} className={`${goldOutline} w-full text-xs`}>
              Preview certificate
            </Link>
            <Link href={`/my-learning/course/${program.slug}#credentials`} className={`${goldOutline} w-full text-xs`}>
              <Download className="h-3.5 w-3.5" aria-hidden />
              Download PDF
            </Link>
            <Link href="/certificates/verify" className={`${goldOutline} w-full text-xs`}>
              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              Verify certificate
            </Link>
          </div>
        </article>
      </div>

      {/* Continue learning + achievements */}
      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <article className={card}>
          <h2 className="text-lg font-bold">Continue learning</h2>
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
                  <div className="h-full rounded-full bg-[#FFB800]" style={{ width: `${progressPercent}%` }} />
                </div>
              </div>
              <Link href="#live-curriculum" className={`${goldOutline} mt-3 text-xs py-2`}>
                Continue watching
              </Link>
            </div>
          </div>
        </article>

        <article className={card}>
          <h2 className="text-lg font-bold">Achievements</h2>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {ACHIEVEMENTS.map((badge) => (
              <div
                key={badge.label}
                className="flex flex-col items-center rounded-xl border border-[#FFB800]/25 bg-[#FFB800]/10 px-2 py-3 text-center"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FFB800]/25 text-[#FFB800]">
                  <badge.icon className="h-5 w-5" aria-hidden />
                </span>
                <p className="mt-2 text-[9px] font-semibold leading-tight text-zinc-300">{badge.label}</p>
              </div>
            ))}
          </div>
        </article>
      </div>

      {/* Curriculum (agenda) */}
      <article id="live-curriculum" className={`${card} scroll-mt-24`}>
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
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-[#0a0a0a]/95 px-4 py-3 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1760px] flex-wrap items-center justify-center gap-2 md:justify-between">
          <div className="flex flex-wrap justify-center gap-2">
            {zoomJoinUrl ? (
              <a
                href={zoomJoinUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-500"
              >
                <Video className="h-3.5 w-3.5" aria-hidden />
                Join live session
              </a>
            ) : null}
            {lastRecording?.playUrl ? (
              <a
                href={lastRecording.playUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-[#FFB800] px-4 py-2 text-xs font-bold text-black"
              >
                <Play className="h-3.5 w-3.5" aria-hidden />
                Watch last recording
              </a>
            ) : (
              <Link href="#session-recordings" className="inline-flex items-center gap-2 rounded-lg bg-[#FFB800] px-4 py-2 text-xs font-bold text-black">
                <Play className="h-3.5 w-3.5" aria-hidden />
                Watch last recording
              </Link>
            )}
            <Link href="#learning-materials" className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-xs font-bold text-white hover:bg-sky-500">
              <Download className="h-3.5 w-3.5" aria-hidden />
              Download notes
            </Link>
            <Link
              href="/my-learning?tab=community"
              className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-xs font-bold text-white hover:bg-violet-500"
            >
              <HelpCircle className="h-3.5 w-3.5" aria-hidden />
              Ask trainer
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
