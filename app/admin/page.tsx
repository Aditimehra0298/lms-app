"use client";

import Image from "next/image";
import Link from "next/link";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import sfWhiteLogo from "@/SF-WHITE-LOGO.png";
import {
  BookOpen,
  Briefcase,
  Building2,
  Calendar,
  CreditCard,
  Eye,
  FileText,
  Filter,
  Home,
  Inbox,
  LayoutGrid,
  Layers,
  Leaf,
  Images,
  LogOut,
  Menu,
  MessageSquare,
  Moon,
  Pencil,
  Search,
  Settings,
  ShoppingCart,
  Star,
  TicketCheck,
  Trash2,
  Undo2,
  Users,
  Video,
  Award,
  HelpCircle,
  Shield,
  BarChart3,
  FileBarChart,
} from "lucide-react";
import AdminCoursesWorkspace from "@/components/admin/AdminCoursesWorkspace";
import AdminCertificatesWorkspace from "@/components/admin/AdminCertificatesWorkspace";
import AdminCoursesPageEditor from "@/components/admin/AdminCoursesPageEditor";
import AdminHomePageEditor from "@/components/admin/AdminHomePageEditor";
import AdminAboutPageEditor from "@/components/admin/AdminAboutPageEditor";
import AdminTutorLedWorkspace from "@/components/admin/AdminTutorLedWorkspace";
import AdminWorkshopsWorkspace from "@/components/admin/AdminWorkshopsWorkspace";
import AdminLessonsWorkspace from "@/components/admin/AdminLessonsWorkspace";
import AdminBatchesWorkspace from "@/components/admin/AdminBatchesWorkspace";
import AdminUsersWorkspace from "@/components/admin/AdminUsersWorkspace";
import AdminPaymentsWorkspace from "@/components/admin/AdminPaymentsWorkspace";
import AdminOrdersWorkspace from "@/components/admin/AdminOrdersWorkspace";
import AdminInvoicesWorkspace from "@/components/admin/AdminInvoicesWorkspace";
import AdminRefundsWorkspace from "@/components/admin/AdminRefundsWorkspace";
import AdminRecentOrders from "@/components/admin/AdminRecentOrders";
import AdminRolesPermissionsWorkspace from "@/components/admin/AdminRolesPermissionsWorkspace";
import AdminSettingsWorkspace from "@/components/admin/AdminSettingsWorkspace";
import AdminAnalyticsWorkspace from "@/components/admin/AdminAnalyticsWorkspace";
import AdminReportsWorkspace from "@/components/admin/AdminReportsWorkspace";
import AdminNotificationsBell from "@/components/admin/AdminNotificationsBell";
import { AdminCommunityConnectEditor } from "@/components/admin/AdminCommunityConnectEditor";
import { AdminDashboardCalendarEditor } from "@/components/admin/AdminDashboardCalendarEditor";
import { AdminOrganizationTeamEditor } from "@/components/admin/AdminOrganizationTeamEditor";
import AdminCourseQAModeration from "@/components/admin/AdminCourseQAModeration";
import AdminSupportTickets from "@/components/admin/AdminSupportTickets";
import AdminFormSubmissions from "@/components/admin/AdminFormSubmissions";
import AdminWebsiteImageGuide from "@/components/admin/AdminWebsiteImageGuide";
import AdminFaqPageEditor from "@/components/admin/AdminFaqPageEditor";
import AdminTestimonialsPageEditor from "@/components/admin/AdminTestimonialsPageEditor";
import CategoryPageEditorModal from "@/components/admin/CategoryPageEditorModal";
import CategoryPreviewIframe from "@/components/admin/CategoryPreviewIframe";
import type { AdminContent, ManagedCategory } from "@/lib/content-schema";
import AdminAccessDenied from "@/components/AdminAccessDenied";
import { defaultAdminContent } from "@/lib/content-schema";
import { clearLearnerProfileStorage, getLearnerEmail, isLearnerLoggedIn } from "@/lib/learner-session-client";
import { installAdminCsrfFetch } from "@/lib/admin-csrf-client";

const menuSections = [
  {
    title: "",
    items: ["Dashboard"],
  },
  {
    title: "Website Management",
    items: [
      "Home Page",
      "About Page",
      "Courses Page",
      "Website Form Data",
      "Image Upload Guide",
      "FAQ Page",
      "Testimonials",
    ],
  },
  {
    title: "Course Management",
    items: [
      "Categories",
      "Self-paced courses",
      "Course Q&A",
      "Lessons",
      "Tutor Led",
      "Workshops",
      "Batches",
    ],
  },
  {
    title: "Users & Access",
    items: ["Users", "Organization Team", "Certificates", "Roles & Permissions"],
  },
  {
    title: "Orders & Payments",
    items: ["Orders", "Payments", "Invoices", "Refunds"],
  },
  {
    title: "Support",
    items: ["Support Tickets"],
  },
  {
    title: "Other",
    items: ["Settings", "Analytics", "Reports"],
  },
];

type DashboardStats = {
  totalUsers: number;
  totalStudents: number;
  totalAdmins: number;
  totalOrganizations: number;
  totalCourses: number;
  publishedCourses: number;
  totalCategories: number;
  totalPurchases: number;
  totalPayments: number;
  totalRevenue: number;
  totalCertificates: number;
  totalReviews: number;
  totalFormSubmissions: number;
  newsletterSubs: number;
};
type DashboardRecentUser = { name: string | null; email: string; createdAt: string; role: string };
type DashboardRecentPayment = {
  id: string;
  learnerEmail: string;
  amount: number;
  currency: string;
  status: string;
  method: string;
  items: unknown;
  createdAt: string;
};
type DashboardTopCourse = { slug: string; title: string; enrollments: number };
type CategoryStatRow = {
  slug: string;
  title: string;
  courseCount: number;
  publishedCourseCount: number;
  studentCount: number;
};

const quickActions = [
  "Add New Course",
  "Add New Category",
  "Manage Users",
  "Create Tutor-Led Session",
  "Send Newsletter",
];

const menuIcons: Record<string, typeof Home> = {
  Dashboard: Home,
  "Website Form Data": Inbox,
  "Image Upload Guide": Images,
  "Home Page": LayoutGrid,
  "About Page": FileText,
  "Courses Page": BookOpen,
  Categories: Layers,
  "Self-paced courses": BookOpen,
  "Course Q&A": MessageSquare,
  Lessons: Video,
  "Tutor Led": Video,
  Workshops: Calendar,
  Batches: Users,
  Users: Users,
  Certificates: Award,
  "Roles & Permissions": Shield,
  Settings: Settings,
  "Support Tickets": TicketCheck,
  "FAQ Page": HelpCircle,
  Testimonials: Star,
  Orders: ShoppingCart,
  Payments: CreditCard,
  Invoices: FileText,
  Refunds: Undo2,
  Analytics: BarChart3,
  Reports: FileBarChart,
  "Organization Team": Building2,
};

