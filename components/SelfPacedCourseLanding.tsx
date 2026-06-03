"use client";

import Link from "next/link";
import { CatalogMediaImage } from "@/components/CatalogMediaImage";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import type { ManagedCourse } from "@/lib/content-schema";
import { canonicalCategorySlug } from "@/lib/category-page-resolve";
import { getCurriculumForCourse, totalCurriculumSteps } from "@/lib/course-detail-template";
import {
  landingAboutText,
  landingCourseIncludes,
  parseCourseIncludesFromHero,
} from "@/lib/course-landing-content";
import { resolveOverviewSection } from "@/lib/course-overview-resolve";
import { resolveTabLabels } from "@/lib/course-tab-labels-resolve";
import { addItemToCart } from "@/components/AddToCartButton";
import { courseLandingHref, markCourseLandingViewed } from "@/lib/course-landing";
import { resolveCourseHero, type ResolvedCourseHero } from "@/lib/course-hero-resolve";
import {
  foodSafetyMasterclassPostHero,
  isFoodSafetyMasterclassSlug,
} from "@/lib/food-safety-masterclass-page";
import SelfPacedCourseCurriculum from "@/components/SelfPacedCourseCurriculum";
import SelfPacedInstructorSection from "@/components/SelfPacedInstructorSection";
import SelfPacedReviewsSection from "@/components/SelfPacedReviewsSection";
import SelfPacedQASection from "@/components/SelfPacedQASection";
import { CoursePrice } from "@/components/CoursePrice";
import { KnowPriceButton } from "@/components/KnowPriceButton";
import { useLearnerPricing } from "@/lib/hooks/useLearnerPricing";
import { formatSimpleRichTextBlock } from "@/lib/simple-rich-text";
import { useResolvedCoursePrice } from "@/lib/hooks/useResolvedCoursePrice";
import { isLearnerLoggedIn, loginRedirectHref } from "@/lib/learner-session-client";
import {
  Award,
  BarChart3,
  Captions,
  Cog,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Clock,
  FolderKanban,
  Globe,
  Heart,
  Infinity,
  Link2,
  MonitorPlay,
  Play,
  Share2,
  Shield,
  Star,
  Users,
} from "lucide-react";

/** Full-width layout to match SF Trainings course marketing pages */
const shell = "mx-auto w-full max-w-[1760px] px-4 md:px-6 xl:px-8";
const goldBtn =
  "inline-flex w-full items-center justify-center rounded-lg bg-[#f4c150] py-3.5 text-sm font-bold text-black shadow-[0_8px_28px_rgba(244,193,80,0.4)] transition hover:bg-[#f9d06a]";

type HeroStat = {
  icon: typeof Clock;
  label: string;
  value: string;
  iconBg: string;
  iconColor: string;
};

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

const learnIconPalette = [
  { icon: Shield, tone: "text-violet-400", bg: "bg-violet-500/15" },
  { icon: MonitorPlay, tone: "text-sky-400", bg: "bg-sky-500/15" },
  { icon: ClipboardList, tone: "text-rose-400", bg: "bg-rose-500/15" },
  { icon: FolderKanban, tone: "text-orange-400", bg: "bg-orange-500/15" },
  { icon: Award, tone: "text-teal-400", bg: "bg-teal-500/15" },
  { icon: Users, tone: "text-fuchsia-400", bg: "bg-fuchsia-500/15" },
];

const cardClass = "rounded-xl border border-white/10 bg-[#141414] p-5";

function SocialShareRow({ courseTitle }: { courseTitle: string }) {
  const share = () => {
    if (typeof window === "undefined") return;
    const url = window.location.href;
    if (navigator.share) {
      void navigator.share({ title: courseTitle, url });
      return;
    }
    void navigator.clipboard.writeText(url);
  };

  return (
    <div className={cardClass}>
      <h3 className="text-sm font-bold text-white">Share this course</h3>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={share}
          className="grid h-9 w-9 place-items-center rounded-full border border-white/15 bg-zinc-900 text-zinc-300 transition hover:border-[#f4c150]/40 hover:text-white"
          aria-label="Copy link"
        >
          <Link2 className="h-4 w-4" />
        </button>
        {[
          { label: "Facebook", letter: "f" },
          { label: "Twitter", letter: "𝕏" },
          { label: "LinkedIn", letter: "in" },
        ].map((s) => (
          <button
            key={s.label}
            type="button"
            onClick={share}
            className="grid h-9 w-9 place-items-center rounded-full border border-white/15 bg-zinc-900 text-[11px] font-bold text-zinc-300 transition hover:border-[#f4c150]/40 hover:text-white"
            aria-label={`Share on ${s.label}`}
          >
            {s.letter}
          </button>
        ))}
      </div>
    </div>
  );
}

