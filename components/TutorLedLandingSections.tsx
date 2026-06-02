"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  Award,
  BadgeCheck,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  MessageCircle,
  MonitorPlay,
  Send,
  Shield,
  Users,
  Video,
} from "lucide-react";
import { registerTutorLedFromTemplate } from "@/lib/push-checkout-or-login";
import { TutorLedCertificatePreview } from "@/components/TutorLedCertificatePreview";
import type { PostHeroCourse } from "@/components/TutorLedPostHeroSections";
import certificationBadge from "../badge - iso 45001 lv.png";

const shell = "mx-auto w-full max-w-[1760px] px-4 md:px-8 xl:px-10";
const sectionTitle = "text-xl font-bold text-white md:text-2xl";
const goldBtn =
  "inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#FFB800] px-6 py-3.5 text-sm font-bold text-black transition hover:bg-[#e5a600]";

export type TutorLedBatchRow = {
  batchId: string;
  startDate: string;
  sessionDays: string;
  timeIst: string;
  duration: string;
  mode: string;
};

type Props = {
  course: PostHeroCourse;
  certificate: { programTitle: string; trainerName: string };
  batch: TutorLedBatchRow;
  openFaq: number | null;
  setOpenFaq: (index: number | null) => void;
  checkoutSlug?: string;
  enrolledLearning?: boolean;
  classroomImageSrc?: string;
};

const includedItems: { icon: LucideIcon; title: string; desc: string }[] = [
  { icon: Video, title: "Live Sessions", desc: "12 interactive live classes on Zoom" },
  { icon: BookOpen, title: "Course Material", desc: "Comprehensive study materials & workbooks" },
  { icon: MonitorPlay, title: "Lifetime LMS Access", desc: "Access course content anytime, anywhere" },
  { icon: MonitorPlay, title: "Practice Labs", desc: "Hands-on labs and real-world assignments" },
  { icon: Award, title: "Certificate", desc: "IEB-accredited Certificate of Attainment with QR verification" },
  { icon: Video, title: "Session Recordings", desc: "Rewatch all live sessions anytime" },
];

const classroomFeatures = [
  "Live trainer-led sessions",
  "Real-time Q&A and interaction",
  "Practical demos and case studies",
  "Collaborate and learn together",
  "Doubt solving in live class",
];

const syllabusRows = [
  { module: 1, topic: "Introduction to Cybersecurity", keyLearning: "Security fundamentals, threats & attack vectors", duration: "2 Hours" },
  { module: 2, topic: "Network Security", keyLearning: "Firewalls, IDS/IPS, VPN, network monitoring", duration: "2 Hours" },
  { module: 3, topic: "Practical Tools", keyLearning: "Industry tools for scanning & enumeration", duration: "2 Hours" },
  { module: 4, topic: "Web Application Security", keyLearning: "OWASP Top 10, SQL injection, XSS", duration: "2 Hours" },
  { module: 5, topic: "Incident Response", keyLearning: "Detection, containment & recovery", duration: "2 Hours" },
];

const certificateBenefits = [
  "Personalized name, program title & unique certificate ID",
  "IEB-accredited · scan QR to verify online",
  "Signed by Program Director with issue date",
  "PDF download & LinkedIn-ready sharing",
] as const;

function CertificateBadgeImage({ className = "" }: { className?: string }) {
  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div className="relative aspect-square w-full max-w-[220px] sm:max-w-[240px] lg:max-w-[260px] xl:max-w-[300px]">
        <div
          className="pointer-events-none absolute -inset-4 rounded-full bg-[radial-gradient(circle,rgba(255,184,0,0.18)_0%,transparent_70%)]"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0 rounded-full border border-[#FFB800]/20 shadow-[inset_0_0_40px_rgba(255,184,0,0.06)]"
          aria-hidden
        />
        <Image
          src={certificationBadge}
          alt="ISO 45001 Lead Verifier professional certification badge"
          fill
          className="object-contain drop-shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
          sizes="(max-width: 1024px) 240px, 300px"
        />
      </div>
      <p className="mt-4 max-w-[200px] text-center text-[11px] leading-relaxed text-zinc-500">
        Industry credential · IEB &amp; Exemplar Global recognized
      </p>
    </div>
  );
}

