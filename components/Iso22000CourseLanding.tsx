"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Award,
  CheckCircle2,
  ChevronRight,
  Clock,
  FileText,
  Globe,
  GraduationCap,
  Infinity,
  Link2,
  Monitor,
  Play,
  Shield,
  Smartphone,
  Star,
  Users,
  Video,
} from "lucide-react";
import { CatalogMediaImage } from "@/components/CatalogMediaImage";
import {
  SocialBrandIcon,
  SOCIAL_BRAND_BUTTON_CLASS,
  SOCIAL_BRAND_LABEL,
} from "@/components/SocialBrandIcon";
import CourseLandingVisit from "@/components/CourseLandingVisit";
import { CoursePrice } from "@/components/CoursePrice";
import type { TutorLedProgramStored } from "@/lib/default-tutor-led-programs";
import { tutorLedLandingCopy, tutorLedLandingImage } from "@/lib/iso-22000-landing-copy";
import { formatTrainingDuration, getCurriculumSessionCount } from "@/lib/tutor-led-training-schedule";
import { isIso22000TutorLedSlug, TUTOR_LED_ISO_22000_CATALOG_HREF } from "@/lib/tutor-led-routes";
import { registerTutorLedFromTemplate } from "@/lib/push-checkout-or-login";
import { formatSimpleRichTextBlock } from "@/lib/simple-rich-text";
import { resolveCoursePrices } from "@/lib/course-regional-pricing";
import { useLearnerPricing } from "@/lib/hooks/useLearnerPricing";
import { tutorLedPricingCourse } from "@/lib/tutor-led-pricing";
import { buildCredentialShareLinks } from "@/lib/share-credentials";

const shell = "mx-auto w-full max-w-[1760px] px-4 md:px-6 xl:px-8";
const goldBtn =
  "inline-flex w-full items-center justify-center rounded-lg bg-[#f4c150] py-3.5 text-sm font-bold text-black shadow-[0_8px_28px_rgba(244,193,80,0.4)] transition hover:bg-[#f9d06a]";

const LEARN_ICONS = [GraduationCap, Monitor, Award, Star] as const;

const cardClass = "rounded-xl border border-white/10 bg-[#141414] p-5";

function SocialShareRow({ courseTitle }: { courseTitle: string }) {
  const [copied, setCopied] = useState(false);

  const getShareLinks = () => {
    if (typeof window === "undefined") return null;
    const url = window.location.href;
    return buildCredentialShareLinks({
      url,
      title: courseTitle,
      text: `Check out ${courseTitle} on SF Trainings`,
    });
  };

  const copyLink = () => {
    if (typeof window === "undefined") return;
    void navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className={cardClass}>
      <h3 className="text-sm font-bold text-white">Share this course</h3>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={copyLink}
          className="grid h-9 w-9 place-items-center rounded-full border border-white/15 bg-zinc-900 text-zinc-300 transition hover:border-[#f4c150]/40 hover:text-white"
          aria-label="Copy link"
        >
          <Link2 className="h-4 w-4" />
        </button>
        {(["facebook", "twitter", "linkedin"] as const).map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              const links = getShareLinks();
              if (links) window.open(links[id], "_blank", "noopener,noreferrer");
            }}
            className={`grid h-9 w-9 place-items-center rounded-full text-white shadow-md ${SOCIAL_BRAND_BUTTON_CLASS[id]}`}
            aria-label={`Share on ${SOCIAL_BRAND_LABEL[id]}`}
          >
            <SocialBrandIcon brand={id} size={16} />
          </button>
        ))}
      </div>
      {copied ? <p className="mt-2 text-[10px] text-emerald-300">Course link copied</p> : null}
    </div>
  );
}

