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
  MonitorPlay,
  Send,
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

  const enroll = () => {
    if (checkoutSlug && !enrolledLearning) registerTutorLedFromTemplate(router, checkoutSlug);
  };

  return (
    <>
      {/* Everything included */}
      <section className="border-b border-white/10 bg-zinc-950">
        <div className={`${shell} py-12 md:py-14`}>
          <h2 className={`${sectionTitle} text-center`}>Everything Included in Your Enrollment</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {includedItems.map((f) => (
              <div
                key={f.title}
                className="flex flex-col items-center rounded-xl border border-zinc-800 bg-black/50 px-5 py-6 text-center"
              >
                <div className="mb-4 grid h-14 w-14 place-items-center rounded-lg border border-[#FFB800]/30 bg-[#FFB800]/10">
                  <f.icon className="h-7 w-7 text-[#FFB800]" aria-hidden />
                </div>
                <p className="text-sm font-bold text-white">{f.title}</p>
                <p className="mt-2 text-[12px] leading-relaxed text-zinc-500">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Certificate */}
      <section className="border-b border-white/10 bg-black" id="certificate">
        <div className={`${shell} py-12 md:py-16`}>
          <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,280px)_1fr_minmax(0,220px)] lg:gap-6 xl:grid-cols-[minmax(0,300px)_1fr_minmax(0,240px)] xl:gap-10">
            <div className="flex justify-center">
              <div className="w-full max-w-[240px] sm:max-w-[260px] lg:max-w-[280px]">
                <TutorLedCertificatePreview
                  programTitle={certificate.programTitle}
                  trainerName={certificate.trainerName}
                  layout="full"
                  hideTitle
                />
              </div>
            </div>
            <div className="min-w-0 text-center lg:text-left">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#FFB800]">
                Included with enrollment
              </p>
              <h2 className="mt-2 text-2xl font-bold text-white md:text-3xl">
                Certificate of <span className="text-[#FFB800]">Attainment</span>
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-zinc-400 md:text-[15px]">
                On successful completion of all live sessions and assessments, you receive a personalized
                Certificate of Attainment — accredited by the International Education Board (IEB), London (UK),
                and verifiable worldwide via QR code.
              </p>
              <ul className="mt-6 space-y-3">
                {[
                  "Personalized with your name, program title, and unique certificate number",
                  "IEB-accredited credential recognized by employers and regulators",
                  "Scan-to-verify QR code — instant authenticity check online",
                  "Signed by the Program Director with issue date and training mode",
                  "Downloadable PDF for portfolios, audits, and compliance records",
                  "Share directly on LinkedIn and other professional networks",
                ].map((item) => (
                  <li key={item} className="flex items-start justify-center gap-2.5 text-sm text-zinc-300 lg:justify-start">
                    <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" aria-hidden />
                    <span className="text-left">{item}</span>
                  </li>
                ))}
              </ul>
              <CertificateBadgeImage className="mt-8 lg:hidden" />
              {!enrolledLearning && checkoutSlug ? (
                <button type="button" onClick={enroll} className={`${goldBtn} mx-auto mt-8 max-w-sm lg:mx-0`}>
                  Enroll Now to Earn Your Certificate
                </button>
              ) : null}
            </div>
            <div className="hidden justify-center lg:flex">
              <CertificateBadgeImage />
            </div>
          </div>
        </div>
      </section>

      {/* Live Training Syllabus */}
      <section className="border-b border-white/10 bg-black" id="syllabus">
        <div className={`${shell} py-12 md:py-14`}>
          <h2 className={sectionTitle}>Live Training Syllabus</h2>
          <div className="mt-6 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950/50">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                  <th className="px-5 py-3.5 font-semibold">Module</th>
                  <th className="px-5 py-3.5 font-semibold">Topic</th>
                  <th className="px-5 py-3.5 font-semibold">Key Learning Areas</th>
                  <th className="px-5 py-3.5 font-semibold">Duration</th>
                  <th className="px-5 py-3.5 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {(syllabus
                  ? syllabus.map((w) => ({
                      module: w.week,
                      topic: w.topic,
                      keyLearning: w.keyLearning,
                      duration: "2 Hours",
                    }))
                  : syllabusRows
                ).map((row) => (
                  <tr key={row.module} className="border-b border-zinc-800/80 last:border-0">
                    <td className="px-5 py-4 font-semibold text-[#FFB800]">Module {row.module}</td>
                    <td className="px-5 py-4 text-zinc-200">{row.topic}</td>
                    <td className="px-5 py-4 text-zinc-500">{row.keyLearning}</td>
                    <td className="px-5 py-4 text-zinc-400">{row.duration}</td>
                    <td className="px-5 py-4 text-right">
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 rounded-md border border-[#FFB800] bg-transparent px-3 py-1.5 text-[11px] font-semibold text-[#FFB800] transition hover:bg-[#FFB800]/10"
                      >
                        View Details
                        <ChevronRight className="h-3.5 w-3.5" aria-hidden />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Upcoming Live Batch Schedule */}
      <section className="border-b border-white/10 bg-zinc-950" id="schedule">
        <div className={`${shell} py-12 md:py-14`}>
          <h2 className={sectionTitle}>Upcoming Live Batch Schedule</h2>
          <div className="mt-6 overflow-hidden rounded-xl border border-zinc-800 bg-black/40">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                  <th className="px-5 py-3.5 font-semibold">Batch</th>
                  <th className="px-5 py-3.5 font-semibold">Start Date</th>
                  <th className="px-5 py-3.5 font-semibold">Session Days</th>
                  <th className="px-5 py-3.5 font-semibold">Time (IST)</th>
                  <th className="px-5 py-3.5 font-semibold">Duration</th>
                  <th className="px-5 py-3.5 font-semibold">Mode</th>
                  <th className="px-5 py-3.5 font-semibold">Platform</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="px-5 py-4 font-semibold text-[#FFB800]">{batch.batchId}</td>
                  <td className="px-5 py-4 text-zinc-200">{batch.startDate}</td>
                  <td className="px-5 py-4 text-zinc-200">{batch.sessionDays}</td>
                  <td className="px-5 py-4 text-zinc-200">{batch.timeIst}</td>
                  <td className="px-5 py-4 text-zinc-200">{batch.duration}</td>
                  <td className="px-5 py-4 text-zinc-200">{batch.mode}</td>
                  <td className="px-5 py-4">
                    <span className="inline-flex items-center gap-2 text-zinc-200">
                      <span className="grid h-6 w-6 place-items-center rounded-md bg-[#2D8CFF] text-[10px] font-bold text-white">
                        Z
                      </span>
                      Zoom
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Inside the Live Classroom */}
      <section className="border-b border-white/10 bg-black" id="classroom">
        <div className={`${shell} py-12 md:py-14`}>
          <h2 className={`${sectionTitle} mb-8`}>Inside the Live Classroom</h2>
          <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
            <div className="overflow-hidden rounded-xl border border-zinc-800">
              <Image
                src={classroomImageSrc}
                alt="Live Zoom classroom"
                width={900}
                height={520}
                className="h-auto w-full object-cover"
              />
            </div>
            <div className="flex flex-col">
              <ul className="space-y-3.5">
                {classroomFeatures.map((text) => (
                  <li key={text} className="flex items-start gap-2.5 text-sm text-zinc-300">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#FFB800]" aria-hidden />
                    {text}
                  </li>
                ))}
              </ul>
              <div className="mt-8 flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900/80 px-4 py-3">
                <span className="min-w-0 flex-1 text-sm text-zinc-500">Type your question here…</span>
                <button
                  type="button"
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-[#FFB800] text-black"
                  aria-label="Send message"
                >
                  <Send className="h-4 w-4" aria-hidden />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose This Live Training? */}
      <section className="border-b border-white/10 bg-zinc-950">
        <div className={`${shell} py-12 md:py-14`}>
          <h2 className={`${sectionTitle} mb-8 text-center`}>Why Choose This Live Training?</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {course.whyChoose.map((item) => (
              <div
                key={item.title}
                className="flex flex-col items-center rounded-xl border border-zinc-800 bg-black/40 px-4 py-6 text-center"
              >
                <div className="mb-4 grid h-12 w-12 place-items-center rounded-lg border border-[#FFB800]/25 bg-[#FFB800]/10">
                  <item.icon className="h-6 w-6 text-[#FFB800]" aria-hidden />
                </div>
                <p className="text-sm font-bold text-white">{item.title}</p>
                <p className="mt-2 text-[11px] leading-relaxed text-zinc-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ + CTA — matches mockup: FAQ left, bordered CTA box with cert on right */}
      <section className="bg-black">
        <div className={`${shell} grid gap-8 py-12 md:grid-cols-[minmax(0,1fr)_minmax(320px,400px)] md:gap-10 md:py-14`}>
          <div>
            <h2 className={`${sectionTitle} mb-6`}>Frequently Asked Questions</h2>
            <div className="divide-y divide-zinc-800 rounded-xl border border-zinc-800 bg-zinc-950/30">
              {course.faqs.map((faq, i) => (
                <div key={faq.q}>
                  <button
                    type="button"
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-sm text-zinc-200"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown
                      size={18}
                      className={`shrink-0 text-zinc-500 transition-transform ${openFaq === i ? "rotate-180" : ""}`}
                    />
                  </button>
                  {openFaq === i ? (
                    <div className="border-t border-zinc-800 px-5 pb-4 text-sm leading-relaxed text-zinc-400">{faq.a}</div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>

          <aside>
            <div className="overflow-hidden rounded-xl border-2 border-[#FFB800]/60 bg-zinc-950 p-5">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-bold leading-snug text-white">Secure Your Seat in the Next Batch</h3>
                  <p className="mt-2 text-sm text-zinc-400">
                    Limited seats available for the upcoming live training batch.
                  </p>
                  {!enrolledLearning && checkoutSlug ? (
                    <button type="button" onClick={enroll} className={`${goldBtn} mt-5`}>
                      Reserve Your Seat
                    </button>
                  ) : (
                    <Link href="/my-learning?tab=live" className={`${goldBtn} mt-5`}>
                      Open My Learning
                    </Link>
                  )}
                </div>
                <div className="mx-auto w-[100px] shrink-0 sm:mx-0">
                  <TutorLedCertificatePreview
                    programTitle={certificate.programTitle}
                    trainerName={certificate.trainerName}
                    layout="compact"
                    hideTitle
                  />
                </div>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}