function CertificatePreviewCard({
  hero,
  courseTitle,
  courseSlug,
}: {
  hero: ResolvedCourseHero;
  courseTitle: string;
  courseSlug: string;
}) {
  return (
    <div className={cardClass}>
      <h3 className="text-sm font-bold text-white">Certificate Preview</h3>
      {hero.certificatePreviewImage ? (
        <div className="mt-3 flex justify-center rounded-lg border border-white/10 bg-white p-2">
          <div className="relative aspect-[1/1.35] w-full max-w-[280px]">
            <CatalogMediaImage
              storedSrc={hero.certificatePreviewImage}
              courseSlug={courseSlug}
              alt={hero.certificatePreviewLabel}
              fill
              className="object-contain"
              sizes="280px"
            />
          </div>
        </div>
      ) : (
        <div className="mt-3 overflow-hidden rounded-lg border border-amber-500/25 bg-gradient-to-b from-[#1e1e24] via-[#141418] to-[#0a0a0c] p-5 shadow-inner">
          <p className="text-center text-[10px] font-bold uppercase tracking-[0.2em] text-amber-200/70">
            SF Trainings
          </p>
          <p className="mt-3 text-center text-xs font-bold uppercase tracking-wide text-white">
            Certificate of Completion
          </p>
          <p className="mt-4 text-center text-sm font-semibold text-zinc-200">John Doe</p>
          <p className="mt-2 px-2 text-center text-[11px] leading-snug text-zinc-400">{courseTitle}</p>
          <div className="mx-auto mt-4 grid h-12 w-12 place-items-center rounded-full border-2 border-amber-400/70 bg-amber-500/10 shadow-[0_0_20px_rgba(251,191,36,0.25)]">
            <Award className="h-6 w-6 text-amber-400" />
          </div>
          <p className="mt-3 text-center text-[9px] text-zinc-600">SF Trainings · Verified credential</p>
        </div>
      )}
    </div>
  );
}