function TutorLedCourseSidebar({
  program,
  duration,
  sessionCount,
}: {
  program: TutorLedProgramStored;
  duration: string;
  sessionCount: number;
}) {
  const includes = [
    { icon: Video, text: `${duration} live Zoom training` },
    { icon: Monitor, text: `${sessionCount || "Live"} classroom session${sessionCount === 1 ? "" : "s"}` },
    { icon: FileText, text: "Notes, PPT and batch materials" },
    { icon: Infinity, text: "Recordings for this batch" },
    { icon: Smartphone, text: "Access on laptop and mobile" },
    { icon: Award, text: "Certificate of attainment" },
  ];

  return (
    <aside className="space-y-4 lg:sticky lg:top-28 lg:self-start">
      <div className={cardClass}>
        <h3 className="text-sm font-bold text-white">This course includes</h3>
        <ul className="mt-4 space-y-3">
          {includes.map((row) => (
            <li key={row.text} className="flex items-start gap-3 text-sm text-zinc-300">
              <row.icon className="mt-0.5 h-4 w-4 shrink-0 text-white/90" strokeWidth={1.75} />
              <span className="leading-snug">{row.text}</span>
            </li>
          ))}
        </ul>
      </div>

      <SocialShareRow courseTitle={program.title} />

      <div className={cardClass}>
        <h3 className="text-sm font-bold text-white">Training 5 or more people?</h3>
        <p className="mt-2 text-sm leading-relaxed text-zinc-500">
          Get your team access to this live program and track progress in one place.
        </p>
        <Link
          href="/#organisation"
          className="mt-4 inline-flex w-full items-center justify-center rounded-lg border border-[#f4c150] py-2.5 text-sm font-semibold text-[#f4c150] transition hover:bg-[#f4c150]/10"
        >
          Get Team Access
        </Link>
      </div>

      <div className={cardClass}>
        <h3 className="text-sm font-bold text-white">Certificate Preview</h3>
        <div className="mt-3 overflow-hidden rounded-lg border border-amber-500/25 bg-gradient-to-b from-[#1e1e24] via-[#141418] to-[#0a0a0c] p-5">
          <p className="text-center text-[10px] font-bold uppercase tracking-[0.2em] text-amber-200/70">
            SF Trainings
          </p>
          <p className="mt-3 text-center text-xs font-bold uppercase tracking-wide text-white">
            Certificate of Attainment
          </p>
          <p className="mt-4 text-center text-sm font-semibold text-zinc-200">Learner Name</p>
          <p className="mt-2 px-2 text-center text-[11px] leading-snug text-zinc-400">{program.title}</p>
          <div className="mx-auto mt-4 grid h-12 w-12 place-items-center rounded-full border-2 border-amber-400/70 bg-amber-500/10">
            <Award className="h-6 w-6 text-amber-400" />
          </div>
          <p className="mt-3 text-center text-[9px] text-zinc-600">SF Trainings · Verified credential</p>
        </div>
      </div>
    </aside>
  );
}

type TabId = "overview" | "content" | "instructor" | "faq";

type Props = { program: TutorLedProgramStored };

