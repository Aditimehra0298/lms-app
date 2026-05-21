"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ManagedCourse } from "@/lib/content-schema";
import { canonicalCategorySlug } from "@/lib/category-page-resolve";
import {
  getCurriculumForCourse,
  learningOutcomeBullets,
  requirementBullets,
  totalCurriculumSteps,
  whatYouLearnGrid,
} from "@/lib/course-detail-template";
import { courseLandingHref, markCourseLandingViewed } from "@/lib/course-landing";
import { instructorInitialLetter } from "@/lib/managed-course-to-post-hero";
import {
  foodSafetyMasterclassPostHero,
  isFoodSafetyMasterclassSlug,
} from "@/lib/food-safety-masterclass-page";
import SelfPacedGoldCurriculum from "@/components/SelfPacedGoldCurriculum";
import { CoursePrice } from "@/components/CoursePrice";
import { KnowPriceButton } from "@/components/KnowPriceButton";
import { useLearnerPricing } from "@/lib/hooks/useLearnerPricing";
import { isLearnerLoggedIn, loginRedirectHref } from "@/lib/learner-session-client";
import {
  Award,
  BarChart3,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Clock,
  FileText,
  FolderKanban,
  Globe,
  Heart,
  Infinity,
  Link2,
  MonitorPlay,
  Play,
  Share2,
  Shield,
  Smartphone,
  Star,
  Tv,
  Users,
  Video,
} from "lucide-react";

/** Full-width layout to match SF Trainings course marketing pages */
const shell = "mx-auto w-full max-w-[1760px] px-4 md:px-6 xl:px-8";
const goldBtn =
  "inline-flex w-full items-center justify-center rounded-lg bg-gradient-to-b from-[#f9b14d] to-[#eb9422] py-3.5 text-sm font-bold text-black shadow-[0_8px_24px_rgba(249,177,77,0.35)] transition hover:brightness-110";

type SectionId = "overview" | "curriculum" | "instructor" | "reviews" | "qa";

const SECTION_IDS: Record<string, SectionId> = {
  overview: "overview",
  content: "curriculum",
  "course-content": "curriculum",
  curriculum: "curriculum",
  instructor: "instructor",
  reviews: "reviews",
  qa: "qa",
  "q-a": "qa",
};

const learnIcons = [
  { icon: Shield, tone: "text-violet-400", bg: "bg-violet-500/15" },
  { icon: MonitorPlay, tone: "text-sky-400", bg: "bg-sky-500/15" },
  { icon: BookOpen, tone: "text-amber-400", bg: "bg-amber-500/15" },
  { icon: ClipboardList, tone: "text-orange-400", bg: "bg-orange-500/15" },
  { icon: Award, tone: "text-emerald-400", bg: "bg-emerald-500/15" },
  { icon: Users, tone: "text-rose-400", bg: "bg-rose-500/15" },
];

