import Image from "next/image";
import Link from "next/link";
import { CoursePrice } from "@/components/CoursePrice";
import type { ComponentType } from "react";
import LevelFilterSelect from "@/components/LevelFilterSelect";
import { getManagedCourses } from "@/lib/server/course-catalog";
import { readAdminContent } from "@/lib/server/content-store";
import {
  BadgeCheck,
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
  Sprout,
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
    Icon: ComponentType<{ size?: number; className?: string }>;
    iconTone: string;
    iconBg: string;
    iconBorder: string;
  }
> = {
  "cyber-security": {
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
    Icon: ScanSearch,
    iconTone: "text-cyan-300",
    iconBg: "bg-cyan-500/20",
    iconBorder: "border-cyan-300/45",
  },
  "medical-devices": {
    Icon: Stethoscope,
    iconTone: "text-rose-300",
    iconBg: "bg-rose-500/20",
    iconBorder: "border-rose-300/45",
  },
  "workplace-compliance": {
    Icon: Gavel,
    iconTone: "text-blue-300",
    iconBg: "bg-blue-500/20",
    iconBorder: "border-blue-300/45",
  },
  "skill-development-framework": {
    Icon: BadgeCheck,
    iconTone: "text-fuchsia-300",
    iconBg: "bg-fuchsia-500/20",
    iconBorder: "border-fuchsia-300/45",
  },
  "mechanical-engineering-hvac-and-refrigeration": {
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
    Icon: ComponentType<{ size?: number; className?: string }>;
    iconTone: string;
    iconBg: string;
    iconBorder: string;
  };
}> = [
  {
    test: /(food|nutrition|haccp)/i,
    visual: { Icon: Salad, iconTone: "text-orange-300", iconBg: "bg-orange-500/20", iconBorder: "border-orange-300/45" },
  },
  {
    test: /(cyber|security|ethical-hacking|infosec)/i,
    visual: { Icon: ShieldCheck, iconTone: "text-sky-300", iconBg: "bg-sky-500/20", iconBorder: "border-sky-300/45" },
  },
  {
    test: /(esg|environment|sustainability)/i,
    visual: { Icon: Leaf, iconTone: "text-green-300", iconBg: "bg-green-500/20", iconBorder: "border-green-300/45" },
  },
  {
    test: /(medical|device|health)/i,
    visual: { Icon: Microscope, iconTone: "text-rose-300", iconBg: "bg-rose-500/20", iconBorder: "border-rose-300/45" },
  },
  {
    test: /(compliance|legal|ethics|audit)/i,
    visual: { Icon: Gavel, iconTone: "text-blue-300", iconBg: "bg-blue-500/20", iconBorder: "border-blue-300/45" },
  },
  {
    test: /(skill|capability|framework|workforce)/i,
    visual: { Icon: BadgeCheck, iconTone: "text-fuchsia-300", iconBg: "bg-fuchsia-500/20", iconBorder: "border-fuchsia-300/45" },
  },
  {
    test: /(mechanical|hvac|refrigeration)/i,
    visual: { Icon: Wrench, iconTone: "text-lime-300", iconBg: "bg-lime-500/20", iconBorder: "border-lime-300/45" },
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
    Icon: FlaskConical,
    iconTone: "text-pink-300",
    iconBg: "bg-pink-500/20",
    iconBorder: "border-pink-300/45",
  };
}

