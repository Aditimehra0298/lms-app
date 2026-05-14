"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import sfWhiteLogo from "@/SF-WHITE-LOGO.png";
import {
  Bell,
  BookOpen,
  Briefcase,
  Calendar,
  CreditCard,
  Eye,
  FileText,
  Filter,
  Home,
  LayoutGrid,
  Layers,
  Leaf,
  LogOut,
  Menu,
  MessageSquare,
  Moon,
  Pencil,
  Search,
  Settings,
  ShoppingCart,
  Star,
  Trash2,
  Users,
  Video,
} from "lucide-react";
import AdminCoursesWorkspace from "@/components/admin/AdminCoursesWorkspace";
import AdminCoursesPageEditor from "@/components/admin/AdminCoursesPageEditor";
import AdminHomePageEditor from "@/components/admin/AdminHomePageEditor";
import AdminAboutPageEditor from "@/components/admin/AdminAboutPageEditor";
import AdminTutorLedWorkspace from "@/components/admin/AdminTutorLedWorkspace";
import CategoryPageEditorModal from "@/components/admin/CategoryPageEditorModal";
import CategoryPreviewIframe from "@/components/admin/CategoryPreviewIframe";
import type { AdminContent, ManagedCategory } from "@/lib/content-schema";
import { defaultAdminContent } from "@/lib/content-schema";

const menuSections = [
  {
    title: "",
    items: ["Dashboard"],
  },
  {
    title: "Website Management",
    items: ["Home Page", "About Page", "Courses Page", "Contact Page", "FAQ Page", "Testimonials"],
  },
  {
    title: "Course Management",
    items: ["Categories", "Self-paced courses", "Lessons", "Tutor Led", "Workshops", "Batches"],
  },
  {
    title: "Users & Access",
    items: ["Users", "Roles & Permissions"],
  },
  {
    title: "Orders & Payments",
    items: ["Orders", "Payments", "Invoices", "Refunds"],
  },
  {
    title: "Other",
    items: ["Settings", "Newsletter", "Analytics", "Reports"],
  },
];

const stats = [
  ["Total Users", "12,458", "12.5%"],
  ["Total Courses", "156", "8.2%"],
  ["Total Revenue", "₹52,450", "18.2%"],
  ["Orders", "1,245", "15.3%"],
  ["Active Students", "7,856", "10.1%"],
];

const quickActions = [
  "Add New Course",
  "Add New Category",
  "Manage Users",
  "Create Tutor-Led Session",
  "Send Newsletter",
];

