"use client";

import {
  Award,
  BookOpen,
  CreditCard,
  GraduationCap,
  TicketCheck,
  Users,
  Video,
} from "lucide-react";
import AdminRecentOrders from "@/components/admin/AdminRecentOrders";
import { AdminCommunityConnectEditor } from "@/components/admin/AdminCommunityConnectEditor";
import { AdminDashboardCalendarEditor } from "@/components/admin/AdminDashboardCalendarEditor";
import { commerceMethodLabel } from "@/lib/admin-commerce-ui";

export type DashboardStats = {
  totalUsers: number;
  totalStudents: number;
  totalAdmins: number;
  totalOrganizations: number;
  totalCourses: number;
  publishedCourses: number;
  draftCourses?: number;
  selfPacedPublished?: number;
  tutorLedPublished?: number;
  workshopPublished?: number;
  totalCategories: number;
  totalPurchases: number;
  totalPayments: number;
  pendingPayments?: number;
  pendingCertificates?: number;
  openIssues?: number;
  newUsers7d?: number;
  newEnrollments7d?: number;
  revenue7d?: number;
  totalRevenue: number;
  totalCertificates: number;
  totalReviews: number;
  totalFormSubmissions: number;
  newsletterSubs: number;
};

export type DashboardRecentUser = {
  name: string | null;
  email: string;
  createdAt: string;
  role: string;
};

export type DashboardTopCourse = { slug: string; title: string; enrollments: number };

export type CategoryStatRow = {
  slug: string;
  title: string;
  courseCount: number;
  publishedCourseCount: number;
  studentCount: number;
};

export type WeekActivityRow = {
  date: string;
  label: string;
  enrollments: number;
  revenue: number;
};

export type RecentEnrollmentRow = {
  id?: string;
  learnerEmail: string;
  title: string;
  courseSlug: string;
  createdAt: string;
};

export type RevenueRecordRow = {
  id: string;
  when: string;
  amount: number;
  currency: string;
  method: string;
  learnerEmail: string;
  course: string;
  note: string | null;
  receipt: string | null;
};

type Props = {
  stats: DashboardStats | null;
  recentUsers: DashboardRecentUser[];
  topCourses: DashboardTopCourse[];
  categoryStats: CategoryStatRow[];
  weekActivity: WeekActivityRow[];
  recentEnrollments: RecentEnrollmentRow[];
  revenueRecords: RevenueRecordRow[];
  onNavigate: (menu: string) => void;
};

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

type ChartSlice = { label: string; value: number; color: string };

function DonutChart({ slices, center }: { slices: ChartSlice[]; center: string }) {
  const total = slices.reduce((sum, s) => sum + Math.max(0, s.value), 0);
  const r = 36;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <svg viewBox="0 0 100 100" className="h-36 w-36 shrink-0" aria-hidden>
      <circle cx="50" cy="50" r={r} fill="none" stroke="#111827" strokeWidth="14" />
      {total > 0
        ? slices
            .filter((s) => s.value > 0)
            .map((s) => {
              const dash = (s.value / total) * c;
              const gap = c - dash;
              const el = (
                <circle
                  key={s.label}
                  cx="50"
                  cy="50"
                  r={r}
                  fill="none"
                  stroke={s.color}
                  strokeWidth="14"
                  strokeDasharray={`${dash} ${gap}`}
                  strokeDashoffset={-offset}
                  transform="rotate(-90 50 50)"
                />
              );
              offset += dash;
              return el;
            })
        : null}
      <text x="50" y="48" textAnchor="middle" fill="#fff" fontSize="13" fontWeight="700">
        {center}
      </text>
      <text x="50" y="62" textAnchor="middle" fill="#94a3b8" fontSize="7">
        total
      </text>
    </svg>
  );
}