type AdminAccessState = {
  status: "loading" | "allowed" | "denied";
  message?: string;
};

const MENU_PANEL_QUERY: Record<string, string> = {
  "Self-paced courses": "self-paced",
  Lessons: "lessons",
  "Course Q&A": "course-qa",
  Batches: "batches",
  "Tutor Led": "tutor-led",
  Workshops: "workshops",
  Users: "users",
  Certificates: "certificates",
  "Roles & Permissions": "roles",
  Orders: "orders",
  Payments: "payments",
  Invoices: "invoices",
  Refunds: "refunds",
  Settings: "settings",
  Analytics: "analytics",
  Reports: "reports",
};

const PANEL_MENU_QUERY: Record<string, string> = Object.fromEntries(
  Object.entries(MENU_PANEL_QUERY).map(([menu, panel]) => [panel, menu]),
);

function formatAdminHeaderDate(now = new Date()): string {
  const start = new Date(now);
  const day = start.getDay(); // 0 Sun … 6 Sat
  const mondayOffset = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + mondayOffset);
  start.setHours(12, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  const sameMonth = start.getMonth() === end.getMonth();
  const sameYear = start.getFullYear() === end.getFullYear();
  const monthDay = (d: Date) =>
    d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const withYear = (d: Date) =>
    d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

  if (sameMonth && sameYear) {
    return `${monthDay(start)} – ${end.getDate()}, ${end.getFullYear()}`;
  }
  if (sameYear) {
    return `${monthDay(start)} – ${withYear(end)}`;
  }
  return `${withYear(start)} – ${withYear(end)}`;
}

function fmtNum(n: number): string {
  return n.toLocaleString("en-IN");
}

