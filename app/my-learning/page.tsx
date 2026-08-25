"use client";

import loadDynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { MY_LEARNING_DASHBOARD_HREF } from "@/lib/my-learning-nav";
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
import {
  AdminContent,
  defaultAdminContent,
  defaultHomePageConfig,
  type ManagedCourse,
} from "@/lib/content-schema";
import { MyLearningDashboardLogo } from "@/components/MyLearningDashboardLogo";
import {
  buildMyLearningAssignments,
  filterLearnerVisibleAssignments,
} from "@/lib/my-learning-assignments";
import { examLinksFromManagedCourse, resolveLearningCourseSlug } from "@/lib/my-learning-exams";
import { PREVIEW_WATCH_UPDATED_EVENT } from "@/lib/learner-preview-gate";
import { liveTutorCourseHref } from "@/lib/tutor-led-routes";
import {
  buildTutorLedExploreCards,
  enrichTutorLedLiveHubRow,
  mergeTutorLedPrograms,
  type TutorLedLiveHubRow,
} from "@/lib/tutor-led-live-hub-enrich";
import {
  isOrganisationLearner,
  learnerDisplayFirstName,
  readLearnerProfileFromStorage,
  timeOfDayGreeting,
} from "@/lib/auth-profile";
import { buildOrganizationDashboardSnapshot } from "@/lib/organization-dashboard";
import { ORG_PREMIUM_PLAN_EVENT } from "@/lib/organization-premium-plans";
import {
  ORG_TEAM_DATA_EVENT,
  setOrganizationTeamAdminConfig,
  syncOrganizationTeamFromServer,
} from "@/lib/organization-team-sync-client";
import { buildOrganizationTeamAssignments } from "@/lib/organization-team-assignments";
import {
  buildRecommendationContext,
  pickFeaturedCourse,
  pickOrgFeaturedCourse,
  rankExploreCourses,
  rankTutorLedExplore,
} from "@/lib/learner-course-recommendations";
import {
  LEARNING_PREFS_EVENT,
  ensureGoogleRecommendationSignals,
  readLearningPreferences,
} from "@/lib/learner-learning-preferences";
import { syncEnrollmentsFromServer, syncEnrollmentsToServer } from "@/lib/enrollment-sync-client";
import { readJsonResponse } from "@/lib/safe-json";
import {
  getLearnerEmail,
  isLearnerLoggedIn,
  syncLearnerProfileFromServer,
} from "@/lib/learner-session-client";
import type { CertificateRowDto } from "@/lib/certificate-types";
import {
  COURSE_PROGRESS_UPDATED_EVENT,
  countLearnerCurriculumModules,
  enrichPurchasedCourse,
  findCatalogCourse,
  mergeCertificatesIntoPurchasedCourses,
  readCompletedModules,
  readPurchasedCoursesFromStorage,
  syncPurchasedCourseProgress,
  type PurchasedCourseRow,
} from "@/lib/learner-course-progress";
import { BADGES_UPDATED_EVENT, readLearnerBadges } from "@/lib/learner-badges";
import { CourseListThumbnail } from "@/components/CourseListThumbnail";
import { syncAllLearnerCourseProgressFromServer } from "@/lib/learner-progress-sync-client";
import { resolveCourseListThumbnail } from "@/lib/course-thumbnail";

function TabPanelLoading() {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-10 text-center text-sm text-gray-400">
      Loading…
    </div>
  );
}

const MyLearningCommunityHub = loadDynamic(
  () => import("@/components/MyLearningCommunityHub").then((m) => ({ default: m.MyLearningCommunityHub })),
  { loading: TabPanelLoading },
);
const MyLearningOrganizationCommunityHub = loadDynamic(
  () =>
    import("@/components/MyLearningOrganizationCommunityHub").then((m) => ({
      default: m.MyLearningOrganizationCommunityHub,
    })),
  { loading: TabPanelLoading },
);
const MyLearningDashboardCourses = loadDynamic(
  () => import("@/components/MyLearningDashboardCourses").then((m) => ({ default: m.MyLearningDashboardCourses })),
  { loading: TabPanelLoading },
);
const MyLearningFeaturedCourse = loadDynamic(
  () => import("@/components/MyLearningFeaturedCourse").then((m) => ({ default: m.MyLearningFeaturedCourse })),
  { loading: TabPanelLoading },
);
const MyLearningIndividualSubscriptions = loadDynamic(
  () =>
    import("@/components/MyLearningIndividualSubscriptions").then((m) => ({
      default: m.MyLearningIndividualSubscriptions,
    })),
  { loading: TabPanelLoading },
);
const MyLearningOrganizationCourses = loadDynamic(
  () =>
    import("@/components/MyLearningOrganizationCourses").then((m) => ({
      default: m.MyLearningOrganizationCourses,
    })),
  { loading: TabPanelLoading },
);
const MyLearningOrganizationSubscriptions = loadDynamic(
  () =>
    import("@/components/MyLearningOrganizationSubscriptions").then((m) => ({
      default: m.MyLearningOrganizationSubscriptions,
    })),
  { loading: TabPanelLoading },
);
const MyLearningLiveHub = loadDynamic(
  () => import("@/components/MyLearningLiveHub").then((m) => ({ default: m.MyLearningLiveHub })),
  { loading: TabPanelLoading },
);
const MyCertificatesList = loadDynamic(() => import("@/components/MyCertificatesList"), {
  loading: TabPanelLoading,
});
const MyLearningAssignmentsTab = loadDynamic(
  () => import("@/components/MyLearningAssignmentsTab").then((m) => ({ default: m.MyLearningAssignmentsTab })),
  { loading: TabPanelLoading },
);
const MyLearningOrganizationAssignmentsTab = loadDynamic(
  () =>
    import("@/components/MyLearningOrganizationAssignmentsTab").then((m) => ({
      default: m.MyLearningOrganizationAssignmentsTab,
    })),
  { loading: TabPanelLoading },
);
const MyLearningOrganizationDashboard = loadDynamic(
  () =>
    import("@/components/MyLearningOrganizationDashboard").then((m) => ({
      default: m.MyLearningOrganizationDashboard,
    })),
  { loading: TabPanelLoading },
);
const MyLearningOrganizationCertificates = loadDynamic(
  () =>
    import("@/components/MyLearningOrganizationCertificates").then((m) => ({
      default: m.MyLearningOrganizationCertificates,
    })),
  { loading: TabPanelLoading },
);
const MyLearningOrganizationLiveHub = loadDynamic(
  () =>
    import("@/components/MyLearningOrganizationLiveHub").then((m) => ({
      default: m.MyLearningOrganizationLiveHub,
    })),
  { loading: TabPanelLoading },
);
const MyLearningOrganizationTeamProgress = loadDynamic(
  () =>
    import("@/components/MyLearningOrganizationTeamProgress").then((m) => ({
      default: m.MyLearningOrganizationTeamProgress,
    })),
  { loading: TabPanelLoading },
);
const MyLearningAchievementsTab = loadDynamic(
  () => import("@/components/MyLearningAchievementsTab").then((m) => ({ default: m.MyLearningAchievementsTab })),
  { loading: TabPanelLoading },
);
const MyLearningOrganizationAchievementsTab = loadDynamic(
  () =>
    import("@/components/MyLearningOrganizationAchievementsTab").then((m) => ({
      default: m.MyLearningOrganizationAchievementsTab,
    })),
  { loading: TabPanelLoading },
);
const MyLearningOrganizationInviteEmployees = loadDynamic(
  () =>
    import("@/components/MyLearningOrganizationInviteEmployees").then((m) => ({
      default: m.MyLearningOrganizationInviteEmployees,
    })),
  { loading: TabPanelLoading },
);
const MyLearningOrganizationAssignCourses = loadDynamic(
  () =>
    import("@/components/MyLearningOrganizationAssignCourses").then((m) => ({
      default: m.MyLearningOrganizationAssignCourses,
    })),
  { loading: TabPanelLoading },
);
const MyLearningOrganizationTeamReport = loadDynamic(
  () =>
    import("@/components/MyLearningOrganizationTeamReport").then((m) => ({
      default: m.MyLearningOrganizationTeamReport,
    })),
  { loading: TabPanelLoading },
);

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