export default function AdminPage() {
  const [activeMenu, setActiveMenu] = useState("Dashboard");
  const showCoursesWorkspace = activeMenu === "Self-paced courses";
  const showCoursesPageEditor = activeMenu === "Courses Page";
  const showHomePageEditor = activeMenu === "Home Page";
  const showAboutPageEditor = activeMenu === "About Page";
  const showTutorLedWorkspace = activeMenu === "Tutor Led";
  const hasMainPanel =
    activeMenu === "Dashboard" ||
    showCoursesWorkspace ||
    showCoursesPageEditor ||
    showHomePageEditor ||
    showAboutPageEditor ||
    showTutorLedWorkspace ||
    activeMenu === "Categories";
  const [categoryPageEditor, setCategoryPageEditor] = useState<{
    slug: string;
    title: string;
  } | null>(null);
  const [categoryPreviewSlug, setCategoryPreviewSlug] = useState<string | null>(null);
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [newCategory, setNewCategory] = useState({
    name: "",
    subtitle: "",
    description: "",
    courses: "0",
    students: "0",
    status: "Published",
  });
  const [categoryRows, setCategoryRows] = useState<string[][]>([]);
  const [categoriesReady, setCategoriesReady] = useState(false);
  const [categoriesLoadError, setCategoriesLoadError] = useState<string | null>(null);

  const toSlug = (value: string) =>
    value
      .toLowerCase()
      .replace(/&/g, "and")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

  const toManagedCategories = (rows: string[][]): ManagedCategory[] =>
    rows.map((row, index) => ({
      slug: toSlug(row[0]) || `category-${index + 1}`,
      title: row[0],
      subtitle: row[1] || "General",
      description: row[2] || "Category description",
      isActive: row[5] !== "Draft",
      isFeatured: false,
      isUppercase: false,
      isBold: false,
      tone: "violet",
    }));

  const rowsFromManagedCategories = (cats: ManagedCategory[]): string[][] =>
    cats.map((c) => [
      c.title,
      c.subtitle,
      c.description,
      "—",
      "—",
      c.isActive ? "Published" : "Draft",
    ]);

  useEffect(() => {
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
  }, []);

  const persistCategories = async (rows: string[][]) => {
    try {
      const currentResponse = await fetch("/api/admin/content", { cache: "no-store" });
      if (!currentResponse.ok) return;
      const current = (await currentResponse.json()) as AdminContent;
      const nextPayload: AdminContent = {
        ...current,
        categories: toManagedCategories(rows),
      };
      await fetch("/api/admin/content", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nextPayload),
      });
    } catch {
      // Keep UI usable even if persistence fails.
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
    setCategoryRows(nextRows);
    await persistCategories(nextRows);
  };

  const addCategory = async () => {
    if (!newCategory.name.trim()) return;
    const nextRows = [
      ...categoryRows,
      [
        newCategory.name.trim(),
        newCategory.subtitle.trim() || "General",
        newCategory.description.trim() || "Category description",
        newCategory.courses.trim() || "0",
        newCategory.students.trim() || "0",
        newCategory.status,
      ],
    ];
    setCategoryRows(nextRows);
    await persistCategories(nextRows);
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
                      onClick={() => setActiveMenu(item)}
                      className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs ${
                        item === activeMenu
                          ? "border border-[#6f55ff]/60 bg-[#6f55ff]/30 shadow-[0_0_24px_rgba(111,85,255,0.35)]"
                          : "text-gray-300 hover:bg-white/5"
                      }`}
                    >
                      {idx % 2 === 0 ? <Home size={13} /> : <Layers size={13} />}
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <button className="mt-3 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-red-300 hover:bg-red-500/10">
              <LogOut size={13} />
              Logout
            </button>
          </div>
        </aside>

        <section className="p-4 md:p-5">
          <header className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#0b1224] px-3 py-2">
            <div className="flex items-center gap-2">
              <button className="rounded-md p-1.5 text-gray-300 hover:bg-white/5">
                <Menu size={16} />
              </button>
              <div className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-[#0a1120] px-3 py-2 text-xs">
                <Search size={13} className="text-gray-500" />
                <input
                  className="w-56 bg-transparent text-sm outline-none placeholder:text-gray-500 md:w-72 lg:w-96"
                  placeholder={
                    showCoursesWorkspace
                      ? "Search for courses, modules, users…"
                      : "Search here..."
                  }
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="rounded-lg border border-white/10 bg-[#0a1120] p-2">
                <Bell size={14} />
              </button>
              <button className="rounded-lg border border-white/10 bg-[#0a1120] p-2">
                <Moon size={14} />
              </button>
              <div className="rounded-lg border border-white/10 bg-[#0a1120] px-3 py-2 text-xs">
                Apr 21 - Apr 27, 2026
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
            {stats.map(([label, value, up], i) => (
              <article key={label} className="rounded-xl border border-white/10 bg-[#0d1528] p-3">
                <div className="mb-2 inline-flex rounded-md bg-[#6f55ff]/20 p-1.5 text-[#b5a8ff]">
                  {i % 2 === 0 ? <Users size={14} /> : <BookOpen size={14} />}
                </div>
                <p className="text-[11px] text-gray-400">{label}</p>
                <p className="mt-1 text-2xl font-semibold">{value}</p>
                <p className="text-[11px] text-emerald-300">↑ {up}</p>
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
                    <p className="text-xl font-semibold">12,458</p>
                    <p className="text-[10px] text-gray-400">Total Users</p>
                  </div>
                </div>
                <div className="space-y-2 text-xs text-gray-300">
                  <p>
                    <span className="mr-2 inline-block h-2 w-2 rounded-full bg-[#6f55ff]" />
                    Students: 9,125
                  </p>
                  <p>
                    <span className="mr-2 inline-block h-2 w-2 rounded-full bg-[#3b82f6]" />
                    Instructors: 2,145
                  </p>
                  <p>
                    <span className="mr-2 inline-block h-2 w-2 rounded-full bg-[#f59e0b]" />
                    Admins: 1,188
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
                      if (action === "Add New Course") setActiveMenu("Self-paced courses");
                      else if (action === "Add New Category") setActiveMenu("Categories");
                      else if (action === "Create Tutor-Led Session") setActiveMenu("Tutor Led");
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
            <article className="rounded-xl border border-white/10 bg-[#0d1528] p-3">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="font-semibold">Recent Orders</h3>
                <button className="rounded-md border border-white/10 bg-[#0a1120] px-2 py-1 text-xs">View All</button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[620px] text-left text-xs">
                  <thead className="text-gray-400">
                    <tr>
                      {["Order ID", "User", "Course", "Amount", "Status", "Date"].map((h) => (
                        <th key={h} className="border-b border-white/10 py-2 pr-3">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ["ORD-2025-041", "Aditi Sharma", "Cyber Security Fundamentals", "₹2,999", "Paid", "Apr 27, 2026"],
                      ["ORD-2025-040", "Rohan Verma", "Data Science with Python", "₹5,999", "Paid", "Apr 27, 2026"],
                      ["ORD-2025-039", "Priya Mehta", "ESG & Sustainability", "₹3,999", "Paid", "Apr 26, 2026"],
                    ].map((row) => (
                      <tr key={row[0]} className="border-b border-white/5">
                        <td className="py-2 pr-3">{row[0]}</td>
                        <td className="py-2 pr-3">{row[1]}</td>
                        <td className="py-2 pr-3">{row[2]}</td>
                        <td className="py-2 pr-3">{row[3]}</td>
                        <td className="py-2 pr-3">
                          <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-emerald-300">{row[4]}</span>
                        </td>
                        <td className="py-2 pr-3">{row[5]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>

            <article className="rounded-xl border border-white/10 bg-[#0d1528] p-3">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="font-semibold">User Registrations</h3>
                <button className="rounded-md border border-white/10 bg-[#0a1120] px-2 py-1 text-xs">View All</button>
              </div>
              <div className="space-y-3">
                {[
                  ["Arti Kumar", "2 mins ago"],
                  ["Neha Patel", "15 mins ago"],
                  ["Viram Singh", "1 hour ago"],
                  ["Neha Gupta", "2 hours ago"],
                ].map(([name, time]) => (
                  <div key={name} className="flex items-center justify-between rounded-lg border border-white/10 bg-[#0a1120] px-3 py-2">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-[#6f55ff]/30" />
                      <div>
                        <p className="text-xs font-medium">{name}</p>
                        <p className="text-[10px] text-gray-500">new user registered</p>
                      </div>
                    </div>
                    <p className="text-[10px] text-gray-400">{time}</p>
                  </div>
                ))}
              </div>
            </article>

            <article className="rounded-xl border border-white/10 bg-[#0d1528] p-3">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="font-semibold">System Overview</h3>
                <Settings size={14} className="text-gray-400" />
              </div>
              <div className="space-y-2 text-xs">
                {[
                  ["Total Categories", "28"],
                  ["Total Lessons", "1,248"],
                  ["Total Students", "7,856"],
                  ["Total Instructors", "96"],
                  ["Total Reviews", "4,856"],
                  ["Newsletter Subscribers", "3,245"],
                ].map(([k, v]) => (
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
                  onClick={() => setActiveMenu("Home Page")}
                  className="rounded-md bg-[#6f55ff]/30 px-2 py-1 hover:bg-[#6f55ff]/45"
                >
                  Home Page
                </button>
                <button
                  type="button"
                  onClick={() => setActiveMenu("About Page")}
                  className="rounded-md border border-white/10 px-2 py-1 hover:bg-white/10"
                >
                  About Page
                </button>
                <button
                  type="button"
                  onClick={() => setActiveMenu("Courses Page")}
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
                <button className="rounded-md border border-white/10 bg-[#0a1120] px-2 py-1 text-xs">View All</button>
              </div>
              <div className="space-y-2">
                {[
                  ["Cyber Security Fundamentals", "512 Enrollments"],
                  ["Data Science with Python", "428 Enrollments"],
                  ["Ethical Hacking with Kali Linux", "316 Enrollments"],
                ].map(([title, sub]) => (
                  <div key={title} className="rounded-lg border border-white/10 bg-[#0a1120] px-3 py-2">
                    <p className="text-xs font-medium">{title}</p>
                    <p className="text-[10px] text-gray-400">{sub}</p>
                  </div>
                ))}
              </div>
            </article>
          </div>

          <div className="mt-3 inline-flex items-center gap-2 rounded-lg border border-white/10 bg-[#0b1224] px-3 py-2 text-xs text-gray-400">
            <Calendar size={12} />
            Last updated just now
          </div>
            </>
          )}

          {showCoursesWorkspace && <AdminCoursesWorkspace />}

          {showTutorLedWorkspace && <AdminTutorLedWorkspace />}

          {showCoursesPageEditor && <AdminCoursesPageEditor />}

          {showHomePageEditor && <AdminHomePageEditor />}

          {showAboutPageEditor && <AdminAboutPageEditor />}

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
                    String(categoryRows.length),
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
                  ["Total Courses", "156", "Courses in all categories", Briefcase, "text-amber-300"],
                  ["Total Students", "8,645", "Students in all categories", Users, "text-blue-300"],
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
                        {["#", "Category", "Description", "Courses", "Students", "Status", "Actions"].map((h) => (
                          <th key={h} className="border-b border-white/10 py-2 pr-3">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {categoryRows.map((row, i) => (
                        <tr key={`${row[0]}-${i}`} className="border-b border-white/5">
                          <td className="py-2 pr-3">{i + 1}</td>
                          <td className="py-2 pr-3">
                            <p className="font-medium">{row[0]}</p>
                            <p className="text-[10px] text-gray-500">{row[1]}</p>
                          </td>
                          <td className="max-w-[360px] py-2 pr-3 text-gray-300">{row[2]}</td>
                          <td className="py-2 pr-3">{row[3]}</td>
                          <td className="py-2 pr-3">{row[4]}</td>
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
                                    slug: toSlug(row[0]) || `category-${i + 1}`,
                                    title: row[0],
                                  })
                                }
                                className="rounded p-1 hover:bg-violet-500/25 hover:text-violet-100"
                              >
                                <LayoutGrid size={13} />
                              </button>
                              <button
                                type="button"
                                title="Same editor"
                                onClick={() =>
                                  setCategoryPageEditor({
                                    slug: toSlug(row[0]) || `category-${i + 1}`,
                                    title: row[0],
                                  })
                                }
                                className="rounded p-1 hover:bg-white/10 hover:text-white"
                              >
                                <Pencil size={13} />
                              </button>
                              <button
                                type="button"
                                title="Preview category page (popup — stay on admin)"
                                onClick={() =>
                                  setCategoryPreviewSlug(toSlug(row[0]) || `category-${i + 1}`)
                                }
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
                      ))}
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
            </>
          )}

          {!hasMainPanel ? (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-6 py-10 text-center">
              <p className="text-sm font-medium text-amber-50">
                <span className="text-white">&quot;{activeMenu}&quot;</span> does not have an editor here yet.
              </p>
              <p className="mx-auto mt-3 max-w-md text-xs leading-relaxed text-amber-100/85">
                To manage the <strong className="text-white">self-paced course catalog</strong> (modules, pricing,
                marketing copy on <strong className="text-white">/courses/your-slug</strong>), open{" "}
                <button
                  type="button"
                  onClick={() => setActiveMenu("Self-paced courses")}
                  className="font-semibold text-violet-200 underline decoration-violet-400/60 underline-offset-2 hover:text-white"
                >
                  Course Management → Self-paced courses
                </button>
                . Mark a course <strong className="text-white">Published</strong> so it appears on the public site.
                “Courses Page” under Website Management edits the courses landing layout.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setActiveMenu("Self-paced courses")}
                  className="rounded-lg bg-[#6f55ff] px-4 py-2 text-xs font-semibold text-white hover:bg-[#7d63ff]"
                >
                  Open course catalog
                </button>
                <Link
                  href="/courses"
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg border border-white/20 bg-black/30 px-4 py-2 text-xs font-semibold text-white hover:bg-white/10"
                >
                  Preview /courses (new tab)
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
