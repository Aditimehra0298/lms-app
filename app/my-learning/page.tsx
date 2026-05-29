"use client";

import Image from "next/image";
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
  FileText,
  Flame,
  GraduationCap,
  HelpCircle,
  ListChecks,
  MessageSquare,
  Rocket,
  ShieldCheck,
  Sparkles,
  Trophy,
} from "lucide-react";
import { AdminContent, defaultAdminContent, type ManagedCourse } from "@/lib/content-schema";
import { MyLearningLiveHub } from "@/components/MyLearningLiveHub";
import MyCertificatesList from "@/components/MyCertificatesList";
import { examLinksFromManagedCourse, resolveLearningCourseSlug } from "@/lib/my-learning-exams";
import { liveTutorCourseHref } from "@/lib/tutor-led-routes";
import {
  learnerDisplayFirstName,
  readLearnerProfileFromStorage,
  timeOfDayGreeting,
} from "@/lib/auth-profile";
import { syncEnrollmentsToServer } from "@/lib/enrollment-sync-client";
import { readJsonResponse } from "@/lib/safe-json";
import {
  getLearnerEmail,
  isLearnerLoggedIn,
  syncLearnerProfileFromServer,
} from "@/lib/learner-session-client";
import {
  COURSE_PROGRESS_UPDATED_EVENT,
  countCurriculumModules,
  enrichPurchasedCourse,
  findCatalogCourse,
  readCompletedModules,
  readPurchasedCoursesFromStorage,
  syncPurchasedCourseProgress,
  type PurchasedCourseRow,
} from "@/lib/learner-course-progress";
import { BADGES_UPDATED_EVENT, readLearnerBadges } from "@/lib/learner-badges";

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

const toCourseSlug = (value: string) =>
  value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

type LearningCourseRow = PurchasedCourseRow;