function parseMoneyInput(s: string): number | null {
  const cleaned = s.replace(/[^\d.]/g, "");
  if (!cleaned) return null;
  const n = parseFloat(cleaned);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function discountPercent(saleStr: string, listStr: string): number | null {
  const sale = parseMoneyInput(saleStr);
  const list = parseMoneyInput(listStr);
  if (sale === null || list === null || list <= 0 || sale >= list) return null;
  return Math.round((1 - sale / list) * 100);
}

function categoryLabel(slug: string): string {
  return canonicalCategorySlug(slug)
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function reviewCountFromLearners(learners: string): string {
  const n = parseInt(learners.replace(/[^\d]/g, ""), 10);
  if (!Number.isFinite(n) || n <= 0) return "1,200";
  return Math.max(120, Math.round(n * 0.07)).toLocaleString();
}

function PurchaseCard({
  course,
  pct,
  onEnroll,
  wishlisted,
  onToggleWishlist,
}: {
  course: ManagedCourse;
  pct: number | null;
  onEnroll: () => void;
  wishlisted: boolean;
  onToggleWishlist: () => void;
}) {
  const { showPrices, ready } = useLearnerPricing();

  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-[#141414] shadow-[0_20px_60px_rgba(0,0,0,0.65)]">
      <div className="relative aspect-video bg-zinc-900">
        <Image
          src={course.image || "/course-food-safety.png"}
          alt=""
          fill
          className="object-cover"
          unoptimized
        />
        <div className="absolute inset-0 flex items-center justify-center bg-black/35">
          <span className="grid h-14 w-14 place-items-center rounded-full bg-white/95 text-black shadow-lg">
            <Play className="ml-1 h-7 w-7 fill-black" />
          </span>
        </div>
        <p className="absolute bottom-3 left-0 right-0 text-center text-xs font-medium text-white/90">
          Preview this course
        </p>
      </div>
      <div className="p-5">
        {!ready ? (
          <div className="mb-4 h-9 animate-pulse rounded-lg bg-zinc-800" />
        ) : showPrices ? (
          <div className="mb-1 flex flex-wrap items-end gap-2">
            <CoursePrice label={course.price} className="text-3xl font-extrabold text-white" />
            {course.oldPrice ? (
              <CoursePrice label={course.oldPrice} className="text-sm text-zinc-500 line-through" />
            ) : null}
            {pct != null ? (
              <span className="rounded bg-violet-600/90 px-2 py-0.5 text-[11px] font-bold text-white">
                {pct}% OFF
              </span>
            ) : null}
          </div>
        ) : (
          <div className="mb-3">
            <KnowPriceButton className="w-full justify-center py-2.5" />
          </div>
        )}
        <p className="mb-4 text-[11px] text-zinc-500">7 days money-back guarantee</p>
        <button type="button" onClick={onEnroll} className={goldBtn}>
          Enroll Now
        </button>
        <button
          type="button"
          onClick={onToggleWishlist}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-white/20 bg-transparent py-3 text-sm font-semibold text-white transition hover:border-white/40"
        >
          <Heart className={`h-4 w-4 ${wishlisted ? "fill-rose-500 text-rose-500" : ""}`} />
          Add to Wishlist
        </button>
      </div>
    </div>
  );
}

function CourseSidebar({ course, lectureCount }: { course: ManagedCourse; lectureCount: number }) {
  const includes = [
    { icon: Video, text: `${lectureCount || 85} on-demand video lessons` },
    { icon: FileText, text: "Downloadable resources & readings" },
    { icon: Smartphone, text: "Access on mobile and tablet" },
    { icon: Tv, text: "Full HD video quality" },
    { icon: Award, text: "Certificate of completion" },
    { icon: Infinity, text: "Lifetime access to materials" },
  ];

  return (
    <aside className="space-y-5 lg:sticky lg:top-28 lg:self-start">
      <div className="rounded-xl border border-white/10 bg-[#141414] p-5">
        <h3 className="text-sm font-bold text-white">This Course Includes</h3>
        <ul className="mt-4 space-y-3">
          {includes.map((row) => (
            <li key={row.text} className="flex items-start gap-3 text-xs text-zinc-400">
              <row.icon className="mt-0.5 h-4 w-4 shrink-0 text-[#f9b14d]" />
              {row.text}
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-xl border border-white/10 bg-[#141414] p-5">
        <h3 className="text-sm font-bold text-white">Share this course</h3>
        <div className="mt-3 flex gap-2">
          {[Link2, Share2, Share2, Share2].map((Icon, i) => (
            <button
              key={i}
              type="button"
              className="grid h-9 w-9 place-items-center rounded-full border border-white/15 bg-zinc-900 text-zinc-400 transition hover:text-white"
              aria-label="Share"
            >
              <Icon className="h-4 w-4" />
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-[#141414] p-5">
        <h3 className="text-sm font-bold text-white">Training 5 or more people?</h3>
        <p className="mt-2 text-xs text-zinc-500">
          Get your team access to this course and track progress in one place.
        </p>
        <Link
          href="/#organisation"
          className="mt-4 inline-flex w-full items-center justify-center rounded-lg border border-[#f9b14d]/50 py-2.5 text-sm font-semibold text-[#f9b14d] transition hover:bg-[#f9b14d]/10"
        >
          Get Team Access
        </Link>
      </div>

      <div className="rounded-xl border border-white/10 bg-[#141414] p-5">
        <h3 className="text-sm font-bold text-white">Certificate Preview</h3>
        <div className="mt-3 overflow-hidden rounded-lg border border-amber-500/20 bg-gradient-to-br from-zinc-900 to-black p-4">
          <p className="text-center text-[10px] font-bold uppercase tracking-widest text-amber-200/80">
            Certificate of Completion
          </p>
          <p className="mt-2 text-center text-xs font-semibold text-white">{course.title}</p>
          <div className="mx-auto mt-3 grid h-10 w-10 place-items-center rounded-full border-2 border-amber-400/60 bg-amber-500/10">
            <Award className="h-5 w-5 text-amber-400" />
          </div>
          <p className="mt-2 text-center text-[9px] text-zinc-600">SF Trainings · Verified credential</p>
        </div>
      </div>
    </aside>
  );
}

type Props = { course: ManagedCourse };

export default function SelfPacedCourseLanding({ course }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeSection, setActiveSection] = useState<SectionId>("overview");
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [wishlisted, setWishlisted] = useState(false);
  const scrolledFromUrl = useRef(false);

  const catSlug = canonicalCategorySlug(course.category);
  const catTitle = categoryLabel(course.category);
  const modules = getCurriculumForCourse(course.slug, course.category, course.title, course.curriculum);
  const lectureCount = totalCurriculumSteps(modules);
  const outcomes = learningOutcomeBullets(course.title);
  const learnGrid = whatYouLearnGrid(course.title);
  const requirements = requirementBullets(catTitle);
  const pct = discountPercent(course.price, course.oldPrice);
  const instructor = (course.instructorName ?? "").trim() || "SF Trainings Team";
  const initial = instructorInitialLetter(course);
  const reviewCount = reviewCountFromLearners(course.learners);
  const badge = (course.pageBadge ?? "BESTSELLER").trim() || "BESTSELLER";
  const isDiploma = isFoodSafetyMasterclassSlug(course.slug);

  const faqs = useMemo(() => {
    if (isFoodSafetyMasterclassSlug(course.slug)) {
      return foodSafetyMasterclassPostHero(course).faqs;
    }
    if (course.faqs?.length) return course.faqs;
    return [
      {
        q: "How long do I have access to the course?",
        a: "Access duration depends on your enrollment plan. Self-paced courses let you study on your own schedule.",
      },
      {
        q: "Is there a certificate upon completion?",
        a: "Yes. Complete all required modules and assessments to unlock your certificate of completion.",
      },
      {
        q: "Can I access the course on mobile?",
        a: "Yes. The platform works on desktop, tablet, and mobile browsers.",
      },
      {
        q: "What if I am not satisfied with the course?",
        a: "We offer a 7-day money-back guarantee on eligible enrollments.",
      },
    ];
  }, [course]);

  const enroll = () => {
    markCourseLandingViewed(course.slug);
    if (!isLearnerLoggedIn()) {
      router.push(loginRedirectHref(courseLandingHref(course.slug, course.learningFormat, null, true)));
      return;
    }
    router.push("/cart");
  };

  const stats = [
    { icon: Clock, label: "Duration", value: course.duration },
    { icon: Play, label: "Lectures", value: `${lectureCount || 85}` },
    { icon: BarChart3, label: "Level", value: course.level },
    { icon: FolderKanban, label: "Projects", value: "5 Hands-on" },
    { icon: Award, label: "Certificate", value: "Yes" },
    { icon: Infinity, label: "Access", value: "Lifetime" },
    { icon: Share2, label: "Shareable", value: "Yes" },
  ];

  const navTabs: { id: SectionId; label: string; hash: string }[] = [
    { id: "overview", label: "Overview", hash: "overview" },
    { id: "curriculum", label: "Course Content", hash: "curriculum" },
    { id: "instructor", label: "Instructor", hash: "instructor" },
    { id: "reviews", label: "Reviews", hash: "reviews" },
    { id: "qa", label: "Q&A", hash: "qa" },
  ];

  const scrollToSection = (id: SectionId) => {
    setActiveSection(id);
    const el = document.getElementById(`sp-${id}`);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  useEffect(() => {
    if (scrolledFromUrl.current) return;
    const tab = searchParams.get("tab");
    if (!tab) return;
    const section = SECTION_IDS[tab.toLowerCase()];
    if (!section) return;
    scrolledFromUrl.current = true;
    setActiveSection(section);
    const t = window.setTimeout(() => {
      document.getElementById(`sp-${section}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 150);
    return () => window.clearTimeout(t);
  }, [searchParams]);

  useEffect(() => {
    const ids = navTabs.map((t) => t.id);
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target?.id) {
          const id = visible.target.id.replace("sp-", "") as SectionId;
          if (ids.includes(id)) setActiveSection(id);
        }
      },
      { rootMargin: "-120px 0px -55% 0px", threshold: [0.08, 0.2, 0.4] },
    );
    ids.forEach((id) => {
      const el = document.getElementById(`sp-${id}`);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  return (
    <div className="self-paced-course-page min-h-screen bg-[#0a0a0a] text-white">
      {/* Hero */}
      <section className="relative min-h-[420px] border-b border-white/10 bg-[#0a0a0a] lg:min-h-[480px]">
        <div className="absolute inset-0 overflow-hidden">
          <Image
            src={course.image || "/course-food-safety.png"}
            alt=""
            fill
            className="object-cover opacity-45"
            priority
            unoptimized
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0a] via-[#0a0a0a]/94 to-[#0a0a0a]/70" />
        </div>

        <div className={`${shell} relative z-10 pb-10 pt-5`}>
          <nav className="mb-6 flex flex-wrap items-center gap-1.5 text-xs text-zinc-500">
            <Link href="/" className="hover:text-[#f9b14d]">
              Home
            </Link>
            <span>/</span>
            <Link href="/courses" className="hover:text-[#f9b14d]">
              Courses
            </Link>
            <span>/</span>
            <Link href={`/courses/category/${catSlug}`} className="hover:text-[#f9b14d]">
              {catTitle}
            </Link>
            <span>/</span>
            <span className="text-zinc-300">{course.title}</span>
          </nav>

          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-12">
            <div className="min-w-0 py-2">
              <span
                className={`inline-block rounded px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white ${
                  isDiploma ? "bg-amber-600/90" : "bg-violet-600/90"
                }`}
              >
                {badge}
              </span>
              <h1 className="mt-3 text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-4xl lg:text-[2.65rem]">
                {course.title}
              </h1>
              <p className="mt-4 max-w-3xl text-sm leading-relaxed text-zinc-300 md:text-base">
                {course.subtitle}
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
                <span className="inline-flex items-center gap-1 font-semibold text-amber-300">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  {course.rating}
                </span>
                <span className="text-zinc-500">({reviewCount} ratings)</span>
                <span className="text-zinc-600">·</span>
                <span className="text-zinc-400">{course.learners} students</span>
              </div>
              <p className="mt-3 text-xs text-zinc-500">
                Created by <span className="text-zinc-300">{instructor}</span>
                <span className="mx-2">·</span>
                Last updated 05/2024
                <span className="mx-2">·</span>
                <span className="inline-flex items-center gap-1">
                  <Globe className="h-3 w-3" /> English
                </span>
              </p>
            </div>

            <aside id="course-enroll" className="scroll-mt-28 lg:sticky lg:top-28">
              <PurchaseCard
                course={course}
                pct={pct}
                onEnroll={enroll}
                wishlisted={wishlisted}
                onToggleWishlist={() => setWishlisted((w) => !w)}
              />
            </aside>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="border-b border-white/10 bg-[#0f0f0f]">
        <div className={`${shell} py-4`}>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            {stats.map((s) => (
              <div
                key={s.label}
                className="flex flex-col items-center rounded-lg border border-white/5 bg-[#141414] px-2 py-3 text-center"
              >
                <s.icon className="mb-1.5 h-4 w-4 text-[#f9b14d]" aria-hidden />
                <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">{s.label}</p>
                <p className="mt-0.5 text-xs font-bold text-white">{s.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Sticky section nav — scrolls to anchors; all sections stay on the page */}
      <div className="sticky top-[52px] z-40 border-b border-white/10 bg-[#0a0a0a]/95 backdrop-blur-md md:top-[88px]">
        <div className={`${shell} flex gap-1 overflow-x-auto py-0`}>
          {navTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => scrollToSection(tab.id)}
              className={`shrink-0 border-b-2 px-4 py-3.5 text-sm font-semibold transition ${
                activeSection === tab.id
                  ? "border-[#f9b14d] text-white"
                  : "border-transparent text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main — full page content (nothing hidden behind tabs) */}
      <section id="course-details" className="scroll-mt-28 py-8 md:py-12">
        <div className={`${shell} grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_360px]`}>
          <div className="min-w-0 space-y-14">
            {/* Overview */}
            <div id="sp-overview" className="scroll-mt-36 space-y-10">
              <div>
                <h2 className="text-2xl font-bold text-white">About This Course</h2>
                <p className="mt-4 text-sm leading-relaxed text-zinc-400 md:text-base">{course.subtitle}</p>
                {course.trainerBio?.trim() ? (
                  <p className="mt-4 text-sm leading-relaxed text-zinc-400">{course.trainerBio}</p>
                ) : null}
                <p className="mt-6 text-sm font-semibold text-white">You will learn to:</p>
                <ul className="mt-4 space-y-2.5">
                  {outcomes.map((o) => (
                    <li key={o} className="flex items-start gap-2.5 text-sm text-zinc-300">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                      {o}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-white">What You&apos;ll Learn</h2>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  {learnGrid.map(([title, desc], i) => {
                    const meta = learnIcons[i % learnIcons.length];
                    const Icon = meta.icon;
                    return (
                      <div
                        key={title}
                        className="flex gap-3 rounded-xl border border-white/10 bg-[#141414] p-4"
                      >
                        <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-lg ${meta.bg}`}>
                          <Icon className={`h-5 w-5 ${meta.tone}`} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white">{title}</p>
                          <p className="mt-1 text-xs leading-relaxed text-zinc-500">{desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-white">Requirements</h2>
                <ul className="mt-4 space-y-2.5">
                  {requirements.map((r) => (
                    <li key={r} className="flex items-start gap-2.5 text-sm text-zinc-400">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                      {r}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-white">Frequently Asked Questions</h2>
                <div className="mt-4 space-y-2">
                  {faqs.map((faq, i) => (
                    <div key={faq.q} className="rounded-xl border border-white/10 bg-[#141414]">
                      <button
                        type="button"
                        onClick={() => setOpenFaq(openFaq === i ? null : i)}
                        className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left text-sm font-medium text-zinc-200"
                      >
                        {faq.q}
                        <ChevronDown
                          className={`h-4 w-4 shrink-0 text-zinc-500 transition ${openFaq === i ? "rotate-180" : ""}`}
                        />
                      </button>
                      {openFaq === i ? (
                        <p className="border-t border-white/5 px-4 py-3 text-sm leading-relaxed text-zinc-500">
                          {faq.a}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Course content — gold modules (pre-payment design) */}
            <div id="sp-curriculum" className="scroll-mt-36">
              <SelfPacedGoldCurriculum course={course} />
            </div>

            {/* Instructor */}
            <div id="sp-instructor" className="scroll-mt-36">
              <h2 className="text-2xl font-bold text-white">Instructor</h2>
              <div className="mt-5 rounded-xl border border-white/10 bg-[#141414] p-6 md:p-8">
                <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
                  <div className="grid h-20 w-20 shrink-0 place-items-center rounded-full bg-zinc-800 text-2xl font-bold text-[#f9b14d]">
                    {initial}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">{instructor}</h3>
                    <p className="mt-1 text-sm text-violet-300">
                      {course.trainerRole?.trim() || "Lead Instructor"}
                    </p>
                    {course.trainerExperience?.trim() ? (
                      <p className="mt-2 text-sm text-zinc-500">{course.trainerExperience}</p>
                    ) : null}
                    <p className="mt-4 text-sm leading-relaxed text-zinc-400">
                      {course.trainerBio?.trim() ||
                        `${instructor} guides learners through practical, job-ready modules with clear explanations and assessments.`}
                    </p>
                    {course.trainerCertifications && course.trainerCertifications.length > 0 ? (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {course.trainerCertifications.map((c) => (
                          <span
                            key={c}
                            className="rounded-full border border-white/10 bg-zinc-900 px-3 py-1 text-xs text-zinc-400"
                          >
                            {c}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>

            {/* Reviews */}
            <div id="sp-reviews" className="scroll-mt-36">
              <h2 className="text-2xl font-bold text-white">Reviews</h2>
              <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="flex items-center gap-4 rounded-xl border border-white/10 bg-[#141414] p-6">
                  <p className="text-5xl font-extrabold text-white">{course.rating}</p>
                  <div>
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Star key={n} className="h-5 w-5 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                    <p className="mt-2 text-sm text-zinc-500">Course rating · {reviewCount} reviews</p>
                  </div>
                </div>
                <p className="text-sm text-zinc-500">
                  Learner reviews are collected after module completion. Enroll to share your experience.
                </p>
              </div>
            </div>

            {/* Q&A */}
            <div id="sp-qa" className="scroll-mt-36">
              <h2 className="text-2xl font-bold text-white">Q&amp;A</h2>
              <div className="mt-5 rounded-xl border border-white/10 bg-[#141414] p-8 text-center">
                <p className="text-sm text-zinc-400">
                  Questions from enrolled learners appear here. Enroll to ask the instructor and community.
                </p>
                <button type="button" onClick={enroll} className={`${goldBtn} mx-auto mt-5 max-w-xs`}>
                  Enroll to ask a question
                </button>
              </div>
            </div>
          </div>

          <CourseSidebar course={course} lectureCount={lectureCount} />
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="border-t border-amber-900/30 bg-gradient-to-r from-[#1a1408] via-[#141008] to-[#0a0a0a]">
        <div className={`${shell} flex flex-col items-center justify-between gap-6 py-12 md:flex-row`}>
          <div className="flex items-start gap-4">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[#f9b14d]/15">
              <BookOpen className="h-6 w-6 text-[#f9b14d]" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Ready to start your journey?</h3>
              <p className="mt-2 max-w-xl text-sm text-zinc-400">
                Join thousands of learners and build in-demand skills with structured, self-paced training.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={enroll}
            className={`${goldBtn} inline-flex w-full max-w-[220px] md:w-auto`}
          >
            Enroll Now
            <ChevronRight className="ml-1 h-4 w-4" />
          </button>
        </div>
      </section>
    </div>
  );
}