export default async function CoursesPage() {
  const adminContent = await readAdminContent();
  const categories = adminContent.categories
    .filter((category) => category.isActive)
    .map((category) => ({ label: category.title, slug: category.slug }));
  const allCourses = await getManagedCourses();

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <main className="mx-auto max-w-[1760px] px-4 py-6 md:px-6 xl:px-8">
        <section className="grid gap-4 lg:grid-cols-[1.9fr_1fr]">
          <article className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
            <div className="relative min-h-[360px] p-6 md:p-8">
              <Image
                src="https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1400&q=80"
                alt="Cyber security poster"
                fill
                unoptimized
                className="object-cover opacity-35"
              />
              <div className="absolute inset-0 bg-linear-to-r from-[#091224] via-[#091224]/70 to-transparent" />
              <div className="relative z-10 max-w-md">
                <p className="inline-flex rounded-full border border-amber-300/40 bg-amber-500/10 px-2.5 py-1 text-xs font-semibold tracking-wide text-amber-200">
                  NEW PROGRAM
                </p>
                <h1 className="mt-4 text-4xl font-bold leading-tight md:text-5xl">
                  Advanced <span className="text-amber-300">Cyber Security</span> Professional
                </h1>
                <p className="mt-4 text-sm text-gray-200">
                  Master the skills to protect systems, detect threats, and respond like a pro.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <button className="rounded-full bg-amber-400 px-5 py-2.5 text-sm font-bold text-black">
                    Explore Program
                  </button>
                  <button className="rounded-full border border-white/25 bg-black/40 px-5 py-2.5 text-sm font-semibold">
                    View Details
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
              {[
                ["MAY 24", "Introduction to IoT Security", "10:00 AM - 11:30 AM"],
                ["MAY 25", "Web Application Penetration Testing", "02:00 PM - 03:30 PM"],
                ["MAY 26", "Network Security Fundamentals", "11:00 AM - 12:30 PM"],
              ].map(([date, title, time]) => (
                <div
                  key={title}
                  className="flex items-start justify-between rounded-xl border border-white/10 bg-black/25 p-3"
                >
                  <div>
                    <p className="text-[10px] font-bold tracking-wide text-amber-300">{date}</p>
                    <p className="text-sm font-semibold">{title}</p>
                    <p className="text-xs text-gray-400">{time}</p>
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
              {[
                "ESG Fundamentals - New cohort open",
                "Cybersecurity Workshop Recap published",
                "HVAC System Optimization case study added",
              ].map((u) => (
                <div key={u} className="rounded-xl border border-white/10 bg-black/30 p-3 text-sm">
                  {u}
                </div>
              ))}
            </div>
          </article>
          <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold">Upcoming (Future)</h3>
              <button className="text-xs font-semibold text-amber-200">View All</button>
            </div>
            <div className="space-y-3">
              {[
                { Icon: Lock, title: "Live Workshop: Incident Response", time: "10:00 AM - 12:00 PM" },
                { Icon: Rocket, title: "New Course Launch: AI for Business", time: "Launching soon" },
                { Icon: Users, title: "Webinar: Future of Work", time: "11:00 AM - 12:30 PM" },
              ].map(({ Icon, title, time }) => (
                <div key={title} className="flex items-start gap-3 rounded-xl border border-white/10 bg-black/30 p-3">
                  <span className="mt-0.5 rounded-lg border border-white/15 bg-white/5 p-2 text-amber-200">
                    <Icon size={14} />
                  </span>
                  <div>
                    <p className="text-sm font-semibold">{title}</p>
                    <p className="text-xs text-gray-400">{time}</p>
                  </div>
                </div>
              ))}
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
                  <div
                    className={`mx-auto mb-2 inline-flex h-9 w-9 items-center justify-center rounded-full border ${style.iconBorder} ${style.iconBg} ${style.iconTone}`}
                  >
                    <Icon size={15} />
                  </div>
                  <p className="text-xs font-semibold">{category.label}</p>
                  <p className="mt-1 text-[11px] text-gray-400">12 Courses</p>
                </article>
                </Link>
              );
            })}
          </div>
        </section>

        <section className="mt-4">
          <h2 className="text-xl font-bold md:text-2xl">All Courses</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {allCourses.map((course) => (
              <Link
                key={course.slug}
                href={`/courses/${course.slug}`}
                target="_blank"
                rel="noreferrer"
                className="group block"
              >
                <article className="rounded-xl border border-white/10 bg-white/[0.03] p-3 transition hover:border-amber-300/40 hover:bg-white/[0.05]">
                <div className="relative h-32 overflow-hidden rounded-lg border border-white/15 bg-black/35">
                  <Image
                    src={course.image}
                    alt={course.title}
                    fill
                    unoptimized
                    className="object-cover"
                  />
                </div>
                  <p className="mt-3 text-sm font-semibold group-hover:text-amber-200">{course.title}</p>
                  <p className="mt-1 text-xs text-gray-400">
                    {course.level} • {course.duration} • {course.rating}★
                  </p>
                  <CoursePrice label={course.price} className="mt-2 text-sm font-bold text-amber-200" />
                </article>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-4 grid gap-4 lg:grid-cols-2">
          <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-bold">Featured Courses</h3>
              <button className="text-xs font-semibold text-amber-200">View All</button>
            </div>
            <p className="text-sm text-gray-300">Handpicked courses by industry experts.</p>
          </article>
          <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-bold">Recommended for You</h3>
              <button className="text-xs font-semibold text-amber-200">View All</button>
            </div>
            <p className="text-sm text-gray-300">
              Based on your interests and enrolled programs.
            </p>
          </article>
        </section>

        <section className="mt-4 grid gap-4 lg:grid-cols-2">
          <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <h3 className="text-lg font-bold">Not sure what to learn?</h3>
            <p className="mt-2 text-sm text-gray-300">
              Answer a few questions and we will suggest the best learning path for you.
            </p>
            <button className="mt-4 rounded-full bg-amber-400 px-4 py-2 text-sm font-bold text-black">
              Start Assessment
            </button>
          </article>
          <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-bold">FAQ</h3>
              <button className="text-xs font-semibold text-amber-200">View All</button>
            </div>
            <div className="space-y-2">
              {[
                "Are these courses industry-recognized?",
                "Can I switch my learning plan anytime?",
                "Do I get certificates after course completion?",
              ].map((faq) => (
                <div key={faq} className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm">
                  {faq}
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className="mt-4 overflow-hidden rounded-2xl border border-amber-300/30 bg-linear-to-r from-[#7a4f00]/40 via-[#241400] to-[#7a4f00]/30">
          <div className="flex flex-col items-center gap-6 p-6 md:flex-row md:p-8">
            <div className="flex flex-1 flex-col items-center text-center">
              <h2 className="text-2xl font-bold md:text-3xl">Ready to Start Your Learning Journey?</h2>
              <p className="mt-2 max-w-xl text-center text-gray-200">
                Choose a path, build practical capabilities, and earn credentials that matter.
              </p>
              <button className="mt-5 inline-flex items-center gap-2 rounded-full bg-amber-400 px-5 py-2.5 text-sm font-bold text-black transition hover:scale-105 hover:shadow-lg hover:shadow-amber-400/30">
                Get Started Now <ChevronRight size={16} />
              </button>
            </div>
            <div className="relative hidden w-56 shrink-0 md:block lg:w-64">
              <Image
                src="/Untitled (Label).png"
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