function formatCourseDuration(raw: string | undefined): string {
  const s = (raw ?? "").trim();
  if (!s || s === "—") return "—";
  // Fix broken values like "h 00m" / "h00m" when hours were lost.
  if (/^h\s*\d*m?$/i.test(s) || /^h\s/i.test(s)) return "—";
  return s;
}

function CoursePoster({ image, title, courseSlug }: { image?: string; title: string; courseSlug?: string }) {
  return (
    <CourseListThumbnail
      image={image}
      title={title}
      courseSlug={courseSlug}
      fit="contain"
      className="relative h-20 w-28 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-[#0a0f1c]"
    />
  );
}

export default function MyLearningPage() {
  const router = useRouter();
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
  const isOrgCourses = activeTab === "org-courses";
  const isInviteEmployees = activeTab === "invite-employees";
  const isAssignCourses = activeTab === "assign-courses";
  const isOrgReport = activeTab === "org-report";
  const [adminContent, setAdminContent] = useState<AdminContent>({
    ...defaultAdminContent,
    managedCourses: [],
    tutorLedPrograms: [],
    learningCourses: [],
  });
  const [learnerFirstName, setLearnerFirstName] = useState("there");
  const [dashboardNow] = useState(() => new Date());
  const [progressTick, setProgressTick] = useState(0);
  const [courseFilter, setCourseFilter] = useState<"all" | "in-progress" | "completed" | "not-started">("all");
  const [courseSort, setCourseSort] = useState<"recent" | "title">("recent");
  const [examCourseSlug, setExamCourseSlug] = useState("all");
  const [examOpenOnly, setExamOpenOnly] = useState(false);
  const [earnedBadges, setEarnedBadges] = useState<ReturnType<typeof readLearnerBadges>>([]);
  const [learnerProfile, setLearnerProfile] = useState(readLearnerProfileFromStorage);
  const [prefsTick, setPrefsTick] = useState(0);
  const [orgPlanTick, setOrgPlanTick] = useState(0);

  useEffect(() => {
    const applyProfile = () => {
      const profile = readLearnerProfileFromStorage();
      setLearnerProfile(profile);
      setLearnerFirstName(learnerDisplayFirstName(profile.name, profile.email));
    };
    applyProfile();
    const onAuth = () => applyProfile();
    window.addEventListener("sft_auth_updated", onAuth);
    if (isLearnerLoggedIn()) {
      const email = getLearnerEmail();
      if (email) {
        ensureGoogleRecommendationSignals(email);
        setPrefsTick((n) => n + 1);
        void syncEnrollmentsToServer(email);
        void syncLearnerProfileFromServer(email).then((p) => {
          if (p) {
            setLearnerProfile(p);
            setLearnerFirstName(learnerDisplayFirstName(p.name, p.email));
          }
        });
      }
    }
    return () => window.removeEventListener("sft_auth_updated", onAuth);
  }, []);

  useEffect(() => {
    const onPrefs = () => setPrefsTick((n) => n + 1);
    window.addEventListener(LEARNING_PREFS_EVENT, onPrefs);
    return () => window.removeEventListener(LEARNING_PREFS_EVENT, onPrefs);
  }, []);

  useEffect(() => {
    const onOrgPlan = () => setOrgPlanTick((n) => n + 1);
    window.addEventListener(ORG_PREMIUM_PLAN_EVENT, onOrgPlan);
    window.addEventListener(ORG_TEAM_DATA_EVENT, onOrgPlan);
    return () => {
      window.removeEventListener(ORG_PREMIUM_PLAN_EVENT, onOrgPlan);
      window.removeEventListener(ORG_TEAM_DATA_EVENT, onOrgPlan);
    };
  }, []);

  useEffect(() => {
    if (!isLearnerLoggedIn()) return;
    const profile = readLearnerProfileFromStorage();
    if (!isOrganisationLearner(profile)) return;
    void syncOrganizationTeamFromServer(getLearnerEmail() ?? undefined);
  }, [learnerProfile.accountType, learnerProfile.email]);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 20_000);
    (async () => {
      try {
        const res = await fetch("/api/learner/site", { cache: "no-store", signal: controller.signal });
        if (!res.ok) throw new Error("learner-site");
        const data = await readJsonResponse(res, {} as Partial<AdminContent>);
        if (!cancelled) {
          const next: AdminContent = {
            ...defaultAdminContent,
            managedCourses: [],
            tutorLedPrograms: [],
            learningCourses: [],
            ...data,
            managedCourses: Array.isArray(data.managedCourses) ? data.managedCourses : [],
            tutorLedPrograms: Array.isArray(data.tutorLedPrograms) ? data.tutorLedPrograms : [],
            dashboard: {
              ...defaultAdminContent.dashboard,
              ...data.dashboard,
              calendarReminders: data.dashboard?.calendarReminders ?? [],
              communityConnect: data.dashboard?.communityConnect ?? [],
            },
          };
          setAdminContent(next);
          setOrganizationTeamAdminConfig(next.organizationTeam);
        }
      } catch {
        if (!cancelled) {
          setAdminContent({
            ...defaultAdminContent,
            managedCourses: [],
            tutorLedPrograms: [],
            learningCourses: [],
          });
        }
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
    const tab = searchParams.get("tab");
    if (pathname === "/my-learning" && !tab) {
      router.replace(MY_LEARNING_DASHBOARD_HREF);
      return;
    }
    setActiveTab(tab ?? "dashboard");
    const progressFilter = searchParams.get("filter");
    if (progressFilter === "completed") setCourseFilter("completed");
    else if (progressFilter === "in-progress") setCourseFilter("in-progress");
    else if (progressFilter === "not-started") setCourseFilter("not-started");
  }, [searchParams, pathname, router]);
  const [purchasedCourses, setPurchasedCourses] = useState<LearningCourseRow[]>([]);
  const [learnerCertificates, setLearnerCertificates] = useState<CertificateRowDto[]>([]);

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
    const syncFromServer = () => {
      const email = getLearnerEmail();
      if (!email) return;
      void syncEnrollmentsFromServer(email).then((result) => {
        if (result.ok) loadPurchasedCourses();
      });
    };

    loadPurchasedCourses();
    syncFromServer();

    if (getLearnerEmail()) {
      void fetch(`/api/certificates?email=${encodeURIComponent(getLearnerEmail()!)}`, { cache: "no-store" })
        .then(async (res) =>
          readJsonResponse(res, {} as { ok?: boolean; certificates?: CertificateRowDto[] }),
        )
        .then((data) => {
          if (data.ok && data.certificates) setLearnerCertificates(data.certificates);
        })
        .catch(() => {
          /* ignore */
        });

      // Pull real module progress for every enrolled course, then refresh UI.
      const slugs = readPurchasedCoursesFromStorage()
        .map((c) => c.slug?.trim() ?? "")
        .filter(Boolean);
      void syncAllLearnerCourseProgressFromServer(slugs).then(() => {
        loadPurchasedCourses();
        setProgressTick((n) => n + 1);
      });
    }
    setEarnedBadges(readLearnerBadges());
    window.addEventListener("storage", loadPurchasedCourses);
    window.addEventListener("sft_purchases_updated", loadPurchasedCourses);
    window.addEventListener("sft_auth_updated", syncFromServer);
    window.addEventListener("focus", syncFromServer);
    const onProgress = () => {
      loadPurchasedCourses();
      setProgressTick((n) => n + 1);
    };
    window.addEventListener(COURSE_PROGRESS_UPDATED_EVENT, onProgress);
    window.addEventListener("sft-exam-scores-updated", onProgress);
    window.addEventListener(PREVIEW_WATCH_UPDATED_EVENT, onProgress);
    window.addEventListener("storage", onProgress);
    window.addEventListener("focus", onProgress);
    const onVisibility = () => {
      if (document.visibilityState === "visible") onProgress();
    };
    document.addEventListener("visibilitychange", onVisibility);
    const onBadges = () => setEarnedBadges(readLearnerBadges());
    window.addEventListener(BADGES_UPDATED_EVENT, onBadges);
    return () => {
      window.removeEventListener("storage", loadPurchasedCourses);
      window.removeEventListener("sft_purchases_updated", loadPurchasedCourses);
      window.removeEventListener("sft_auth_updated", syncFromServer);
      window.removeEventListener("focus", syncFromServer);
      window.removeEventListener(COURSE_PROGRESS_UPDATED_EVENT, onProgress);
      window.removeEventListener("sft-exam-scores-updated", onProgress);
      window.removeEventListener(PREVIEW_WATCH_UPDATED_EVENT, onProgress);
      window.removeEventListener("storage", onProgress);
      window.removeEventListener("focus", onProgress);
      document.removeEventListener("visibilitychange", onVisibility);
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

  const effectiveCatalog = useMemo(() => {
    if (courseCatalog && courseCatalog.length > 0) return courseCatalog;
    return (adminContent.managedCourses ?? []).filter(
      (c) => c.published !== false && c.settings?.showInCatalog !== false,
    );
  }, [courseCatalog, adminContent.managedCourses]);

  const examsByCourse = useMemo(() => {
    if (!effectiveCatalog.length) return [];
    return effectiveCatalog
      .map((c) => ({ course: c, links: examLinksFromManagedCourse(c) }))
      .filter((x) => x.links.length > 0);
  }, [effectiveCatalog]);

  useEffect(() => {
    if (!effectiveCatalog.length) return;
    const rows = readPurchasedCoursesFromStorage();
    if (rows.length === 0) return;
    for (const row of rows) {
      const slug = row.slug?.trim();
      if (!slug) continue;
      const catalog = findCatalogCourse(row, effectiveCatalog);
      const modules = catalog ? countLearnerCurriculumModules(catalog.curriculum) : row.modules;
      syncPurchasedCourseProgress(slug, readCompletedModules(slug).length, modules || row.modules);
    }
  }, [effectiveCatalog, progressTick]);

  const courseRowKey = (c: { title: string; slug?: string }) =>
    (c.slug?.trim() || c.title.trim()).toLowerCase();

  const coursesForLearning = useMemo(() => {
    void progressTick;
    const catalog =
      effectiveCatalog.length > 0 ? effectiveCatalog : adminContent.managedCourses ?? [];
    const merged = mergeCertificatesIntoPurchasedCourses(
      purchasedCourses,
      learnerCertificates,
      catalog,
    );
    return merged.map((course) =>
      enrichPurchasedCourse(course, findCatalogCourse(course, catalog)),
    );
  }, [
    purchasedCourses,
    learnerCertificates,
    effectiveCatalog,
    adminContent.managedCourses,
    progressTick,
  ]);

  const completedCoursesWithCerts = useMemo(
    () =>
      coursesForLearning.filter(
        (c) =>
          c.status.toLowerCase() === "completed" ||
          learnerCertificates.some(
            (cert) =>
              cert.courseSlug === c.slug?.trim() &&
              (cert.status === "ready" || cert.status === "pending"),
          ),
      ),
    [coursesForLearning, learnerCertificates],
  );
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
    () =>
      purchasedCourses.filter(
        (c) =>
          (c.deliveryKind === "tutor-led" || c.deliveryKind === "workshop") && c.slug?.trim(),
      ),
    [purchasedCourses],
  );

  const tutorLedProgramsMerged = useMemo(
    () => mergeTutorLedPrograms(adminContent.tutorLedPrograms),
    [adminContent.tutorLedPrograms],
  );

  const tutorLedCoursesForHub = useMemo((): TutorLedLiveHubRow[] => {
    return purchasedTutorLedRows
      .filter((c) => c.slug?.trim())
      .map((course) =>
        enrichTutorLedLiveHubRow(course.slug!.trim(), { title: course.title, image: course.image }, tutorLedProgramsMerged),
      );
  }, [purchasedTutorLedRows, tutorLedProgramsMerged]);

  const tutorLedExploreCourses = useMemo(
    () => buildTutorLedExploreCards(tutorLedProgramsMerged),
    [tutorLedProgramsMerged],
  );

  const selfPacedCoursesForDashboard = useMemo(
    () => coursesForLearning.filter((c) => c.deliveryKind !== "tutor-led"),
    [coursesForLearning],
  );

  const isCourseCompleted = (course: PurchasedCourseRow) => {
    const status = course.status?.toLowerCase() ?? "";
    return (
      status === "completed" ||
      course.action === "View Certificate" ||
      (course.modules > 0 && course.completed >= course.modules)
    );
  };

  const activeSelfPacedForDashboard = useMemo(
    () => selfPacedCoursesForDashboard.filter((c) => !isCourseCompleted(c)),
    [selfPacedCoursesForDashboard],
  );

  const activeTutorLedForHub = useMemo(
    () => tutorLedCoursesForHub.filter((c) => c.progressPercent < 100),
    [tutorLedCoursesForHub],
  );

  const completedDashboardCount = useMemo(
    () =>
      selfPacedCoursesForDashboard.filter((c) => isCourseCompleted(c)).length +
      tutorLedCoursesForHub.filter((c) => c.progressPercent >= 100).length,
    [selfPacedCoursesForDashboard, tutorLedCoursesForHub],
  );

  const enrolledSlugSet = useMemo(() => {
    const slugs = new Set<string>();
    for (const c of coursesForLearning) {
      const slug = c.slug?.trim().toLowerCase();
      if (slug) slugs.add(slug);
    }
    return slugs;
  }, [coursesForLearning]);

  const exploreSelfPacedCourses = useMemo(
    () =>
      effectiveCatalog.filter(
        (c) =>
          c.slug?.trim() &&
          c.published !== false &&
          c.settings?.showInCatalog !== false &&
          !enrolledSlugSet.has(c.slug.trim().toLowerCase()),
      ),
    [effectiveCatalog, enrolledSlugSet],
  );

  const exploreTutorLedCourses = useMemo(
    () => tutorLedExploreCourses.filter((c) => !enrolledSlugSet.has(c.slug.toLowerCase())),
    [tutorLedExploreCourses, enrolledSlugSet],
  );

  const recommendationContext = useMemo(() => {
    void prefsTick;
    return buildRecommendationContext({
      profile: learnerProfile,
      preferences: readLearningPreferences(),
      enrolledSlugs: enrolledSlugSet,
    });
  }, [learnerProfile, enrolledSlugSet, prefsTick]);

  const rankedExploreSelfPaced = useMemo(
    () => rankExploreCourses(exploreSelfPacedCourses, recommendationContext),
    [exploreSelfPacedCourses, recommendationContext],
  );

  const rankedExploreTutorLed = useMemo(
    () => rankTutorLedExplore(exploreTutorLedCourses, recommendationContext),
    [exploreTutorLedCourses, recommendationContext],
  );

  const sortedExploreSelfPaced = useMemo(
    () => rankedExploreSelfPaced.map((row) => row.course),
    [rankedExploreSelfPaced],
  );

  const sortedExploreTutorLed = useMemo(
    () => rankedExploreTutorLed.map((row) => row.card),
    [rankedExploreTutorLed],
  );

  const recommendedSelfPacedSlugs = useMemo(
    () =>
      new Set(
        rankedExploreSelfPaced
          .slice(0, 3)
          .map((r) => r.course.slug?.trim().toLowerCase())
          .filter(Boolean) as string[],
      ),
    [rankedExploreSelfPaced],
  );

  const recommendedTutorSlugs = useMemo(
    () =>
      new Set(
        rankedExploreTutorLed
          .slice(0, 2)
          .map((r) => r.card.slug.trim().toLowerCase())
          .filter(Boolean),
      ),
    [rankedExploreTutorLed],
  );

  const enrolledCourseSlugs = useMemo(
    () =>
      coursesForLearning
        .map((c) => c.slug?.trim())
        .filter((s): s is string => Boolean(s)),
    [coursesForLearning],
  );

  const enrolledCourseTitles = useMemo(() => {
    const map: Record<string, string> = {};
    for (const c of coursesForLearning) {
      const slug = c.slug?.trim();
      if (slug) map[slug] = c.title;
    }
    return map;
  }, [coursesForLearning]);

  const communityFocusCourse = searchParams.get("course")?.trim() || null;

  const enrolledExamSlugs = useMemo(() => {
    if (!effectiveCatalog.length) return new Set<string>();
    const s = new Set<string>();
    for (const lc of coursesForLearning) {
      const slug = resolveLearningCourseSlug(lc, effectiveCatalog, toCourseSlug);
      if (slug) s.add(slug);
    }
    return s;
  }, [effectiveCatalog, coursesForLearning]);

  const learningHrefFor = (course: { title: string; slug?: string; action?: string; status?: string }) => {
    if (course.status === "Completed" || course.action === "View Certificate") {
      const slug = course.slug?.trim();
      if (slug) return `/my-learning/course/${encodeURIComponent(slug)}#credentials`;
      return "/my-learning?tab=certificates";
    }
    const direct = course.slug?.trim();
    if (direct) return `/my-learning/course/${direct}`;
    const catalog = effectiveCatalog.length ? effectiveCatalog : adminContent.managedCourses ?? [];
    const resolved = resolveLearningCourseSlug(course, catalog, toCourseSlug);
    return `/my-learning/course/${resolved ?? toCourseSlug(course.title)}`;
  };

  const featuredCoursePick = useMemo(
    () =>
      pickFeaturedCourse({
        enrolled: coursesForLearning,
        exploreRanked: rankedExploreSelfPaced,
        ctx: recommendationContext,
        learningHrefFor,
      }),
    [
      coursesForLearning,
      rankedExploreSelfPaced,
      recommendationContext,
      effectiveCatalog,
      adminContent.managedCourses,
    ],
  );

  const orgFeaturedCoursePick = useMemo(
    () =>
      pickOrgFeaturedCourse({
        exploreRanked: rankedExploreSelfPaced,
        companyName: learnerProfile.companyName ?? learnerProfile.name,
      }),
    [rankedExploreSelfPaced, learnerProfile.companyName, learnerProfile.name],
  );

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

  const sortedCoursesForLearning = useMemo(() => {
    const list = [...filteredCoursesForLearning];
    if (courseSort === "title") {
      list.sort((a, b) => a.title.localeCompare(b.title));
    }
    return list;
  }, [filteredCoursesForLearning, courseSort]);

  const assignmentRows = useMemo(
    () =>
      buildMyLearningAssignments({
        purchased: purchasedCourses,
        catalog: effectiveCatalog,
        tutorLedHubRows: tutorLedCoursesForHub,
        tutorLedPrograms: tutorLedProgramsMerged,
        titleToSlug: toCourseSlug,
      }),
    [
      purchasedCourses,
      effectiveCatalog,
      tutorLedCoursesForHub,
      tutorLedProgramsMerged,
      progressTick,
    ],
  );

  const learnerAssignmentRows = useMemo(
    () => filterLearnerVisibleAssignments(assignmentRows),
    [assignmentRows],
  );

  const orgAssignmentRows = useMemo(
    () =>
      buildOrganizationTeamAssignments({
        courses: effectiveCatalog,
        tutorEnrollments: tutorLedCoursesForHub,
        tutorExplore: tutorLedExploreCourses,
        companySize: learnerProfile.companySize,
      }),
    [effectiveCatalog, tutorLedCoursesForHub, tutorLedExploreCourses, learnerProfile.companySize],
  );

  const enrolledExamTasks = useMemo(
    () =>
      learnerAssignmentRows.map((row) => ({
        courseTitle: row.courseTitle,
        label: row.assessment,
        href: row.href,
        status:
          row.status === "passed"
            ? "Completed"
            : row.status === "locked"
              ? "Locked"
              : "Pending",
        courseSlug: row.courseSlug,
        ready: row.ready,
        unlocked: row.unlocked,
        marksLabel: row.marksLabel,
      })),
    [learnerAssignmentRows],
  );

  const examCourseOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const task of enrolledExamTasks) {
      if (!map.has(task.courseSlug)) map.set(task.courseSlug, task.courseTitle);
    }
    return [...map.entries()].map(([slug, title]) => ({ slug, title }));
  }, [enrolledExamTasks]);

  const filteredExamTasks = useMemo(() => {
    const byCourse =
      examCourseSlug === "all"
        ? enrolledExamTasks
        : enrolledExamTasks.filter((task) => task.courseSlug === examCourseSlug);
    const openedFirst = [...byCourse].sort((a, b) => {
      const aOpen = a.ready && a.unlocked ? 1 : 0;
      const bOpen = b.ready && b.unlocked ? 1 : 0;
      return bOpen - aOpen;
    });
    if (examOpenOnly) {
      return openedFirst.filter((task) => task.ready && task.unlocked);
    }
    return openedFirst;
  }, [enrolledExamTasks, examCourseSlug, examOpenOnly]);

  const openedExamCount = useMemo(
    () => filteredExamTasks.filter((task) => task.ready && task.unlocked && task.status !== "Completed").length,
    [filteredExamTasks],
  );

  const isOrgLearner = isOrganisationLearner(learnerProfile);
  const orgDashboardSnapshot = useMemo(
    () =>
      buildOrganizationDashboardSnapshot({
        companyName: learnerProfile.companyName ?? learnerProfile.name,
        companySize: learnerProfile.companySize,
        certificateCount: learnerCertificates.filter((c) => c.status === "ready").length || undefined,
      }),
    [
      learnerProfile.companyName,
      learnerProfile.companySize,
      learnerProfile.name,
      learnerCertificates,
      orgPlanTick,
    ],
  );

  const quickActions = [
    { label: "Join Tutor-Led Session", icon: Rocket, cta: "View & Join", href: "/my-learning?tab=live" },
    { label: "View Calendar", icon: CalendarDays, cta: "See Schedule", href: "/my-learning/calendar" },
    { label: "My Assignments", icon: ListChecks, cta: "View Tasks", href: "/my-learning?tab=assignments" },
    { label: "Achievements", icon: Trophy, cta: "View Badges", href: "/my-learning?tab=achievements" },
    { label: "Certificate Records", icon: Award, cta: "View All", href: "/my-learning?tab=certificates" },
    { label: "Community", icon: MessageSquare, cta: "Join Now", href: "/my-learning?tab=community" },
  ] as const;

  return (
    <div className="my-learning-dashboard-main">
      <main
        className={`mx-auto w-full max-w-[1760px] px-4 md:px-5 lg:px-6 ${
          isSubscriptions ? "pb-2 pt-4" : "py-6"
        }`}
      >
        {isDashboard && isOrgLearner ? (
          <MyLearningOrganizationDashboard
            snapshot={orgDashboardSnapshot}
            adminDisplayName={learnerFirstName}
            learnerProfile={learnerProfile}
            dashboardNow={dashboardNow}
            industryType={learnerProfile.industryType}
            countryCode={learnerProfile.countryCode}
            countryName={learnerProfile.countryName}
            companySize={learnerProfile.companySize}
            orgFeaturedCourse={orgFeaturedCoursePick}
            orgRankedSelfPaced={rankedExploreSelfPaced}
            orgRankedTutorLed={rankedExploreTutorLed}
            enrolledSummary={
              coursesForLearning.length > 0
                ? `Your organisation is enrolled in ${selfPacedCoursesForDashboard.length} self-paced course${selfPacedCoursesForDashboard.length === 1 ? "" : "s"} and ${tutorLedCoursesForHub.length} tutor-led program${tutorLedCoursesForHub.length === 1 ? "" : "s"}.`
                : "Browse the catalog to assign courses and start team training."
            }
          />
        ) : isDashboard ? (
          <section className="rounded-2xl border border-white/10 bg-[#0a0a0a] p-4 shadow-[0_0_24px_rgba(0,0,0,0.35)]">
            <div className="grid gap-3 lg:grid-cols-[1fr_1.5fr]">
              <article className="my-learning-welcome-card rounded-xl border border-white/10 bg-linear-to-br from-violet-500/15 via-[#101933] to-[#0a1023] p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
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
                <h2 className="mt-3 text-2xl font-bold">
                  Welcome to <span className="sf-trainings-green">SF Trainings</span>
                </h2>
                <p className="mt-1 text-sm text-gray-300">
                  Elevate your professional skills with industry-led courses.
                </p>
                <p className="mt-3 text-sm text-gray-400">
                  {activeSelfPacedForDashboard.length > 0 || activeTutorLedForHub.length > 0
                    ? `${activeSelfPacedForDashboard.length} course${activeSelfPacedForDashboard.length === 1 ? "" : "s"} ready to continue${
                        activeTutorLedForHub.length > 0
                          ? ` · ${activeTutorLedForHub.length} live program${activeTutorLedForHub.length === 1 ? "" : "s"}`
                          : ""
                      }.`
                    : completedDashboardCount > 0
                      ? "All enrolled courses are complete. Explore new programs below."
                      : "Browse the catalog below to enroll and start learning."}
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
                  </div>
                  <div className="hidden shrink-0 sm:block">
                    <MyLearningDashboardLogo />
                  </div>
                </div>
              </article>

              <MyLearningFeaturedCourse featured={featuredCoursePick} />
            </div>

            <MyLearningDashboardCourses
              selfPacedCourses={activeSelfPacedForDashboard}
              tutorLedCourses={activeTutorLedForHub}
              exploreSelfPaced={sortedExploreSelfPaced}
              exploreTutorLed={sortedExploreTutorLed}
              catalogCourses={effectiveCatalog}
              recommendedSelfPacedSlugs={recommendedSelfPacedSlugs}
              recommendedTutorSlugs={recommendedTutorSlugs}
              completedCount={completedDashboardCount}
              learningHrefFor={learningHrefFor}
            />

            <article className="mt-4 rounded-xl border border-white/10 bg-black/30 p-3">
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

            {coursesForLearning.length > 0 ? (
              <article className="mt-4 rounded-xl border border-emerald-500/25 bg-black/30 p-3">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <h3 className="inline-flex items-center gap-2 text-xl font-bold">
                    <ListChecks size={18} className="text-emerald-300" />
                    Module exams
                  </h3>
                  <Link
                    href="/my-learning?tab=assignments"
                    className="text-xs text-emerald-200/90 underline-offset-2 hover:underline"
                  >
                    View all assignments
                  </Link>
                </div>
                {enrolledExamTasks.length === 0 ? (
                  <p className="text-sm text-gray-400">
                    No module exams are configured on your enrolled courses yet.
                  </p>
                ) : (
                  <>
                    <div className="mb-3 flex flex-wrap items-end gap-2">
                      {examCourseOptions.length > 1 ? (
                        <label className="min-w-[220px] flex-1 text-xs text-gray-400">
                          Course
                          <select
                            value={examCourseSlug}
                            onChange={(e) => setExamCourseSlug(e.target.value)}
                            className="mt-1 w-full rounded-md border border-white/15 bg-black/50 px-2.5 py-1.5 text-sm text-white outline-none focus:border-emerald-400/40"
                          >
                            <option value="all">All courses</option>
                            {examCourseOptions.map((option) => (
                              <option key={option.slug} value={option.slug}>
                                {option.title}
                              </option>
                            ))}
                          </select>
                        </label>
                      ) : null}
                      <label className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-black/40 px-2.5 py-1.5 text-xs text-gray-300">
                        <input
                          type="checkbox"
                          checked={examOpenOnly}
                          onChange={(e) => setExamOpenOnly(e.target.checked)}
                          className="rounded border-white/20 bg-black/40 text-emerald-400"
                        />
                        Opened exams only
                      </label>
                    </div>
                    <p className="mb-2 text-xs text-emerald-200/80">
                      {openedExamCount === 0
                        ? "No exams are open for this selection yet."
                        : `${openedExamCount} exam${openedExamCount === 1 ? "" : "s"} open`}
                    </p>
                    {filteredExamTasks.length === 0 ? (
                      <p className="text-sm text-gray-400">
                        No matching exams for this course filter.
                      </p>
                    ) : (
                      <ul className="space-y-2">
                        {(examCourseSlug === "all" && !examOpenOnly
                          ? filteredExamTasks.slice(0, 6)
                          : filteredExamTasks
                        ).map((task) => (
                          <li
                            key={`${task.courseSlug}-${task.href}`}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 bg-black/25 px-3 py-2"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-white">{task.label}</p>
                              <p className="truncate text-xs text-gray-400">
                                {task.courseTitle}
                                {task.marksLabel !== "—" ? ` · ${task.marksLabel}` : ""}
                              </p>
                            </div>
                            {task.ready && task.unlocked ? (
                              <Link
                                href={task.href}
                                className="shrink-0 rounded-md border border-emerald-400/40 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-100 hover:bg-emerald-500/20"
                              >
                                {task.status === "Completed" ? "Review" : "Start exam"}
                              </Link>
                            ) : task.status === "Locked" ? (
                              <span className="shrink-0 text-xs text-zinc-500">Locked</span>
                            ) : (
                              <span className="shrink-0 text-xs text-zinc-500">Not available yet</span>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                )}
              </article>
            ) : null}

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
        ) : isLive && isOrgLearner ? (
          <MyLearningOrganizationLiveHub
            enrollments={tutorLedCoursesForHub}
            exploreCourses={tutorLedExploreCourses}
            companySize={learnerProfile.companySize}
          />
        ) : isLive ? (
          <MyLearningLiveHub
            enrollments={tutorLedCoursesForHub}
            exploreCourses={tutorLedExploreCourses}
          />
        ) : isOrgCourses && isOrgLearner ? (
          <MyLearningOrganizationCourses courses={effectiveCatalog} />
        ) : isInviteEmployees && isOrgLearner ? (
          <section className="rounded-2xl border border-white/10 bg-[#0a0a0a] p-4 shadow-[0_0_24px_rgba(0,0,0,0.35)]">
            <MyLearningOrganizationInviteEmployees
              companyName={learnerProfile.companyName ?? orgDashboardSnapshot.companyName}
              companySize={learnerProfile.companySize}
              seatsTotal={orgDashboardSnapshot.seatsTotal}
            />
          </section>
        ) : isAssignCourses && isOrgLearner ? (
          <section className="rounded-2xl border border-white/10 bg-[#0a0a0a] p-4 shadow-[0_0_24px_rgba(0,0,0,0.35)]">
            <MyLearningOrganizationAssignCourses
              courses={effectiveCatalog}
              companySize={learnerProfile.companySize}
              seatsTotal={orgDashboardSnapshot.seatsTotal}
            />
          </section>
        ) : isOrgReport && isOrgLearner ? (
          <section className="rounded-2xl border border-white/10 bg-[#0a0a0a] p-4 shadow-[0_0_24px_rgba(0,0,0,0.35)]">
            <MyLearningOrganizationTeamReport
              companyName={learnerProfile.companyName ?? orgDashboardSnapshot.companyName}
              companySize={learnerProfile.companySize}
              courses={effectiveCatalog}
              seatsTotal={orgDashboardSnapshot.seatsTotal}
            />
          </section>
        ) : isCertificates && isOrgLearner ? (
          <section className="rounded-2xl border border-white/10 bg-[#0a0a0a] p-4 shadow-[0_0_24px_rgba(0,0,0,0.35)]">
            <MyLearningOrganizationCertificates
              courses={effectiveCatalog}
              tutorEnrollments={tutorLedCoursesForHub}
              tutorExplore={tutorLedExploreCourses}
              companySize={learnerProfile.companySize}
            />
          </section>
        ) : isCertificates ? (
          <section className="rounded-2xl border border-white/10 bg-[#0a0a0a] p-4 shadow-[0_0_24px_rgba(0,0,0,0.35)]">
            <MyCertificatesList />
          </section>
        ) : isSubscriptions ? (
          <section className="rounded-2xl border border-white/10 bg-[#0a0a0a] p-4 pb-3 shadow-[0_0_24px_rgba(0,0,0,0.35)]">
            {isOrgLearner ? (
              <MyLearningOrganizationSubscriptions
                orgPlan={adminContent.homePage?.orgPlan ?? defaultHomePageConfig.orgPlan}
              />
            ) : (
              <MyLearningIndividualSubscriptions />
            )}
          </section>
        ) : isCommunity && isOrgLearner ? (
          <section className="rounded-2xl border border-white/10 bg-[#0a0a0a] p-4 shadow-[0_0_24px_rgba(0,0,0,0.35)]">
            <MyLearningOrganizationCommunityHub
              enrolledSlugs={enrolledCourseSlugs}
              courseTitles={enrolledCourseTitles}
              focusCourseSlug={communityFocusCourse}
              completedCourses={coursesForLearning.filter(
                (c) => c.status.toLowerCase() === "completed" || c.completed >= c.modules,
              )}
              certificates={learnerCertificates}
              earnedBadges={earnedBadges}
              globalBadgeImage={adminContent.globalCertificateAssets?.badgeImage}
              calendarReminders={adminContent.dashboard?.calendarReminders ?? []}
              communityConnect={adminContent.dashboard?.communityConnect ?? []}
              companyName={learnerProfile.companyName ?? orgDashboardSnapshot.companyName}
              adminDisplayName={learnerFirstName}
            />
          </section>
        ) : isCommunity ? (
          <section className="rounded-2xl border border-white/10 bg-[#0a0a0a] p-4 shadow-[0_0_24px_rgba(0,0,0,0.35)]">
            <MyLearningCommunityHub
              enrolledSlugs={enrolledCourseSlugs}
              courseTitles={enrolledCourseTitles}
              focusCourseSlug={communityFocusCourse}
              completedCourses={coursesForLearning.filter(
                (c) => c.status.toLowerCase() === "completed" || c.completed >= c.modules,
              )}
              certificates={learnerCertificates}
              earnedBadges={earnedBadges}
              globalBadgeImage={adminContent.globalCertificateAssets?.badgeImage}
              calendarReminders={adminContent.dashboard?.calendarReminders ?? []}
              communityConnect={adminContent.dashboard?.communityConnect ?? []}
            />
          </section>
        ) : isAssignments && isOrgLearner ? (
          <MyLearningOrganizationAssignmentsTab rows={orgAssignmentRows} />
        ) : isAssignments ? (
          <MyLearningAssignmentsTab rows={learnerAssignmentRows} />
        ) : isLearning && isOrgLearner ? (
          <section className="rounded-2xl border border-white/10 bg-[#0a0a0a] p-4 shadow-[0_0_24px_rgba(0,0,0,0.35)]">
            <MyLearningOrganizationTeamProgress
              courses={effectiveCatalog}
              tutorEnrollments={tutorLedCoursesForHub}
              tutorExplore={tutorLedExploreCourses}
              companySize={learnerProfile.companySize}
            />
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
                <button
                  type="button"
                  onClick={() => setCourseSort((s) => (s === "recent" ? "title" : "recent"))}
                  className="rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-gray-300 hover:border-amber-400/30 hover:text-amber-100"
                >
                  Sort by: {courseSort === "recent" ? "Recent Activity" : "Course Title"}
                </button>
              </div>

              <div className="space-y-2">
                {sortedCoursesForLearning.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-white/15 bg-black/20 p-6 text-center text-sm text-gray-400">
                    {coursesForLearning.length === 0
                      ? "You have not enrolled in any courses yet. Purchase a course to track your progress here."
                      : "No courses match this filter."}
                  </p>
                ) : (
                  sortedCoursesForLearning.map((course) => {
                  const catalogCourse = findCatalogCourse(course, effectiveCatalog);
                  const safeModules = Math.max(
                    1,
                    catalogCourse
                      ? countLearnerCurriculumModules(catalogCourse.curriculum)
                      : course.modules || 1,
                  );
                  // Real per-module completion (not “first N modules”), so progress stays accurate
                  // when learners open modules out of order.
                  const doneSet = new Set(
                    course.slug ? readCompletedModules(course.slug) : [],
                  );
                  const doneCount = Array.from({ length: safeModules }).filter((_, idx) =>
                    doneSet.has(idx + 1),
                  ).length;
                  const firstIncomplete =
                    Array.from({ length: safeModules }, (_, idx) => idx + 1).find(
                      (n) => !doneSet.has(n),
                    ) ?? null;
                  const percentage = Math.round((doneCount / safeModules) * 100);
                  const courseDone =
                    course.status === "Completed" || doneCount >= safeModules;
                  const posterImage =
                    (catalogCourse ? resolveCourseListThumbnail(catalogCourse) : "") ||
                    course.image ||
                    "";
                  return (
                    <article
                      key={courseRowKey(course)}
                      className="grid gap-3 rounded-xl border border-white/10 bg-black/20 p-3 xl:grid-cols-[320px_1fr_150px]"
                    >
                      <div className="flex gap-3">
                        <CoursePoster image={posterImage} title={course.title} courseSlug={course.slug} />
                        <div>
                          <p className="text-lg font-semibold">{course.title}</p>
                          <p className="mt-1 text-xs text-gray-400">
                            {safeModules} Modules • {formatCourseDuration(catalogCourse?.duration || course.duration)}
                          </p>
                        </div>
                      </div>

                      <div>
                        <p className="text-xs text-gray-400">
                          Modules Progress{" "}
                          <span className="text-gray-500">
                            ({doneCount}/{safeModules} done — click a number to open)
                          </span>
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {Array.from({ length: safeModules }).map((_, idx) => {
                            const moduleNumber = idx + 1;
                            const isDone = doneSet.has(moduleNumber);
                            const isCurrent = !courseDone && moduleNumber === firstIncomplete;
                            const hrefBase = learningHrefFor(course).split("#")[0];
                            const href = courseDone
                              ? `${hrefBase}?review=1&module=${moduleNumber}`
                              : `${hrefBase}?module=${moduleNumber}`;
                            const className = `inline-flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-semibold transition ${
                              isDone || courseDone
                                ? "bg-emerald-500 text-white ring-1 ring-emerald-300/50 hover:bg-emerald-400"
                                : isCurrent
                                  ? "bg-violet-500/40 text-violet-100 ring-1 ring-violet-300/50 hover:bg-violet-500/55"
                                  : "border border-white/15 text-gray-500 hover:border-violet-300/40 hover:text-violet-100"
                            }`;
                            return (
                              <Link
                                key={`${courseRowKey(course)}-${moduleNumber}`}
                                href={href}
                                title={
                                  isDone || courseDone
                                    ? `Reopen module ${moduleNumber}`
                                    : isCurrent
                                      ? `Continue module ${moduleNumber}`
                                      : `Open module ${moduleNumber}`
                                }
                                className={className}
                              >
                                {moduleNumber}
                              </Link>
                            );
                          })}
                        </div>
                      </div>

                      <div className="flex flex-col items-end justify-between">
                        <div className="text-right">
                          <p className="text-4xl font-bold">{percentage}%</p>
                          <p className="text-xs text-gray-400">
                            {doneCount} / {safeModules} Modules
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
                  Exams & Assessments
                </h2>
                <Link
                  href="/my-learning?tab=assignments"
                  className="text-xs text-emerald-200/90 underline-offset-2 hover:underline"
                >
                  Assignments tab
                </Link>
              </div>
              {courseCatalog === undefined && effectiveCatalog.length === 0 ? (
                <p className="text-sm text-gray-400">Loading exam list from catalog…</p>
              ) : examsByCourse.length === 0 ? (
                <p className="text-sm text-gray-400">
                  No assessments are listed for your courses yet. Open the{" "}
                  <Link href="/my-learning?tab=assignments" className="text-emerald-200 underline">
                    Assignments
                  </Link>{" "}
                  tab after you enroll and start learning.
                </p>
              ) : (
                <div className="space-y-4">
                  {examsByCourse.map(({ course, links }) => {
                    const readyLinks = links.filter((link) => link.ready);
                    if (readyLinks.length === 0) return null;
                    return (
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
                        {readyLinks.map((link) => (
                          <li
                            key={link.href}
                            className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-2 last:border-0 last:pb-0"
                          >
                            <span className="text-sm text-gray-300">
                              <span className="text-gray-500">{link.slot} · </span>
                              {link.label}
                            </span>
                            {enrolledExamSlugs.has(course.slug) ? (
                            <Link
                              href={link.href}
                              className="shrink-0 rounded-md border border-emerald-400/40 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-100 hover:bg-emerald-500/20"
                            >
                              Open exam
                            </Link>
                            ) : (
                              <Link
                                href={`/courses/${encodeURIComponent(course.slug)}`}
                                className="shrink-0 rounded-md border border-amber-400/40 bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-100 hover:bg-amber-500/20"
                              >
                                Enroll to take exam
                              </Link>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                    );
                  })}
                </div>
              )}
            </article>
          </section>
        ) : isAchievements && isOrgLearner ? (
          <MyLearningOrganizationAchievementsTab
            companyName={learnerProfile.companyName ?? orgDashboardSnapshot.companyName}
            courses={effectiveCatalog}
            tutorEnrollments={tutorLedCoursesForHub}
            tutorExplore={tutorLedExploreCourses}
            companySize={learnerProfile.companySize}
            globalBadgeImage={adminContent.globalCertificateAssets?.badgeImage}
          />
        ) : isAchievements ? (
          <MyLearningAchievementsTab
            learnerFirstName={learnerFirstName}
            certificates={learnerCertificates}
            earnedBadges={earnedBadges}
            completedCourses={coursesForLearning}
            globalBadgeImage={adminContent.globalCertificateAssets?.badgeImage}
            stats={{
              enrolled: totalEnrolledCourses,
              inProgress: totalInProgressCourses,
              completed: totalCompletedCourses,
              modulesDone: coursesForLearning.reduce((s, c) => s + c.completed, 0),
              notStarted: totalNotStartedCourses,
            }}
            overallProgressPercent={Math.min(
              100,
              Math.round(
                (coursesForLearning.reduce((s, c) => s + c.completed, 0) /
                  Math.max(1, coursesForLearning.reduce((s, c) => s + c.modules, 0))) *
                  100,
              ),
            )}
          />
        ) : null}
      </main>
    </div>
  );
}
