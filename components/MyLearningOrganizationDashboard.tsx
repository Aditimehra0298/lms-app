"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Award,
  BookOpen,
  CalendarDays,
  ChevronRight,
  Download,
  GraduationCap,
  ShieldCheck,
  TrendingUp,
  UserPlus,
  Users,
} from "lucide-react";
import { timeOfDayGreeting } from "@/lib/auth-profile";
import { CountryFlagImg } from "@/components/CountryFlagImg";
import {
  formatDashboardDate,
  formatPlanDetailsParagraph,
  type OrganizationDashboardSnapshot,
} from "@/lib/organization-dashboard";
import { MyLearningOrganizationRecommendations } from "@/components/MyLearningOrganizationRecommendations";
import type { LearnerAuthProfile } from "@/lib/auth-profile";
import type { FeaturedCoursePick, ScoredCourse } from "@/lib/learner-course-recommendations";
import type { TutorLedExploreCard } from "@/lib/tutor-led-live-hub-enrich";
import { COMPANY_DISPLAY_NAME } from "@/lib/contact-site-data";
import sfWhiteLogo from "@/SF-WHITE-LOGO.png";

const ORG_TEAM_PLAN_BADGE_URL =
  "https://res.cloudinary.com/dwnnakrrh/image/upload/v1781164540/ChatGPT_Image_Jun_11_2026_01_25_11_PM_s4a0fx.png";

type TutorRanked = {
  card: TutorLedExploreCard;
  score: number;
  reasons: string[];
};

type Props = {
  snapshot: OrganizationDashboardSnapshot;
  adminDisplayName: string;
  learnerProfile: LearnerAuthProfile;
  dashboardNow?: Date;
  countryCode?: string | null;
  industryType?: string | null;
  countryName?: string | null;
  companySize?: string | null;
  enrolledSummary?: string;
  orgFeaturedCourse?: FeaturedCoursePick | null;
  orgRankedSelfPaced?: ScoredCourse[];
  orgRankedTutorLed?: TutorRanked[];
};

const surface =
  "rounded-xl border border-white/[0.07] bg-[#101018] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]";

function toneBarClass(tone: "rose" | "sky" | "emerald" | "violet", high = false): string {
  if (high) return "bg-emerald-500";
  if (tone === "rose") return "bg-rose-500";
  if (tone === "sky") return "bg-sky-500";
  if (tone === "emerald") return "bg-emerald-500";
  return "bg-violet-500";
}

function toneIconClass(tone: "rose" | "sky" | "emerald" | "violet"): string {
  if (tone === "rose") return "bg-rose-500/15 text-rose-300 ring-rose-500/25";
  if (tone === "sky") return "bg-sky-500/15 text-sky-300 ring-sky-500/25";
  if (tone === "emerald") return "bg-emerald-500/15 text-emerald-300 ring-emerald-500/25";
  return "bg-violet-500/15 text-violet-300 ring-violet-500/25";
}

function initialsAvatar(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">{children}</p>
  );
}

function MetricCard({
  icon: Icon,
  value,
  label,
  footer,
}: {
  icon: typeof Users;
  value: ReactNode;
  label: string;
  footer?: ReactNode;
}) {
  return (
    <article className={`flex flex-col p-5 ${surface}`}>
      <div className="flex items-center gap-3">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 ring-1 ring-amber-500/20">
          <Icon size={18} className="text-amber-400/90" strokeWidth={1.75} />
        </span>
        <p className="text-xs font-medium text-zinc-500">{label}</p>
      </div>
      <p className="mt-4 text-3xl font-semibold tracking-tight text-white">{value}</p>
      {footer ? <div className="mt-3">{footer}</div> : null}
    </article>
  );
}

