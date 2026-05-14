import Image from "next/image";
import Link from "next/link";
import type { ComponentType } from "react";
import LevelFilterSelect from "@/components/LevelFilterSelect";
import { getManagedCourses } from "@/lib/server/course-catalog";
import { readAdminContent } from "@/lib/server/content-store";
import { defaultCoursesPageConfig } from "@/lib/content-schema";
import type { CoursesPageConfig } from "@/lib/content-schema";
import {
  BadgeCheck,
  BellRing,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  Cpu,
  Factory,
  FlaskConical,
  Gavel,
  Leaf,
  Lock,
  Microscope,
  Salad,
  ScanSearch,
  ShieldCheck,
  Stethoscope,
  UtensilsCrossed,
  Rocket,
  Search,
  Shield,
  Wrench,
  Users,
} from "lucide-react";

export const dynamic = "force-dynamic";

const categoryIconMap: Record<
  string,
  {
    imageSrc?: string;
    Icon: ComponentType<{ size?: number; className?: string }>;
    iconTone: string;
    iconBg: string;
    iconBorder: string;
  }
> = {
  "cyber-security": {
    imageSrc: "/p2.png",
    Icon: ShieldCheck,
    iconTone: "text-sky-300",
    iconBg: "bg-sky-500/20",
    iconBorder: "border-sky-300/40",
  },
  food: {
    Icon: UtensilsCrossed,
    iconTone: "text-orange-300",
    iconBg: "bg-orange-500/20",
    iconBorder: "border-orange-300/45",
  },
  "food-safety": {
    imageSrc: "/course-food-safety.png",
    Icon: UtensilsCrossed,
    iconTone: "text-orange-300",
    iconBg: "bg-orange-500/20",
    iconBorder: "border-orange-300/45",
  },
  management: {
    Icon: Users,
    iconTone: "text-indigo-300",
    iconBg: "bg-indigo-500/20",
    iconBorder: "border-indigo-300/45",
  },
  "information-security": {
    imageSrc: "/p4.jpg",
    Icon: ScanSearch,
    iconTone: "text-cyan-300",
    iconBg: "bg-cyan-500/20",
    iconBorder: "border-cyan-300/45",
  },
  "medical-devices": {
    imageSrc: "/p5.png",
    Icon: Stethoscope,
    iconTone: "text-rose-300",
    iconBg: "bg-rose-500/20",
    iconBorder: "border-rose-300/45",
  },
  "workplace-compliance": {
    imageSrc: "/p6.png",
    Icon: Gavel,
    iconTone: "text-blue-300",
    iconBg: "bg-blue-500/20",
    iconBorder: "border-blue-300/45",
  },
  "skill-development-framework": {
    imageSrc: "/p7.png",
    Icon: BadgeCheck,
    iconTone: "text-fuchsia-300",
    iconBg: "bg-fuchsia-500/20",
    iconBorder: "border-fuchsia-300/45",
  },
  "mechanical-engineering-hvac-and-refrigeration": {
    imageSrc: "/p8.png",
    Icon: Wrench,
    iconTone: "text-lime-300",
    iconBg: "bg-lime-500/20",
    iconBorder: "border-lime-300/45",
  },
  framework: {
    Icon: Factory,
    iconTone: "text-emerald-300",
    iconBg: "bg-emerald-500/20",
    iconBorder: "border-emerald-300/45",
  },
  skills: {
    Icon: Cpu,
    iconTone: "text-violet-300",
    iconBg: "bg-violet-500/20",
    iconBorder: "border-violet-300/45",
  },
  esg: {
    imageSrc: "/p3.png",
    Icon: Leaf,
    iconTone: "text-green-300",
    iconBg: "bg-green-500/20",
    iconBorder: "border-green-300/45",
  },
  auditing: {
    Icon: Shield,
    iconTone: "text-amber-300",
    iconBg: "bg-amber-500/20",
    iconBorder: "border-amber-300/45",
  },
  compliance: {
    Icon: Shield,
    iconTone: "text-teal-300",
    iconBg: "bg-teal-500/20",
    iconBorder: "border-teal-300/45",
  },
};