function ChartLegend({ slices }: { slices: ChartSlice[] }) {
  const total = slices.reduce((sum, s) => sum + Math.max(0, s.value), 0);
  return (
    <ul className="space-y-1.5 text-xs">
      {slices.map((s) => {
        const pct = total > 0 ? Math.round((s.value / total) * 100) : 0;
        return (
          <li key={s.label} className="flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2 text-gray-300">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ background: s.color }} />
              {s.label}
            </span>
            <span className="tabular-nums text-gray-200">
              {fmtNum(s.value)} <span className="text-gray-500">({pct}%)</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function HBarList({
  rows,
}: {
  rows: { key: string; label: string; value: number; hint?: string }[];
}) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className="space-y-2.5">
      {rows.map((row) => (
        <div key={row.key}>
          <div className="mb-1 flex items-center justify-between gap-2 text-[11px]">
            <span className="truncate text-gray-200">{row.label}</span>
            <span className="shrink-0 tabular-nums text-gray-400">
              {fmtNum(row.value)}
              {row.hint ? ` ${row.hint}` : ""}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[#0a1120]">
            <div
              className="h-full rounded-full bg-linear-to-r from-[#6f55ff] to-[#f5b942]"
              style={{ width: `${Math.max(row.value > 0 ? 6 : 0, (row.value / max) * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AdminDashboardHome({
  stats,
  recentUsers,
  topCourses,
  categoryStats,
  weekActivity,
  recentEnrollments,
  revenueRecords,
  onNavigate,
}: Props) {
  const enrollments = stats?.totalPurchases ?? 0;
  const learners = stats?.totalStudents ?? 0;
  const published = stats?.publishedCourses ?? 0;
  const drafts = stats?.draftCourses ?? 0;
  const tutorLed = stats?.tutorLedPublished ?? 0;
  const workshops = stats?.workshopPublished ?? 0;
  const pendingPay = stats?.pendingPayments ?? 0;
  const pendingCerts = stats?.pendingCertificates ?? 0;
  const tickets = stats?.openIssues ?? 0;
  const newUsers = stats?.newUsers7d ?? 0;
  const newEnrolls = stats?.newEnrollments7d ?? 0;
  const revenue7d = stats?.revenue7d ?? 0;
  const maxEnrollBar = Math.max(1, ...weekActivity.map((d) => d.enrollments));
  const maxRevenueBar = Math.max(1, ...weekActivity.map((d) => d.revenue));
  const catalogSlices: ChartSlice[] = [
    { label: "Self-paced", value: published, color: "#6f55ff" },
    { label: "Tutor-led", value: tutorLed, color: "#f5b942" },
    { label: "Workshops", value: workshops, color: "#38bdf8" },
  ];
  const peopleSlices: ChartSlice[] = [
    { label: "Learners", value: learners, color: "#6f55ff" },
    { label: "Organisations", value: stats?.totalOrganizations ?? 0, color: "#38bdf8" },
    { label: "Admins", value: stats?.totalAdmins ?? 0, color: "#f59e0b" },
  ];
  const categoryBars = categoryStats
    .slice()
    .sort((a, b) => b.studentCount - a.studentCount)
    .map((cat) => ({
      key: cat.slug,
      label: cat.title,
      value: cat.studentCount,
      hint: `· ${fmtNum(cat.publishedCourseCount)} live`,
    }));
  const courseBars = topCourses.map((c) => ({
    key: c.slug,
    label: c.title,
    value: c.enrollments,
    hint: "enrolled",
  }));

  const attention = [
    { label: "Waiting checkouts", count: pendingPay, menu: "Orders", hint: "Review payments that have not completed" },
    { label: "Certificates in progress", count: pendingCerts, menu: "Certificates", hint: "Finish or hide pending certificates" },
    { label: "Draft self-paced courses", count: drafts, menu: "Self-paced courses", hint: "Not visible in the catalog yet" },
    { label: "Open support tickets", count: tickets, menu: "Support Tickets", hint: "Learners waiting for a reply" },
  ];
  const attentionOpen = attention.filter((item) => item.count > 0);

  return (
    <>
      <section className="mb-4 rounded-xl border border-white/10 bg-[#0b1224] p-4">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="mt-1 text-xs text-gray-400">
          Live LMS snapshot — learners, enrollments, catalog, and items that need action.
          {stats
            ? ` ${fmtNum(newUsers)} new learners and ${fmtNum(newEnrolls)} enrollments in the last 7 days.`
            : ""}
        </p>
      </section>

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {(
          [
            ["Learners", stats ? fmtNum(learners) : "—", `${stats ? fmtNum(stats.totalUsers) : "—"} accounts`, Users],
            [
              "Enrollments",
              stats ? fmtNum(enrollments) : "—",
              `${fmtNum(newEnrolls)} this week`,
              GraduationCap,
            ],
            [
              "Published catalog",
              stats ? fmtNum(published + tutorLed + workshops) : "—",
              `${fmtNum(published)} self-paced · ${fmtNum(tutorLed)} tutor-led`,
              BookOpen,
            ],
            [
              "Certificates",
              stats ? fmtNum(stats.totalCertificates) : "—",
              pendingCerts > 0 ? `${fmtNum(pendingCerts)} still processing` : "All issued or none pending",
              Award,
            ],
            [
              "Collected",
              stats ? fmtCurrency(stats.totalRevenue) : "—",
              `${fmtCurrency(revenue7d)} in 7 days`,
              CreditCard,
            ],
          ] as [string, string, string, typeof Users][]
        ).map(([label, value, note, Icon]) => (
          <article key={label} className="rounded-xl border border-white/10 bg-[#0d1528] p-3">
            <div className="mb-2 inline-flex rounded-md bg-[#6f55ff]/20 p-1.5 text-[#b5a8ff]">
              <Icon size={14} />
            </div>
            <p className="text-[11px] text-gray-400">{label}</p>
            <p className="mt-1 text-2xl font-semibold">{value}</p>
            <p className="mt-1 text-[10px] text-gray-500">{note}</p>
          </article>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr_1fr]">
        <article className="rounded-xl border border-white/10 bg-[#0d1528] p-3">
          <h3 className="font-semibold">This week: enrollments and money</h3>
          <p className="mt-0.5 text-[11px] text-gray-500">
            Violet bar = new enrollments. Gold bar = rupees collected that day. Read the tallest
            violet bar as the busiest learning day.
          </p>
          {weekActivity.length === 0 ? (
            <p className="mt-8 text-center text-xs text-gray-500">No activity in the last 7 days.</p>
          ) : (
            <div className="mt-4 flex h-52 items-end gap-2 px-1">
              {weekActivity.map((day) => (
                <div key={day.date} className="flex flex-1 flex-col items-center gap-1">
                  <span className="text-[10px] tabular-nums text-gray-400">{day.enrollments || "0"}</span>
                  <div className="flex h-36 w-full items-end justify-center gap-0.5 rounded-md bg-[#0a1120] px-1 pb-1">
                    <div
                      className="w-1/2 rounded-sm bg-[#6f55ff]"
                      title={`${day.enrollments} enrollments`}
                      style={{ height: `${Math.max(4, (day.enrollments / maxEnrollBar) * 100)}%` }}
                    />
                    <div
                      className="w-1/2 rounded-sm bg-[#f5b942]"
                      title={`${fmtCurrency(day.revenue)} collected`}
                      style={{ height: `${Math.max(4, (day.revenue / maxRevenueBar) * 100)}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-gray-500">{day.label}</span>
                </div>
              ))}
            </div>
          )}
          <div className="mt-2 flex flex-wrap gap-3 text-[10px] text-gray-400">
            <span className="inline-flex items-center gap-1">
              <span className="h-2 w-2 rounded-sm bg-[#6f55ff]" /> Enrollments
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-2 w-2 rounded-sm bg-[#f5b942]" /> Collected (₹)
            </span>
          </div>
        </article>

        <article className="rounded-xl border border-white/10 bg-[#0d1528] p-3">
          <h3 className="font-semibold">Catalog mix</h3>
          <p className="mt-0.5 text-[11px] text-gray-500">
            Share of live programs learners can buy. A larger slice means more of that format is
            published.
          </p>
          <div className="mt-3 flex flex-col items-center gap-3 sm:flex-row sm:items-start">
            <DonutChart
              slices={catalogSlices}
              center={fmtNum(published + tutorLed + workshops)}
            />
            <div className="w-full">
              <ChartLegend slices={catalogSlices} />
              <button
                type="button"
                onClick={() => onNavigate("Self-paced courses")}
                className="mt-3 text-[11px] text-[#b5a8ff] hover:underline"
              >
                Open catalog →
              </button>
            </div>
          </div>
        </article>

        <article className="rounded-xl border border-white/10 bg-[#0d1528] p-3">
          <h3 className="font-semibold">Needs attention</h3>
          <p className="mt-0.5 text-[11px] text-gray-500">Open these first — they affect learners now.</p>
          <div className="mt-3 space-y-2">
            {(attentionOpen.length ? attentionOpen : attention).map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => onNavigate(item.menu)}
                className="flex w-full items-start justify-between rounded-lg border border-white/10 bg-[#0a1120] px-3 py-2 text-left hover:border-[#6f55ff]/50"
              >
                <span>
                  <span className="block text-xs font-medium text-white">{item.label}</span>
                  <span className="block text-[10px] text-gray-500">{item.hint}</span>
                </span>
                <span
                  className={`rounded-md px-2 py-0.5 text-xs font-semibold ${
                    item.count > 0 ? "bg-amber-500/20 text-amber-200" : "bg-white/5 text-gray-400"
                  }`}
                >
                  {fmtNum(item.count)}
                </span>
              </button>
            ))}
          </div>
        </article>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.4fr_1fr_1fr]">
        <article className="rounded-xl border border-white/10 bg-[#0d1528] p-3">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="font-semibold">Latest enrollments</h3>
            <button
              type="button"
              onClick={() => onNavigate("Users")}
              className="rounded-md border border-white/10 bg-[#0a1120] px-2 py-1 text-xs hover:border-[#6f55ff]/50"
            >
              Learners
            </button>
          </div>
          {recentEnrollments.length === 0 ? (
            <p className="py-6 text-center text-xs text-gray-500">
              No enrollments yet. When a learner buys or is added to a roster, they appear here.
            </p>
          ) : (
            <div className="space-y-2">
              {recentEnrollments.map((row, index) => (
                <div
                  key={row.id || `${row.courseSlug}-${row.learnerEmail}-${row.createdAt}-${index}`}
                  className="flex items-center justify-between rounded-lg border border-white/10 bg-[#0a1120] px-3 py-2"
                >
                  <div>
                    <p className="text-xs font-medium">{row.title || row.courseSlug}</p>
                    <p className="text-[10px] text-gray-500">{row.learnerEmail}</p>
                  </div>
                  <p className="text-[10px] text-gray-400">{timeAgo(row.createdAt)}</p>
                </div>
              ))}
            </div>
          )}
        </article>

        <article className="rounded-xl border border-white/10 bg-[#0d1528] p-3">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="font-semibold">New registrations</h3>
            <button
              type="button"
              onClick={() => onNavigate("Users")}
              className="rounded-md border border-white/10 bg-[#0a1120] px-2 py-1 text-xs"
            >
              View all
            </button>
          </div>
          <div className="space-y-2">
            {recentUsers.length === 0 ? (
              <p className="py-6 text-center text-xs text-gray-500">No registrations yet.</p>
            ) : (
              recentUsers.map((u) => (
                <div
                  key={u.email}
                  className="flex items-center justify-between rounded-lg border border-white/10 bg-[#0a1120] px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <div className="grid h-8 w-8 place-items-center rounded-full bg-[#6f55ff]/30 text-[10px] font-bold text-white">
                      {(u.name || u.email).charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-xs font-medium">{u.name || u.email.split("@")[0]}</p>
                      <p className="text-[10px] text-gray-500">{u.role === "admin" ? "Admin" : "Learner"}</p>
                    </div>
                  </div>
                  <p className="text-[10px] text-gray-400">{timeAgo(u.createdAt)}</p>
                </div>
              ))
            )}
          </div>
        </article>

        <article className="rounded-xl border border-white/10 bg-[#0d1528] p-3">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="font-semibold">Top enrolled courses</h3>
            <button
              type="button"
              onClick={() => onNavigate("Self-paced courses")}
              className="rounded-md border border-white/10 bg-[#0a1120] px-2 py-1 text-xs"
            >
              Catalog
            </button>
          </div>
          <p className="mb-3 text-[11px] text-gray-500">
            Longer bar = more learners on that course. Use this to see what is actually selling.
          </p>
          {courseBars.length === 0 ? (
            <p className="py-6 text-center text-xs text-gray-500">No enrollment data yet.</p>
          ) : (
            <HBarList rows={courseBars} />
          )}
        </article>
      </div>

      <article className="mt-4 rounded-xl border border-white/10 bg-[#0d1528] p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div>
            <h3 className="font-semibold">Revenue records</h3>
            <p className="mt-0.5 text-[11px] text-gray-500">
              All money collected — online checkout, cash, grant, bank transfer, and cheque.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate("Payments")}
            className="rounded-md border border-white/10 bg-[#0a1120] px-2 py-1 text-xs"
          >
            Record cash / grant
          </button>
        </div>
        {revenueRecords.length === 0 ? (
          <p className="py-6 text-center text-xs text-gray-500">
            No paid records yet. Add cash or grant income under Payments.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-xs">
              <thead className="text-[10px] uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-2 py-2">Date</th>
                  <th className="px-2 py-2">Amount</th>
                  <th className="px-2 py-2">Method</th>
                  <th className="px-2 py-2">Payer / learner</th>
                  <th className="px-2 py-2">Course</th>
                  <th className="px-2 py-2">Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {revenueRecords.map((row) => (
                  <tr key={row.id}>
                    <td className="whitespace-nowrap px-2 py-2 text-gray-300">
                      {new Date(row.when).toLocaleString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="whitespace-nowrap px-2 py-2 font-medium text-white">
                      {fmtCurrency(row.amount)}
                    </td>
                    <td className="whitespace-nowrap px-2 py-2 text-gray-300">
                      {commerceMethodLabel(row.method)}
                    </td>
                    <td className="max-w-[10rem] truncate px-2 py-2 text-gray-300" title={row.learnerEmail}>
                      {row.learnerEmail === "offline-record@sftlms.local" ? "—" : row.learnerEmail}
                    </td>
                    <td className="max-w-[10rem] truncate px-2 py-2 text-gray-400" title={row.course}>
                      {row.course}
                    </td>
                    <td className="max-w-[12rem] truncate px-2 py-2 text-gray-500" title={row.note ?? ""}>
                      {row.note || row.receipt || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </article>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <AdminRecentOrders onViewAll={() => onNavigate("Orders")} />
        <article className="rounded-xl border border-white/10 bg-[#0d1528] p-3">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="font-semibold">Who is on the platform</h3>
            <button
              type="button"
              onClick={() => onNavigate("Users")}
              className="rounded-md border border-white/10 bg-[#0a1120] px-2 py-1 text-xs"
            >
              Users
            </button>
          </div>
          <p className="mb-3 text-[11px] text-gray-500">
            Pie share of accounts. Learners should be the largest slice on a healthy LMS.
          </p>
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start">
            <DonutChart slices={peopleSlices} center={fmtNum(stats?.totalUsers ?? 0)} />
            <ChartLegend slices={peopleSlices} />
          </div>
        </article>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <article className="rounded-xl border border-white/10 bg-[#0d1528] p-3">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="font-semibold">Enrollments by category</h3>
            <button
              type="button"
              onClick={() => onNavigate("Categories")}
              className="rounded-md border border-white/10 bg-[#0a1120] px-2 py-1 text-xs"
            >
              Edit pages
            </button>
          </div>
          <p className="mb-3 text-[11px] text-gray-500">
            Horizontal bar = learners enrolled in that category. Food Safety should lead if most
            roster adds are food courses.
          </p>
          {categoryBars.length === 0 ? (
            <p className="py-6 text-center text-xs text-gray-500">No categories loaded.</p>
          ) : (
            <HBarList rows={categoryBars} />
          )}
        </article>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Add self-paced course", "Self-paced courses", BookOpen],
          ["Add tutor-led program", "Tutor Led", Video],
          ["Open support tickets", "Support Tickets", TicketCheck],
          ["Manage learners", "Users", Users],
        ].map(([label, menu, Icon]) => (
          <button
            key={label}
            type="button"
            onClick={() => onNavigate(String(menu))}
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#0d1528] px-3 py-3 text-left text-xs font-medium hover:border-[#6f55ff]/50"
          >
            <Icon size={14} className="text-[#b5a8ff]" />
            {label}
          </button>
        ))}
      </div>

      <AdminDashboardCalendarEditor />
      <AdminCommunityConnectEditor />
    </>
  );
}