function PanelHeader({ title, href, linkLabel }: { title: string; href: string; linkLabel: string }) {
  return (
    <div className="mb-5 flex items-center justify-between gap-3 border-b border-white/[0.06] pb-4">
      <h2 className="text-base font-semibold tracking-tight text-white">{title}</h2>
      <Link
        href={href}
        className="inline-flex items-center gap-0.5 text-xs font-medium text-amber-400/90 transition hover:text-amber-300"
      >
        {linkLabel}
        <ChevronRight size={14} />
      </Link>
    </div>
  );
}

export function MyLearningOrganizationDashboard({
  snapshot,
  adminDisplayName,
  learnerProfile,
  dashboardNow = new Date(),
  countryCode,
  enrolledSummary,
  orgFeaturedCourse = null,
  orgRankedSelfPaced = [],
  orgRankedTutorLed = [],
}: Props) {
  const seatPercent = Math.round((snapshot.seatsUsed / Math.max(1, snapshot.seatsTotal)) * 100);
  const greetingName = adminDisplayName && adminDisplayName !== "there" ? adminDisplayName : snapshot.companyName;

  const quickActions = [
    {
      label: "Invite Employees",
      desc: `Up to ${snapshot.seatsTotal} learners on your plan — photo, name, email, position`,
      icon: UserPlus,
      href: "/my-learning?tab=invite-employees",
      highlight: true,
    },
    {
      label: "Assign Courses",
      desc: "Any course · each employee can take multiple programs",
      icon: BookOpen,
      href: "/my-learning?tab=assign-courses",
      highlight: true,
    },
    {
      label: "Download Report",
      desc: "Who is assigned to which course (CSV)",
      icon: Download,
      href: "/my-learning?tab=org-report",
      highlight: true,
    },
    {
      label: "View Calendar",
      desc: "Team sessions, exams & reminders",
      icon: CalendarDays,
      href: "/my-learning/calendar",
      highlight: false,
    },
  ] as const;

  return (
    <section className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-2 lg:items-stretch">
        {/* Welcome */}
        <article className={`relative overflow-hidden p-6 md:p-7 ${surface}`}>
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_100%_0%,rgba(251,191,36,0.06),transparent_55%)]"
            aria-hidden
          />

          <div className="relative flex h-full flex-col justify-between gap-6">
            <div className="flex items-start justify-between gap-5">
              <div className="min-w-0 flex-1">
                <SectionLabel>Organization dashboard</SectionLabel>
                <p className="mt-2 text-2xl font-semibold tracking-tight text-white md:text-[1.65rem]">
                  {timeOfDayGreeting(dashboardNow)},{" "}
                  <span className="text-amber-400/95">{greetingName}</span>
                </p>
                <p className="mt-1.5 text-sm text-zinc-500">{formatDashboardDate(dashboardNow)}</p>

                <div className="mt-6 border-t border-white/[0.06] pt-5">
                  <h1 className="text-xl font-semibold tracking-tight text-white md:text-2xl">
                    {snapshot.companyName}
                  </h1>
                  <div className="mt-2 flex flex-wrap items-center gap-2.5">
                    <span className="rounded-md bg-white/[0.04] px-2 py-1 text-xs font-medium text-zinc-400 ring-1 ring-white/[0.06]">
                      Organization Admin
                    </span>
                    {countryCode?.trim() ? (
                      <CountryFlagImg
                        code={countryCode.trim()}
                        width={48}
                        className="h-5 w-5 rounded-full object-cover ring-1 ring-white/10"
                      />
                    ) : null}
                  </div>
                </div>

                <p className="mt-4 max-w-md text-sm leading-relaxed text-zinc-500">
                  {enrolledSummary ??
                    "Browse the catalog to assign courses and start team training."}
                </p>
              </div>

              <div className="hidden shrink-0 sm:block">
                <Image
                  src={sfWhiteLogo}
                  alt={COMPANY_DISPLAY_NAME}
                  className="h-24 w-auto object-contain opacity-90 md:h-28"
                  priority
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2.5">
              <Link
                href="/my-learning?tab=invite-employees"
                className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-amber-400"
              >
                Invite Employees
                <ArrowRight size={15} strokeWidth={2} />
              </Link>
              <Link
                href="/my-learning?tab=assign-courses"
                className="inline-flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-2.5 text-sm font-semibold text-amber-200 transition hover:bg-amber-500/20"
              >
                Assign Courses
              </Link>
            </div>
          </div>
        </article>

        {/* Subscription */}
        <article className={`flex flex-col overflow-hidden ${surface}`}>
          <div className="flex items-center justify-between gap-3 border-b border-white/[0.06] px-6 py-4">
            <SectionLabel>Active subscription</SectionLabel>
            <Link
              href="/my-learning?tab=subscriptions"
              className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:border-amber-500/30 hover:text-amber-300"
            >
              View Plan
            </Link>
          </div>

          <div className="flex flex-1 flex-col px-6 py-5">
            <div className="flex items-start gap-4">
              <div className="relative h-20 w-20 shrink-0">
                <Image
                  src={ORG_TEAM_PLAN_BADGE_URL}
                  alt=""
                  fill
                  className="object-contain"
                  sizes="80px"
                />
              </div>
              <div className="min-w-0 flex-1 pt-0.5">
                <p className="text-base font-semibold leading-snug text-white">{snapshot.planName}</p>
                <p className="mt-0.5 text-sm text-zinc-500">{snapshot.planTier}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-400 ring-1 ring-emerald-500/20">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    Active
                  </span>
                  <span className="text-xs text-zinc-600">Renews {snapshot.planValidUntil}</span>
                </div>
              </div>
            </div>

            <div className="mt-5 flex-1 rounded-lg bg-black/20 px-4 py-4 ring-1 ring-white/[0.05]">
              <p className="text-sm leading-relaxed text-zinc-400">
                {formatPlanDetailsParagraph(snapshot.planDetails)}
              </p>
            </div>

            <p className="mt-4 text-[11px] text-zinc-600">
              Synced {formatDashboardDate(dashboardNow)}
            </p>
          </div>
        </article>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={Users}
          label="Seats used"
          value={
            <>
              {snapshot.seatsUsed}
              <span className="text-xl font-normal text-zinc-600"> / {snapshot.seatsTotal}</span>
            </>
          }
          footer={
            <>
              <div className="h-1 overflow-hidden rounded-full bg-white/[0.06]">
                <div className="h-full rounded-full bg-amber-500/80" style={{ width: `${seatPercent}%` }} />
              </div>
              <p className="mt-1.5 text-xs text-zinc-600">{seatPercent}% capacity</p>
            </>
          }
        />
        <MetricCard
          icon={GraduationCap}
          label="Active learners"
          value={snapshot.activeLearners}
          footer={
            <p className="inline-flex items-center gap-1 text-xs font-medium text-emerald-500/90">
              <TrendingUp size={13} />
              +{snapshot.activeLearnersDelta} this month
            </p>
          }
        />
        <MetricCard
          icon={ShieldCheck}
          label="Compliance score"
          value={`${snapshot.complianceScore}%`}
          footer={
            <p className="inline-flex items-center gap-1 text-xs font-medium text-emerald-500/90">
              <TrendingUp size={13} />
              +{snapshot.complianceScoreDelta}% this month
            </p>
          }
        />
        <MetricCard
          icon={Award}
          label="Compliance earned"
          value={snapshot.complianceEarned}
          footer={
            <p className="inline-flex items-center gap-1 text-xs font-medium text-emerald-500/90">
              <TrendingUp size={13} />
              +{snapshot.complianceEarnedDelta} this month
            </p>
          }
        />
      </div>

      {/* Team management — highlighted */}
      <article className={`overflow-hidden ${surface}`}>
        <div className="border-b border-amber-500/20 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent px-5 py-4 md:px-6">
          <SectionLabel>Team management</SectionLabel>
          <p className="mt-1 text-base font-semibold text-white">
            Invite your team, assign purchased courses, export reports
          </p>
          <p className="mt-1 max-w-2xl text-xs text-zinc-500">
            {snapshot.seatsUsed} of {snapshot.seatsTotal} learner seats on{" "}
            <span className="text-amber-200/90">{snapshot.planName}</span> — invite, then assign any
            catalog course (multiple courses per employee).
          </p>
        </div>
        <div className="grid sm:grid-cols-2 xl:grid-cols-4 divide-y divide-white/[0.06] sm:divide-x sm:divide-y-0">
          {quickActions.map(({ label, desc, icon: Icon, href, highlight }) => (
            <Link
              key={label}
              href={href}
              className={`group flex items-start gap-3.5 p-5 transition ${
                highlight ? "hover:bg-amber-500/[0.06]" : "hover:bg-white/[0.02]"
              }`}
            >
              <span
                className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ring-1 transition ${
                  highlight
                    ? "bg-amber-500/15 ring-amber-500/30 group-hover:ring-amber-400/50"
                    : "bg-white/[0.04] ring-white/[0.07] group-hover:ring-amber-500/25"
                }`}
              >
                <Icon
                  size={18}
                  className={
                    highlight
                      ? "text-amber-300"
                      : "text-zinc-400 transition group-hover:text-amber-400/90"
                  }
                />
              </span>
              <div className="min-w-0">
                <p className={`text-sm font-semibold ${highlight ? "text-amber-100" : "text-zinc-200"}`}>
                  {label}
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-zinc-600">{desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </article>

      {/* Bottom panels */}
      <div className="grid gap-5 lg:grid-cols-2">
        <article className={`p-5 md:p-6 ${surface}`}>
          <PanelHeader title="Employee progress" href="/my-learning?tab=learning" linkLabel="View all" />
          <ul className="space-y-4">
            {snapshot.employees.map((emp) => (
              <li key={emp.id} className="flex items-center gap-3">
                {emp.avatarUrl ? (
                  <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full ring-1 ring-white/10">
                    <Image src={emp.avatarUrl} alt="" fill className="object-cover" sizes="36px" />
                  </div>
                ) : (
                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/[0.04] text-[10px] font-bold text-zinc-400 ring-1 ring-white/10">
                    {initialsAvatar(emp.name)}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium text-zinc-200">{emp.name}</p>
                    <span className="shrink-0 text-xs font-semibold tabular-nums text-zinc-400">
                      {emp.progressPercent}%
                    </span>
                  </div>
                  <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/[0.06]">
                    <div
                      className="h-full rounded-full bg-amber-500/75"
                      style={{ width: `${emp.progressPercent}%` }}
                    />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </article>

        <article className={`p-5 md:p-6 ${surface}`}>
          <PanelHeader title="Compliance overview" href="/my-learning?tab=org-report" linkLabel="Download report" />
          <ul className="space-y-4">
            {snapshot.complianceRows.map((row) => (
              <li key={row.id} className="flex items-center gap-3">
                <span
                  className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold ring-1 ${toneIconClass(row.tone)}`}
                >
                  {row.label.slice(0, 1)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium text-zinc-200">{row.label}</p>
                    <span className="shrink-0 text-xs font-semibold tabular-nums text-zinc-400">
                      {row.percent}%
                    </span>
                  </div>
                  <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/[0.06]">
                    <div
                      className={`h-full rounded-full ${toneBarClass(row.tone, row.percent >= 90)}`}
                      style={{ width: `${row.percent}%` }}
                    />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </article>
      </div>

      <MyLearningOrganizationRecommendations
        profile={learnerProfile}
        featured={orgFeaturedCourse}
        rankedSelfPaced={orgRankedSelfPaced}
        rankedTutorLed={orgRankedTutorLed}
      />
    </section>
  );
}
