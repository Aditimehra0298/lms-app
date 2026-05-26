"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  Award,
  BadgeCheck,
  Bell,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock3,
  CircleDot,
  CreditCard,
  Download,
  FileText,
  Flame,
  GraduationCap,
  HelpCircle,
  ListChecks,
  Mail,
  Megaphone,
  MessageSquare,
  Rocket,
  Share2,
  Shield,
  Send,
  ShieldCheck,
  Sparkles,
  Trophy,
  Users,
  Zap,
} from "lucide-react";
import { AdminContent, defaultAdminContent, type ManagedCourse } from "@/lib/content-schema";
import { MyLearningLiveHub } from "@/components/MyLearningLiveHub";
import { examLinksFromManagedCourse, resolveLearningCourseSlug } from "@/lib/my-learning-exams";
import { liveTutorCourseHref } from "@/lib/tutor-led-routes";

export const dynamic = "force-dynamic";

const tabs = [
  "dashboard",
  "overview",
  "learning",
  "progress",
  "achievements",
  "certificates",
  "events",
  "calendar",
];

const learningCourses = [
  {
    title: "Advanced Cyber Security Professional",
    modules: 12,
    duration: "40h 30m",
    completed: 8,
    status: "In Progress",
    action: "Continue",
    tone: "blue",
  },
  {
    title: "ESG Fundamentals",
    modules: 10,
    duration: "20h 15m",
    completed: 10,
    status: "Completed",
    action: "View Certificate",
    tone: "green",
  },
  {
    title: "Network Security Essentials",
    modules: 9,
    duration: "18h 45m",
    completed: 5,
    status: "In Progress",
    action: "Continue",
    tone: "violet",
  },
  {
    title: "Ethical Hacking with Tools",
    modules: 8,
    duration: "16h 30m",
    completed: 2,
    status: "In Progress",
    action: "Continue",
    tone: "amber",
  },
  {
    title: "Python for Data Science",
    modules: 10,
    duration: "22h 10m",
    completed: 0,
    status: "Not Started",
    action: "Start Course",
    tone: "sky",
  },
  {
    title: "Workplace Compliance",
    modules: 6,
    duration: "10h 20m",
    completed: 6,
    status: "Completed",
    action: "View Certificate",
    tone: "slate",
  },
];