function fmtCurrency(n: number): string {
  if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(1)}Cr`;
  if (n >= 100_000) return `₹${(n / 100_000).toFixed(1)}L`;
  return `₹${n.toLocaleString("en-IN")}`;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min${mins === 1 ? "" : "s"} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

function AdminAccessLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a] text-zinc-400">
      Checking administrator permission…
    </div>
  );
}

function AdminPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeMenu, setActiveMenu] = useState("Dashboard");
  const [access, setAccess] = useState<AdminAccessState>({ status: "loading" });
  const [categoryPageEditor, setCategoryPageEditor] = useState<{
    slug: string;
    title: string;
  } | null>(null);
  const [categoryPreviewSlug, setCategoryPreviewSlug] = useState<string | null>(null);
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [editCategoryIndex, setEditCategoryIndex] = useState<number | null>(null);
  const [newCategory, setNewCategory] = useState({
    name: "",
    subtitle: "",
    description: "",
    courses: "0",
    students: "0",
    status: "Published",
  });
  const [editCategory, setEditCategory] = useState({
    name: "",
    subtitle: "",
    description: "",
    courses: "0",
    students: "0",
    status: "Published",
    slug: "",
    image: "",
  });
  const [uploadingCategoryImage, setUploadingCategoryImage] = useState(false);
  const [categoryRows, setCategoryRows] = useState<string[][]>([]);
  const [categoriesReady, setCategoriesReady] = useState(false);
  const [headerDateLabel, setHeaderDateLabel] = useState(() => formatAdminHeaderDate());
  const [categoriesLoadError, setCategoriesLoadError] = useState<string | null>(null);
  const [dashStats, setDashStats] = useState<DashboardStats | null>(null);
  const [dashRecentUsers, setDashRecentUsers] = useState<DashboardRecentUser[]>([]);
  const [dashRecentPayments, setDashRecentPayments] = useState<DashboardRecentPayment[]>([]);
  const [dashTopCourses, setDashTopCourses] = useState<DashboardTopCourse[]>([]);
  const [categoryStats, setCategoryStats] = useState<CategoryStatRow[]>([]);

  const panelQuery = searchParams.get("panel");

  const selectMenu = useCallback(
    (item: string) => {
      setActiveMenu(item);
      const nextPanel = MENU_PANEL_QUERY[item] ?? null;
      if (nextPanel) {
        if (panelQuery !== nextPanel) {
          router.replace(`/admin?panel=${nextPanel}`, { scroll: false });
        }
        return;
      }
      if (panelQuery) {
        router.replace("/admin", { scroll: false });
      }
    },
    [router, panelQuery],
  );

  useEffect(() => {
    if (!panelQuery) return;
    const menu = PANEL_MENU_QUERY[panelQuery];
    if (menu) setActiveMenu(menu);
  }, [panelQuery]);

  useEffect(() => {
    const tick = () => setHeaderDateLabel(formatAdminHeaderDate());
    tick();
    const id = window.setInterval(tick, 60_000);
    return () => window.clearInterval(id);
  }, []);

  const authCheckStarted = useRef(false);

  useEffect(() => {
    return installAdminCsrfFetch();
  }, []);

  useEffect(() => {
    if (authCheckStarted.current) return;
    authCheckStarted.current = true;

    let cancelled = false;

    const applyAccess = (data: { allowed?: boolean; message?: string; email?: string }) => {
      if (cancelled) return;
      if (data.allowed) {
        if (data.email) {
          window.localStorage.setItem("sft_learner_email", data.email);
          window.localStorage.setItem("sft_logged_in", "true");
        }
        window.localStorage.setItem("sft_user_role", "admin");
        setAccess({ status: "allowed" });
        return;
      }
      window.localStorage.setItem("sft_user_role", "learner");
      window.sessionStorage.removeItem("sft_admin_access_email");
      setAccess({
        status: "denied",
        message: data.message,
      });
      router.replace("/account?admin=1&reason=session");
    };

    const check = () =>
      fetch("/api/auth/admin-access", { cache: "no-store", credentials: "include" })
        .then((r) => r.json())
        .then(applyAccess)
        .catch(() => {
          if (!cancelled) {
            setAccess({
              status: "denied",
              message: "Could not verify admin permission. Sign in at Admin login.",
            });
            router.replace("/account?admin=1");
          }
        });

    // Server JWT session cookie is the only proof of admin — never trust localStorage alone.
    void check();
    // Kick this browser if another device took the exclusive admin session.
    const heartbeat = window.setInterval(() => {
      void check();
    }, 20_000);

    return () => {
      cancelled = true;
      window.clearInterval(heartbeat);
    };
  }, [router]);

  const toSlug = (value: string) =>
    value
      .toLowerCase()
      .replace(/&/g, "and")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

  const toManagedCategories = (rows: string[][]): ManagedCategory[] =>
    rows.map((row, index) => ({
      slug: (row[6]?.trim() || toSlug(row[0]) || `category-${index + 1}`),
      title: row[0],
      subtitle: row[1] || "General",
      description: row[2] || "Category description",
      isActive: row[5] !== "Draft",
      isFeatured: false,
      isUppercase: false,
      isBold: false,
      tone: "violet",
      image: row[7]?.trim() || undefined,
    }));

  const rowsFromManagedCategories = (cats: ManagedCategory[]): string[][] =>
    cats.map((c) => {
      const row = c as ManagedCategory & { name?: string };
      return [
        row.title || row.name || row.slug || "",
        row.subtitle || "General",
        row.description || "",
        "—",
        "—",
        row.isActive === false ? "Draft" : "Published",
        row.slug || "",
        row.image?.trim() || "",
      ];
    });

  const categorySlugAt = (row: string[], index: number) =>
    row[6]?.trim() || toSlug(row[0]) || `category-${index + 1}`;

  useEffect(() => {
    if (access.status !== "allowed") return;
    let cancelled = false;
    fetch("/api/admin/dashboard-stats", { cache: "no-store" })
      .then((r) => r.json())
      .then((data: {
        ok?: boolean;
        stats?: DashboardStats;
        recentUsers?: DashboardRecentUser[];
        recentPayments?: DashboardRecentPayment[];
        topCourses?: DashboardTopCourse[];
        categoryStats?: CategoryStatRow[];
      }) => {
        if (cancelled) return;
        if (data.stats) setDashStats(data.stats);
        if (data.recentUsers) setDashRecentUsers(data.recentUsers);
        if (data.recentPayments) setDashRecentPayments(data.recentPayments);
        if (data.topCourses) setDashTopCourses(data.topCourses);
        if (Array.isArray(data.categoryStats)) setCategoryStats(data.categoryStats);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [access.status]);

  useEffect(() => {
    if (access.status !== "allowed") return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/content", { cache: "no-store" });
        if (!res.ok) {
          if (!cancelled) {
            setCategoriesLoadError(`Could not load saved categories (HTTP ${res.status}). Showing defaults.`);
            setCategoryRows(rowsFromManagedCategories(defaultAdminContent.categories));
          }
          return;
        }
        const data = (await res.json()) as AdminContent;
        if (cancelled) return;
        const cats = Array.isArray(data.categories) ? data.categories : defaultAdminContent.categories;
        setCategoryRows(cats.length > 0 ? rowsFromManagedCategories(cats) : []);
        setCategoriesLoadError(null);
      } catch {
        if (!cancelled) {
          setCategoriesLoadError("Network error while loading categories. Showing defaults.");
          setCategoryRows(rowsFromManagedCategories(defaultAdminContent.categories));
        }
      } finally {
        if (!cancelled) setCategoriesReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [access.status]);

  if (access.status === "loading") {
    return <AdminAccessLoading />;
  }

  if (access.status === "denied") {
    return (
      <div className="min-h-screen bg-[#0a0a0a]">
        <AdminAccessDenied
          userEmail={getLearnerEmail()}
          message={access.message}
        />
      </div>
    );
  }

  const showCoursesWorkspace = activeMenu === "Self-paced courses";
  const showLessonsWorkspace = activeMenu === "Lessons";
  const showCourseQAModeration = activeMenu === "Course Q&A";
  const showBatchesWorkspace = activeMenu === "Batches";
  const showCoursesPageEditor = activeMenu === "Courses Page";
  const showHomePageEditor = activeMenu === "Home Page";
  const showAboutPageEditor = activeMenu === "About Page";
  const showTutorLedWorkspace = activeMenu === "Tutor Led";
  const showWorkshopsWorkspace = activeMenu === "Workshops";
  const showSupportTickets = activeMenu === "Support Tickets";
  const showFormSubmissions = activeMenu === "Website Form Data";
  const showImageUploadGuide = activeMenu === "Image Upload Guide";
  const showFaqPageEditor = activeMenu === "FAQ Page";
  const showTestimonialsEditor = activeMenu === "Testimonials";
  const showCertificatesWorkspace = activeMenu === "Certificates";
  const showUsersWorkspace = activeMenu === "Users";
  const showPaymentsWorkspace = activeMenu === "Payments";
  const showOrdersWorkspace = activeMenu === "Orders";
  const showInvoicesWorkspace = activeMenu === "Invoices";
  const showRefundsWorkspace = activeMenu === "Refunds";
  const showSettingsWorkspace = activeMenu === "Settings";
  const showAnalyticsWorkspace = activeMenu === "Analytics";
  const showReportsWorkspace = activeMenu === "Reports";
  const showOrganizationTeam = activeMenu === "Organization Team";
  const showRolesWorkspace = activeMenu === "Roles & Permissions";
  const hasMainPanel =
    activeMenu === "Dashboard" ||
    showCoursesWorkspace ||
    showLessonsWorkspace ||
    showCourseQAModeration ||
    showBatchesWorkspace ||
    showCoursesPageEditor ||
    showHomePageEditor ||
    showAboutPageEditor ||
    showTutorLedWorkspace ||
    showWorkshopsWorkspace ||
    showSupportTickets ||
    showFormSubmissions ||
    showImageUploadGuide ||
    showFaqPageEditor ||
    showTestimonialsEditor ||
    showCertificatesWorkspace ||
    showUsersWorkspace ||
    showPaymentsWorkspace ||
    showOrdersWorkspace ||
    showInvoicesWorkspace ||
    showRefundsWorkspace ||
    showSettingsWorkspace ||
    showAnalyticsWorkspace ||
    showReportsWorkspace ||
    showOrganizationTeam ||
    showRolesWorkspace ||
    activeMenu === "Categories";

  const persistCategories = async (rows: string[][]) => {
    try {
      const put = await fetch("/api/admin/content", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categories: toManagedCategories(rows) }),
      });
      const data = (await put.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!put.ok || data.ok === false) {
        throw new Error(data.error || `Save failed (HTTP ${put.status})`);
      }
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not save categories.";
      if (typeof window !== "undefined") window.alert(`Category save failed: ${message}`);
      return false;
    }
  };

  const deleteCategoryAt = async (index: number) => {
    const row = categoryRows[index];
    const label = row?.[0] ?? "this category";
    if (
      typeof window !== "undefined" &&
      !window.confirm(`Delete “${label}”? It will be removed from the website and courses listing.`)
    ) {
      return;
    }
    const nextRows = categoryRows.filter((_, i) => i !== index);
    const ok = await persistCategories(nextRows);
    if (ok) setCategoryRows(nextRows);
  };

  const addCategory = async () => {
    if (!newCategory.name.trim()) return;
    const name = newCategory.name.trim();
    const nextRows = [
      ...categoryRows,
      [
        name,
        newCategory.subtitle.trim() || "General",
        newCategory.description.trim() || "Category description",
        newCategory.courses.trim() || "0",
        newCategory.students.trim() || "0",
        newCategory.status,
        toSlug(name) || `category-${categoryRows.length + 1}`,
        "",
      ],
    ];
    const ok = await persistCategories(nextRows);
    if (!ok) return;
    setCategoryRows(nextRows);
    setNewCategory({
      name: "",
      subtitle: "",
      description: "",
      courses: "0",
      students: "0",
      status: "Published",
    });
    setShowAddCategoryModal(false);
  };

  const openEditCategory = (index: number) => {
    const row = categoryRows[index];
    if (!row) return;
    setEditCategoryIndex(index);
    setEditCategory({
      name: row[0] ?? "",
      subtitle: row[1] ?? "",
      description: row[2] ?? "",
      courses: row[3] ?? "0",
      students: row[4] ?? "0",
      status: row[5] === "Draft" ? "Draft" : "Published",
      slug: categorySlugAt(row, index),
      image: row[7] ?? "",
    });
  };

  const uploadCategoryImage = async (file: File) => {
    setUploadingCategoryImage(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/upload-cover", { method: "POST", body: fd });
      const data = (await res.json()) as { ok?: boolean; url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error ?? "Upload failed");
      setEditCategory((prev) => ({ ...prev, image: data.url! }));
    } catch (e) {
      const message = e instanceof Error ? e.message : "Image upload failed.";
      if (typeof window !== "undefined") window.alert(message);
    } finally {
      setUploadingCategoryImage(false);
    }
  };

  const saveEditCategory = async () => {
    if (editCategoryIndex === null || !editCategory.name.trim()) return;
    const nextRows = categoryRows.map((row, i) => {
      if (i !== editCategoryIndex) return row;
      return [
        editCategory.name.trim(),
        editCategory.subtitle.trim() || "General",
        editCategory.description.trim() || "Category description",
        editCategory.courses.trim() || row[3] || "0",
        editCategory.students.trim() || row[4] || "0",
        editCategory.status,
        // Keep slug stable so courses / Explore / URLs stay connected
        row[6]?.trim() || editCategory.slug || toSlug(editCategory.name.trim()),
        editCategory.image.trim(),
      ];
    });
    const ok = await persistCategories(nextRows);
    if (!ok) return;
    setCategoryRows(nextRows);
    setEditCategoryIndex(null);
    if (typeof window !== "undefined") window.alert("Category saved (including image).");
  };

  return (
    <main className="min-h-screen bg-[#060b16] text-white">
      <div className="grid min-h-screen lg:grid-cols-[260px_1fr]">
        <aside className="border-r border-white/10 bg-[#080f20] p-4">
          <div className="mb-4 flex items-center gap-3">
            <Image
              src={sfWhiteLogo}
              alt="Sustainable Futures Trainings"
              width={38}
              height={38}
              className="rounded-lg"
            />
            <div>
              <p className="text-sm font-semibold">Sustainable Futures</p>
              <p className="text-[11px] text-gray-400">Admin Panel</p>
            </div>
          </div>

          <div className="space-y-4">
            {menuSections.map((section) => (
              <div key={section.title || "main"}>
                {section.title ? (
                  <p className="mb-2 text-[10px] uppercase tracking-[0.2em] text-[#8f80ff]">
                    {section.title}
                  </p>
                ) : null}
                <div className="space-y-1">
                  {section.items.map((item, idx) => (
                    <button
                      key={item}
                      onClick={() => selectMenu(item)}
                      className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs ${
                        item === activeMenu
                          ? "border border-[#6f55ff]/60 bg-[#6f55ff]/30 shadow-[0_0_24px_rgba(111,85,255,0.35)]"
                          : "text-gray-300 hover:bg-white/5"
                      }`}
                    >
                      {(() => {
                        const Icon = menuIcons[item] ?? (idx % 2 === 0 ? Home : Layers);
                        return <Icon size={13} />;
                      })()}
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={() => {
                void fetch("/api/auth/admin-logout", {
                  method: "POST",
                  credentials: "include",
                }).finally(() => {
                  try {
                    clearLearnerProfileStorage();
                    sessionStorage.removeItem("sft_admin_access_email");
                    localStorage.removeItem("sft_user_role");
                  } catch {
                    /* ignore */
                  }
                  window.location.href = "/";
                });
              }}
              className="mt-3 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-red-300 hover:bg-red-500/10"
            >
              <LogOut size={13} />
              Logout
            </button>
          </div>
        </aside>

        <section className="min-w-0 overflow-x-hidden p-4 md:p-5">
          <header className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#0b1224] px-3 py-2">
            <div className="flex items-center gap-2">
              <button className="rounded-md p-1.5 text-gray-300 hover:bg-white/5">
                <Menu size={16} />
              </button>
              <div className="inline-flex min-w-0 items-center gap-2 rounded-lg border border-white/10 bg-[#0a1120] px-3 py-2 text-xs">
                <Search size={13} className="text-gray-500" />
                <input
                  className="w-32 bg-transparent text-sm outline-none placeholder:text-gray-500 sm:w-56 md:w-72 lg:w-96"
                  placeholder={
                    showCoursesWorkspace
                      ? "Search for courses, modules, users…"
                      : showLessonsWorkspace
                        ? "Search courses for lessons…"
                        : showTutorLedWorkspace
                          ? "Search tutor-led programs…"
                          : showWorkshopsWorkspace
                            ? "Search workshops…"
                            : showBatchesWorkspace
                              ? "Search batch schedules…"
                              : showCourseQAModeration
                                ? "Filter Q&A by course…"
                                : showUsersWorkspace
                                  ? "Search users by email…"
                                  : showPaymentsWorkspace
                                    ? "Search payments by email or order ID…"
                                    : "Search here..."
                  }
                />
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <AdminNotificationsBell onNavigate={(menu) => selectMenu(menu)} />
              <button className="rounded-lg border border-white/10 bg-[#0a1120] p-2">
                <Moon size={14} />
              </button>
              <div className="hidden rounded-lg border border-white/10 bg-[#0a1120] px-3 py-2 text-xs sm:block">
                {headerDateLabel}
              </div>
              <div className="rounded-lg border border-white/10 bg-[#0a1120] px-3 py-2 text-xs">Admin</div>
            </div>
          </header>

          {activeMenu === "Dashboard" && (
            <>
          <section className="mb-4 rounded-xl border border-white/10 bg-[#0b1224] p-3">
            <h1 className="text-2xl font-semibold">Dashboard</h1>
            <p className="text-xs text-gray-400">
              Welcome back, Admin! Here&apos;s what&apos;s happening with your platform today.
            </p>
          </section>

          <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {(dashStats ? [
              ["Total Users", fmtNum(dashStats.totalUsers), Users],
              ["Total Courses", fmtNum(dashStats.totalCourses), BookOpen],
              ["Total Revenue", fmtCurrency(dashStats.totalRevenue), CreditCard],
              ["Orders", fmtNum(dashStats.totalPayments), ShoppingCart],
              ["Active Students", fmtNum(dashStats.totalStudents), Users],
            ] as [string, string, typeof Users][] : [
              ["Total Users", "—", Users],
              ["Total Courses", "—", BookOpen],
              ["Total Revenue", "—", CreditCard],
              ["Orders", "—", ShoppingCart],
              ["Active Students", "—", Users],
            ] as [string, string, typeof Users][]).map(([label, value, Icon]) => (
              <article key={label} className="rounded-xl border border-white/10 bg-[#0d1528] p-3">
                <div className="mb-2 inline-flex rounded-md bg-[#6f55ff]/20 p-1.5 text-[#b5a8ff]">
                  <Icon size={14} />
                </div>
                <p className="text-[11px] text-gray-400">{label}</p>
                <p className="mt-1 text-2xl font-semibold">{value}</p>
              </article>
            ))}
          </div>

          <div className="grid gap-4 xl:grid-cols-[2fr_1.2fr_1fr]">
            <article className="rounded-xl border border-white/10 bg-[#0d1528] p-3">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-semibold">Revenue Overview</h3>
                <button className="rounded-md border border-white/10 bg-[#0a1120] px-2 py-1 text-xs">
                  This Week
                </button>
              </div>
              <div className="h-48 rounded-lg border border-white/10 bg-[#0a1120] p-3">
                <svg viewBox="0 0 600 220" className="h-full w-full">
                  <polyline
                    fill="none"
                    stroke="#7b61ff"
                    strokeWidth="4"
                    points="20,165 105,120 190,135 275,95 360,110 445,70 530,35"
                  />
                  <polyline
                    fill="none"
                    stroke="#f5b942"
                    strokeWidth="4"
                    points="20,190 105,175 190,185 275,160 360,170 445,145 530,95"
                  />
                </svg>
              </div>
            </article>

            <article className="rounded-xl border border-white/10 bg-[#0d1528] p-3">
              <h3 className="font-semibold">Users Overview</h3>
              <div className="mt-4 flex items-center gap-3">
                <div className="grid h-28 w-28 place-items-center rounded-full border-12 border-[#6f55ff] bg-[#0a1120]">
                  <div className="text-center">
                    <p className="text-xl font-semibold">{dashStats ? fmtNum(dashStats.totalUsers) : "—"}</p>
                    <p className="text-[10px] text-gray-400">Total Users</p>
                  </div>
                </div>
                <div className="space-y-2 text-xs text-gray-300">
                  <p>
                    <span className="mr-2 inline-block h-2 w-2 rounded-full bg-[#6f55ff]" />
                    Students: {dashStats ? fmtNum(dashStats.totalStudents) : "—"}
                  </p>
                  <p>
                    <span className="mr-2 inline-block h-2 w-2 rounded-full bg-[#3b82f6]" />
                    Organizations: {dashStats ? fmtNum(dashStats.totalOrganizations) : "—"}
                  </p>
                  <p>
                    <span className="mr-2 inline-block h-2 w-2 rounded-full bg-[#f59e0b]" />
                    Admins: {dashStats ? fmtNum(dashStats.totalAdmins) : "—"}
                  </p>
                </div>
              </div>
            </article>

            <article className="rounded-xl border border-white/10 bg-[#0d1528] p-3">
              <h3 className="mb-3 font-semibold">Quick Actions</h3>
              <div className="space-y-2">
                {quickActions.map((action) => (
                  <button
                    key={action}
                    type="button"
                    onClick={() => {
                      if (action === "Add New Course") selectMenu("Self-paced courses");
                      else if (action === "Add New Category") selectMenu("Categories");
                      else if (action === "Manage Users") selectMenu("Users");
                      else if (action === "Create Tutor-Led Session") selectMenu("Tutor Led");
                    }}
                    className="flex w-full items-center gap-2 rounded-lg border border-white/10 bg-[#0a1120] px-3 py-2 text-left text-xs hover:border-[#6f55ff]/50"
                  >
                    <Video size={13} className="text-[#b5a8ff]" />
                    {action}
                  </button>
                ))}
              </div>
            </article>
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-[2fr_1.1fr_1fr]">
            <AdminRecentOrders onViewAll={() => selectMenu("Orders")} />

            <article className="rounded-xl border border-white/10 bg-[#0d1528] p-3">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="font-semibold">User Registrations</h3>
                <button onClick={() => selectMenu("Users")} className="rounded-md border border-white/10 bg-[#0a1120] px-2 py-1 text-xs">View All</button>
              </div>
              <div className="space-y-3">
                {(dashRecentUsers.length > 0 ? dashRecentUsers : []).map((u) => (
                  <div key={u.email} className="flex items-center justify-between rounded-lg border border-white/10 bg-[#0a1120] px-3 py-2">
                    <div className="flex items-center gap-2">
                      <div className="grid h-8 w-8 place-items-center rounded-full bg-[#6f55ff]/30 text-[10px] font-bold text-white">
                        {(u.name || u.email).charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-xs font-medium">{u.name || u.email.split("@")[0]}</p>
                        <p className="text-[10px] text-gray-500">new user registered</p>
                      </div>
                    </div>
                    <p className="text-[10px] text-gray-400">{timeAgo(u.createdAt)}</p>
                  </div>
                ))}
                {dashRecentUsers.length === 0 && (
                  <p className="py-4 text-center text-xs text-gray-500">No registrations yet</p>
                )}
              </div>
            </article>

            <article className="rounded-xl border border-white/10 bg-[#0d1528] p-3">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="font-semibold">System Overview</h3>
                <Settings size={14} className="text-gray-400" />
              </div>
              <div className="space-y-2 text-xs">
                {(dashStats ? [
                  ["Total Categories", fmtNum(dashStats.totalCategories)],
                  ["Published Courses", fmtNum(dashStats.publishedCourses)],
                  ["Total Students", fmtNum(dashStats.totalStudents)],
                  ["Certificates Issued", fmtNum(dashStats.totalCertificates)],
                  ["Total Reviews", fmtNum(dashStats.totalReviews)],
                  ["Newsletter Subscribers", fmtNum(dashStats.newsletterSubs)],
                ] : [
                  ["Total Categories", "—"],
                  ["Published Courses", "—"],
                  ["Total Students", "—"],
                  ["Certificates Issued", "—"],
                  ["Total Reviews", "—"],
                  ["Newsletter Subscribers", "—"],
                ]).map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between rounded-lg border border-white/10 bg-[#0a1120] px-3 py-2">
                    <span className="inline-flex items-center gap-2 text-gray-300">
                      <FileText size={12} />
                      {k}
                    </span>
                    <span className="font-semibold">{v}</span>
                  </div>
                ))}
              </div>
            </article>
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-[2fr_1fr]">
            <article className="rounded-xl border border-white/10 bg-[#0d1528] p-3">
              <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-gray-300">
                <button
                  type="button"
                  onClick={() => selectMenu("Home Page")}
                  className="rounded-md bg-[#6f55ff]/30 px-2 py-1 hover:bg-[#6f55ff]/45"
                >
                  Home Page
                </button>
                <button
                  type="button"
                  onClick={() => selectMenu("About Page")}
                  className="rounded-md border border-white/10 px-2 py-1 hover:bg-white/10"
                >
                  About Page
                </button>
                <button
                  type="button"
                  onClick={() => selectMenu("Courses Page")}
                  className="rounded-md border border-white/10 px-2 py-1 hover:bg-white/10"
                >
                  Courses Page
                </button>
                <button type="button" className="rounded-md border border-white/10 px-2 py-1 opacity-60" disabled>
                  Contact Page
                </button>
              </div>
              <h3 className="mb-2 font-semibold">Content Management</h3>
              <table className="w-full text-left text-xs">
                <thead className="text-gray-400">
                  <tr>
                    {["Section", "Title", "Status", "Updated On", "Actions"].map((h) => (
                      <th key={h} className="border-b border-white/10 py-2">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["Hero Section", "Learn Today, Lead Tomorrow", "Published", "Apr 25, 2026"],
                    ["Categories Section", "Top Categories", "Published", "Apr 24, 2026"],
                    ["Popular Courses", "Explore Our Popular Courses", "Published", "Apr 26, 2026"],
                  ].map((row) => (
                    <tr key={row[0]} className="border-b border-white/5">
                      <td className="py-2">{row[0]}</td>
                      <td className="py-2">{row[1]}</td>
                      <td className="py-2">
                        <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-emerald-300">{row[2]}</span>
                      </td>
                      <td className="py-2">{row[3]}</td>
                      <td className="py-2">
                        <span className="inline-flex gap-2 text-gray-300">
                          <MessageSquare size={13} />
                          <CreditCard size={13} />
                          <ShoppingCart size={13} />
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </article>

            <article className="rounded-xl border border-white/10 bg-[#0d1528] p-3">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="font-semibold">Top Courses</h3>
                <button onClick={() => selectMenu("Self-paced courses")} className="rounded-md border border-white/10 bg-[#0a1120] px-2 py-1 text-xs">View All</button>
              </div>
              <div className="space-y-2">
                {dashTopCourses.length > 0 ? dashTopCourses.map((c) => (
                  <div key={c.slug} className="rounded-lg border border-white/10 bg-[#0a1120] px-3 py-2">
                    <p className="text-xs font-medium">{c.title}</p>
                    <p className="text-[10px] text-gray-400">{fmtNum(c.enrollments)} Enrollment{c.enrollments !== 1 ? "s" : ""}</p>
                  </div>
                )) : (
                  <p className="py-4 text-center text-xs text-gray-500">No enrollment data yet</p>
                )}
              </div>
            </article>
          </div>

          <AdminDashboardCalendarEditor />

          <AdminCommunityConnectEditor />

          <div className="mt-3 inline-flex items-center gap-2 rounded-lg border border-white/10 bg-[#0b1224] px-3 py-2 text-xs text-gray-400">
            <Calendar size={12} />
            Last updated just now
          </div>
            </>
          )}

          {showCoursesWorkspace && <AdminCoursesWorkspace />}

          {showLessonsWorkspace && <AdminLessonsWorkspace />}

          {showCourseQAModeration && <AdminCourseQAModeration />}

          {showBatchesWorkspace && <AdminBatchesWorkspace />}

          {showTutorLedWorkspace && <AdminTutorLedWorkspace />}

          {showWorkshopsWorkspace && <AdminWorkshopsWorkspace />}

          {showCoursesPageEditor && <AdminCoursesPageEditor />}

          {showHomePageEditor && <AdminHomePageEditor />}

          {showAboutPageEditor && <AdminAboutPageEditor />}

          {showSupportTickets && <AdminSupportTickets />}

          {showFormSubmissions && <AdminFormSubmissions />}

          {showCertificatesWorkspace && <AdminCertificatesWorkspace />}

          {showUsersWorkspace && <AdminUsersWorkspace />}

          {showOrdersWorkspace && <AdminOrdersWorkspace />}

          {showPaymentsWorkspace && <AdminPaymentsWorkspace />}

          {showInvoicesWorkspace && <AdminInvoicesWorkspace />}

          {showRefundsWorkspace && <AdminRefundsWorkspace />}

          {showSettingsWorkspace && (
            <AdminSettingsWorkspace onNavigate={(menu) => selectMenu(menu)} />
          )}

          {showAnalyticsWorkspace && (
            <AdminAnalyticsWorkspace onNavigate={(menu) => selectMenu(menu)} />
          )}

          {showReportsWorkspace && <AdminReportsWorkspace />}

          {showOrganizationTeam && <AdminOrganizationTeamEditor />}

          {showRolesWorkspace && <AdminRolesPermissionsWorkspace />}

          {showImageUploadGuide && <AdminWebsiteImageGuide />}
          {showFaqPageEditor && <AdminFaqPageEditor />}
          {showTestimonialsEditor && <AdminTestimonialsPageEditor />}

          {activeMenu === "Categories" && (
            <>
              {!categoriesReady ? (
                <div className="mb-4 rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-xs text-amber-100">
                  Loading categories from server…
                </div>
              ) : categoriesLoadError ? (
                <div className="mb-4 rounded-xl border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-xs text-rose-100">
                  {categoriesLoadError}
                </div>
              ) : null}
              <section className="mb-4 rounded-xl border border-white/10 bg-[#0b1224] p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h1 className="text-2xl font-semibold">Categories</h1>
                    <p className="text-xs text-gray-400">Manage all course categories. Add, edit or delete categories.</p>
                  </div>
                  <button
                    onClick={() => setShowAddCategoryModal(true)}
                    className="rounded-lg bg-[#f5b942] px-3 py-2 text-xs font-semibold text-black"
                  >
                    + Add New Category
                  </button>
                </div>
              </section>

              <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  [
                    "Total Categories",
                    String(dashStats?.totalCategories ?? categoryRows.length),
                    "All Categories",
                    BookOpen,
                    "text-violet-300",
                  ],
                  [
                    "Published Categories",
                    String(categoryRows.filter((r) => r[5] === "Published").length),
                    "Active Categories",
                    Leaf,
                    "text-emerald-300",
                  ],
                  [
                    "Total Courses",
                    String(dashStats?.totalCourses ?? "—"),
                    "Courses in all categories",
                    Briefcase,
                    "text-amber-300",
                  ],
                  [
                    "Total Students",
                    String(dashStats?.totalStudents ?? "—"),
                    "Learners enrolled on LMS",
                    Users,
                    "text-blue-300",
                  ],
                ].map(([title, val, sub, Icon, tone]) => (
                  <article key={String(title)} className="rounded-xl border border-white/10 bg-[#0d1528] p-3">
                    <div className={`mb-2 inline-flex rounded-md bg-white/5 p-1.5 ${String(tone)}`}>
                      <Icon size={14} />
                    </div>
                    <p className="text-[11px] text-gray-400">{String(title)}</p>
                    <p className="mt-1 text-2xl font-semibold">{String(val)}</p>
                    <p className="text-[11px] text-gray-500">{String(sub)}</p>
                  </article>
                ))}
              </div>

              <section className="rounded-xl border border-white/10 bg-[#0d1528] p-3">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-semibold">All Categories</h3>
                  <div className="flex items-center gap-2">
                    <div className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-[#0a1120] px-2 py-1.5 text-xs">
                      <Search size={12} className="text-gray-500" />
                      <input className="w-40 bg-transparent outline-none placeholder:text-gray-500" placeholder="Search categories..." />
                    </div>
                    <button className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-[#0a1120] px-2 py-1.5 text-xs">
                      <Filter size={12} /> Filters
                    </button>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[980px] text-left text-xs">
                    <thead className="text-gray-400">
                      <tr>
                        {["#", "Image", "Category", "Description", "Courses", "Students", "Status", "Actions"].map((h) => (
                          <th key={h} className="border-b border-white/10 py-2 pr-3">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {categoryRows.map((row, i) => {
                        const slug = categorySlugAt(row, i);
                        const stats =
                          categoryStats.find((s) => s.slug === slug) ??
                          categoryStats.find(
                            (s) => s.title.trim().toLowerCase() === (row[0] ?? "").trim().toLowerCase(),
                          );
                        const courseCount = stats?.courseCount ?? 0;
                        const studentCount = stats?.studentCount ?? 0;
                        return (
                        <tr key={`${row[0]}-${i}`} className="border-b border-white/5">
                          <td className="py-2 pr-3">{i + 1}</td>
                          <td className="py-2 pr-3">
                            <div className="relative h-12 w-16 overflow-hidden rounded-md border border-white/10 bg-black/40">
                              {row[7]?.trim() ? (
                                <Image
                                  src={row[7]}
                                  alt=""
                                  fill
                                  unoptimized
                                  className="object-cover"
                                />
                              ) : (
                                <span className="flex h-full items-center justify-center text-[9px] text-gray-500">
                                  No image
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-2 pr-3">
                            <p className="font-medium">{row[0]}</p>
                            <p className="text-[10px] text-gray-500">{row[1]}</p>
                            <p className="mt-0.5 font-mono text-[10px] text-amber-200/70">
                              /{slug}
                            </p>
                          </td>
                          <td className="max-w-[360px] py-2 pr-3 text-gray-300">{row[2]}</td>
                          <td className="py-2 pr-3 font-semibold text-amber-100">{courseCount}</td>
                          <td className="py-2 pr-3 font-semibold text-blue-100">{studentCount}</td>
                          <td className="py-2 pr-3">
                            <span className={`rounded px-2 py-0.5 ${row[5] === "Published" ? "bg-emerald-500/20 text-emerald-300" : "bg-amber-500/20 text-amber-300"}`}>
                              {row[5]}
                            </span>
                          </td>
                          <td className="py-2 pr-3">
                            <span className="inline-flex gap-1 text-gray-300">
                              <button
                                type="button"
                                title="Edit category page — hero, courses, instructors, filters"
                                onClick={() =>
                                  setCategoryPageEditor({
                                    slug,
                                    title: row[0],
                                  })
                                }
                                className="rounded p-1 hover:bg-violet-500/25 hover:text-violet-100"
                              >
                                <LayoutGrid size={13} />
                              </button>
                              <button
                                type="button"
                                title="Rename / edit category & card image"
                                onClick={() => openEditCategory(i)}
                                className="rounded p-1 hover:bg-white/10 hover:text-white"
                              >
                                <Pencil size={13} />
                              </button>
                              <button
                                type="button"
                                title="Preview category page (popup — stay on admin)"
                                onClick={() => setCategoryPreviewSlug(slug)}
                                className="rounded p-1 hover:bg-amber-500/20 hover:text-amber-100"
                              >
                                <Eye size={13} />
                              </button>
                              <button
                                type="button"
                                title="Delete category"
                                onClick={() => void deleteCategoryAt(i)}
                                className="rounded p-1 text-red-300/90 hover:bg-red-500/15 hover:text-red-200"
                              >
                                <Trash2 size={13} />
                              </button>
                            </span>
                          </td>
                        </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                  <p>
                    {categoryRows.length === 0
                      ? "No categories yet"
                      : `Showing ${categoryRows.length} categor${categoryRows.length === 1 ? "y" : "ies"}`}
                  </p>
                  <div className="inline-flex items-center gap-1">
                    <button className="h-6 w-6 rounded border border-white/10 bg-[#0a1120]">&lt;</button>
                    <button className="h-6 w-6 rounded bg-[#6f55ff] text-white">1</button>
                    <button className="h-6 w-6 rounded border border-white/10 bg-[#0a1120]">2</button>
                    <button className="h-6 w-6 rounded border border-white/10 bg-[#0a1120]">&gt;</button>
                  </div>
                </div>
              </section>

              {showAddCategoryModal && (
                <div className="fixed inset-0 z-50 grid place-items-center bg-black/65 p-4">
                  <div className="w-full max-w-xl rounded-xl border border-white/10 bg-[#0b1224] p-4">
                    <h3 className="text-lg font-semibold">Add New Category</h3>
                    <p className="mb-3 text-xs text-gray-400">Fill details and save to add category to table.</p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <input
                        value={newCategory.name}
                        onChange={(e) => setNewCategory((prev) => ({ ...prev, name: e.target.value }))}
                        className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none"
                        placeholder="Category Name"
                      />
                      <input
                        value={newCategory.subtitle}
                        onChange={(e) => setNewCategory((prev) => ({ ...prev, subtitle: e.target.value }))}
                        className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none"
                        placeholder="Subtitle"
                      />
                      <input
                        value={newCategory.courses}
                        onChange={(e) => setNewCategory((prev) => ({ ...prev, courses: e.target.value }))}
                        className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none"
                        placeholder="Courses count"
                      />
                      <input
                        value={newCategory.students}
                        onChange={(e) => setNewCategory((prev) => ({ ...prev, students: e.target.value }))}
                        className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none"
                        placeholder="Students count"
                      />
                      <select
                        value={newCategory.status}
                        onChange={(e) => setNewCategory((prev) => ({ ...prev, status: e.target.value }))}
                        className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none sm:col-span-2"
                      >
                        <option value="Published">Published</option>
                        <option value="Draft">Draft</option>
                      </select>
                      <textarea
                        value={newCategory.description}
                        onChange={(e) => setNewCategory((prev) => ({ ...prev, description: e.target.value }))}
                        className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none sm:col-span-2"
                        placeholder="Description"
                        rows={3}
                      />
                    </div>
                    <div className="mt-4 flex justify-end gap-2">
                      <button
                        onClick={() => setShowAddCategoryModal(false)}
                        className="rounded-lg border border-white/15 px-3 py-2 text-xs"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={addCategory}
                        className="rounded-lg bg-[#f5b942] px-3 py-2 text-xs font-semibold text-black"
                      >
                        Add Category
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {editCategoryIndex !== null && (
                <div className="fixed inset-0 z-50 grid place-items-center bg-black/65 p-4">
                  <div className="w-full max-w-xl rounded-xl border border-white/10 bg-[#0b1224] p-4">
                    <h3 className="text-lg font-semibold">Edit Category</h3>
                    <p className="mb-3 text-xs text-gray-400">
                      Change name, description, and the card image shown on the home page. Course links stay connected.
                    </p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <input
                        value={editCategory.name}
                        onChange={(e) => setEditCategory((prev) => ({ ...prev, name: e.target.value }))}
                        className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none sm:col-span-2"
                        placeholder="Category Name"
                      />
                      <input
                        value={editCategory.subtitle}
                        onChange={(e) => setEditCategory((prev) => ({ ...prev, subtitle: e.target.value }))}
                        className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none"
                        placeholder="Subtitle"
                      />
                      <select
                        value={editCategory.status}
                        onChange={(e) => setEditCategory((prev) => ({ ...prev, status: e.target.value }))}
                        className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none"
                      >
                        <option value="Published">Published</option>
                        <option value="Draft">Draft</option>
                      </select>
                      <textarea
                        value={editCategory.description}
                        onChange={(e) => setEditCategory((prev) => ({ ...prev, description: e.target.value }))}
                        className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none sm:col-span-2"
                        placeholder="Description"
                        rows={3}
                      />

                      <div className="sm:col-span-2 rounded-lg border border-white/10 bg-black/20 p-3">
                        <p className="mb-2 text-xs font-semibold text-gray-300">Category card image</p>
                        <div className="flex flex-wrap items-start gap-3">
                          <div className="relative h-20 w-28 overflow-hidden rounded-md border border-white/10 bg-black/40">
                            {editCategory.image.trim() ? (
                              <Image
                                src={editCategory.image}
                                alt=""
                                fill
                                unoptimized
                                className="object-cover"
                              />
                            ) : (
                              <span className="flex h-full items-center justify-center text-[10px] text-gray-500">
                                No image
                              </span>
                            )}
                          </div>
                          <div className="min-w-[200px] flex-1 space-y-2">
                            <label className="inline-flex cursor-pointer items-center rounded-lg bg-[#f5b942] px-3 py-2 text-xs font-semibold text-black">
                              {uploadingCategoryImage ? "Uploading…" : "Upload image"}
                              <input
                                type="file"
                                accept="image/jpeg,image/png,image/webp,image/gif"
                                className="hidden"
                                disabled={uploadingCategoryImage}
                                onChange={(e) => {
                                  const f = e.target.files?.[0];
                                  e.target.value = "";
                                  if (f) void uploadCategoryImage(f);
                                }}
                              />
                            </label>
                            <input
                              value={editCategory.image}
                              onChange={(e) =>
                                setEditCategory((prev) => ({ ...prev, image: e.target.value }))
                              }
                              className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-xs outline-none"
                              placeholder="Or paste image URL /uploads/..."
                            />
                            {editCategory.image.trim() ? (
                              <button
                                type="button"
                                onClick={() => setEditCategory((prev) => ({ ...prev, image: "" }))}
                                className="text-[11px] text-rose-300 hover:underline"
                              >
                                Remove image
                              </button>
                            ) : null}
                          </div>
                        </div>
                        <p className="mt-2 text-[10px] text-gray-500">
                          For the big banner on the category page, use the layout grid icon → Hero banner image.
                        </p>
                      </div>

                      <p className="sm:col-span-2 text-[11px] text-gray-500">
                        URL slug (unchanged):{" "}
                        <span className="font-mono text-amber-200/90">{editCategory.slug}</span>
                      </p>
                    </div>
                    <div className="mt-4 flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setEditCategoryIndex(null)}
                        className="rounded-lg border border-white/15 px-3 py-2 text-xs"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => void saveEditCategory()}
                        className="rounded-lg bg-[#f5b942] px-3 py-2 text-xs font-semibold text-black"
                      >
                        Save category
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {!hasMainPanel ? (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-6 py-10 text-center">
              <p className="text-sm font-medium text-amber-50">
                <span className="text-white">&quot;{activeMenu}&quot;</span> does not have an editor here yet.
              </p>
              <p className="mx-auto mt-3 max-w-md text-xs leading-relaxed text-amber-100/85">
                To manage <strong className="text-white">live tutor-led programs</strong> (Zoom links, curriculum,
                enrolled learner dashboard, pad notes / PPT / webbook on{" "}
                <strong className="text-white">/tutor-led/your-slug</strong>), open{" "}
                <button
                  type="button"
                  onClick={() => selectMenu("Tutor Led")}
                  className="font-semibold text-violet-200 underline decoration-violet-400/60 underline-offset-2 hover:text-white"
                >
                  Course Management → Tutor Led
                </button>
                . For the <strong className="text-white">self-paced catalog</strong>, use{" "}
                <button
                  type="button"
                  onClick={() => selectMenu("Self-paced courses")}
                  className="font-semibold text-violet-200 underline decoration-violet-400/60 underline-offset-2 hover:text-white"
                >
                  Self-paced courses
                </button>
                . Mark items <strong className="text-white">Published</strong> so they appear on the public site.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <button
                  type="button"
                  onClick={() => selectMenu("Tutor Led")}
                  className="rounded-lg bg-[#6f55ff] px-4 py-2 text-xs font-semibold text-white hover:bg-[#7d63ff]"
                >
                  Open tutor-led programs
                </button>
                <button
                  type="button"
                  onClick={() => selectMenu("Self-paced courses")}
                  className="rounded-lg border border-white/20 bg-black/30 px-4 py-2 text-xs font-semibold text-white hover:bg-white/10"
                >
                  Self-paced catalog
                </button>
                <Link
                  href="/tutor-led"
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg border border-white/20 bg-black/30 px-4 py-2 text-xs font-semibold text-white hover:bg-white/10"
                >
                  Preview /tutor-led
                </Link>
              </div>
            </div>
          ) : null}
        </section>
      </div>

      {categoryPageEditor ? (
        <CategoryPageEditorModal
          open
          categorySlug={categoryPageEditor.slug}
          categoryTitle={categoryPageEditor.title}
          onClose={() => setCategoryPageEditor(null)}
          onOpenPreview={(slug) => setCategoryPreviewSlug(slug)}
        />
      ) : null}

      {categoryPreviewSlug ? (
        <CategoryPreviewIframe
          categorySlug={categoryPreviewSlug}
          onClose={() => setCategoryPreviewSlug(null)}
        />
      ) : null}
    </main>
  );
}

export default function AdminPage() {
  return (
    <Suspense fallback={<AdminAccessLoading />}>
      <AdminPageInner />
    </Suspense>
  );
}