function categoryLabel(slug: string): string {
  return canonicalCategorySlug(slug)
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function PurchaseCard({
  course,
  hero,
  salePrice,
  listPrice,
  pct,
  onEnroll,
  wishlisted,
  onToggleWishlist,
}: {
  course: ManagedCourse;
  hero: ResolvedCourseHero;
  salePrice: string;
  listPrice: string;
  pct: number | null;
  onEnroll: () => void;
  wishlisted: boolean;
  onToggleWishlist: () => void;
}) {
  const { showPrices, ready } = useLearnerPricing();

  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-[#141414] shadow-[0_20px_60px_rgba(0,0,0,0.65)]">
      <div className="relative aspect-video bg-zinc-900">
        <CatalogMediaImage
          storedSrc={hero.previewImage}
          courseSlug={course.slug}
          alt=""
          fill
          className="object-cover"
        />
        <div className="absolute inset-0 flex items-center justify-center bg-black/35">
          <span className="grid h-14 w-14 place-items-center rounded-full bg-white/95 text-black shadow-lg">
            <Play className="ml-1 h-7 w-7 fill-black" />
          </span>
        </div>
        <p className="absolute bottom-3 left-0 right-0 text-center text-xs font-medium text-white/90">
          {hero.previewLabel}
        </p>
      </div>
      <div className="p-5">
        {!ready ? (
          <div className="mb-4 h-9 animate-pulse rounded-lg bg-zinc-800" />
        ) : showPrices ? (
          <div className="mb-1 flex flex-wrap items-end gap-2">
            <CoursePrice label={salePrice} exactLabel className="text-3xl font-extrabold text-white" />
            {listPrice ? (
              <CoursePrice label={listPrice} exactLabel className="text-sm text-zinc-500 line-through" />
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
        <p className="mb-4 flex items-center gap-1.5 text-[11px] text-zinc-400">
          <Shield className="h-3.5 w-3.5 shrink-0 text-zinc-500" aria-hidden />
          {hero.moneyBackGuarantee}
        </p>
        <button type="button" onClick={onEnroll} className={goldBtn}>
          {hero.enrollButtonLabel}
        </button>
        <button
          type="button"
          onClick={onToggleWishlist}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-white/20 bg-transparent py-3 text-sm font-semibold text-white transition hover:border-white/40"
        >
          <Heart className={`h-4 w-4 ${wishlisted ? "fill-rose-500 text-rose-500" : ""}`} />
          {hero.wishlistButtonLabel}
        </button>
      </div>
    </div>
  );
}

function CourseSidebar({
  course,
  hero,
  lectureCount,
  includesLines,
}: {
  course: ManagedCourse;
  hero: ResolvedCourseHero;
  lectureCount: number;
  includesLines?: string[];
}) {
  const includes = landingCourseIncludes(course, hero, lectureCount, includesLines);

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

      <SocialShareRow courseTitle={course.title} />

      <div className={cardClass}>
        <h3 className="text-sm font-bold text-white">Training 5 or more people?</h3>
        <p className="mt-2 text-sm leading-relaxed text-zinc-500">
          Get your team access to this course and track progress in one place.
        </p>
        <Link
          href="/#organisation"
          className="mt-4 inline-flex w-full items-center justify-center rounded-lg border border-[#f4c150] py-2.5 text-sm font-semibold text-[#f4c150] transition hover:bg-[#f4c150]/10"
        >
          Get Team Access
        </Link>
      </div>

      <CertificatePreviewCard hero={hero} courseTitle={course.title} courseSlug={course.slug} />
    </aside>
  );
}

type Props = { course: ManagedCourse };

export default function SelfPacedCourseLanding({ course }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [wishlisted, setWishlisted] = useState(false);

  const allowQa = course.settings?.allowQa !== false;
  const initialTab = searchParams.get("tab");
  const tabSection = initialTab ? SECTION_IDS[initialTab.toLowerCase()] : undefined;
  const initialSection: SectionId =
    tabSection === "qa" && !allowQa ? "overview" : (tabSection ?? "overview");
  const [activeSection, setActiveSection] = useState<SectionId>(initialSection);

  const catSlug = canonicalCategorySlug(course.category);
  const catTitle = categoryLabel(course.category);
  const modules = getCurriculumForCourse(course.slug, course.category, course.title, course.curriculum);
  const lectureCount = totalCurriculumSteps(modules);
  const aboutText = landingAboutText(course, course.hero?.aboutText);
  const overview = useMemo(() => resolveOverviewSection(course), [course]);
  const tabLabels = useMemo(() => resolveTabLabels(course), [course]);
  const includesLines = parseCourseIncludesFromHero(course.hero);
  const resolved = useResolvedCoursePrice(course);
  const pct = resolved.discountPercent;
  const instructor = (course.instructorName ?? "").trim() || "SF Trainings Team";
  const heroResolved = useMemo(
    () => resolveCourseHero(course, lectureCount),
    [course, lectureCount],
  );
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
    addItemToCart({
      slug: course.slug,
      title: course.title,
      price: resolved.price,
      image: course.image,
    });
    router.push("/cart");
  };

  const heroStats: HeroStat[] = [
    {
      icon: Clock,
      label: "Duration",
      value: course.duration,
      iconBg: "bg-violet-500/20",
      iconColor: "text-violet-400",
    },
    {
      icon: MonitorPlay,
      label: "Lectures",
      value: heroResolved.lectureCount,
      iconBg: "bg-sky-500/20",
      iconColor: "text-sky-400",
    },
    {
      icon: BarChart3,
      label: "Level",
      value: course.level,
      iconBg: "bg-orange-500/20",
      iconColor: "text-orange-400",
    },
    {
      icon: FolderKanban,
      label: "Projects",
      value: heroResolved.projects,
      iconBg: "bg-emerald-500/20",
      iconColor: "text-emerald-400",
    },
    {
      icon: Award,
      label: "Certificate",
      value: heroResolved.certificate,
      iconBg: "bg-amber-500/20",
      iconColor: "text-amber-400",
    },
    {
      icon: Infinity,
      label: "Access",
      value: heroResolved.access,
      iconBg: "bg-blue-500/20",
      iconColor: "text-blue-400",
    },
    {
      icon: Share2,
      label: "Shareable",
      value: heroResolved.shareable,
      iconBg: "bg-zinc-500/20",
      iconColor: "text-zinc-400",
    },
  ];

  const navTabs: { id: SectionId; label: string; hash: string }[] = [
    { id: "overview", label: tabLabels.overview, hash: "overview" },
    { id: "curriculum", label: tabLabels.curriculum, hash: "curriculum" },
    { id: "instructor", label: tabLabels.instructor, hash: "instructor" },
    { id: "reviews", label: tabLabels.reviews, hash: "reviews" },
    ...(allowQa ? [{ id: "qa" as const, label: tabLabels.qa, hash: "qa" }] : []),
  ];

  const selectTab = (id: SectionId) => {
    setActiveSection(id);
    document.getElementById("course-details")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="self-paced-course-page min-h-screen bg-[#0a0a0a] text-white">
      {/* Hero — two-column info + enroll card + integrated stats bar */}
      <section className="relative overflow-hidden border-b border-white/10 bg-[#0a0a0a]">
        <div className="absolute inset-0">
          <CatalogMediaImage
            storedSrc={heroResolved.backgroundImage}
            courseSlug={course.slug}
            alt=""
            fill
            className="object-cover object-[72%_center] opacity-55"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0a] via-[#0a0a0a]/88 to-[#0a0a0a]/35" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_75%_45%,rgba(34,211,238,0.14),transparent_55%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_40%_at_20%_80%,rgba(106,90,205,0.12),transparent_50%)]" />
        </div>

        <div className={`${shell} relative z-10 pb-8 pt-5 md:pb-10`}>
          <nav className="mb-5 flex flex-wrap items-center gap-1.5 text-xs text-zinc-500">
            <Link href="/" className="hover:text-[#f4c150]">
              Home
            </Link>
            <span>/</span>
            <Link href="/courses" className="hover:text-[#f4c150]">
              Courses
            </Link>
            <span>/</span>
            <Link href={`/courses/category/${catSlug}`} className="hover:text-[#f4c150]">
              {catTitle}
            </Link>
            <span>/</span>
            <span className="text-zinc-400">{course.title}</span>
          </nav>

          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(300px,380px)] lg:items-start lg:gap-10 xl:gap-14">
            <div className="min-w-0 py-1 lg:py-4 lg:pr-4">
              <span
                className={`inline-block rounded-md px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white ${
                  isDiploma ? "bg-amber-600" : "bg-[#6a5acd]"
                }`}
              >
                {badge}
              </span>
              <h1 className="mt-4 max-w-3xl text-3xl font-extrabold leading-[1.12] tracking-tight text-white sm:text-4xl lg:text-[2.75rem] lg:leading-[1.1]">
                {course.title}
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-zinc-200 md:text-[1.05rem]">
                {course.subtitle}
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                <span className="inline-flex items-center gap-1.5 font-semibold text-white">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" aria-hidden />
                  {course.rating}
                  <span className="font-normal text-zinc-400">({heroResolved.ratingCount} ratings)</span>
                </span>
                <span className="hidden text-zinc-600 sm:inline">·</span>
                <span className="inline-flex items-center gap-1.5 text-zinc-300">
                  <Users className="h-4 w-4 text-zinc-500" aria-hidden />
                  {heroResolved.studentsLabel}
                </span>
              </div>
              <p className="mt-4 text-sm text-zinc-400">
                Created by{" "}
                <span className="font-medium text-violet-300 hover:text-violet-200">{instructor}</span>
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-zinc-500">
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" aria-hidden />
                  Last updated {heroResolved.lastUpdated}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Globe className="h-3.5 w-3.5" aria-hidden />
                  {heroResolved.language}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Captions className="h-3.5 w-3.5" aria-hidden />
                  {heroResolved.captions}
                </span>
              </div>
            </div>

            <aside id="course-enroll" className="scroll-mt-28 lg:sticky lg:top-24">
              <PurchaseCard
                course={course}
                hero={heroResolved}
                salePrice={resolved.price}
                listPrice={resolved.oldPrice}
                pct={pct}
                onEnroll={enroll}
                wishlisted={wishlisted}
                onToggleWishlist={() => setWishlisted((w) => !w)}
              />
            </aside>
          </div>

          <div className="relative z-10 mt-8 rounded-2xl border border-white/10 bg-[#121212]/92 p-3 shadow-[0_16px_48px_rgba(0,0,0,0.45)] backdrop-blur-md md:mt-10 md:p-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7 lg:gap-0 lg:divide-x lg:divide-white/10">
              {heroStats.map((s) => (
                <div
                  key={s.label}
                  className="flex items-center gap-3 px-1 py-2 sm:px-2 lg:px-4"
                >
                  <div
                    className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${s.iconBg}`}
                  >
                    <s.icon className={`h-[1.15rem] w-[1.15rem] ${s.iconColor}`} aria-hidden />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
                      {s.label}
                    </p>
                    <p className="mt-0.5 text-sm font-bold leading-tight text-white">{s.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Sticky section nav */}
      <div className="sticky top-[52px] z-40 border-b border-white/10 bg-[#0a0a0a]/98 backdrop-blur-md md:top-[88px]">
        <div className={`${shell} flex gap-0 overflow-x-auto`}>
          {navTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => selectTab(tab.id)}
              className={`shrink-0 border-b-[3px] px-5 py-4 text-sm font-semibold transition ${
                activeSection === tab.id
                  ? "border-[#f4c150] text-white"
                  : "border-transparent text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main — tab panels (Overview | Course Content | …) */}
      <section id="course-details" className="scroll-mt-28 py-8 md:py-12">
        <div
          className={`${shell} grid gap-10 ${
            activeSection === "instructor" ||
            activeSection === "reviews" ||
            activeSection === "qa"
              ? "lg:grid-cols-1"
              : "lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_360px]"
          }`}
        >
          <div className="min-w-0 min-h-[320px]">
            {activeSection === "overview" ? (
            <div id="sp-overview" className="space-y-12">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-white">{overview.aboutTitle}</h2>
                <p className="mt-4 text-sm leading-relaxed text-zinc-400 md:text-[15px] md:leading-7">
                  {formatSimpleRichTextBlock(aboutText)}
                </p>
                <p className="mt-8 text-base font-semibold text-white">{overview.youWillLearnTitle}</p>
                <ul className="mt-4 space-y-2.5">
                  {overview.learnOutcomes.map((o) => (
                    <li key={o} className="flex items-start gap-2.5 text-sm text-zinc-300">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                      {o}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h2 className="text-2xl font-bold tracking-tight text-white">{overview.whatYouLearnTitle}</h2>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  {overview.whatYouLearn.map((row, i) => {
                    const title = row.title;
                    const desc = row.description;
                    const meta = learnIconPalette[i % learnIconPalette.length];
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
                <h2 className="text-2xl font-bold tracking-tight text-white">{overview.requirementsTitle}</h2>
                <ul className="mt-4 space-y-2.5">
                  {overview.requirements.map((r) => (
                    <li key={r} className="flex items-start gap-2.5 text-sm text-zinc-400">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                      {r}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h2 className="text-2xl font-bold tracking-tight text-white">{overview.faqSectionTitle}</h2>
                <div className="mt-4 space-y-2">
                  {faqs.map((faq, i) => (
                    <div key={faq.q} className="overflow-hidden rounded-lg border border-white/10 bg-[#161616]">
                      <button
                        type="button"
                        onClick={() => setOpenFaq(openFaq === i ? null : i)}
                        className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left text-sm font-medium text-zinc-100"
                      >
                        {faq.q}
                        <ChevronDown
                          className={`h-4 w-4 shrink-0 text-zinc-500 transition ${openFaq === i ? "rotate-180" : ""}`}
                        />
                      </button>
                      {openFaq === i ? (
                        <p className="border-t border-white/5 px-4 py-3 text-sm leading-relaxed text-zinc-500">
                          {formatSimpleRichTextBlock(faq.a)}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            ) : null}

            {activeSection === "curriculum" ? (
            <div id="sp-curriculum">
              <SelfPacedCourseCurriculum course={course} />
            </div>
            ) : null}

            {activeSection === "instructor" ? <SelfPacedInstructorSection course={course} /> : null}

            {activeSection === "reviews" ? (
              <SelfPacedReviewsSection
                course={course}
                hero={heroResolved}
                ratingCountLabel={heroResolved.ratingCount}
                lectureCount={lectureCount}
                includesLines={includesLines}
                onWriteReview={enroll}
              />
            ) : null}

            {activeSection === "qa" ? (
              <SelfPacedQASection course={course} onRequireEnroll={enroll} />
            ) : null}
          </div>

          {activeSection !== "instructor" &&
          activeSection !== "reviews" &&
          activeSection !== "qa" ? (
            <CourseSidebar
              course={course}
              hero={heroResolved}
              lectureCount={lectureCount}
              includesLines={includesLines}
            />
          ) : null}
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="border-t border-amber-900/20 bg-gradient-to-r from-[#1c1608] via-[#141008] to-[#0a0a0a]">
        <div className={`${shell} flex flex-col items-center justify-between gap-6 py-10 md:flex-row md:py-12`}>
          <div className="flex items-center gap-4">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-white/10 bg-white/5 text-white">
              <Cog className="h-5 w-5" aria-hidden />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white md:text-xl">Ready to start your journey?</h3>
              <p className="mt-1 max-w-xl text-sm text-zinc-400">
                Join thousands of learners and build in-demand skills.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={enroll}
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
