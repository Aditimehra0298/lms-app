"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Award,
  BookOpen,
  Briefcase,
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Clock,
  FileSpreadsheet,
  GraduationCap,
  HardHat,
  HeartPulse,
  Leaf,
  LogIn,
  PlusCircle,
  Quote,
  Shield,
  ShieldCheck,
  Sparkles,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import type { HomePageConfig, ManagedCategory, ManagedCourse } from "@/lib/content-schema";
import { defaultHomePageConfig } from "@/lib/content-schema";
import { catalogCourseLandingHref } from "@/lib/course-landing";
import { resolveCourseListThumbnail } from "@/lib/course-thumbnail";
import { CatalogMediaImage } from "@/components/CatalogMediaImage";
import { canonicalCategorySlug } from "@/lib/category-page-resolve";
import { readPurchasedCourses } from "@/lib/tutor-led-enrollment-client";
import { readCompletedModules } from "@/lib/learner-course-progress";
import { countLearnerCurriculumModules } from "@/lib/curriculum-learner-filter";
import { isLearnerLoggedIn, loginRedirectHref } from "@/lib/learner-session-client";

type Props = {
  homeConfig: HomePageConfig;
  categories: ManagedCategory[];
  courses: ManagedCourse[];
  comingSoon?: boolean;
};

const shell = "mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8";

const PATH_TONES = [
  "from-emerald-500/30 via-emerald-600/10 to-transparent text-emerald-300 border-emerald-400/35",
  "from-sky-500/30 via-sky-600/10 to-transparent text-sky-300 border-sky-400/35",
  "from-amber-500/30 via-amber-600/10 to-transparent text-amber-300 border-amber-400/35",
  "from-orange-500/30 via-orange-600/10 to-transparent text-orange-300 border-orange-400/35",
  "from-violet-500/30 via-violet-600/10 to-transparent text-violet-300 border-violet-400/35",
  "from-teal-500/30 via-teal-600/10 to-transparent text-teal-300 border-teal-400/35",
];

const WHY_ITEMS: { icon: LucideIcon; label: string }[] = [
  { icon: Users, label: "Learn from Industry Experts" },
  { icon: FileSpreadsheet, label: "Practical Tools & Templates" },
  { icon: BookOpen, label: "Case Studies & Real Scenarios" },
  { icon: Clock, label: "Flexible Learning Anytime, Anywhere" },
  { icon: Award, label: "Globally Recognized Certificates" },
];

const TEMPLATE_STATS = [
  { value: "25K+", label: "Active Learners" },
  { value: "500+", label: "Expert Instructors" },
  { value: "300+", label: "Courses & Programs" },
  { value: "98%", label: "Satisfaction Rate" },
];

function categoryIcon(slug: string, title: string): LucideIcon {
  const key = `${slug} ${title}`.toLowerCase();
  if (/food|haccp|fsms/.test(key)) return HeartPulse;
  if (/cyber|ethical|hack|pen/.test(key)) return Shield;
  if (/esg|sustain|environment/.test(key)) return Leaf;
  if (/information.?security|infosec/.test(key)) return ShieldCheck;
  if (/medical|device/.test(key)) return HeartPulse;
  if (/compliance|workplace|iso/.test(key)) return ClipboardCheck;
  if (/skill|framework|development|leadership/.test(key)) return GraduationCap;
  if (/mechanical|hvac|engineer|industrial/.test(key)) return Wrench;
  if (/quality/.test(key)) return CheckCircle2;
  if (/health|safety|hse/.test(key)) return HardHat;
  if (/business|management/.test(key)) return Building2;
  return Briefcase;
}

function courseCountForCategory(courses: ManagedCourse[], categorySlug: string): number {
  const key = canonicalCategorySlug(categorySlug);
  return courses.filter((c) => canonicalCategorySlug(c.category) === key).length;
}

function progressPercent(slug: string, course: ManagedCourse | undefined): number {
  const total = countLearnerCurriculumModules(course?.curriculum);
  if (!total) return 0;
  const done = readCompletedModules(slug).length;
  return Math.min(100, Math.round((done / total) * 100));
}