export default function Iso22000CourseLanding({ program }: Props) {
  const router = useRouter();
  const copy = tutorLedLandingCopy(program);
  const heroSrc = tutorLedLandingImage(program);
  const [tab, setTab] = useState<TabId>("overview");
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const { region, showPrices, ready } = useLearnerPricing();
  const resolved =
    (program.regionalPrices?.length ?? 0) > 0
      ? resolveCoursePrices(tutorLedPricingCourse(program), region)
      : null;
  const sessionCount = getCurriculumSessionCount(program);
  const duration = formatTrainingDuration(sessionCount);
  const mode = program.batchDetails?.find((d) => /mode|platform/i.test(d.label))?.value || "Live on Zoom";
  const trainer = program.trainer ?? {
    name: "Trainer",
    role: "",
    bio: "",
    experience: "",
    certifications: [] as string[],
  };
  const iso = isIso22000TutorLedSlug(program.slug);
  const catHref = iso
    ? TUTOR_LED_ISO_22000_CATALOG_HREF
    : program.category
      ? `/courses/category/${program.category}`
      : "/tutor-led";
  const catLabel = iso ? "ISO 22000:2018" : program.breadcrumb?.[1] || "Tutor Led";

  const tabs: { id: TabId; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "content", label: "Course content" },
    { id: "instructor", label: "Instructor" },
    { id: "faq", label: "FAQ" },
  ];

  return (
    <div className="self-paced-course-page min-h-screen bg-[#0a0a0a] text-white">
      <CourseLandingVisit slug={program.slug} enrollAnchorId="course-enroll" />

      <section className="relative overflow-hidden border-b border-white/10 bg-[#0a0a0a]">
        <div className="absolute inset-0">
          <CatalogMediaImage
            storedSrc={heroSrc}
            courseSlug={program.slug}
            alt=""
            fill
            className="object-cover object-[72%_center] opacity-55"
            extraFallback="/chatgpt-hero.png"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0a] via-[#0a0a0a]/88 to-[#0a0a0a]/35" />
        </div>

        <div className={`${shell} relative z-10 pb-8 pt-5 md:pb-10`}>
          <nav className="mb-5 flex flex-wrap items-center gap-1.5 text-xs text-zinc-500">
            <Link href="/" className="hover:text-[#f4c150]">
              Home
            </Link>
            <span>/</span>
            <Link href={catHref} className="hover:text-[#f4c150]">
              {catLabel}
            </Link>
            <span>/</span>
            <span className="text-zinc-400">{program.title}</span>
          </nav>

          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(300px,380px)] lg:items-start lg:gap-10">
            <div className="min-w-0 py-1 lg:py-4">
              <span className="inline-block rounded-md bg-[#6a5acd] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
                {program.badge || "LIVE TUTOR-LED"}
              </span>
              <h1 className="mt-4 max-w-3xl text-3xl font-extrabold leading-[1.12] tracking-tight text-white sm:text-4xl lg:text-[2.75rem]">
                {program.title}
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-zinc-200 md:text-[1.05rem]">
                {copy.tagline}
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                <span className="inline-flex items-center gap-1.5 font-semibold text-white">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  4.8
                  <span className="font-normal text-zinc-400">(live batch)</span>
                </span>
                <span className="inline-flex items-center gap-1.5 text-zinc-300">
                  <Users className="h-4 w-4 text-zinc-500" />
                  {program.seatsLeft} seats left
                </span>
              </div>
              <p className="mt-4 text-sm text-zinc-400">
                Created by <span className="font-medium text-violet-300">{trainer.name}</span>
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-zinc-500">
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  {duration}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Globe className="h-3.5 w-3.5" />
                  {program.language || "English"}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Monitor className="h-3.5 w-3.5" />
                  {mode}
                </span>
                {program.nextBatchDate?.trim() ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5" />
                    Next batch {program.nextBatchDate}
                    {program.schedule?.trim() ? ` · ${program.schedule}` : ""}
                  </span>
                ) : null}
              </div>
            </div>

            <aside id="course-enroll" className="scroll-mt-28 lg:sticky lg:top-24">
              <div className="overflow-hidden rounded-xl border border-white/10 bg-[#141414] shadow-[0_20px_60px_rgba(0,0,0,0.65)]">
                <div className="relative aspect-video bg-zinc-900">
                  <CatalogMediaImage
                    storedSrc={heroSrc}
                    courseSlug={program.slug}
                    alt={program.title}
                    fill
                    className="object-cover"
                    extraFallback="/chatgpt-hero.png"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/35">
                    <span className="grid h-14 w-14 place-items-center rounded-full bg-white/95 text-black shadow-lg">
                      <Play className="ml-1 h-7 w-7 fill-black" />
                    </span>
                  </div>
                  <p className="absolute bottom-3 left-0 right-0 text-center text-xs font-medium text-white/90">
                    Preview this live program
                  </p>
                </div>
                <div className="p-5">
                  {ready && showPrices ? (
                    <div className="mb-1 flex flex-wrap items-end gap-2">
                      <CoursePrice
                        label={resolved?.price}
                        inr={resolved?.price ? undefined : program.price}
                        exactLabel={Boolean(resolved?.price)}
                        className="text-3xl font-extrabold text-white"
                      />
                      {program.originalPrice ? (
                        <CoursePrice
                          label={resolved?.oldPrice}
                          inr={resolved?.oldPrice ? undefined : program.originalPrice}
                          exactLabel={Boolean(resolved?.oldPrice)}
                          className="text-sm text-zinc-500 line-through"
                        />
                      ) : null}
                    </div>
                  ) : null}
                  <p className="mb-4 flex items-center gap-1.5 text-[11px] text-zinc-400">
                    <Shield className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
                    Live Zoom classroom for this program only
                  </p>
                  <button
                    type="button"
                    className={goldBtn}
                    onClick={() => registerTutorLedFromTemplate(router, program.slug)}
                  >
                    Enroll Now
                  </button>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>

      <div className="sticky top-[52px] z-40 border-b border-white/10 bg-[#0a0a0a]/98 backdrop-blur-md md:top-[88px]">
        <div className={`${shell} flex gap-0 overflow-x-auto`}>
          {tabs.map((row) => (
            <button
              key={row.id}
              type="button"
              onClick={() => setTab(row.id)}
              className={`shrink-0 border-b-2 px-4 py-3 text-sm font-semibold transition ${
                tab === row.id
                  ? "border-[#f4c150] text-white"
                  : "border-transparent text-zinc-400 hover:text-white"
              }`}
            >
              {row.label}
            </button>
          ))}
        </div>
      </div>

      <section id="course-details" className="scroll-mt-28 py-8 md:py-12">
        <div
          className={`${shell} grid gap-10 ${
            tab === "instructor" || tab === "faq"
              ? "lg:grid-cols-1"
              : "lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_360px]"
          }`}
        >
          <div className="min-w-0">
            {tab === "overview" ? (
              <div className="space-y-12">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight text-white">About this course</h2>
                  <p className="mt-4 text-base leading-7 text-zinc-100 md:text-[1.05rem]">
                    {formatSimpleRichTextBlock(copy.about)}
                  </p>
                  <p className="mt-8 text-base font-semibold text-white">You will learn to:</p>
                  <ul className="mt-4 space-y-2.5">
                    {copy.learnOutcomes.map((o) => (
                      <li key={o} className="flex items-start gap-2.5 text-sm text-zinc-300">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                        {o}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h2 className="text-2xl font-bold tracking-tight text-white">What you&apos;ll learn</h2>
                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    {copy.whatYouLearn.map((row, i) => {
                      const Icon = LEARN_ICONS[i % LEARN_ICONS.length];
                      return (
                        <div
                          key={`${row.title}-${i}`}
                          className="flex gap-3 rounded-xl border border-white/10 bg-[#141414] p-4"
                        >
                          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-[#FFB800]/15">
                            <Icon className="h-5 w-5 text-[#FFB800]" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-white">{row.title}</p>
                            <p className="mt-1 text-xs leading-relaxed text-zinc-500">{row.description}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <h2 className="text-2xl font-bold tracking-tight text-white">Requirements</h2>
                  <ul className="mt-4 space-y-2.5">
                    {copy.requirements.map((r) => (
                      <li key={r} className="flex items-start gap-2.5 text-sm text-zinc-400">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : null}

            {tab === "content" ? (
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-white">Course content</h2>
                <p className="mt-2 text-sm text-zinc-400">
                  {sessionCount} live Zoom {sessionCount === 1 ? "day" : "days"} for {program.title}
                  {program.nextBatchDate?.trim() ? ` · starts ${program.nextBatchDate}` : ""}.
                  Each day has its own meeting link. The final exam unlocks after the last class.
                </p>
                <ol className="mt-6 space-y-3">
                  {(program.curriculum ?? []).map((day) => (
                    <li
                      key={`${day.week}-${day.label}-${day.topic}`}
                      className="rounded-xl border border-white/10 bg-[#141414] p-4"
                    >
                      <p className="text-[11px] font-bold uppercase tracking-wider text-[#FFB800]">
                        {day.label} · {day.sessionType}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-white">{day.topic}</p>
                      <p className="mt-1 text-xs text-zinc-400">{day.keyLearning}</p>
                    </li>
                  ))}
                </ol>
              </div>
            ) : null}

            {tab === "instructor" ? (
              <div className="rounded-2xl border border-white/10 bg-[#141414] p-6">
                <h2 className="text-2xl font-bold tracking-tight text-white">{trainer.name}</h2>
                <p className="mt-1 text-sm text-violet-300">
                  {trainer.role}
                  {trainer.experience ? ` · ${trainer.experience}` : ""}
                </p>
                <p className="mt-4 text-sm leading-relaxed text-zinc-300">{trainer.bio}</p>
                {trainer.certifications?.length ? (
                  <ul className="mt-4 flex flex-wrap gap-2">
                    {trainer.certifications.map((c) => (
                      <li key={c} className="rounded-full border border-white/10 px-3 py-1 text-[11px] text-zinc-300">
                        {c}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : null}

            {tab === "faq" ? (
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-white">Frequently asked questions</h2>
                <div className="mt-4 space-y-2">
                  {copy.faqs.map((faq, i) => {
                    const open = openFaq === i;
                    return (
                      <div key={faq.q} className="overflow-hidden rounded-lg border border-white/10 bg-[#161616]">
                        <button
                          type="button"
                          onClick={() => setOpenFaq(open ? null : i)}
                          className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-semibold text-white"
                        >
                          {faq.q}
                          <span className="text-zinc-500">{open ? "−" : "+"}</span>
                        </button>
                        {open ? <p className="px-4 pb-4 text-sm leading-relaxed text-zinc-400">{faq.a}</p> : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>

          {tab !== "instructor" && tab !== "faq" ? (
            <TutorLedCourseSidebar
              program={program}
              duration={duration}
              sessionCount={sessionCount}
            />
          ) : null}
        </div>
      </section>

      <section className="border-t border-amber-900/20 bg-gradient-to-r from-[#1c1608] via-[#141008] to-[#0a0a0a]">
        <div className={`${shell} flex flex-col items-center justify-between gap-6 py-10 md:flex-row md:py-12`}>
          <div>
            <h3 className="text-lg font-bold text-white md:text-xl">Ready to start your journey?</h3>
            <p className="mt-1 max-w-xl text-sm text-zinc-400">
              Join the live Zoom batch for {program.title} and train with your cohort.
            </p>
          </div>
          <button
            type="button"
            onClick={() => registerTutorLedFromTemplate(router, program.slug)}
            className={`${goldBtn} inline-flex w-full min-w-[200px] shrink-0 md:w-auto`}
          >
            Enroll Now
            <ChevronRight className="ml-1.5 h-4 w-4" strokeWidth={2.5} />
          </button>
        </div>
      </section>
    </div>
  );
}