const categoryKeywordVisuals: Array<{
  test: RegExp;
  visual: {
    imageSrc?: string;
    Icon: ComponentType<{ size?: number; className?: string }>;
    iconTone: string;
    iconBg: string;
    iconBorder: string;
  };
}> = [
  {
    test: /(food|nutrition|haccp)/i,
    visual: {
      imageSrc: "/course-food-safety.png",
      Icon: Salad,
      iconTone: "text-orange-300",
      iconBg: "bg-orange-500/20",
      iconBorder: "border-orange-300/45",
    },
  },
  {
    test: /(cyber|security|ethical-hacking|infosec)/i,
    visual: {
      imageSrc: "/p2.png",
      Icon: ShieldCheck,
      iconTone: "text-sky-300",
      iconBg: "bg-sky-500/20",
      iconBorder: "border-sky-300/45",
    },
  },
  {
    test: /(esg|environment|sustainability)/i,
    visual: {
      imageSrc: "/p3.png",
      Icon: Leaf,
      iconTone: "text-green-300",
      iconBg: "bg-green-500/20",
      iconBorder: "border-green-300/45",
    },
  },
  {
    test: /(medical|device|health)/i,
    visual: {
      imageSrc: "/p5.png",
      Icon: Microscope,
      iconTone: "text-rose-300",
      iconBg: "bg-rose-500/20",
      iconBorder: "border-rose-300/45",
    },
  },
  {
    test: /(compliance|legal|ethics|audit)/i,
    visual: {
      imageSrc: "/p6.png",
      Icon: Gavel,
      iconTone: "text-blue-300",
      iconBg: "bg-blue-500/20",
      iconBorder: "border-blue-300/45",
    },
  },
  {
    test: /(skill|capability|framework|workforce)/i,
    visual: {
      imageSrc: "/p7.png",
      Icon: BadgeCheck,
      iconTone: "text-fuchsia-300",
      iconBg: "bg-fuchsia-500/20",
      iconBorder: "border-fuchsia-300/45",
    },
  },
  {
    test: /(mechanical|hvac|refrigeration)/i,
    visual: {
      imageSrc: "/p8.png",
      Icon: Wrench,
      iconTone: "text-lime-300",
      iconBg: "bg-lime-500/20",
      iconBorder: "border-lime-300/45",
    },
  },
  {
    test: /(engineering|technology|systems)/i,
    visual: { Icon: Cpu, iconTone: "text-violet-300", iconBg: "bg-violet-500/20", iconBorder: "border-violet-300/45" },
  },
];

function getCategoryVisual(category: { slug: string; label: string }) {
  if (categoryIconMap[category.slug]) return categoryIconMap[category.slug];
  const keywordHit = categoryKeywordVisuals.find((entry) =>
    entry.test.test(`${category.slug} ${category.label}`),
  );
  if (keywordHit) return keywordHit.visual;
  return {
    imageSrc: "/p1.png",
    Icon: FlaskConical,
    iconTone: "text-pink-300",
    iconBg: "bg-pink-500/20",
    iconBorder: "border-pink-300/45",
  };
}