const toCourseSlug = (value: string) =>
  value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export default function MyLearningPage() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [activeTab, setActiveTab] = useState("overview");
  const isAchievements = activeTab === "achievements";
  const isDashboard = activeTab === "dashboard";
  const isLearning = activeTab === "learning";
  const isLive = activeTab === "live";
  const isAssignments = activeTab === "assignments";
  const isCommunity = activeTab === "community";
  const isCertificates = activeTab === "certificates";
  const isSubscriptions = activeTab === "subscriptions";
  const [adminContent, setAdminContent] = useState<AdminContent>(defaultAdminContent);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 20_000);
    (async () => {
      try {
        const res = await fetch("/api/admin/content", { cache: "no-store", signal: controller.signal });
        if (!res.ok) throw new Error("admin-content");
        const data = (await res.json()) as AdminContent;
        if (!cancelled) {
          setAdminContent({
            ...defaultAdminContent,
            ...data,
          });
        }
      } catch {
        if (!cancelled) setAdminContent(defaultAdminContent);
      } finally {
        window.clearTimeout(timeoutId);
      }
    })();
    return () => {
      cancelled = true;
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, []);

  useEffect(() => {
    setActiveTab(searchParams.get("tab") ?? "overview");
  }, [searchParams, pathname]);
  const [purchasedCourses, setPurchasedCourses] = useState<
    Array<{
      slug?: string;
      title: string;
      modules: number;
      duration: string;
      completed: number;
      status: string;
      action: string;
      tone: string;
      deliveryKind?: "managed" | "tutor-led";
    }>
  >([]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("sft_purchased_courses");
      if (!raw) return;
      const parsed = JSON.parse(raw) as Array<{
        slug?: string;
        title: string;
        modules: number;
        duration: string;
        completed: number;
        status: string;
        action: string;
        tone: string;
        deliveryKind?: "managed" | "tutor-led";
      }>;
      if (Array.isArray(parsed)) {
        setPurchasedCourses(parsed);
      }
    } catch {
      setPurchasedCourses([]);
    }
  }, []);

  const [examCatalog, setExamCatalog] = useState<ManagedCourse[] | undefined>(undefined);

  useEffect(() => {
    if (!isLearning) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/courses", { cache: "no-store" });
        if (!res.ok) throw new Error("courses");
        const data = (await res.json()) as { courses?: ManagedCourse[] };
        if (!cancelled) setExamCatalog(Array.isArray(data.courses) ? data.courses : []);
      } catch {
        if (!cancelled) setExamCatalog([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isLearning]);

  const examsByCourse = useMemo(() => {
    if (!examCatalog?.length) return [];
    return examCatalog
      .map((c) => ({ course: c, links: examLinksFromManagedCourse(c) }))
      .filter((x) => x.links.length > 0);
  }, [examCatalog]);

  const baseLearningCourses = adminContent.learningCourses.length
    ? adminContent.learningCourses
    : learningCourses;
  const courseRowKey = (c: { title: string; slug?: string }) =>
    (c.slug?.trim() || c.title.trim()).toLowerCase();

  const coursesForLearning = [...purchasedCourses, ...baseLearningCourses].filter(
    (course, index, all) => all.findIndex((item) => courseRowKey(item) === courseRowKey(course)) === index,
  );

  const purchasedTutorLedRows = useMemo(
    () => purchasedCourses.filter((c) => c.deliveryKind === "tutor-led" && c.slug?.trim()),
    [purchasedCourses],
  );

  const enrolledExamSlugs = useMemo(() => {
    if (!examCatalog?.length) return new Set<string>();
    const s = new Set<string>();
    for (const lc of coursesForLearning) {
      const slug = resolveLearningCourseSlug(lc, examCatalog, toCourseSlug);
      if (slug) s.add(slug);
    }
    return s;
  }, [examCatalog, coursesForLearning]);

  const learningHrefFor = (course: { title: string; slug?: string }) => {
    const direct = course.slug?.trim();
    if (direct) return `/my-learning/course/${direct}`;
    const catalog = examCatalog?.length ? examCatalog : adminContent.managedCourses ?? [];
    const resolved = resolveLearningCourseSlug(course, catalog, toCourseSlug);
    return `/my-learning/course/${resolved ?? toCourseSlug(course.title)}`;
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <main className="mx-auto w-full max-w-[1760px] px-4 py-6 md:px-6 xl:px-8">
        {isDashboard ? (
          <section className="rounded-2xl border border-white/10 bg-[#0a0a0a] p-4 shadow-[0_0_24px_rgba(0,0,0,0.35)]">
            <div className="grid gap-3 lg:grid-cols-[1fr_1.5fr]">
              <article className="rounded-xl border border-white/10 bg-linear-to-br from-violet-500/15 via-[#101933] to-[#0a1023] p-4">
                <p className="text-3xl font-bold">
                  Good Morning, <span className="text-amber-300">Aditi!</span> 👋
                </p>
                <p className="mt-1 text-sm text-amber-200">9:24 AM • Friday, May 16, 2025</p>
                <h2 className="mt-3 text-2xl font-bold">Welcome to SF Trainings</h2>
                <p className="mt-1 text-sm text-gray-300">
                  Elevate your professional skills with industry-led courses.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button className="rounded-md bg-amber-500 px-4 py-2 text-sm font-semibold">
                    Explore More Courses
                  </button>
                  <button className="rounded-md border border-white/20 bg-white/5 px-4 py-2 text-sm">
                    View My Courses
                  </button>
                </div>
              </article>

              <article className="relative overflow-hidden rounded-xl border border-white/10 bg-linear-to-r from-black/40 via-[#121c39] to-[#0d1530] p-4">
                <p className="inline-flex rounded bg-white/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-amber-100">
                  Featured Course
                </p>
                <h3 className="mt-3 text-4xl font-bold">
                  Advanced <span className="text-amber-300">Cyber Security</span>
                </h3>
                <p className="mt-2 max-w-md text-sm text-gray-300">
                  Master ethical hacking, threat detection, and secure the digital future.
                </p>
                <Link
                  href={learningHrefFor(coursesForLearning[0] ?? { title: "food-safety-course" })}
                  className="mt-4 inline-flex rounded-md border border-white/15 bg-black/30 px-4 py-2 text-sm font-semibold"
                >
                  Start Learning
                </Link>
                <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-amber-500/20 blur-3xl" />
              </article>
            </div>

            <div className="mt-4 rounded-xl border border-white/10 bg-black/30 p-3">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-xl font-bold">Explore Courses</h3>
                <button className="text-xs text-amber-200">View All Courses</button>
              </div>
              <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">
                {coursesForLearning.slice(0, 5).map((course) => (
                  <article key={course.title} className="rounded-lg border border-white/10 bg-black/25 p-3">
                    <div className="h-20 rounded-md border border-dashed border-white/20 bg-black/30 text-center text-[10px] leading-[80px] text-gray-500">
                      Course Poster
                    </div>
                    <p className="mt-2 line-clamp-2 text-base font-semibold">{course.title}</p>
                    <p className="mt-1 text-xs text-gray-400">
                      {course.modules} lessons • {course.duration}
                    </p>
                    <Link
                      href={learningHrefFor(course)}
                      className="mt-2 inline-flex w-full items-center justify-center rounded-md border border-white/15 py-1 text-xs text-amber-200"
                    >
                      View Course
                    </Link>
                  </article>
                ))}
              </div>
            </div>

            <div className="mt-4 grid gap-3 xl:grid-cols-[1fr_1.1fr]">
              <article className="rounded-xl border border-white/10 bg-black/30 p-3">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-xl font-bold">Recommended For You</h3>
                  <button className="text-xs text-amber-200">View All</button>
                </div>
                <div className="space-y-2">
                  {coursesForLearning.slice(0, 3).map((course) => {
                    const percentage = Math.round((course.completed / course.modules) * 100);
                    return (
                      <div key={`recommended-${course.title}`} className="rounded-lg border border-white/10 bg-black/20 p-3">
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-sm font-semibold">{course.title}</p>
                          <span className="text-xs text-gray-400">{course.duration}</span>
                        </div>
                        <div className="mt-2 h-1.5 rounded-full bg-white/10">
                          <div className="h-1.5 rounded-full bg-violet-400" style={{ width: `${percentage}%` }} />
                        </div>
                        <p className="mt-1 text-xs text-gray-400">{percentage}% Completed</p>
                      </div>
                    );
                  })}
                </div>
              </article>

              <article className="rounded-xl border border-white/10 bg-black/30 p-3">
                <h3 className="text-xl font-bold">Quick Actions</h3>
                <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {[
                    ["Join Tutor-Led Session", Rocket, "View & Join"],
                    ["View Calendar", CalendarDays, "See Schedule"],
                    ["My Assignments", ListChecks, "View Tasks"],
                    ["Achievements", Trophy, "View Badges"],
                    ["Certificate Records", Award, "View All"],
                    ["Community", MessageSquare, "Join Now"],
                  ].map(([label, Icon, cta]) => (
                    <div key={label as string} className="rounded-lg border border-white/10 bg-black/25 p-3">
                      <p className="inline-flex items-center gap-2 text-sm font-semibold text-amber-100">
                        <Icon size={15} className="text-amber-300" />
                        {label as string}
                      </p>
                      <button className="mt-2 text-xs text-amber-200">{cta as string}</button>
                    </div>
                  ))}
                </div>
              </article>
            </div>

            <div className="mt-4 rounded-xl border border-white/10 bg-linear-to-r from-[#15163a] via-[#1c1744] to-[#131a39] p-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-[220px]">
                  <p className="text-sm text-gray-300">Resume Learning</p>
                  <p className="mt-1 text-base font-semibold">
                    {coursesForLearning[0]?.title ?? "Continue your learning journey"}
                  </p>
                  <div className="mt-2 h-1.5 rounded-full bg-white/10">
                    <div
                      className="h-1.5 rounded-full bg-violet-400"
                      style={{
                        width: `${Math.round(((coursesForLearning[0]?.completed ?? 0) / (coursesForLearning[0]?.modules ?? 1)) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
                <Link
                  href={learningHrefFor(coursesForLearning[0] ?? { title: "food-safety-course" })}
                  className="rounded-md bg-amber-500 px-4 py-2 text-sm font-semibold"
                >
                  Continue Learning
                </Link>
              </div>
            </div>
          </section>
        ) : isLive ? (
          <MyLearningLiveHub
            enrollments={purchasedTutorLedRows.map((c) => ({ slug: c.slug!, title: c.title }))}
          />
        ) : isCertificates ? (
          <section className="rounded-2xl border border-white/10 bg-[#0a0a0a] p-4 shadow-[0_0_24px_rgba(0,0,0,0.35)]">
            <div className="grid gap-4 xl:grid-cols-[1.7fr_0.7fr]">
              <section>
                <h1 className="text-4xl font-bold">My Certificates</h1>
                <p className="mt-1 text-sm text-gray-300">
                  View and download all the certificates you&apos;ve earned from SF Trainings.
                </p>

                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {[
                    [Award, "08", "Total Certificates", "Certificates Earned"],
                    [CheckCircle2, "08", "Courses Completed", "Courses"],
                    [CalendarDays, "May 18, 2025", "Latest Certificate", "Network Security Test"],
                    [Download, "08", "Available to Download", "Certificates"],
                  ].map(([Icon, value, label, hint]) => (
                    <article key={label as string} className="rounded-xl border border-white/10 bg-black/30 p-3">
                      <p className="inline-flex items-center gap-1 text-xs text-gray-300">
                        <Icon size={13} className="text-amber-300" /> {label as string}
                      </p>
                      <p className="mt-2 text-3xl font-bold">{value as string}</p>
                      <p className="text-xs text-gray-400">{hint as string}</p>
                    </article>
                  ))}
                </div>

                <div className="mt-4 rounded-xl border border-white/10 bg-black/30 p-3">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex gap-2 text-xs">
                      {["All Certificates", "Completed", "In Progress", "Not Eligible"].map((f, idx) => (
                        <button
                          key={f}
                          className={`rounded-full px-3 py-1.5 ${
                            idx === 0
                              ? "bg-amber-500/20 text-amber-100"
                              : "border border-white/10 bg-white/5 text-gray-300"
                          }`}
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input
                        placeholder="Search certificates..."
                        className="rounded-md border border-white/10 bg-black/25 px-3 py-1.5 text-xs"
                      />
                      <button className="rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-gray-300">
                        Most Recent
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {[
                      ["Network Security Test", "SFT-NS-2025-0518", "May 18, 2025", "Completed"],
                      ["Ethical Hacking with Tools", "SFT-EH-2025-0515", "May 15, 2025", "Completed"],
                      ["Advanced Cyber Security", "SFT-ACS-2025-0512", "May 12, 2025", "Completed"],
                      ["Cyber Security Basics Quiz", "SFT-CSBQ-2025-0510", "May 10, 2025", "Completed"],
                    ].map(([title, credential, issued, status]) => (
                      <article
                        key={title}
                        className="grid gap-3 rounded-xl border border-white/10 bg-black/20 p-3 xl:grid-cols-[130px_1fr_120px_180px]"
                      >
                        <div className="h-20 rounded-lg border border-dashed border-white/20 bg-black/30 text-center text-[10px] leading-[80px] text-gray-400">
                          Certificate
                        </div>
                        <div>
                          <p className="text-lg font-semibold">{title}</p>
                          <p className="mt-1 text-xs text-gray-400">Credential ID: {credential}</p>
                          <p className="text-xs text-gray-400">Issued on: {issued}</p>
                        </div>
                        <div className="text-sm">
                          <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs text-emerald-200">
                            Verified
                          </span>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <button className="rounded-md bg-violet-500 px-3 py-1 text-xs font-semibold">
                            Download Certificate
                          </button>
                          <button className="rounded-md border border-white/20 px-3 py-1 text-xs text-gray-200">
                            View Details
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              </section>

              <aside className="space-y-3">
                <article className="rounded-xl border border-white/10 bg-black/30 p-3">
                  <h3 className="inline-flex items-center gap-1 font-semibold">
                    <Shield size={14} className="text-emerald-300" /> Certificate Verification
                  </h3>
                  <p className="mt-1 text-xs text-gray-400">
                    All certificates are securely verified and blockchain protected.
                  </p>
                  <button className="mt-2 rounded-md border border-white/15 px-3 py-1 text-xs text-amber-100">
                    Verify Certificate
                  </button>
                </article>

                <article className="rounded-xl border border-white/10 bg-black/30 p-3">
                  <h3 className="inline-flex items-center gap-1 font-semibold">
                    <HelpCircle size={14} className="text-amber-300" /> Need Help?
                  </h3>
                  <p className="mt-1 text-xs text-gray-400">
                    If you face any issues with your certificate, our support team is here to help.
                  </p>
                  <button className="mt-2 rounded-md border border-white/15 px-3 py-1 text-xs text-amber-100">
                    Contact Support
                  </button>
                </article>

                <article className="rounded-xl border border-white/10 bg-black/30 p-3">
                  <h3 className="inline-flex items-center gap-1 font-semibold">
                    <Share2 size={14} className="text-amber-300" /> Share Your Achievement
                  </h3>
                  <p className="mt-1 text-xs text-gray-400">
                    Showcase your success! Share your certificate on LinkedIn and other platforms.
                  </p>
                  <div className="mt-2 flex gap-2">
                    <button className="rounded-md border border-white/10 bg-white/5 px-3 py-1 text-xs">LinkedIn</button>
                    <button className="rounded-md border border-white/10 bg-white/5 px-3 py-1 text-xs">X</button>
                    <button className="rounded-md border border-white/10 bg-white/5 px-3 py-1 text-xs">Download</button>
                  </div>
                </article>
              </aside>
            </div>
          </section>
        ) : isSubscriptions ? (
          <section className="rounded-2xl border border-white/10 bg-[#0a0a0a] p-4 shadow-[0_0_24px_rgba(0,0,0,0.35)]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="text-4xl font-bold">Subscription Plans</h1>
                <p className="mt-1 text-sm text-gray-300">
                  Choose the perfect plan to continue your learning journey with SF Trainings.
                </p>
              </div>
              <button className="rounded-md border border-white/15 bg-white/5 px-3 py-1.5 text-sm text-amber-100">
                Manage Plan
              </button>
            </div>

            <div className="mt-4 grid gap-3 xl:grid-cols-[1.5fr_1fr_1fr_1fr]">
              <article className="rounded-xl border border-emerald-300/25 bg-emerald-500/10 p-4">
                <p className="inline-flex rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs text-emerald-100">
                  Active Plan
                </p>
                <h2 className="mt-2 text-2xl font-bold">Individual Annual Plan</h2>
                <p className="text-sm text-gray-300">
                  Your plan is active and valid until <span className="text-emerald-200">May 20, 2026</span>
                </p>
              </article>
              {[
                [ListChecks, "Unlimited Access", "All courses & resources"],
                [BadgeCheck, "Certificate Included", "Earn recognized certificates"],
                [Zap, "Priority Support", "Get help when you need it"],
              ].map(([Icon, title, desc]) => (
                <article key={title as string} className="rounded-xl border border-white/10 bg-black/30 p-4">
                  <p className="inline-flex items-center gap-2 text-sm font-semibold">
                    <Icon size={14} className="text-amber-300" /> {title as string}
                  </p>
                  <p className="mt-1 text-xs text-gray-400">{desc as string}</p>
                </article>
              ))}
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
              <div className="flex gap-2 text-xs">
                {["Individual Plans", "Organization Plans"].map((f, idx) => (
                  <button
                    key={f}
                    className={`rounded-full px-3 py-1.5 ${
                      idx === 0
                        ? "bg-amber-500/20 text-amber-100"
                        : "border border-white/10 bg-white/5 text-gray-300"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
              <div className="text-xs text-gray-300">
                Monthly <span className="mx-2 text-amber-200">●</span> Annually
              </div>
            </div>

            <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_1fr_1fr_0.95fr]">
              {[
                ["Basic", "Perfect for learners getting started", "₹999", "Save 17%", ["Access to 50+ courses", "Standard learning resources", "Community access", "Certificate of completion"]],
                ["Pro", "Best for serious learners", "₹1,999", "Save 20%", ["Everything in Basic", "Access to 200+ courses", "Tutor-led sessions access", "Priority support", "Downloadable resources"]],
                ["Premium", "For advanced professionals", "₹3,499", "Save 17%", ["Everything in Pro", "Unlimited course access", "1:1 mentor sessions", "Exclusive workshops", "Priority support"]],
              ].map(([name, subtitle, price, save, features], idx) => (
                <article
                  key={name as string}
                  className={`rounded-xl border p-4 ${
                    idx === 1
                      ? "border-white/15 bg-violet-500/10 shadow-[0_0_22px_rgba(139,92,246,0.35)]"
                      : "border-white/10 bg-black/30"
                  }`}
                >
                  {idx === 1 && (
                    <p className="mb-2 inline-flex rounded-full bg-violet-500/30 px-2 py-0.5 text-[10px] text-amber-100">
                      Most Popular
                    </p>
                  )}
                  <h3 className="text-2xl font-bold">{name as string}</h3>
                  <p className="text-xs text-gray-400">{subtitle as string}</p>
                  <p className="mt-3 text-4xl font-bold">
                    {price as string}
                    <span className="ml-1 text-sm text-gray-400">/month</span>
                  </p>
                  <p className="mt-1 inline-flex rounded bg-emerald-500/20 px-2 py-0.5 text-xs text-emerald-200">
                    {save as string}
                  </p>
                  <ul className="mt-3 space-y-1 text-sm text-gray-300">
                    {(features as string[]).map((feature) => (
                      <li key={feature}>• {feature}</li>
                    ))}
                  </ul>
                  <button className="mt-4 w-full rounded-md bg-violet-500 px-3 py-2 text-sm font-semibold">
                    Buy Now
                  </button>
                </article>
              ))}

              <aside className="space-y-3">
                <article className="rounded-xl border border-white/10 bg-black/30 p-3">
                  <h3 className="font-semibold">Why Upgrade?</h3>
                  <ul className="mt-2 space-y-1 text-xs text-gray-300">
                    <li>Unlimited learning access</li>
                    <li>Recognized certificates</li>
                    <li>Learn from experts</li>
                    <li>Flexible learning pace</li>
                  </ul>
                </article>
                <article className="rounded-xl border border-white/10 bg-black/30 p-3">
                  <h3 className="font-semibold">Have a Coupon?</h3>
                  <div className="mt-2 flex gap-2">
                    <input
                      placeholder="Enter coupon code"
                      className="w-full rounded-md border border-white/10 bg-black/25 px-3 py-2 text-xs"
                    />
                    <button className="rounded-md bg-violet-500 px-3 py-2 text-xs font-semibold">
                      Apply
                    </button>
                  </div>
                </article>
                <article className="rounded-xl border border-white/10 bg-black/30 p-3">
                  <h3 className="font-semibold">Organization Benefits</h3>
                  <ul className="mt-2 space-y-1 text-xs text-gray-300">
                    <li>Team management</li>
                    <li>Centralized billing</li>
                    <li>Advanced analytics</li>
                    <li>Priority support</li>
                  </ul>
                </article>
              </aside>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <article className="rounded-xl border border-white/10 bg-black/30 p-3 md:col-span-2">
                <h3 className="font-semibold">Organization Plans</h3>
                <div className="mt-2 grid gap-2 md:grid-cols-3">
                  {[
                    ["Team", "₹7,999 /month", "For small teams and startups"],
                    ["Business", "₹14,999 /month", "For growing teams and businesses"],
                    ["Enterprise", "Custom", "For large organizations"],
                  ].map(([name, price, desc]) => (
                    <div key={name} className="rounded-lg border border-white/10 bg-white/5 p-2.5">
                      <p className="font-semibold">{name}</p>
                      <p className="text-sm text-amber-200">{price}</p>
                      <p className="text-xs text-gray-400">{desc}</p>
                    </div>
                  ))}
                </div>
              </article>
              <article className="rounded-xl border border-white/10 bg-black/30 p-3">
                <h3 className="font-semibold">Need Help Choosing the Right Plan?</h3>
                <p className="mt-1 text-xs text-gray-400">
                  Our team is here to help you find the best plan for your learning goals.
                </p>
                <div className="mt-3 flex gap-2">
                  <button className="rounded-md border border-white/15 px-3 py-1.5 text-xs text-amber-100">
                    Contact Support
                  </button>
                  <button className="rounded-md border border-white/20 px-3 py-1.5 text-xs text-gray-200">
                    View FAQs
                  </button>
                </div>
              </article>
            </div>
          </section>
        ) : isCommunity ? (
          <section className="rounded-2xl border border-white/10 bg-[#0a0a0a] p-4 shadow-[0_0_24px_rgba(0,0,0,0.35)]">
            <div className="grid gap-4 xl:grid-cols-[1.7fr_0.7fr]">
              <section>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h1 className="text-4xl font-bold">Community Hub</h1>
                    <p className="mt-1 text-sm text-gray-300">
                      Connect, collaborate and grow together with the SF Trainings community.
                    </p>
                  </div>
                  <button className="rounded-md bg-violet-500 px-3 py-1.5 text-sm font-semibold">
                    + Create Post
                  </button>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  {[
                    [Users, "LinkedIn Community", "Follow us for updates and professional insights.", "Follow Us"],
                    [Send, "Telegram Community", "Join Telegram group for discussions and peer support.", "Join Telegram"],
                    [Mail, "Email Community", "Subscribe to newsletters and important updates.", "Manage Preferences"],
                  ].map(([Icon, title, desc, cta]) => (
                    <article key={title as string} className="rounded-xl border border-white/10 bg-black/30 p-3">
                      <p className="inline-flex items-center gap-2 text-sm font-semibold">
                        <Icon size={14} className="text-amber-300" /> {title as string}
                      </p>
                      <p className="mt-1 text-xs text-gray-400">{desc as string}</p>
                      <button className="mt-3 rounded-md border border-white/15 bg-violet-500/10 px-3 py-1 text-xs text-amber-100">
                        {cta as string}
                      </button>
                    </article>
                  ))}
                </div>

                <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_1.2fr]">
                  <article className="rounded-xl border border-white/10 bg-black/30 p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <h3 className="text-lg font-semibold">Community Discussions</h3>
                      <button className="text-xs text-amber-200">View More</button>
                    </div>
                    <div className="flex gap-2 text-xs">
                      {["All", "Questions", "Feedback", "General"].map((f, idx) => (
                        <button
                          key={f}
                          className={`rounded-full px-3 py-1 ${
                            idx === 0
                              ? "bg-amber-500/20 text-amber-100"
                              : "border border-white/10 bg-white/5 text-gray-300"
                          }`}
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                    <div className="mt-3 space-y-2">
                      {[
                        ["Best resources to learn Ethical Hacking?", "Question"],
                        ["Feedback: Advanced Cyber Security Course", "Feedback"],
                        ["How to prepare for SOC Analyst interviews?", "Question"],
                        ["Suggestion: More hands-on labs", "Suggestion"],
                      ].map(([title, type]) => (
                        <div key={title} className="rounded-lg border border-white/10 bg-white/5 p-2.5">
                          <p className="text-sm font-semibold">{title}</p>
                          <p className="mt-1 text-xs text-gray-400">{type}</p>
                        </div>
                      ))}
                    </div>
                  </article>

                  <article className="rounded-xl border border-white/10 bg-black/30 p-3">
                    <div className="rounded-lg border border-violet-300/20 bg-violet-500/10 p-3">
                      <p className="text-lg font-semibold">Best resources to learn Ethical Hacking?</p>
                      <p className="mt-1 text-sm text-gray-300">
                        I&apos;m looking for beginner-friendly resources to start learning Ethical Hacking.
                        Any recommendations?
                      </p>
                      <div className="mt-2 text-xs text-gray-400">24 likes • 12 comments • Share</div>
                    </div>
                    <div className="mt-3 space-y-2">
                      {[
                        "You can start with TryHackMe and Hack The Box.",
                        "PortSwigger Web Security Academy helped me a lot!",
                        "Check out OWASP Top 10 first. Very important!",
                      ].map((reply, idx) => (
                        <div key={reply} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                          <p className="text-sm">{reply}</p>
                          <p className="mt-1 text-xs text-gray-400">Reply {idx + 1}</p>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 flex gap-2">
                      <input
                        placeholder="Write a reply..."
                        className="w-full rounded-md border border-white/10 bg-black/25 px-3 py-2 text-sm"
                      />
                      <button className="rounded-md bg-violet-500 px-3 py-2 text-sm font-semibold">Post</button>
                    </div>
                  </article>
                </div>

                <article className="mt-4 rounded-xl border border-white/10 bg-black/30 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="font-semibold">Recent Activity</h3>
                    <button className="text-xs text-amber-200">View All</button>
                  </div>
                  <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-5">
                    {[
                      "Riya replied to your question",
                      "Amit liked your post",
                      "You got 5 new replies",
                      "Karan mentioned you",
                      "Pooja shared your post",
                    ].map((activity) => (
                      <div key={activity} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs">
                        {activity}
                      </div>
                    ))}
                  </div>
                </article>
              </section>

              <aside className="space-y-3">
                <article className="rounded-xl border border-white/10 bg-black/30 p-3">
                  <h3 className="font-semibold">Stay Connected</h3>
                  <ul className="mt-2 space-y-1 text-xs text-gray-300">
                    <li>Course Updates</li>
                    <li>Workshop Announcements</li>
                    <li>New Resources</li>
                    <li>Event Reminders</li>
                    <li>Offers & Discounts</li>
                  </ul>
                </article>

                <article className="rounded-xl border border-white/10 bg-black/30 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="font-semibold">Upcoming Community Events</h3>
                    <button className="text-xs text-amber-200">View All</button>
                  </div>
                  <div className="space-y-2 text-sm">
                    {[
                      ["25 MAY", "Live Q&A: Cyber Security Career", "Register"],
                      ["01 JUN", "Workshop: Incident Response", "Register"],
                      ["08 JUN", "Community Meetup (Virtual)", "Register"],
                    ].map(([date, title, cta]) => (
                      <div key={title} className="rounded-lg border border-white/10 bg-white/5 p-2.5">
                        <p className="text-xs text-gray-400">{date}</p>
                        <p className="text-sm">{title}</p>
                        <Link
                          href={liveTutorCourseHref()}
                          className="mt-1 inline-block rounded-md border border-white/15 px-2 py-0.5 text-xs text-amber-200 hover:bg-white/10"
                        >
                          {cta}
                        </Link>
                      </div>
                    ))}
                  </div>
                </article>

                <article className="rounded-xl border border-white/10 bg-black/30 p-3">
                  <h3 className="inline-flex items-center gap-1 font-semibold">
                    <Megaphone size={14} className="text-amber-300" /> Share Your Feedback
                  </h3>
                  <div className="mt-2 grid gap-2">
                    {["Course Feedback", "Suggest topics", "Report an issue"].map((item) => (
                      <button
                        key={item}
                        className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-left text-sm"
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                  <button className="mt-3 w-full rounded-md bg-violet-500 px-3 py-2 text-sm font-semibold">
                    Submit Feedback
                  </button>
                </article>
              </aside>
            </div>
          </section>
        ) : isAssignments ? (
          <section className="rounded-2xl border border-white/10 bg-[#0a0a0a] p-4 shadow-[0_0_24px_rgba(0,0,0,0.35)]">
            <div className="grid gap-4 lg:grid-cols-[1.7fr_1fr]">
              <div>
                <h1 className="text-4xl font-bold">Assignments</h1>
                <p className="mt-1 text-sm text-gray-300">
                  Track all pending tasks, submissions, and deadlines in one place.
                </p>
              </div>
              <div className="rounded-xl border border-amber-300/25 bg-linear-to-r from-amber-500/15 to-rose-500/10 p-4">
                <p className="inline-flex items-center gap-1 text-sm font-semibold text-amber-100">
                  <AlertTriangle size={14} /> Upcoming Deadline Alert
                </p>
                <p className="mt-1 text-xs text-gray-300">
                  Risk Assessment Report due today, 11:59 PM.
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                [FileText, "12", "Total Assignments", "This term"],
                [Clock3, "5", "Pending", "Need submission"],
                [CheckCircle2, "6", "Submitted", "Awaiting review"],
                [GraduationCap, "1", "Completed", "Graded"],
              ].map(([Icon, value, label, hint]) => (
                <article key={label as string} className="rounded-xl border border-white/10 bg-black/30 p-3">
                  <p className="inline-flex items-center gap-1 text-xs text-gray-300">
                    <Icon size={13} className="text-amber-300" /> {label as string}
                  </p>
                  <p className="mt-2 text-3xl font-bold">{value as string}</p>
                  <p className="text-xs text-gray-400">{hint as string}</p>
                </article>
              ))}
            </div>

            <div className="mt-4 rounded-xl border border-white/10 bg-black/30 p-3">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex gap-2 text-xs">
                  {["All", "Pending", "Submitted", "Completed", "Overdue"].map((filter, idx) => (
                    <button
                      key={filter}
                      className={`rounded-full px-3 py-1.5 ${
                        idx === 0
                          ? "bg-amber-500/20 text-amber-100"
                          : "border border-white/10 bg-white/5 text-gray-300"
                      }`}
                    >
                      {filter}
                    </button>
                  ))}
                </div>
                <button className="rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-gray-300">
                  Sort by: Due Date
                </button>
              </div>

              <div className="space-y-2">
                {[
                  ["Risk Assessment Report", "Due Today, 11:59 PM", "High Priority", "Pending", "Submit"],
                  ["Network Security Lab", "Due May 22, 11:59 PM", "Medium Priority", "Pending", "Submit"],
                  ["Security Audit Case Study", "Due May 25, 11:59 PM", "Low Priority", "Pending", "Submit"],
                  ["Cloud Threat Model", "Submitted May 19", "Awaiting Review", "Submitted", "View"],
                  ["SOC Incident Analysis", "Graded May 18", "Score: 92/100", "Completed", "View Feedback"],
                ].map(([title, due, priority, status, cta]) => (
                  <article
                    key={title}
                    className="grid gap-3 rounded-xl border border-white/10 bg-black/20 p-3 lg:grid-cols-[1.2fr_220px_170px_120px]"
                  >
                    <div>
                      <p className="text-lg font-semibold">{title}</p>
                      <p className="mt-1 text-xs text-gray-400">{due}</p>
                    </div>
                    <div className="text-sm">
                      <p className="text-xs text-gray-400">Priority</p>
                      <span
                        className={`mt-1 inline-flex rounded-full px-2.5 py-0.5 text-xs ${
                          String(priority).includes("High")
                            ? "bg-rose-500/20 text-rose-200"
                            : String(priority).includes("Medium")
                              ? "bg-amber-500/20 text-amber-200"
                              : String(priority).includes("Low")
                                ? "bg-emerald-500/20 text-emerald-200"
                                : "bg-blue-500/20 text-blue-200"
                        }`}
                      >
                        {priority}
                      </span>
                    </div>
                    <div className="text-sm">
                      <p className="text-xs text-gray-400">Status</p>
                      <span
                        className={`mt-1 inline-flex rounded-full px-2.5 py-0.5 text-xs ${
                          status === "Pending"
                            ? "bg-amber-500/20 text-amber-200"
                            : status === "Submitted"
                              ? "bg-blue-500/20 text-blue-200"
                              : "bg-emerald-500/20 text-emerald-200"
                        }`}
                      >
                        {status}
                      </span>
                    </div>
                    <div className="text-right">
                      <button className="rounded-md border border-white/15 px-3 py-1 text-xs text-amber-100">
                        {cta}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>
        ) : isLearning ? (
          <section className="rounded-2xl border border-white/10 bg-[#0a0a0a] p-4 shadow-[0_0_24px_rgba(0,0,0,0.35)]">
            <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
              <div>
                <h1 className="text-4xl font-bold">My Courses Progress</h1>
                <p className="mt-1 text-sm text-gray-300">
                  Track your learning progress across all enrolled courses.
                </p>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {[
                  [BookOpen, "6", "Enrolled Courses", "violet"],
                  [CheckCircle2, "2", "Completed", "green"],
                  [Clock3, "3", "In Progress", "amber"],
                  [CircleDot, "1", "Not Started", "rose"],
                ].map(([Icon, value, label, tone]) => (
                  <article key={label as string} className="rounded-xl border border-white/10 bg-black/30 p-3">
                    <p className="inline-flex items-center gap-2 text-sm">
                      <Icon
                        size={14}
                        className={
                          tone === "green"
                            ? "text-emerald-300"
                            : tone === "amber"
                              ? "text-amber-300"
                              : tone === "rose"
                                ? "text-rose-300"
                                : "text-amber-300"
                        }
                      />
                      <span className="text-2xl font-bold">{value as string}</span>
                    </p>
                    <p className="text-xs text-gray-400">{label as string}</p>
                  </article>
                ))}
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-white/10 bg-black/30 p-3">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex gap-2 text-xs">
                  {["All Courses", "In Progress", "Completed", "Not Started"].map((filter, idx) => (
                    <button
                      key={filter}
                      className={`rounded-full px-3 py-1.5 ${
                        idx === 0
                          ? "bg-amber-500/20 text-amber-100"
                          : "border border-white/10 bg-white/5 text-gray-300"
                      }`}
                    >
                      {filter}
                    </button>
                  ))}
                </div>
                <button className="rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-gray-300">
                  Sort by: Recent Activity
                </button>
              </div>

              <div className="space-y-2">
                {coursesForLearning.map((course) => {
                  const percentage = Math.round((course.completed / course.modules) * 100);
                  return (
                    <article
                      key={course.title}
                      className="grid gap-3 rounded-xl border border-white/10 bg-black/20 p-3 xl:grid-cols-[320px_1fr_150px]"
                    >
                      <div className="flex gap-3">
                        <div className="h-20 w-28 shrink-0 rounded-lg border border-dashed border-white/20 bg-black/30 text-center text-[10px] leading-[80px] text-gray-400">
                          Poster
                        </div>
                        <div>
                          <p className="text-lg font-semibold">{course.title}</p>
                          <p className="mt-1 text-xs text-gray-400">
                            {course.modules} Modules • {course.duration}
                          </p>
                        </div>
                      </div>

                      <div>
                        <p className="text-xs text-gray-400">Modules Progress</p>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {Array.from({ length: course.modules }).map((_, idx) => (
                            <span
                              key={`${course.title}-${idx}`}
                              className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[10px] ${
                                idx < course.completed
                                  ? "bg-emerald-500/30 text-emerald-200"
                                  : "border border-white/15 text-gray-400"
                              }`}
                            >
                              {idx + 1}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="flex flex-col items-end justify-between">
                        <div className="text-right">
                          <p className="text-4xl font-bold">{percentage}%</p>
                          <p className="text-xs text-gray-400">
                            {course.completed} / {course.modules} Modules
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[11px] ${
                              course.status === "Completed"
                                ? "bg-emerald-500/20 text-emerald-200"
                                : course.status === "Not Started"
                                  ? "bg-rose-500/20 text-rose-200"
                                  : "bg-amber-500/20 text-amber-200"
                            }`}
                          >
                            {course.status}
                          </span>
                          <Link
                            href={learningHrefFor(course)}
                            className="rounded-md border border-white/15 px-2.5 py-1 text-xs text-amber-200"
                          >
                            {course.action}
                          </Link>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>

            <article className="mt-4 rounded-xl border border-emerald-500/25 bg-black/30 p-3">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h2 className="inline-flex items-center gap-2 text-lg font-bold text-white">
                  <ListChecks size={18} className="text-emerald-300" />
                  Exams & assessments
                </h2>
                <Link
                  href="/my-learning?tab=assignments"
                  className="text-xs text-emerald-200/90 underline-offset-2 hover:underline"
                >
                  Assignments tab
                </Link>
              </div>
              {examCatalog === undefined ? (
                <p className="text-sm text-gray-400">Loading exam list from catalog…</p>
              ) : examsByCourse.length === 0 ? (
                <p className="text-sm text-gray-400">
                  No exams are configured on published courses yet. In{" "}
                  <strong className="text-gray-200">Admin → Courses</strong>, add curriculum rows with kind{" "}
                  <strong className="text-gray-200">exam</strong> (and optional final exam) so they appear here.
                </p>
              ) : (
                <div className="space-y-4">
                  {examsByCourse.map(({ course, links }) => (
                    <div key={course.slug} className="rounded-lg border border-white/10 bg-black/25 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-semibold text-white">{course.title}</p>
                        {enrolledExamSlugs.has(course.slug) ? (
                          <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-200">
                            On your list
                          </span>
                        ) : null}
                      </div>
                      <ul className="mt-2 space-y-2">
                        {links.map((link) => (
                          <li
                            key={link.href}
                            className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-2 last:border-0 last:pb-0"
                          >
                            <span className="text-sm text-gray-300">
                              <span className="text-gray-500">{link.slot} · </span>
                              {link.label}
                            </span>
                            <Link
                              href={link.href}
                              className="shrink-0 rounded-md border border-emerald-400/40 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-100 hover:bg-emerald-500/20"
                            >
                              Open exam
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </article>
          </section>
        ) : isAchievements ? (
          <section className="rounded-2xl border border-white/10 bg-[#0a0a0a] p-4 shadow-[0_0_24px_rgba(0,0,0,0.35)]">
            <div className="grid gap-4 lg:grid-cols-[2fr_1.1fr]">
              <div>
                <h1 className="text-4xl font-bold">Welcome back, Aditi!</h1>
                <p className="mt-1 text-sm text-gray-300">
                  Keep going! You are making great progress.
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-linear-to-r from-violet-500/20 to-fuchsia-500/15 p-4 shadow-[0_0_24px_rgba(0,0,0,0.35)]">
                <p className="text-sm font-semibold">AI Learning Assistant</p>
                <p className="mt-1 text-xs text-gray-200">
                  Get personalized suggestions and stay ahead in your learning journey.
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              {[
                [ShieldCheck, "Courses Enrolled", "14", "Active Courses"],
                [Clock3, "Hours Learned", "68h 30m", "This Month"],
                [Award, "Certificates Earned", "6", "View All"],
                [Trophy, "Achievements", "18", "Badges Earned"],
                [Flame, "Current Streak", "12 Days", "Keep it up!"],
              ].map(([Icon, label, value, hint]) => (
                <article
                  key={label as string}
                  className="rounded-xl border border-white/10 bg-linear-to-b from-white/10 to-black/30 p-3"
                >
                  <p className="inline-flex items-center gap-1 text-xs text-gray-300">
                    <Icon size={13} className="text-amber-300" /> {label as string}
                  </p>
                  <p className="mt-2 text-3xl font-bold">{value as string}</p>
                  <p className="text-xs text-gray-400">{hint as string}</p>
                </article>
              ))}
            </div>

            <div className="mt-4 flex flex-wrap gap-2 border-b border-white/10 pb-3 text-xs">
              {tabs.map((tab) => (
                <span
                  key={tab}
                  className={`rounded-full px-3 py-1.5 ${
                    tab === "achievements"
                      ? "bg-amber-500/20 text-amber-100 shadow-[0_0_14px_rgba(245,158,11,0.35)]"
                      : "border border-white/10 bg-white/5 text-gray-300"
                  }`}
                >
                  {tab === "learning"
                    ? "My Courses"
                    : tab === "certificates"
                      ? "Certificate Records"
                      : tab === "events"
                        ? "Summits & Events"
                        : tab.charAt(0).toUpperCase() + tab.slice(1)}
                </span>
              ))}
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-[1.35fr_1fr]">
              <article className="rounded-xl border border-white/10 bg-black/30 p-3">
                <h2 className="text-xl font-bold">Achievements & Certificates</h2>
                <p className="mt-1 text-xs text-gray-400">
                  Celebrate your milestones and showcase your accomplishments.
                </p>
                <div className="mt-3 rounded-lg border border-white/10 bg-linear-to-br from-violet-500/20 to-indigo-500/10 p-10 text-center text-sm text-gray-200 shadow-[inset_0_0_40px_rgba(139,92,246,0.2)]">
                  Certificate Placeholder
                </div>
              </article>

              <article className="rounded-xl border border-white/10 bg-black/30 p-3">
                <div className="space-y-2">
                  {[
                    "Advanced Cyber Security Professional",
                    "Network Security Fundamentals",
                    "Ethical Hacking with Tools",
                    "Python for Data Science",
                  ].map((item) => (
                    <div
                      key={item}
                      className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2"
                    >
                      <div>
                        <p className="text-sm font-semibold">{item}</p>
                        <p className="text-xs text-gray-400">Issued this year</p>
                      </div>
                      <button className="rounded-md border border-blue-300/30 px-2.5 py-1 text-xs text-blue-200">
                        View Certificate
                      </button>
                    </div>
                  ))}
                </div>
              </article>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <article className="rounded-xl border border-white/10 bg-black/30 p-3">
                <h3 className="text-lg font-bold">Badges Earned</h3>
                <p className="text-xs text-gray-400">18 / 30 Badges Unlocked</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {["Gold", "Silver", "Contributor", "Mentor", "Explorer", "+13"].map((badge) => (
                    <span
                      key={badge}
                      className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs"
                    >
                      {badge}
                    </span>
                  ))}
                </div>
              </article>
              <article className="rounded-xl border border-white/10 bg-linear-to-r from-violet-500/15 to-blue-500/10 p-3 shadow-[inset_0_0_35px_rgba(59,130,246,0.18)]">
                <h3 className="text-lg font-bold">Learning Level</h3>
                <p className="mt-1 text-sm">Level 7</p>
                <p className="text-xs text-gray-300">Knowledge Explorer</p>
                <div className="mt-3 h-2 rounded-full bg-white/10">
                  <div className="h-2 w-[80%] rounded-full bg-amber-400" />
                </div>
                <p className="mt-1 text-xs text-gray-300">2800 / 3500 XP</p>
              </article>
            </div>

            <div className="mt-4 rounded-xl border border-white/10 bg-black/30 p-3">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-xl font-bold">Events & Summits</h3>
                <button className="text-xs text-amber-200">View All Events</button>
              </div>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {["Threat Intelligence Summit 2025", "Future of AI Summit", "DevOps World Summit 2025", "Cloud Innovation Summit"].map((event) => (
                  <article key={event} className="rounded-lg border border-white/10 bg-linear-to-b from-violet-500/15 to-black/35 p-3">
                    <p className="text-xs text-amber-200">UPCOMING</p>
                    <p className="mt-1 text-sm font-semibold">{event}</p>
                    <div className="mt-2 h-12 rounded-md border border-dashed border-white/20 bg-black/20 text-center text-[10px] leading-[48px] text-gray-400">
                      Event Poster Placeholder
                    </div>
                    <Link
                      href={liveTutorCourseHref()}
                      className="mt-3 inline-block rounded-md bg-amber-400 px-3 py-1 text-xs font-bold text-black hover:bg-amber-300"
                    >
                      Register Now
                    </Link>
                  </article>
                ))}
              </div>
            </div>

            <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_1.3fr_0.8fr]">
              <article className="rounded-xl border border-white/10 bg-black/30 p-3">
                <h3 className="text-lg font-bold">Quick Actions</h3>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {["Enroll in Course", "Join Tutor-Led Session", "View Calendar", "Browse Summits"].map((action) => (
                    <button
                      key={action}
                      className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-left text-sm"
                    >
                      {action}
                    </button>
                  ))}
                </div>
              </article>

              <article className="rounded-xl border border-white/10 bg-black/30 p-3">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-lg font-bold">Upcoming Schedule</h3>
                  <button className="text-xs text-amber-200">View Calendar</button>
                </div>
                <div className="space-y-2">
                  {[
                    ["Webinar: Career in Cyber Security", "Join"],
                    ["Assignment Due: Risk Assessment", "View"],
                    ["Live Class: Network Security", "Join"],
                  ].map(([item, cta]) => (
                    <div key={item} className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                      <p className="text-sm">{item}</p>
                      <button className="rounded-md border border-blue-300/30 px-2.5 py-1 text-xs text-blue-200">
                        {cta}
                      </button>
                    </div>
                  ))}
                </div>
              </article>

              <article className="rounded-xl border border-white/10 bg-black/30 p-3">
                <p className="text-sm font-semibold">May 2025</p>
                <div className="mt-2 grid grid-cols-7 gap-1 text-center text-[10px] text-gray-400">
                  {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((d) => (
                    <span key={d}>{d}</span>
                  ))}
                  {["", "", "", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20", "21", "22", "23", "24", "25", "26", "27", "28", "29", "30", "31", ""].map((day, idx) => (
                    <span
                      key={`${day}-${idx}`}
                      className={day === "21" ? "rounded bg-white/10 text-amber-100" : ""}
                    >
                      {day || "."}
                    </span>
                  ))}
                </div>
              </article>
            </div>
          </section>
        ) : (
          <section className="rounded-2xl border border-white/10 bg-[#0d1526] p-8">
            <h1 className="text-3xl font-bold">My Learning</h1>
            <p className="mt-2 text-gray-300">
              Open the achievements tab from header menu to view the new achievements dashboard.
            </p>
            <div className="mt-4 inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-gray-200">
              Try: <span className="ml-2 font-semibold text-amber-200">?tab=achievements</span>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