/* DELETE_BLOCK
function __OLD_BADGE_DELETE() {
  const radius = 78;

  return (
    <div className="relative mx-auto hidden h-[200px] w-[200px] shrink-0 justify-self-center lg:block xl:h-[220px] xl:w-[220px]">
      <div
        className="pointer-events-none absolute inset-3 rounded-full border border-dashed border-[#FFB800]/25"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-10 rounded-full border border-white/5 bg-[#FFB800]/[0.03]"
        aria-hidden
      />
      <div className="absolute left-1/2 top-1/2 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border border-[#FFB800]/30 bg-[#FFB800]/10">
        <Award className="h-6 w-6 text-[#FFB800]" aria-hidden />
        <span className="mt-0.5 text-[8px] font-bold uppercase tracking-wider text-[#FFB800]">Verified</span>
      </div>
      {certificateTrustBadges.map((badge, i) => {
        const angle = (i * 90 - 90) * (Math.PI / 180);
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        const Icon = badge.icon;
        return (
          <div
            key={badge.label}
            className="absolute left-1/2 top-1/2 z-10"
            style={{ transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))` }}
          >
            <div
              className={`flex h-[72px] w-[72px] flex-col items-center justify-center rounded-full border-2 text-center shadow-lg backdrop-blur-sm xl:h-[76px] xl:w-[76px] ${badge.ring}`}
            >
              <Icon className={`h-5 w-5 ${badge.iconClass}`} aria-hidden />
              <span className="mt-1 text-[9px] font-bold leading-tight">{badge.label}</span>
              <span className="text-[8px] leading-tight opacity-80">{badge.sub}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CertificateBadgesMobile() {
  return (
    <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:hidden">
      {certificateTrustBadges.map((badge) => {
        const Icon = badge.icon;
        return (
          <div
            key={badge.label}
            className={`flex flex-col items-center justify-center rounded-full border-2 px-2 py-4 text-center ${badge.ring}`}
          >
            <Icon className={`h-5 w-5 ${badge.iconClass}`} aria-hidden />
            <span className="mt-1.5 text-[10px] font-bold leading-tight">{badge.label}</span>
            <span className="text-[9px] leading-tight opacity-80">{badge.sub}</span>
          </div>
        );
      })}
    </div>
  );
}
REMOVED_BADGE_END */