/** Fixed locale so server HTML matches client (avoids hydration mismatch). */
function formatDashboardDate(now: Date) {
  return now.toLocaleString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function CoursePoster({ image, title }: { image?: string; title: string }) {
  if (image?.trim()) {
    return (
      <div className="relative h-20 w-28 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-black/30">
        <Image src={image.trim()} alt={title} fill className="object-cover" sizes="112px" />
      </div>
    );
  }
  return (
    <div className="flex h-20 w-28 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-black/30 px-1 text-center text-[10px] leading-tight text-gray-500">
      No image
    </div>
  );
}

export default function MyLearningPage() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [activeTab, setActiveTab] = useState("dashboard");
  const isAchievements = activeTab === "achievements";
  const isOverview = activeTab === "overview";
  const isDashboard = activeTab === "dashboard" || isOverview;
  const isLearning = activeTab === "learning" || activeTab === "progress";
  const isLive = activeTab === "live" || activeTab === "events";
  const isAssignments = activeTab === "assignments";
  const isCommunity = activeTab === "community";
  const isCertificates = activeTab === "certificates";
  const isSubscriptions = activeTab === "subscriptions";
  const [adminContent, setAdminContent] = useState<AdminContent>(defaultAdminContent);
  const [learnerFirstName, setLearnerFirstName] = useState("there");
  const [dashboardNow] = useState(() => new Date());
  const [progressTick, setProgressTick] = useState(0);
  const [courseFilter, setCourseFilter] = useState<"all" | "in-progress" | "completed" | "not-started">("all");
  const [earnedBadges, setEarnedBadges] = useState<ReturnType<typeof readLearnerBadges>>([]);

  useEffect(() => {
    const applyProfile = () => {
      const profile = readLearnerProfileFromStorage();
      setLearnerFirstName(learnerDisplayFirstName(profile.name, profile.email));
    };
    applyProfile();
    const onAuth = () => applyProfile();
    window.addEventListener("sft_auth_updated", onAuth);
    if (isLearnerLoggedIn()) {
      const email = getLearnerEmail();
      if (email) {
        void syncEnrollmentsToServer(email);
        void syncLearnerProfileFromServer(email).then((p) => {
          if (p) setLearnerFirstName(learnerDisplayFirstName(p.name, p.email));
        });
      }
    }
    return () => window.removeEventListener("sft_auth_updated", onAuth);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 20_000);
    (async () => {
      try {
        const res = await fetch("/api/admin/content", { cache: "no-store", signal: controller.signal });
        if (!res.ok) throw new Error("admin-content");
        const data = await readJsonResponse(res, defaultAdminContent);
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
    setActiveTab(searchParams.get("tab") ?? "dashboard");
  }, [searchParams, pathname]);
  const [purchasedCourses, setPurchasedCourses] = useState<LearningCourseRow[]>([]);

  useEffect(() => {
    const loadPurchasedCourses = () => {
      const parsed = readPurchasedCoursesFromStorage();
      setPurchasedCourses((prev) => {
        if (prev.length === parsed.length && JSON.stringify(prev) === JSON.stringify(parsed)) {
          return prev;
        }
        return parsed;
      });
    };
    loadPurchasedCourses();
    setEarnedBadges(readLearnerBadges());
    window.addEventListener("storage", loadPurchasedCourses);
    window.addEventListener("sft_purchases_updated", loadPurchasedCourses);
    const onProgress = () => setProgressTick((n) => n + 1);
    window.addEventListener(COURSE_PROGRESS_UPDATED_EVENT, onProgress);
    window.addEventListener("storage", onProgress);
    window.addEventListener("focus", onProgress);
    const onBadges = () => setEarnedBadges(readLearnerBadges());
    window.addEventListener(BADGES_UPDATED_EVENT, onBadges);
    return () => {
      window.removeEventListener("storage", loadPurchasedCourses);
      window.removeEventListener("sft_purchases_updated", loadPurchasedCourses);
      window.removeEventListener(COURSE_PROGRESS_UPDATED_EVENT, onProgress);
      window.removeEventListener("storage", onProgress);
      window.removeEventListener("focus", onProgress);
      window.removeEventListener(BADGES_UPDATED_EVENT, onBadges);
    };
  }, []);

  const [courseCatalog, setCourseCatalog] = useState<ManagedCourse[] | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/courses", { cache: "no-store" });
        if (!res.ok) throw new Error("courses");
        const data = await readJsonResponse(res, {} as { courses?: ManagedCourse[] });
        if (!cancelled) setCourseCatalog(Array.isArray(data.courses) ? data.courses : []);
      } catch {
        if (!cancelled) setCourseCatalog([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const examsByCourse = useMemo(() => {
    if (!courseCatalog?.length) return [];
    return courseCatalog
      .map((c) => ({ course: c, links: examLinksFromManagedCourse(c) }))
      .filter((x) => x.links.length > 0);
  }, [courseCatalog]);

  useEffect(() => {
    if (!courseCatalog?.length) return;
    const rows = readPurchasedCoursesFromStorage();
    if (rows.length === 0) return;
    for (const row of rows) {
      const slug = row.slug?.trim();
      if (!slug) continue;
      const catalog = findCatalogCourse(row, courseCatalog);
      const modules = catalog ? countCurriculumModules(catalog.curriculum) : row.modules;
      syncPurchasedCourseProgress(slug, readCompletedModules(slug).length, modules || row.modules);
    }
  }, [courseCatalog, progressTick]);

  const courseRowKey = (c: { title: string; slug?: string }) =>
    (c.slug?.trim() || c.title.trim()).toLowerCase();

  const coursesForLearning = useMemo(() => {
    void progressTick;
    const catalog = courseCatalog ?? adminContent.managedCourses ?? [];
    return purchasedCourses.map((course) =>
      enrichPurchasedCourse(course, findCatalogCourse(course, catalog)),
    );
  }, [purchasedCourses, courseCatalog, adminContent.managedCourses, progressTick]);
  const totalEnrolledCourses = coursesForLearning.length;
  const totalCompletedCourses = coursesForLearning.filter(
    (course) =>
      course.status.toLowerCase() === "completed" ||
      (Number.isFinite(course.modules) && course.modules > 0 && course.completed >= course.modules),
  ).length;
  const totalNotStartedCourses = coursesForLearning.filter((course) =>
    course.status.toLowerCase().includes("not started"),
  ).length;
  const totalInProgressCourses = Math.max(
    0,
    totalEnrolledCourses - totalCompletedCourses - totalNotStartedCourses,
  );

  const purchasedTutorLedRows = useMemo(
    () => purchasedCourses.filter((c) => c.deliveryKind === "tutor-led" && c.slug?.trim()),
    [purchasedCourses],
  );

  const enrolledExamSlugs = useMemo(() => {
    if (!courseCatalog?.length) return new Set<string>();
    const s = new Set<string>();
    for (const lc of coursesForLearning) {
      const slug = resolveLearningCourseSlug(lc, courseCatalog, toCourseSlug);
      if (slug) s.add(slug);
    }
    return s;
  }, [courseCatalog, coursesForLearning]);

  const learningHrefFor = (course: { title: string; slug?: string; action?: string; status?: string }) => {
    if (course.status === "Completed" || course.action === "View Certificate") {
      return "/my-learning?tab=certificates";
    }
    const direct = course.slug?.trim();
    if (direct) return `/my-learning/course/${direct}`;
    const catalog = courseCatalog?.length ? courseCatalog : adminContent.managedCourses ?? [];
    const resolved = resolveLearningCourseSlug(course, catalog, toCourseSlug);
    return `/my-learning/course/${resolved ?? toCourseSlug(course.title)}`;
  };

  const resumeCourse = coursesForLearning.find((c) => c.status === "In Progress") ?? coursesForLearning[0];

  const filteredCoursesForLearning = useMemo(() => {
    if (courseFilter === "all") return coursesForLearning;
    if (courseFilter === "completed") {
      return coursesForLearning.filter((c) => c.status.toLowerCase() === "completed");
    }
    if (courseFilter === "not-started") {
      return coursesForLearning.filter((c) => c.status.toLowerCase().includes("not started"));
    }
    return coursesForLearning.filter((c) => c.status.toLowerCase() === "in progress");
  }, [coursesForLearning, courseFilter]);

  const enrolledExamTasks = useMemo(() => {
    if (!courseCatalog?.length) return [];
    const tasks: Array<{
      courseTitle: string;
      label: string;
      href: string;
      status: string;
      courseSlug: string;
    }> = [];
    for (const row of coursesForLearning) {
      const slug = row.slug ?? resolveLearningCourseSlug(row, courseCatalog, toCourseSlug);
      if (!slug) continue;
      const course = courseCatalog.find((c) => c.slug === slug);
      if (!course) continue;
      const links = examLinksFromManagedCourse(course);
      const completed = readCompletedModules(slug);
      for (const link of links) {
        const moduleNum = link.href.includes("module=")
          ? Number.parseInt(link.href.split("module=")[1]?.split("&")[0] ?? "", 10)
          : NaN;
        const done = Number.isFinite(moduleNum) && completed.includes(moduleNum);
        tasks.push({
          courseTitle: course.title,
          label: link.label,
          href: link.href,
          status: done ? "Completed" : "Pending",
          courseSlug: slug,
        });
      }
    }
    return tasks;
  }, [courseCatalog, coursesForLearning]);

  const quickActions = [
    { label: "Join Tutor-Led Session", icon: Rocket, cta: "View & Join", href: "/my-learning?tab=live" },
    { label: "View Calendar", icon: CalendarDays, cta: "See Schedule", href: "/my-learning/calendar" },
    { label: "My Assignments", icon: ListChecks, cta: "View Tasks", href: "/my-learning?tab=assignments" },
    { label: "Achievements", icon: Trophy, cta: "View Badges", href: "/my-learning?tab=achievements" },
    { label: "Certificate Records", icon: Award, cta: "View All", href: "/my-learning?tab=certificates" },
    { label: "Community", icon: MessageSquare, cta: "Join Now", href: "/my-learning?tab=community" },
  ] as const;

  return (
    <div className="min-h-full bg-[#0a0a0a] text-white">
      <main className="mx-auto w-full max-w-[1760px] px-4 py-6 md:px-5 lg:px-6">
        {isDashboard ? (
          <section className="rounded-2xl border border-white/10 bg-[#0a0a0a] p-4 shadow-[0_0_24px_rgba(0,0,0,0.35)]">
            <div className="grid gap-3 lg:grid-cols-[1fr_1.5fr]">
              <article className="rounded-xl border border-white/10 bg-linear-to-br from-violet-500/15 via-[#101933] to-[#0a1023] p-4">
                <p className="text-3xl font-bold">
                  {learnerFirstName !== "there" ? (
                    <>
                      {timeOfDayGreeting()},{" "}
                      <span className="text-amber-300">{learnerFirstName}!</span> 👋
                    </>
                  ) : (
                    <>{timeOfDayGreeting()}! 👋</>
                  )}
                </p>
                <p className="mt-1 text-sm text-amber-200">{formatDashboardDate(dashboardNow)}</p>
                <h2 className="mt-3 text-2xl font-bold">Welcome to SF Trainings</h2>
                <p className="mt-1 text-sm text-gray-300">
                  Elevate your professional skills with industry-led courses.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link
                    href="/courses"
                    className="rounded-md bg-amber-500 px-4 py-2 text-sm font-semibold text-black"
                  >
                    Explore More Courses
                  </Link>
                  <Link
                    href="/my-learning?tab=learning"
                    className="rounded-md border border-white/20 bg-white/5 px-4 py-2 text-sm"
                  >
                    View My Courses
                  </Link>
                </div>
              </article>

              <article className="relative overflow-hidden rounded-xl border border-white/10 bg-linear-to-r from-black/40 via-[#121c39] to-[#0d1530] p-4">
                <p className="inline-flex rounded bg-white/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-amber-100">
                  Featured Course
                </p>
                <h3 className="mt-3 text-4xl font-bold">
                  {resumeCourse ? (
                    <>
                      {resumeCourse.title.split(" ").slice(0, 2).join(" ")}{" "}
                      <span className="text-amber-300">
                        {resumeCourse.title.split(" ").slice(2, 4).join(" ") || "Course"}
                      </span>
                    </>
                  ) : (
                    <>
                      Explore <span className="text-amber-300">SF Trainings</span>
                    </>
                  )}
                </h3>
                <p className="mt-2 max-w-md text-sm text-gray-300">
                  {resumeCourse
                    ? `${resumeCourse.modules} modules • ${resumeCourse.duration} • ${resumeCourse.completed} completed`
                    : "Browse the catalog and enroll to start your learning journey."}
                </p>
                <Link
                  href={
                    resumeCourse
                      ? learningHrefFor(resumeCourse)
                      : "/courses"
                  }
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
                <Link href="/courses" className="text-xs text-amber-200 hover:text-amber-100">
                  View All Courses
                </Link>
              </div>
              <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">
                {coursesForLearning.length === 0 ? (
                  <p className="col-span-full rounded-lg border border-dashed border-white/15 bg-black/20 p-4 text-sm text-gray-400">
                    No enrolled courses yet. Complete checkout on a course to see it here.
                  </p>
                ) : (
                  coursesForLearning.slice(0, 7).map((course) => (
                  <article key={courseRowKey(course)} className="rounded-lg border border-white/10 bg-black/25 p-3">
                    {course.image?.trim() ? (
                      <div className="relative h-20 overflow-hidden rounded-md border border-white/10 bg-black/30">
                        <Image
                          src={course.image.trim()}
                          alt={course.title}
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 33vw, 20vw"
                        />
                      </div>
                    ) : (
                      <div className="flex h-20 items-center justify-center rounded-md border border-dashed border-white/20 bg-black/30 text-center text-[10px] text-gray-500">
                        No image
                      </div>
                    )}
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
                  ))
                )}
              </div>
            </div>

            <div className="mt-4 grid gap-3 xl:grid-cols-[1fr_1.1fr]">
              <article className="rounded-xl border border-white/10 bg-black/30 p-3">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-xl font-bold">Recommended For You</h3>
                  <Link href="/my-learning?tab=learning" className="text-xs text-amber-200 hover:text-amber-100">
                    View All
                  </Link>
                </div>
                <div className="space-y-2">
                  {coursesForLearning.length === 0 ? (
                    <p className="text-sm text-gray-400">Enroll in courses to see recommendations here.</p>
                  ) : (
                    coursesForLearning.slice(0, 3).map((course) => {
                    const safeModules = Math.max(1, course.modules);
                    const percentage = Math.round((course.completed / safeModules) * 100);
                    return (
                      <div
                        key={`recommended-${courseRowKey(course)}`}
                        className="rounded-lg border border-white/10 bg-black/20 p-3"
                      >
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
                  })
                  )}
                </div>
              </article>

              <article className="rounded-xl border border-white/10 bg-black/30 p-3">
                <h3 className="text-xl font-bold">Quick Actions</h3>
                <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {quickActions.map(({ label, icon: Icon, cta, href }) => (
                    <div key={label} className="rounded-lg border border-white/10 bg-black/25 p-3">
                      <p className="inline-flex items-center gap-2 text-sm font-semibold text-amber-100">
                        <Icon size={15} className="text-amber-300" />
                        {label}
                      </p>
                      <Link href={href} className="mt-2 inline-block text-xs text-amber-200 hover:text-amber-100">
                        {cta}
                      </Link>
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
                    {resumeCourse?.title ?? "No course in progress yet"}
                  </p>
                  <div className="mt-2 h-1.5 rounded-full bg-white/10">
                    <div
                      className="h-1.5 rounded-full bg-violet-400"
                      style={{
                        width: `${Math.round(((resumeCourse?.completed ?? 0) / Math.max(1, resumeCourse?.modules ?? 1)) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
                {resumeCourse ? (
                <Link
                  href={learningHrefFor(resumeCourse)}
                  className="rounded-md bg-amber-500 px-4 py-2 text-sm font-semibold"
                >
                  Continue Learning
                </Link>
                ) : (
                <Link
                  href="/courses"
                  className="rounded-md bg-amber-500 px-4 py-2 text-sm font-semibold"
                >
                  Browse Courses
                </Link>
                )}
              </div>
            </div>
          </section>
        ) : isLive ? (
          <MyLearningLiveHub
            enrollments={purchasedTutorLedRows.map((c) => ({ slug: c.slug!, title: c.title }))}
          />
        ) : isCertificates ? (
          <section className="rounded-2xl border border-white/10 bg-[#0a0a0a] p-4 shadow-[0_0_24px_rgba(0,0,0,0.35)]">
            <MyCertificatesList />
          </section>
        ) : isSubscriptions ? (
          <section className="rounded-2xl border border-white/10 bg-[#0a0a0a] p-4 shadow-[0_0_24px_rgba(0,0,0,0.35)]">
            <h1 className="text-4xl font-bold">Subscriptions</h1>
            <p className="mt-1 text-sm text-gray-300">
              Your active plans and billing will appear here when configured for your account.
            </p>
            <p className="mt-6 rounded-xl border border-dashed border-white/15 bg-black/20 p-8 text-center text-sm text-gray-400">
              No subscription on file yet. Enroll in courses from the catalog or contact support for
              organisation plans.
            </p>
            <Link
              href="/courses"
              className="mt-4 inline-flex rounded-md bg-amber-500 px-4 py-2 text-sm font-semibold text-black"
            >
              Browse courses
            </Link>
          </section>
        ) : isCommunity ? (
          <section className="rounded-2xl border border-white/10 bg-[#0a0a0a] p-4 shadow-[0_0_24px_rgba(0,0,0,0.35)]">
            <h1 className="text-4xl font-bold">Community</h1>
            <p className="mt-1 text-sm text-gray-300">
              Discussions and cohort activity from your courses will appear here.
            </p>
            <p className="mt-6 rounded-xl border border-dashed border-white/15 bg-black/20 p-8 text-center text-sm text-gray-400">
              No community posts yet. Check back after you join tutor-led sessions or when your
              instructor shares updates.
            </p>
            <Link
              href="/my-learning?tab=live"
              className="mt-4 inline-flex rounded-md border border-white/15 px-4 py-2 text-sm text-amber-200 hover:bg-white/5"
            >
              View tutor-led programs
            </Link>
          </section>
        ) : isAssignments ? (
          <section className="rounded-2xl border border-white/10 bg-[#0a0a0a] p-4 shadow-[0_0_24px_rgba(0,0,0,0.35)]">
            <div className="grid gap-4 lg:grid-cols-[1.7fr_1fr]">
              <div>
                <h1 className="text-4xl font-bold">Assignments</h1>
                <p className="mt-1 text-sm text-gray-300">
                  Module exams and assessments from your enrolled courses.
                </p>
              </div>
              {enrolledExamTasks.some((t) => t.status === "Pending") ? (
                <div className="rounded-xl border border-amber-300/25 bg-linear-to-r from-amber-500/15 to-rose-500/10 p-4">
                  <p className="inline-flex items-center gap-1 text-sm font-semibold text-amber-100">
                    <AlertTriangle size={14} /> Pending exams
                  </p>
                  <p className="mt-1 text-xs text-gray-300">
                    {enrolledExamTasks.filter((t) => t.status === "Pending").length} module exam
                    {enrolledExamTasks.filter((t) => t.status === "Pending").length === 1 ? "" : "s"} waiting
                    for you.
                  </p>
                </div>
              ) : null}
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {[
                [FileText, String(enrolledExamTasks.length), "Total Exams", "From your courses"],
                [Clock3, String(enrolledExamTasks.filter((t) => t.status === "Pending").length), "Pending", "Not passed yet"],
                [CheckCircle2, String(enrolledExamTasks.filter((t) => t.status === "Completed").length), "Completed", "Passed"],
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
              <div className="space-y-2">
                {enrolledExamTasks.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-white/15 bg-black/20 p-6 text-center text-sm text-gray-400">
                    No exams found for your enrolled courses yet.
                  </p>
                ) : (
                  enrolledExamTasks.map((task) => (
                    <article
                      key={`${task.courseSlug}-${task.href}`}
                      className="grid gap-3 rounded-xl border border-white/10 bg-black/20 p-3 lg:grid-cols-[1.2fr_170px_120px]"
                    >
                      <div>
                        <p className="text-lg font-semibold">{task.label}</p>
                        <p className="mt-1 text-xs text-gray-400">{task.courseTitle}</p>
                      </div>
                      <div className="text-sm">
                        <p className="text-xs text-gray-400">Status</p>
                        <span
                          className={`mt-1 inline-flex rounded-full px-2.5 py-0.5 text-xs ${
                            task.status === "Pending"
                              ? "bg-amber-500/20 text-amber-200"
                              : "bg-emerald-500/20 text-emerald-200"
                          }`}
                        >
                          {task.status}
                        </span>
                      </div>
                      <div className="text-right">
                        <Link
                          href={task.href}
                          className="rounded-md border border-white/15 px-3 py-1 text-xs text-amber-100 hover:bg-white/5"
                        >
                          {task.status === "Completed" ? "Review" : "Start exam"}
                        </Link>
                      </div>
                    </article>
                  ))
                )}
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
                  [BookOpen, String(totalEnrolledCourses), "Enrolled Courses", "violet"],
                  [CheckCircle2, String(totalCompletedCourses), "Completed", "green"],
                  [Clock3, String(totalInProgressCourses), "In Progress", "amber"],
                  [CircleDot, String(totalNotStartedCourses), "Not Started", "rose"],
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
                  {(
                    [
                      ["all", "All Courses"],
                      ["in-progress", "In Progress"],
                      ["completed", "Completed"],
                      ["not-started", "Not Started"],
                    ] as const
                  ).map(([id, filter]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setCourseFilter(id)}
                      className={`rounded-full px-3 py-1.5 ${
                        courseFilter === id
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
                {filteredCoursesForLearning.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-white/15 bg-black/20 p-6 text-center text-sm text-gray-400">
                    {coursesForLearning.length === 0
                      ? "You have not enrolled in any courses yet. Purchase a course to track your progress here."
                      : "No courses match this filter."}
                  </p>
                ) : (
                  filteredCoursesForLearning.map((course) => {
                  const safeModules = Math.max(1, course.modules);
                  const percentage = Math.round((course.completed / safeModules) * 100);
                  return (
                    <article
                      key={courseRowKey(course)}
                      className="grid gap-3 rounded-xl border border-white/10 bg-black/20 p-3 xl:grid-cols-[320px_1fr_150px]"
                    >
                      <div className="flex gap-3">
                        <CoursePoster image={course.image} title={course.title} />
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
                          {Array.from({ length: safeModules }).map((_, idx) => (
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
                            {course.completed} / {safeModules} Modules
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
                })
                )}
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
              {courseCatalog === undefined ? (
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
                <h1 className="text-4xl font-bold">
                  Welcome back{learnerFirstName === "there" ? "" : `, ${learnerFirstName}`}!
                </h1>
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
                [ShieldCheck, "Courses Enrolled", String(totalEnrolledCourses), "Your courses"],
                [Clock3, "In Progress", String(totalInProgressCourses), "Active now"],
                [Award, "Completed", String(totalCompletedCourses), "Finished courses"],
                [Trophy, "Modules Done", String(coursesForLearning.reduce((s, c) => s + c.completed, 0)), "Across all courses"],
                [Flame, "Not Started", String(totalNotStartedCourses), "Ready to begin"],
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

            <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1fr]">
              <article className="rounded-xl border border-white/10 bg-black/30 p-3">
                <h2 className="text-xl font-bold">Certificates</h2>
                <p className="mt-1 text-xs text-gray-400">
                  View and download certificates you earn after completing courses.
                </p>
                <Link
                  href="/my-learning?tab=certificates"
                  className="mt-4 inline-flex rounded-md bg-amber-500 px-4 py-2 text-sm font-semibold text-black"
                >
                  Open certificate records
                </Link>
              </article>

              <article className="rounded-xl border border-white/10 bg-black/30 p-3">
                <div className="space-y-2">
                  {coursesForLearning.length === 0 ? (
                    <p className="text-sm text-gray-400">Enroll in a course to track achievements.</p>
                  ) : (
                    coursesForLearning.map((item) => (
                    <div
                      key={courseRowKey(item)}
                      className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2"
                    >
                      <div>
                        <p className="text-sm font-semibold">{item.title}</p>
                        <p className="text-xs text-gray-400">
                          {item.completed}/{item.modules} modules • {item.status}
                        </p>
                      </div>
                      <Link
                        href={learningHrefFor(item)}
                        className="rounded-md border border-blue-300/30 px-2.5 py-1 text-xs text-blue-200"
                      >
                        {item.action}
                      </Link>
                    </div>
                    ))
                  )}
                </div>
              </article>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <article className="rounded-xl border border-white/10 bg-black/30 p-3">
                <h3 className="text-lg font-bold">Badges Earned</h3>
                <p className="text-xs text-gray-400">
                  {earnedBadges.length} badge{earnedBadges.length === 1 ? "" : "s"} unlocked
                </p>
                {earnedBadges.length === 0 ? (
                  <p className="mt-3 text-sm text-gray-500">Complete course modules to earn shareable badges.</p>
                ) : (
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {earnedBadges.slice(0, 8).map((badge) => (
                      <div
                        key={badge.id}
                        className="rounded-lg border border-violet-300/20 bg-violet-500/10 px-3 py-2"
                      >
                        <p className="text-xs font-semibold text-white">{badge.moduleTitle}</p>
                        <p className="text-[10px] text-gray-400">{badge.courseTitle}</p>
                        <Link
                          href={`/my-learning/course/${encodeURIComponent(badge.courseSlug)}`}
                          className="mt-1 inline-block text-[10px] text-amber-200 hover:underline"
                        >
                          Share from course page
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </article>
              <article className="rounded-xl border border-white/10 bg-linear-to-r from-violet-500/15 to-blue-500/10 p-3 shadow-[inset_0_0_35px_rgba(59,130,246,0.18)]">
                <h3 className="text-lg font-bold">Overall Progress</h3>
                <p className="mt-1 text-sm">
                  {coursesForLearning.reduce((s, c) => s + c.completed, 0)} /{" "}
                  {coursesForLearning.reduce((s, c) => s + c.modules, 0)} modules
                </p>
                <p className="text-xs text-gray-300">Across {totalEnrolledCourses} enrolled course(s)</p>
                <div className="mt-3 h-2 rounded-full bg-white/10">
                  <div
                    className="h-2 rounded-full bg-amber-400"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.round(
                          (coursesForLearning.reduce((s, c) => s + c.completed, 0) /
                            Math.max(1, coursesForLearning.reduce((s, c) => s + c.modules, 0))) *
                            100,
                        ),
                      )}%`,
                    }}
                  />
                </div>
                <p className="mt-1 text-xs text-gray-300">
                  {totalCompletedCourses} course{totalCompletedCourses === 1 ? "" : "s"} fully completed
                </p>
              </article>
            </div>
          </section>
        ) : null}
      </main>
    </div>
  );
}