export default async function CoursesPage({
  searchParams,
}: {
  searchParams?: Promise<{ view?: string; rec?: string }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const showAllCourses = resolvedSearchParams?.view === "all";
  const showAllRecommended = resolvedSearchParams?.rec === "all";
  const adminContent = await readAdminContent();
  const cpConfig: CoursesPageConfig = adminContent.coursesPage ?? defaultCoursesPageConfig;
  const categories = adminContent.categories
    .filter((category) => category.isActive)
    .map((category) => ({ label: category.title, slug: category.slug }));
  const allCourses = await getManagedCourses();
  const visibleCourses = showAllCourses ? allCourses : allCourses.slice(0, cpConfig.defaultVisibleCourses);
  const recommendedCourses = [...allCourses]
    .sort((a, b) => (parseFloat(b.rating) || 0) - (parseFloat(a.rating) || 0))
    .slice(0, 6);
  const visibleRecommendedCourses = showAllRecommended
    ? recommendedCourses
    : recommendedCourses.slice(0, 3);
  const featuredExperts = cpConfig.featuredExperts;

  const heroTitleParts = cpConfig.hero.title.split("{highlight}");
  const iconColorMap: Record<string, { tone: string; bg: string; border: string }> = {
    rose: { tone: "text-rose-300", bg: "bg-rose-500/20", border: "border-rose-300/45" },
    sky: { tone: "text-sky-300", bg: "bg-sky-500/20", border: "border-sky-300/45" },
    violet: { tone: "text-violet-300", bg: "bg-violet-500/20", border: "border-violet-300/45" },
    emerald: { tone: "text-emerald-300", bg: "bg-emerald-500/20", border: "border-emerald-300/45" },
    amber: { tone: "text-amber-300", bg: "bg-amber-500/20", border: "border-amber-300/45" },
    blue: { tone: "text-blue-300", bg: "bg-blue-500/20", border: "border-blue-300/45" },
  };
  const upcomingIcons: Record<string, typeof Lock> = {
    rose: Lock, sky: Rocket, violet: Users, emerald: Leaf, amber: Shield, blue: ShieldCheck,
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <main className="mx-auto max-w-[1760px] px-4 py-6 md:px-6 xl:px-8">
        <section className="grid gap-4 lg:grid-cols-[1.9fr_1fr]">
          <article className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
            <div className="relative min-h-[360px] p-6 md:p-8">
              <Image
                src={cpConfig.hero.backgroundImage}
                alt="Hero background"
                fill
                unoptimized
                className="object-cover opacity-35"
              />
              <div className="absolute inset-0 bg-linear-to-r from-[#091224] via-[#091224]/70 to-transparent" />
              <div className="relative z-10 max-w-md">
                <p className="inline-flex rounded-full border border-amber-300/40 bg-amber-500/10 px-2.5 py-1 text-xs font-semibold tracking-wide text-amber-200">
                  {cpConfig.hero.badgeText}
                </p>
                <h1 className="mt-4 text-4xl font-bold leading-tight md:text-5xl">
                  {heroTitleParts[0]}<span className="text-amber-300">{cpConfig.hero.highlightWord}</span>{heroTitleParts[1] || ""}
                </h1>
                <p className="mt-4 text-sm text-gray-200">
                  {cpConfig.hero.subtitle}
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <button className="rounded-full bg-amber-400 px-5 py-2.5 text-sm font-bold text-black">
                    {cpConfig.hero.ctaPrimary}
                  </button>
                  <button className="rounded-full border border-white/25 bg-black/40 px-5 py-2.5 text-sm font-semibold">
                    {cpConfig.hero.ctaSecondary}
                  </button>
                </div>
              </div>
            </div>
          </article>

          <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">Tutor-Led Sessions</h2>
              <button className="text-xs font-semibold text-amber-200">View All</button>
            </div>
            <div className="space-y-3">
              {cpConfig.tutorLed.map((session) => (
                <div
                  key={session.title}
                  className="flex items-start justify-between rounded-xl border border-white/10 bg-black/25 p-3"
                >
                  <div>
                    <p className="text-[10px] font-bold tracking-wide text-amber-300">{session.date}</p>
                    <p className="text-sm font-semibold">{session.title}</p>
                    <p className="text-xs text-gray-400">{session.time}</p>
                  </div>
                  <button className="rounded-full border border-blue-300/40 px-3 py-1 text-xs text-blue-200">
                    Join
                  </button>
                </div>
              ))}
            </div>
            <button className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-amber-300/25 bg-amber-500/10 py-2 text-xs font-semibold text-amber-200">
              <CalendarDays size={14} /> View Full Calendar
            </button>
          </article>
        </section>

        <section className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div className="grid gap-3 md:grid-cols-[1.4fr_repeat(4,0.8fr)_auto]">
            <label className="relative">
              <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-gray-500" />
              <input
                type="search"
                placeholder="Search courses..."
                className="w-full rounded-xl border border-white/10 bg-black/35 py-2.5 pl-10 pr-3 text-sm"
              />
            </label>
            <button
              type="button"
              className="inline-flex items-center justify-between rounded-xl border border-white/10 bg-black/35 px-3 py-2.5 text-sm text-gray-200"
            >
              Domain <ChevronDown size={14} />
            </button>
            <LevelFilterSelect variant="courses" />
            {["Duration", "Format"].map((label) => (
              <button
                key={label}
                type="button"
                className="inline-flex items-center justify-between rounded-xl border border-white/10 bg-black/35 px-3 py-2.5 text-sm text-gray-200"
              >
                {label} <ChevronDown size={14} />
              </button>
            ))}
            <button className="rounded-xl bg-amber-400 px-5 py-2.5 text-sm font-bold text-black">
              Search
            </button>
          </div>
        </section>

        <section className="mt-4 grid gap-4 lg:grid-cols-2">
          <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold">Recent Updates</h3>
              <button className="text-xs font-semibold text-amber-200">View All</button>
            </div>
            <div className="space-y-3">
              {cpConfig.recentUpdates.map((update) => (
                <Link
                  key={update.title}
                  href={update.href}
                  className="group block overflow-hidden rounded-xl border border-white/10 bg-black/30 transition hover:border-amber-300/40 hover:bg-black/20"
                >
                  <div className="flex items-center gap-3 p-3">
                    <div className="h-14 w-20 shrink-0 overflow-hidden rounded-lg border border-white/10">
                      <Image
                        src={update.image}
                        alt={update.title}
                        width={80}
                        height={56}
                        unoptimized
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                      />
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-300">
                        {update.subtitle}
                      </p>
                      <p className="mt-0.5 text-sm font-medium text-gray-100 group-hover:text-amber-100">
                        {update.title}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </article>
          <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold">Upcoming (Future)</h3>
              <div className="flex items-center gap-2">
                <button className="text-xs font-semibold text-amber-200">View All</button>
                <button className="inline-flex items-center gap-1 rounded-full border border-amber-300/40 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-200 transition hover:border-amber-200/60 hover:bg-amber-500/20">
                  <BellRing size={12} /> Notify Me
                </button>
              </div>
            </div>
            <div className="space-y-3">
              {cpConfig.upcomingItems.map((item) => {
                const colors = iconColorMap[item.iconColor] ?? iconColorMap.amber;
                const UpIcon = upcomingIcons[item.iconColor] ?? Lock;
                return (
                <div key={item.title} className="flex items-start gap-3 rounded-xl border border-white/10 bg-black/30 p-3">
                  <span className={`mt-0.5 rounded-lg border p-2 ${colors.border} ${colors.bg} ${colors.tone}`}>
                    <UpIcon size={14} />
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold">{item.title}</p>
                    <p className="text-xs text-gray-400">{item.time}</p>
                  </div>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 rounded-full border border-amber-300/35 bg-amber-500/10 px-2.5 py-1 text-[11px] font-semibold text-amber-200 transition hover:border-amber-200/60 hover:bg-amber-500/20"
                  >
                    <BellRing size={11} />
                    Notify
                  </button>
                </div>
                );
              })}
            </div>
          </article>
        </section>

        <section className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-bold">Categories (Sections)</h3>
            <button className="text-xs font-semibold text-amber-200">View All</button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
            {categories.map((category) => {
              const style = getCategoryVisual(category);
              const Icon = style.Icon;
              return (
                <Link key={category.slug} href={`/courses/category/${category.slug}`} className="block">
                <article className="rounded-xl border border-white/10 bg-linear-to-br from-white/[0.06] to-black/35 p-3 text-center transition hover:border-amber-300/40 hover:bg-white/5">
                  <div className="relative mx-auto mb-2 h-10 w-10">
                    {style.imageSrc ? (
                      <div className={`h-10 w-10 overflow-hidden rounded-full border-2 ${style.iconBorder} ${style.iconBg}`}>
                        <Image
                          src={style.imageSrc}
                          alt={`${category.label} icon`}
                          width={40}
                          height={40}
                          unoptimized
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ) : (
                      <div
                        className={`inline-flex h-10 w-10 items-center justify-center rounded-full border ${style.iconBorder} ${style.iconBg} ${style.iconTone}`}
                      >
                        <Icon size={16} />
                      </div>
                    )}
                    <span
                      className={`absolute -bottom-1 -right-1 inline-flex h-5 w-5 items-center justify-center rounded-full border border-black/20 bg-[#0b0b0b]/85 ${style.iconTone}`}
                    >
                      <Icon size={11} />
                    </span>
                  </div>
                  <p className="text-xs font-semibold">{category.label}</p>
                  <p className="mt-1 text-[11px] text-gray-400">12 Courses</p>
                </article>
                </Link>
              );
            })}
          </div>
        </section>

        <section id="all-courses" className="mt-4">
          <h2 className="text-xl font-bold md:text-2xl">All Courses</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {visibleCourses.map((course) => (
              <Link
                key={course.slug}
                href={`/courses/${course.slug}`}
                target="_blank"
                rel="noreferrer"
                className="group block"
              >
                <article className="rounded-xl border border-white/10 bg-white/[0.03] p-3 transition hover:border-amber-300/40 hover:bg-white/[0.05]">
                <div className="h-32 overflow-hidden rounded-lg border border-white/15 bg-black/35">
                  <Image
                    src={course.image}
                    alt={course.title}
                    width={400}
                    height={200}
                    unoptimized
                    className="h-full w-full object-cover"
                  />
                </div>
                  <p className="mt-3 text-sm font-semibold group-hover:text-amber-200">{course.title}</p>
                  <p className="mt-1 text-xs text-gray-400">
                    {course.level} • {course.duration} • {course.rating}★
                  </p>
                  <p className="mt-2 text-sm font-bold text-amber-200">{course.price}</p>
                </article>
              </Link>
            ))}
          </div>
          {allCourses.length > cpConfig.defaultVisibleCourses ? (
            <div className="mt-5 text-center">
              <Link
                href={showAllCourses ? "/courses#all-courses" : "/courses?view=all#all-courses"}
                className="inline-flex items-center justify-center rounded-full border border-amber-300/40 bg-amber-500/10 px-6 py-2 text-sm font-semibold text-amber-200 transition hover:border-amber-200/60 hover:bg-amber-500/20"
              >
                {showAllCourses ? "Show Less" : "View All"}
              </Link>
            </div>
          ) : null}
        </section>

        <section className="mt-4 grid gap-4 lg:grid-cols-2">
          <article className="rounded-2xl border border-amber-300/35 bg-linear-to-br from-[#0b1530] via-[#091224] to-[#050a16] p-5 shadow-[0_0_26px_rgba(245,158,11,0.2)]">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-bold text-amber-100">Featured Courses</h3>
              <button className="text-xs font-semibold text-amber-200">View All</button>
            </div>
            <p className="text-sm leading-7 text-amber-50/90">
              {cpConfig.featuredDescription}
            </p>
            <div className="mt-4 flex items-center justify-between gap-3">
              <div className="flex items-center">
                {featuredExperts.map((expert, idx) => (
                  <div key={expert.name} className={`group relative ${idx > 0 ? "-ml-3" : ""}`}>
                    <div className="h-11 w-11 overflow-hidden rounded-full border-2 border-amber-300/70 bg-white/10 shadow-[0_0_18px_rgba(245,158,11,0.28)]">
                      <Image
                        unoptimized
                        src={expert.photo}
                        alt={expert.name}
                        width={44}
                        height={44}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <span className="pointer-events-none absolute -bottom-6 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded-md border border-amber-300/40 bg-[#0a1224] px-2 py-0.5 text-[10px] text-amber-100 group-hover:block">
                      {expert.name}
                    </span>
                  </div>
                ))}
              </div>
              <button
                type="button"
                className="inline-flex items-center rounded-full border border-amber-300/50 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-100 transition hover:border-amber-200/70 hover:bg-amber-500/20"
              >
                + more experts
              </button>
            </div>
          </article>
          <article className="rounded-2xl border border-amber-300/35 bg-linear-to-br from-[#0b1530] via-[#091224] to-[#050a16] p-5 shadow-[0_0_26px_rgba(245,158,11,0.2)]">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-bold text-amber-100">Recommended for You</h3>
              {recommendedCourses.length > 3 ? (
                <Link
                  href={showAllRecommended ? "/courses#recommended-courses" : "/courses?rec=all#recommended-courses"}
                  className="text-xs font-semibold text-amber-200"
                >
                  {showAllRecommended ? "Show Less" : "View All"}
                </Link>
              ) : (
                <span className="text-xs font-semibold text-amber-200">Top Picks</span>
              )}
            </div>
            <p className="text-sm text-amber-50/90">Based on your interests and enrolled programs.</p>
            <div id="recommended-courses" className="mt-3 grid gap-2 md:grid-cols-3">
              {visibleRecommendedCourses.map((course) => (
                <Link
                  key={course.slug}
                  href={`/courses/${course.slug}`}
                  className="block overflow-hidden rounded-lg border border-amber-300/25 bg-black/25 transition hover:border-amber-300/45 hover:bg-black/35"
                >
                  <div className="h-24 w-full overflow-hidden">
                    <Image
                      src={course.image}
                      alt={course.title}
                      width={400}
                      height={96}
                      unoptimized
                      className="h-full w-full object-cover"
                    />
                  </div>
                </Link>
              ))}
            </div>
          </article>
        </section>

        <section className="mt-4 grid gap-4 lg:grid-cols-2">
          <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold">Not sure what to learn?</h3>
                <p className="mt-2 text-sm text-gray-300">
                  Answer a few questions and we will suggest the best learning path for you.
                </p>
                <button className="mt-4 rounded-full bg-amber-400 px-4 py-2 text-sm font-bold text-black">
                  Start Assessment
                </button>
              </div>
              <div className="hidden sm:block">
                <span className="qmark-hero inline-block text-9xl font-black leading-none text-amber-200 drop-shadow-[0_0_22px_rgba(251,191,36,0.6)]">
                  ?
                </span>
              </div>
            </div>
          </article>
          <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-bold">FAQ</h3>
              <button className="text-xs font-semibold text-amber-200">View All</button>
            </div>
            <div className="space-y-2">
              {cpConfig.faqs.map((faq) => (
                <div key={faq.question} className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm">
                  {faq.question}
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className="mt-4 overflow-hidden rounded-2xl border border-amber-300/30 bg-linear-to-r from-[#7a4f00]/40 via-[#241400] to-[#7a4f00]/30">
          <div className="flex flex-col items-center gap-6 p-6 md:flex-row md:p-8">
            <div className="flex flex-1 flex-col items-center text-center">
              <h2 className="text-2xl font-bold md:text-3xl">{cpConfig.cta.heading}</h2>
              <p className="mt-2 max-w-xl text-center text-gray-200">
                {cpConfig.cta.description}
              </p>
              <button className="mt-5 inline-flex items-center gap-2 rounded-full bg-amber-400 px-5 py-2.5 text-sm font-bold text-black transition hover:scale-105 hover:shadow-lg hover:shadow-amber-400/30">
                {cpConfig.cta.buttonText} <ChevronRight size={16} />
              </button>
            </div>
            <div className="relative hidden w-56 shrink-0 md:block lg:w-64">
              <Image
                src={cpConfig.cta.image}
                alt="Graduation cap & diploma"
                width={280}
                height={220}
                className="drop-shadow-[0_0_24px_rgba(212,160,23,0.45)]"
                style={{ objectFit: "contain" }}
              />
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