export default function TutorLedLandingSections({
  course,
  certificate,
  batch,
  openFaq,
  setOpenFaq,
  checkoutSlug,
  enrolledLearning = false,
  classroomImageSrc = "/h3.png",
}: Props) {
  const router = useRouter();
  const syllabus = course.curriculum.length > 0 ? course.curriculum.slice(0, 5) : null;
  const previewSyllabusRows =
    syllabus?.map((w) => ({
      module: w.week,
      topic: w.topic,
      keyLearning: w.keyLearning,
      duration: "Live Session",
    })) ?? syllabusRows;

  const enroll = () => {
    if (checkoutSlug && !enrolledLearning) registerTutorLedFromTemplate(router, checkoutSlug);
  };

  return (
    <>
      {/* Hero-follow section matching live-course mockup */}
      <section className="border-b border-white/10 bg-black">
        <div className={`${shell} py-7 md:py-8`}>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            <article className="overflow-hidden rounded-xl border border-white/10 bg-zinc-950/55">
              <div className="border-b border-white/10 px-4 py-3">
                <h3 className="text-base font-bold text-white">Live Training Schedule (Detailed Curriculum)</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[620px] text-left text-xs">
                  <thead>
                    <tr className="border-b border-white/10 bg-black/30 text-[10px] uppercase tracking-wide text-zinc-500">
                      <th className="px-3 py-2.5">Module</th>
                      <th className="px-3 py-2.5">Topic</th>
                      <th className="px-3 py-2.5">Key Learning</th>
                      <th className="px-3 py-2.5 text-right">Session Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewSyllabusRows.map((row) => (
                      <tr key={row.module} className="border-b border-white/5 last:border-0">
                        <td className="px-3 py-2.5 font-semibold text-[#FFB800]">Module {row.module}</td>
                        <td className="px-3 py-2.5 text-zinc-200">{row.topic}</td>
                        <td className="px-3 py-2.5 text-zinc-500">{row.keyLearning}</td>
                        <td className="px-3 py-2.5 text-right">
                          <span className="rounded-full border border-[#FFB800]/30 bg-[#FFB800]/10 px-2 py-0.5 text-[10px] font-semibold text-[#FFB800]">
                            {row.duration}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>

            <article className="overflow-hidden rounded-xl border border-white/10 bg-zinc-950/55">
              <div className="border-b border-white/10 px-4 py-3">
                <h3 className="text-base font-bold text-white">Inside Live Classrooms</h3>
              </div>
              <div className="p-3">
                <div className="overflow-hidden rounded-lg border border-white/10">
                  <Image
                    src={classroomImageSrc}
                    alt="Live classroom session"
                    width={640}
                    height={360}
                    className="h-auto w-full object-cover"
                  />
                </div>
                <div className="mt-3 space-y-2 text-[11px] text-zinc-400">
                  <p className="inline-flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-[#FFB800]" /> Group interaction and real-time Q&amp;A
                  </p>
                  <p className="inline-flex items-center gap-1.5">
                    <MessageCircle className="h-3.5 w-3.5 text-[#FFB800]" /> Mentor support during every live session
                  </p>
                </div>
                <div className="mt-3 flex items-center gap-2 rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-[11px] text-zinc-500">
                  <span className="min-w-0 flex-1 truncate">Type a message...</span>
                  <Send className="h-3.5 w-3.5 shrink-0 text-[#FFB800]" aria-hidden />
                </div>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* Combined lower layout: schedule + classroom + certificate + FAQ */}
      <section className="border-b border-white/10 bg-black">
        <div className={`${shell} py-8`}>
          <div className="mb-4 grid gap-4 lg:grid-cols-2">
            <article className="rounded-xl border border-white/10 bg-zinc-950/50 p-4">
              <h3 className="text-base font-bold text-white">Meet Your Trainer</h3>
              <div className="mt-3 flex gap-3">
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full border border-[#FFB800]/40 bg-zinc-900">
                  {course.trainer.avatar?.trim() ? (
                    <Image src={course.trainer.avatar} alt={course.trainer.name} fill className="object-cover" unoptimized />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-lg font-bold text-[#FFB800]">
                      {course.trainer.name.replace(/^Mr\.?\s*/i, "").charAt(0)}
                    </span>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white">{course.trainer.name}</p>
                  <p className="text-xs text-zinc-400">{course.trainer.role}</p>
                  <p className="mt-1 line-clamp-3 text-[11px] leading-relaxed text-zinc-500">{course.trainer.bio}</p>
                </div>
              </div>
              {course.trainer.workedWith.length > 0 ? (
                <div className="mt-3 border-t border-white/10 pt-2.5">
                  <p className="mb-1.5 text-[10px] uppercase tracking-wide text-zinc-500">Worked with</p>
                  <div className="flex flex-wrap gap-3 text-xs font-semibold text-zinc-400">
                    {course.trainer.workedWith.slice(0, 5).map((w) => (
                      <span key={w}>{w}</span>
                    ))}
                  </div>
                </div>
              ) : null}
            </article>

            <article className="rounded-xl border border-white/10 bg-zinc-950/50 p-4">
              <h3 className="text-base font-bold text-white">Live Training Highlights</h3>
              <div className="mt-3 grid grid-cols-[minmax(0,1fr)_96px] gap-3">
                <ul className="space-y-2">
                  {course.highlights.slice(0, 6).map((h) => (
                    <li key={h} className="flex items-start gap-2 text-xs text-zinc-300">
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#FFB800]" aria-hidden />
                      <span className="leading-snug">{h}</span>
                    </li>
                  ))}
                </ul>
                <div className="flex items-center justify-center rounded-lg border border-[#FFB800]/25 bg-[#FFB800]/5">
                  <Shield className="h-10 w-10 text-[#FFB800]" aria-hidden />
                </div>
              </div>
            </article>
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
            <div className="space-y-4">
              <article className="overflow-hidden rounded-xl border border-white/10 bg-zinc-950/50">
                <div className="border-b border-white/10 px-4 py-3">
                  <h2 className="text-base font-bold text-white">Live Training Schedule (Detailed Curriculum)</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[680px] text-left text-xs">
                    <thead>
                      <tr className="border-b border-white/10 bg-black/30 text-[10px] uppercase tracking-wide text-zinc-500">
                        <th className="px-3 py-2.5">Week</th>
                        <th className="px-3 py-2.5">Topic</th>
                        <th className="px-3 py-2.5">Key Learning</th>
                        <th className="px-3 py-2.5 text-right">Session Type</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewSyllabusRows.map((row) => (
                        <tr key={row.module} className="border-b border-white/5 last:border-0">
                          <td className="px-3 py-2.5 font-semibold text-[#FFB800]">Week {row.module}</td>
                          <td className="px-3 py-2.5 text-zinc-200">{row.topic}</td>
                          <td className="px-3 py-2.5 text-zinc-500">{row.keyLearning}</td>
                          <td className="px-3 py-2.5 text-right">
                            <span className="rounded-full border border-[#FFB800]/30 bg-[#FFB800]/10 px-2 py-0.5 text-[10px] font-semibold text-[#FFB800]">
                              {row.duration}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </article>

              <article className="rounded-xl border border-white/10 bg-zinc-950/50 p-4">
                <h3 className="text-base font-bold text-white">Why Choose Tutor Led Training?</h3>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
                  {course.whyChoose.slice(0, 5).map((item) => (
                    <div key={item.title} className="rounded-lg border border-white/10 bg-black/30 px-2 py-3 text-center">
                      <div className="mx-auto mb-2 grid h-8 w-8 place-items-center rounded-md border border-[#FFB800]/25 bg-[#FFB800]/10">
                        <item.icon className="h-4 w-4 text-[#FFB800]" aria-hidden />
                      </div>
                      <p className="text-[11px] font-semibold text-white">{item.title}</p>
                    </div>
                  ))}
                </div>
              </article>

              <article className="rounded-xl border border-white/10 bg-zinc-950/50 p-4">
                <h3 className="mb-3 text-base font-bold text-white">Frequently Asked Questions</h3>
                <div className="divide-y divide-zinc-800 rounded-xl border border-zinc-800 bg-black/25">
                  {course.faqs.map((faq, i) => (
                    <div key={faq.q}>
                      <button
                        type="button"
                        onClick={() => setOpenFaq(openFaq === i ? null : i)}
                        className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left text-xs text-zinc-200"
                      >
                        <span>{faq.q}</span>
                        <ChevronDown
                          size={16}
                          className={`shrink-0 text-zinc-500 transition-transform ${openFaq === i ? "rotate-180" : ""}`}
                        />
                      </button>
                      {openFaq === i ? (
                        <div className="border-t border-zinc-800 px-4 pb-3 text-xs leading-relaxed text-zinc-400">{faq.a}</div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </article>
            </div>

            <div className="space-y-4">
              <article className="overflow-hidden rounded-xl border border-white/10 bg-zinc-950/50">
                <div className="border-b border-white/10 px-4 py-3">
                  <h3 className="text-base font-bold text-white">Inside Live Classrooms</h3>
                </div>
                <div className="p-3">
                  <div className="overflow-hidden rounded-lg border border-white/10">
                    <Image
                      src={classroomImageSrc}
                      alt="Live classroom session"
                      width={640}
                      height={360}
                      className="h-auto w-full object-cover"
                    />
                  </div>
                  <div className="mt-3 space-y-2 text-[11px] text-zinc-400">
                    {classroomFeatures.slice(0, 3).map((text) => (
                      <p key={text} className="inline-flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5 text-[#FFB800]" aria-hidden />
                        {text}
                      </p>
                    ))}
                  </div>
                  <div className="mt-3 flex items-center gap-2 rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-[11px] text-zinc-500">
                    <span className="min-w-0 flex-1 truncate">Type a message...</span>
                    <Send className="h-3.5 w-3.5 shrink-0 text-[#FFB800]" aria-hidden />
                  </div>
                </div>
              </article>

              <article className="rounded-xl border border-white/10 bg-zinc-950/50 p-4">
                <h3 className="text-base font-bold text-white">Certificate of Completion</h3>
                <p className="mt-1 text-xs text-zinc-500">Earn an industry-recognized certificate after course success.</p>
                <ul className="mt-3 space-y-2 text-[11px] text-zinc-300">
                  {certificateBenefits.slice(0, 4).map((item) => (
                    <li key={item} className="inline-flex items-start gap-2">
                      <BadgeCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" aria-hidden />
                      {item}
                    </li>
                  ))}
                </ul>
                <div className="mt-3 overflow-hidden rounded-lg border border-[#FFB800]/35 bg-black/30 p-2">
                  <TutorLedCertificatePreview
                    programTitle={certificate.programTitle}
                    trainerName={certificate.trainerName}
                    layout="full"
                    hideTitle
                  />
                </div>
              </article>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom CTA bar */}
      <section className="bg-black">
        <div className={`${shell} py-4`}>
          <div className="flex flex-col items-center justify-between gap-3 rounded-xl border border-[#FFB800]/40 bg-zinc-950/70 px-4 py-3 sm:flex-row">
            <div className="text-center sm:text-left">
              <h3 className="text-base font-bold text-white">Secure Your Spot in the Next Batch!</h3>
              <p className="text-xs text-zinc-500">Limited seats available for personalized learning experience.</p>
            </div>
            {!enrolledLearning && checkoutSlug ? (
              <button type="button" onClick={enroll} className="inline-flex min-w-[220px] items-center justify-center gap-2 rounded-lg bg-[#FFB800] px-5 py-2.5 text-sm font-bold text-black transition hover:bg-[#e5a600]">
                Reserve Your Seat Now
                <ChevronRight className="h-4 w-4" aria-hidden />
              </button>
            ) : (
              <Link href="/my-learning?tab=live" className="inline-flex min-w-[220px] items-center justify-center gap-2 rounded-lg bg-[#FFB800] px-5 py-2.5 text-sm font-bold text-black transition hover:bg-[#e5a600]">
                Open My Learning
                <ChevronRight className="h-4 w-4" aria-hidden />
              </Link>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