export default function IndustryProfessionalsLanding({
  homeConfig,
  categories,
  courses,
  comingSoon = false,
}: Props) {
  const cfg = { ...defaultHomePageConfig, ...homeConfig };
  const published = useMemo(
    () =>
      courses.filter(
        (c) => c.published !== false && c.settings?.showInCatalog !== false && c.slug?.trim(),
      ),
    [courses],
  );
  const activeCategories = useMemo(
    () => categories.filter((c) => c.isActive && c.slug?.trim()),
    [categories],
  );

  const [enrolledSlugs, setEnrolledSlugs] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [testimonialIdx, setTestimonialIdx] = useState(0);
  const courseRailRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const rows = readPurchasedCourses();
    setEnrolledSlugs(
      rows.map((r) => r.slug?.trim().toLowerCase()).filter(Boolean) as string[],
    );
    setLoggedIn(isLearnerLoggedIn());
    setHydrated(true);
  }, []);

  const continueCourses = useMemo(() => {
    const pool =
      hydrated && enrolledSlugs.length > 0
        ? (() => {
            const bySlug = new Map(published.map((c) => [c.slug.trim().toLowerCase(), c]));
            const enrolled = enrolledSlugs
              .map((s) => bySlug.get(s))
              .filter((c): c is ManagedCourse => Boolean(c));
            const rest = published.filter(
              (c) => !enrolledSlugs.includes(c.slug.trim().toLowerCase()),
            );
            return [...enrolled, ...rest];
          })()
        : published;
    return pool.slice(0, 8);
  }, [hydrated, enrolledSlugs, published]);

  const pathCategories = activeCategories.slice(0, 5);
  const exploreCategories = activeCategories.slice(0, 6);
  const testimonials = cfg.testimonials?.length ? cfg.testimonials : defaultHomePageConfig.testimonials;
  const testimonial = testimonials[testimonialIdx % testimonials.length];

  const scrollCourses = (dir: -1 | 1) => {
    const el = courseRailRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.min(360, el.clientWidth * 0.85), behavior: "smooth" });
  };

  return (
    <div className="industry-pros-home min-h-screen bg-[#0a0a0a] font-sans text-white antialiased selection:bg-amber-500 selection:text-black">
      {comingSoon ? (
        <div className="border-b border-[#F5B800]/35 bg-[#F5B800]/10">
          <p className="mx-auto flex max-w-[1760px] items-center justify-center gap-2 px-4 py-2.5 text-center text-xs font-bold uppercase tracking-[0.16em] text-[#F5B800] sm:text-[13px]">
            <Sparkles size={14} />
            Coming soon — Industry Professionals experience
          </p>
        </div>
      ) : null}
      {/* ── Hero (home-page layout, industrial content) ── */}
      <section className="relative isolate overflow-hidden">
        <div className="mx-auto grid w-full max-w-[1760px] items-stretch gap-4 px-4 pb-10 pt-6 sm:px-6 md:pt-8 lg:grid-cols-2 lg:gap-5 xl:px-8">
          <div className="flex w-full flex-col justify-center space-y-4 text-center lg:pr-1 lg:text-left">
            <span className="inline-flex items-center gap-2 self-center rounded-full border border-[#F5B800]/40 bg-[#F5B800]/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-[#F5B800] lg:self-start">
              <Sparkles size={14} />
              For Industry Professionals
            </span>
            <h1 className="text-4xl font-extrabold leading-[1.08] tracking-tight text-white md:text-5xl lg:text-[3.25rem]">
              Skill Today.
              <br />
              <span className="text-[#F5B800]">Lead Tomorrow.</span>
            </h1>
            <p className="text-base leading-relaxed text-zinc-200">
              Industry-focused training for professionals who build, operate and innovate — from plant
              floors and quality labs to HSE, ESG, and cybersecurity teams.
            </p>
            <p className="text-sm leading-6 text-zinc-400">
              Sustainable Futures Trainings gives working professionals a clear path: watch lectures,
              complete module assessments, and earn a certificate you can use on site. Learn at your
              own pace or join tutor-led sessions when you need live guidance.
            </p>
            <ul className="space-y-2.5 text-left text-sm leading-snug text-zinc-300">
              {[
                "Food safety, ESG, information security, workplace compliance, and industrial skills — mapped to real job roles.",
                "Each module pairs a lecture with an assessment so you can prove competence, not just attendance.",
                "Progress, exams, and certificates stay in My Learning so teams can track completion.",
              ].map((line) => (
                <li key={line} className="flex items-start gap-2.5">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#F5B800]" aria-hidden />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
            <div className="flex flex-col items-center justify-center gap-3 pt-1 sm:flex-row lg:justify-start">
              <Link
                href={
                  loggedIn
                    ? "/my-learning?tab=learning"
                    : loginRedirectHref("/my-learning?tab=learning")
                }
                className="inline-flex items-center gap-2 rounded-xl bg-[#F5B800] px-6 py-3.5 text-sm font-extrabold text-black shadow-[0_8px_24px_rgba(245,184,0,0.32)] transition hover:brightness-110"
              >
                <GraduationCap size={18} />
                Start Learning
              </Link>
              {loggedIn ? (
                <Link
                  href="/courses"
                  className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/[0.04] px-6 py-3.5 text-sm font-bold text-zinc-100 transition hover:border-[#F5B800]/40 hover:bg-[#F5B800]/10"
                >
                  Explore Courses
                  <ArrowRight size={16} />
                </Link>
              ) : (
                <Link
                  href={loginRedirectHref("/")}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/[0.04] px-6 py-3.5 text-sm font-bold text-zinc-100 transition hover:border-[#F5B800]/40 hover:bg-[#F5B800]/10"
                >
                  <LogIn size={18} />
                  Login
                </Link>
              )}
            </div>
            <ul className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[13px] font-semibold text-[#F5B800] lg:justify-start">
              {["Industry Relevant", "Expert Instructors", "Practical Learning"].map((label) => (
                <li key={label} className="inline-flex items-center gap-1.5">
                  <PlusCircle className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
                  {label}
                </li>
              ))}
            </ul>
          </div>

          <div className="relative min-h-[280px] w-full md:min-h-[360px] lg:h-full">
            <div className="relative h-full min-h-[280px] w-full overflow-hidden rounded-2xl border border-white/10 bg-black shadow-[0_24px_60px_rgba(0,0,0,0.45)] md:min-h-[360px] md:rounded-3xl">
              <Image
                src="/industry/hero-plant-night.png"
                alt="Industrial professional training"
                fill
                priority
                className="object-cover object-[78%_center]"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
              <div className="absolute left-3 top-3 flex flex-wrap gap-2 md:left-4 md:top-4">
                <span className="rounded-full border border-[#F5B800]/40 bg-black/55 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#F5B800] backdrop-blur-md">
                  SFT LMS
                </span>
                <span className="rounded-full border border-white/15 bg-black/50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white/90 backdrop-blur-md">
                  On-site skills
                </span>
              </div>
              <div className="absolute inset-x-3 bottom-3 rounded-xl border border-white/12 bg-black/70 p-4 backdrop-blur-md md:inset-x-4 md:bottom-4 md:p-5">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#F5B800]">
                  Built for plant teams
                </p>
                <p className="mt-1 text-sm font-semibold text-white">
                  HSE, quality, operations, and compliance — without leaving the job.
                </p>
                <div className="mt-3 grid grid-cols-3 gap-2 border-t border-white/10 pt-3">
                  <div>
                    <p className="text-lg font-extrabold text-[#F5B800]">{published.length}+</p>
                    <p className="text-[10px] uppercase tracking-wide text-zinc-500">Courses</p>
                  </div>
                  <div>
                    <p className="text-lg font-extrabold text-[#F5B800]">{activeCategories.length}</p>
                    <p className="text-[10px] uppercase tracking-wide text-zinc-500">Domains</p>
                  </div>
                  <div>
                    <p className="text-lg font-extrabold text-[#F5B800]">24/7</p>
                    <p className="text-[10px] uppercase tracking-wide text-zinc-500">Access</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Popular Learning Paths ── */}
      <section className="border-t border-white/5 bg-[#0a0a0a] py-16 md:py-20">
        <div className={shell}>
          <div className="text-center">
            <h2 className="inline-flex items-center justify-center gap-2 text-2xl font-bold text-white md:text-[1.75rem]">
              <Sparkles className="h-5 w-5 text-[#F5B800]" aria-hidden />
              Popular Learning Paths
            </h2>
            <p className="mt-2 text-sm text-zinc-400">
              Curated paths to accelerate your career.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5 lg:gap-5">
            {pathCategories.map((cat, i) => {
              const Icon = categoryIcon(cat.slug, cat.title);
              const tone = PATH_TONES[i % PATH_TONES.length];
              return (
                <Link
                  key={cat.slug}
                  href={`/courses/category/${encodeURIComponent(cat.slug)}`}
                  className="group flex flex-col items-center rounded-2xl border border-white/10 bg-[#111111] px-3 py-7 text-center transition hover:-translate-y-0.5 hover:border-[#F5B800]/40 hover:shadow-[0_12px_40px_rgba(0,0,0,0.35)]"
                >
                  <span
                    className={`grid h-[4.5rem] w-[4.5rem] place-items-center rounded-full border bg-gradient-to-b ${tone}`}
                  >
                    <Icon className="h-8 w-8" strokeWidth={1.6} aria-hidden />
                  </span>
                  <span className="mt-4 line-clamp-2 text-[13px] font-semibold leading-snug text-zinc-100">
                    {cat.title}
                  </span>
                </Link>
              );
            })}
          </div>

          <div className="mt-10 flex justify-center">
            <Link
              href="/courses"
              className="inline-flex items-center justify-center rounded-lg border border-[#F5B800]/75 px-6 py-2.5 text-sm font-semibold text-[#F5B800] transition hover:bg-[#F5B800]/10"
            >
              View All Learning Paths
            </Link>
          </div>
        </div>
      </section>

      {/* ── Continue Learning (carousel) ── */}
      <section className="border-t border-white/5 bg-[#0a0a0a] py-14 md:py-16">
        <div className={shell}>
          <div className="mb-6 flex items-end justify-between gap-3">
            <h2 className="text-2xl font-bold text-white md:text-[1.75rem]">Continue Learning</h2>
            <Link
              href="/my-learning?tab=learning"
              className="inline-flex items-center gap-1 text-sm font-semibold text-[#F5B800] hover:text-[#ffd24d]"
            >
              View My Courses <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => scrollCourses(-1)}
              className="absolute -left-2 top-1/2 z-10 hidden h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-white/20 bg-black/80 text-white shadow-lg backdrop-blur md:grid lg:-left-4"
              aria-label="Previous courses"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => scrollCourses(1)}
              className="absolute -right-2 top-1/2 z-10 hidden h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-white/20 bg-black/80 text-white shadow-lg backdrop-blur md:grid lg:-right-4"
              aria-label="Next courses"
            >
              <ChevronRight className="h-5 w-5" />
            </button>

            <div
              ref={courseRailRef}
              className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {continueCourses.map((course, idx) => {
                const thumb = resolveCourseListThumbnail(course);
                const slugKey = course.slug.trim().toLowerCase();
                const enrolled = enrolledSlugs.includes(slugKey);
                const pct = enrolled
                  ? progressPercent(slugKey, course)
                  : [65, 40, 25, 0, 55, 15, 80, 10][idx % 8]!;
                const badge =
                  enrolled && pct > 0
                    ? "IN PROGRESS"
                    : enrolled
                      ? "ENROLLED"
                      : pct === 0
                        ? "NOT STARTED"
                        : "NEXT LESSON";
                const href = enrolled
                  ? `/my-learning/course/${encodeURIComponent(course.slug)}`
                  : catalogCourseLandingHref(course.slug, new Set(), course.learningFormat);

                return (
                  <Link
                    key={course.slug}
                    href={href}
                    className="group w-[min(78vw,260px)] shrink-0 snap-start overflow-hidden rounded-xl border border-white/10 bg-[#121212] transition hover:border-[#F5B800]/45 sm:w-[240px]"
                  >
                    <div className="relative aspect-[16/10] bg-zinc-900">
                      {thumb ? (
                        <CatalogMediaImage
                          storedSrc={thumb}
                          courseSlug={course.slug}
                          alt={course.title}
                          fill
                          className="object-cover transition duration-500 group-hover:scale-[1.03]"
                          sizes="260px"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-xs text-zinc-600">
                          No cover
                        </div>
                      )}
                      <span
                        className={`absolute left-2.5 top-2.5 rounded px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide ${
                          badge === "IN PROGRESS" || badge === "NEXT LESSON"
                            ? "bg-[#F5B800] text-black"
                            : "border border-white/25 bg-black/70 text-zinc-200"
                        }`}
                      >
                        {badge}
                      </span>
                    </div>
                    <div className="p-3.5">
                      <h3 className="line-clamp-2 min-h-[2.5rem] text-[13px] font-bold leading-snug text-white">
                        {course.title}
                      </h3>
                      <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full bg-[#F5B800]"
                          style={{ width: `${Math.max(pct, pct === 0 ? 0 : 4)}%` }}
                        />
                      </div>
                      <p className="mt-1.5 text-[11px] font-medium text-zinc-400">
                        {pct}% Complete
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ── Explore by Category ── */}
      <section className="border-t border-white/5 bg-[#0a0a0a] py-16 md:py-20">
        <div className={shell}>
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white md:text-[1.75rem]">Explore by Category</h2>
            <p className="mt-2 text-sm text-zinc-400">
              Browse courses by your professional domain
            </p>
          </div>

          <div className="mt-10 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
            {exploreCategories.map((cat) => {
              const Icon = categoryIcon(cat.slug, cat.title);
              const count = courseCountForCategory(published, cat.slug);
              return (
                <Link
                  key={cat.slug}
                  href={`/courses/category/${encodeURIComponent(cat.slug)}`}
                  className="flex aspect-[1.35] flex-col items-center justify-center gap-3 rounded-xl border border-[#F5B800]/35 bg-[#111111] px-4 text-center transition hover:border-[#F5B800] hover:bg-[#161616]"
                >
                  <Icon className="h-8 w-8 text-[#F5B800]" strokeWidth={1.5} aria-hidden />
                  <span>
                    <span className="block text-sm font-bold text-white">{cat.title}</span>
                    <span className="mt-1 block text-xs text-zinc-500">
                      {count} Course{count === 1 ? "" : "s"}
                    </span>
                  </span>
                </Link>
              );
            })}
          </div>

          <div className="mt-10 flex justify-center">
            <Link
              href="/courses"
              className="inline-flex items-center justify-center rounded-lg border border-[#F5B800]/75 px-6 py-2.5 text-sm font-semibold text-[#F5B800] transition hover:bg-[#F5B800]/10"
            >
              View All Courses
            </Link>
          </div>
        </div>
      </section>

      {/* ── Why ── */}
      <section className="border-t border-white/5 bg-[#0a0a0a] py-14 md:py-16">
        <div className={shell}>
          <h2 className="text-center text-2xl font-bold text-white md:text-[1.75rem]">
            Why Professionals Choose SFT Learning?
          </h2>
          <div className="mt-12 grid grid-cols-2 gap-8 sm:grid-cols-3 lg:grid-cols-5 lg:gap-4">
            {WHY_ITEMS.map((item) => (
              <div key={item.label} className="flex flex-col items-center text-center">
                <span className="grid h-14 w-14 place-items-center rounded-full border border-[#F5B800]/55 text-[#F5B800]">
                  <item.icon className="h-6 w-6" strokeWidth={1.6} aria-hidden />
                </span>
                <p className="mt-3 max-w-[9.5rem] text-[12px] font-semibold leading-snug text-zinc-200">
                  {item.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="border-y border-white/5 bg-[#121212] py-12 md:py-14">
        <div className={`${shell} grid grid-cols-2 gap-8 md:grid-cols-4`}>
          {TEMPLATE_STATS.map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-3xl font-extrabold tracking-tight text-[#F5B800] md:text-4xl">
                {s.value}
              </p>
              <p className="mt-2 text-xs font-medium text-zinc-400 md:text-sm">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Testimonials ── */}
      {testimonial ? (
        <section className="border-b border-white/5 bg-[#0a0a0a] py-16 md:py-20">
          <div className={shell}>
            <h2 className="mb-8 text-center text-2xl font-bold text-white md:text-[1.75rem]">
              What Our Learners Say
            </h2>
            <div className="relative">
              <button
                type="button"
                onClick={() =>
                  setTestimonialIdx((i) => (i - 1 + testimonials.length) % testimonials.length)
                }
                className="absolute -left-1 top-1/2 z-10 hidden h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-white/20 bg-black/80 text-white lg:grid xl:-left-5"
                aria-label="Previous testimonial"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => setTestimonialIdx((i) => (i + 1) % testimonials.length)}
                className="absolute -right-1 top-1/2 z-10 hidden h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-white/20 bg-black/80 text-white lg:grid xl:-right-5"
                aria-label="Next testimonial"
              >
                <ChevronRight className="h-5 w-5" />
              </button>

              <div className="grid items-stretch gap-5 lg:grid-cols-2 lg:gap-6">
                <article className="flex flex-col justify-between rounded-2xl border border-white/10 bg-[#121212] p-7 md:p-9">
                  <div>
                    <Quote className="h-9 w-9 text-[#F5B800]" aria-hidden />
                    <blockquote className="mt-5 text-lg font-medium leading-relaxed text-zinc-100 md:text-xl">
                      “{testimonial.quote}”
                    </blockquote>
                  </div>
                  <div className="mt-8 flex items-center gap-3 border-t border-white/10 pt-5">
                    {testimonial.photo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={testimonial.photo}
                        alt=""
                        className="h-11 w-11 rounded-full object-cover"
                      />
                    ) : (
                      <span className="grid h-11 w-11 place-items-center rounded-full bg-[#F5B800]/15 text-sm font-bold text-[#F5B800]">
                        {testimonial.name.charAt(0)}
                      </span>
                    )}
                    <div>
                      <p className="font-bold text-white">{testimonial.name}</p>
                      <p className="text-xs text-zinc-500">{testimonial.role}</p>
                    </div>
                  </div>
                </article>
                <div className="relative min-h-[280px] overflow-hidden rounded-2xl border border-white/10 bg-zinc-900 lg:min-h-0">
                  <Image
                    src="/industry/hero-plant-night.png"
                    alt="Industrial professional at work"
                    fill
                    className="object-cover object-[85%_20%]"
                    sizes="(max-width: 1024px) 100vw, 50vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {/* ── Bottom CTA ── */}
      <section className="bg-[#0a0a0a] py-10 md:py-14">
        <div className={shell}>
          <div className="relative overflow-hidden rounded-2xl border border-[#F5B800]/20 bg-gradient-to-r from-[#2a1f0a] via-[#16120a] to-[#0c0c0c]">
            <div className="grid items-center gap-6 px-6 py-10 sm:px-10 md:grid-cols-[minmax(0,1fr)_220px] md:py-12 lg:px-14">
              <div>
                <h2 className="text-2xl font-extrabold text-white md:text-3xl">
                  Keep Learning. Keep Growing.
                </h2>
                <p className="mt-2 max-w-md text-sm text-zinc-400">
                  Unlock your potential with industry-relevant skills.
                </p>
                <Link
                  href="/courses"
                  className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[#F5B800] px-6 py-3 text-sm font-extrabold text-black transition hover:bg-[#e0a800]"
                >
                  Explore Courses
                </Link>
              </div>
              <div className="relative mx-auto h-48 w-full max-w-[200px] md:h-52 md:max-w-none">
                <Image
                  src="/industry/cta-professional.png"
                  alt=""
                  fill
                  className="object-contain object-bottom"
                  sizes="220px"
                />
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
