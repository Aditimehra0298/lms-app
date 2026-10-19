"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Activity,
  ArrowRight,
  Award,
  Building2,
  Calendar,
  Clock,
  CreditCard,
  Download,
  Layers,
  Loader2,
  RefreshCw,
  Sparkles,
  Target,
  TrendingUp,
  User,
  Users,
  Video,
  Wallet,
  Zap,
} from "lucide-react";

type Audience = "individual" | "organisation";
type TabId =
  | "overview"
  | "learners"
  | "courses"
  | "revenue"
  | "plans"
  | "corporate"
  | "training"
  | "insights";

type SeriesPoint = { label: string; value: number };

type DashboardPayload = {
  ok: true;
  audience: Audience;
  title: string;
  generatedAt: string;
  overview: {
    kpis: {
      totalLearners: number;
      learnerGrowthPct: number;
      newLearnersYtd: number;
      activeLearners: number;
      activeDaily: number;
      activeWeekly: number;
      inactiveLearners: number;
      inactive30: number;
      inactive60: number;
      inactive90plus: number;
      lifetimeRevenuePaise: number;
      yearlyRevenuePaise: number;
      monthlyRevenuePaise: number;
      revenueYoY: number;
    };
    learnerGrowth: SeriesPoint[];
    revenueGrowth: SeriesPoint[];
    purchaseActivity: Array<{
      id: string;
      at: string;
      student: string;
      email: string;
      country: string;
      course: string;
      division: string;
      training: string;
      amountPaise: number;
    }>;
    journey: Array<{ key: string; label: string; value: number; tone: string; barPct: number }>;
  };
  learners: {
    kpis: {
      total: number;
      growthPct: number;
      active: number;
      weeklyActive: number;
      completed: number;
      completedPct: number;
      inProgress: number;
      coursesCount: number;
      inactive: number;
      inactive90plus: number;
    };
    engagementSeries: SeriesPoint[];
    activeDaily: number;
    activeWeekly: number;
    activeMonthly: number;
    inactivity: Array<{ label: string; value: number }>;
    directory: Array<{
      name: string;
      email: string;
      country: string;
      registeredAt: string;
      lastLoginAt: string | null;
      course: string;
      progress: number;
      certificate: string;
      subscription: string;
    }>;
  };
  courses: {
    kpis: {
      totalCourses: number;
      divisions: number;
      totalEnrollments: number;
      enrollmentGrowthPct: number;
      avgCompletionPct: number;
      avgRating: number;
    };
    divisions: Array<{
      name: string;
      courses: number;
      learners: number;
      revenuePaise: number;
      completionPct: number;
      rating: number;
      barPct: number;
    }>;
    topCourses: Array<{
      slug: string;
      title: string;
      division: string;
      enrollments: number;
      revenuePaise: number;
      completionPct: number;
      mode: string;
    }>;
  };
  revenue: {
    kpis: {
      last24hPaise: number;
      last24hCount: number;
      monthlyPaise: number;
      monthlyGrowthPct: number;
      sixMonthPaise: number;
      yearPaise: number;
      lifetimePaise: number;
      lifetimeGrowthPct: number;
    };
    timeline: SeriesPoint[];
    byTrainingType: Array<{ key: string; label: string; revenuePaise: number; sharePct: number }>;
    corporatePaise: number;
    corporateSharePct: number;
    recentPayments: Array<{
      id: string;
      email: string;
      amountPaise: number;
      status: string;
      at: string;
      itemCount: number;
    }>;
  };
  subscriptions: {
    kpis: {
      activeSubscribers: number;
      planCount: number;
      subscriptionRevenuePaise: number;
      revenueSharePct: number;
      upcomingRenewals: number;
      avgPlanYears: number;
    };
    plans: Array<{
      title: string;
      subscribers: number;
      revenuePaise: number;
      sharePct: number;
      barPct: number;
    }>;
    directory: Array<{
      name: string;
      email: string;
      plan: string;
      purchaseDate: string;
      expiryDate: string;
      coursesAccessed: number;
      completed: number;
      certificates: number;
      lastLoginAt: string | null;
    }>;
  } | null;
  corporate: {
    kpis: {
      clients: number;
      employeesEnrolled: number;
      corporateRevenuePaise: number;
      revenueSharePct: number;
      avgCompletionPct: number;
    };
    portfolio: Array<{
      company: string;
      employees: number;
      assignedCourses: number;
      activeLearners: number;
      completionPct: number;
      certificates: number;
      revenuePaise: number;
    }>;
    workforce: {
      company: string;
      completed: number;
      inProgress: number;
      inactive: number;
      assignedCourses: number;
    } | null;
    employeeTracking: Array<{
      employee: string;
      company: string;
      lastLoginAt: string | null;
      course: string;
      progress: number;
      certificate: string;
    }>;
  } | null;
  training: {
    selfPaced: { courses: number; learners: number; completionPct: number; revenuePaise: number };
    liveTutorLed: { courses: number; learners: number; completionPct: number; revenuePaise: number };
    batches: Array<{
      name: string;
      trainer: string;
      students: number;
      attendance: number;
      completion: number;
      mode: string;
    }>;
  };
  insights: Array<{
    kind: string;
    badge: string;
    metric: string;
    headline: string;
    body: string;
    action: string;
    hrefMenu: string;
  }>;
};

function rupees(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN", {
    maximumFractionDigits: 0,
  })}`;
}

/** Compact INR: Cr / L / plain */
function inrCompact(paise: number): string {
  const r = paise / 100;
  if (r >= 1e7) return `₹${(r / 1e7).toFixed(r >= 1e8 ? 1 : 2)} Cr`;
  if (r >= 1e5) return `₹${(r / 1e5).toFixed(r >= 1e6 ? 1 : 2)} L`;
  return rupees(paise);
}

function n(v: number): string {
  return v.toLocaleString("en-IN");
}

function fmtWhen(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const today = new Date();
  const sameDay =
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear();
  if (sameDay) {
    return `Today, ${d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`;
  }
  return d.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

type Props = {
  initialAudience?: Audience;
  onNavigate?: (menu: string) => void;
};

function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <article className={`rounded-2xl border border-white/10 bg-[#0d1528] p-4 shadow-sm ${className}`}>
      {children}
    </article>
  );
}

function Kpi({
  label,
  value,
  sub,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  sub?: ReactNode;
  icon: typeof Activity;
  tone: "sky" | "emerald" | "amber" | "violet" | "rose";
}) {
  const tones = {
    sky: "bg-sky-500/15 text-sky-300 border-sky-400/20",
    emerald: "bg-emerald-500/15 text-emerald-300 border-emerald-400/20",
    amber: "bg-amber-500/15 text-amber-300 border-amber-400/20",
    violet: "bg-violet-500/15 text-violet-300 border-violet-400/20",
    rose: "bg-rose-500/15 text-rose-300 border-rose-400/20",
  };
  return (
    <Card>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] text-gray-400">{label}</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight text-white">{value}</p>
          {sub ? <div className="mt-1 text-[11px] text-gray-500">{sub}</div> : null}
        </div>
        <div className={`rounded-xl border p-2 ${tones[tone]}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </Card>
  );
}

type AxisFormat = "count" | "rupees" | "percent";

function niceMax(raw: number): number {
  if (!Number.isFinite(raw) || raw <= 0) return 1;
  const exp = Math.pow(10, Math.floor(Math.log10(raw)));
  const scaled = raw / exp;
  const nice = scaled <= 1 ? 1 : scaled <= 2 ? 2 : scaled <= 5 ? 5 : 10;
  return nice * exp;
}

function formatAxis(value: number, format: AxisFormat): string {
  if (format === "percent") return `${Math.round(value)}%`;
  if (format === "rupees") {
    const r = value / 100;
    if (r >= 1e7) return `₹${(r / 1e7).toFixed(r % 1e7 === 0 ? 0 : 1)}Cr`;
    if (r >= 1e5) return `₹${(r / 1e5).toFixed(r % 1e5 === 0 ? 0 : 1)}L`;
    if (r >= 1e3) return `₹${(r / 1e3).toFixed(r % 1e3 === 0 ? 0 : 1)}k`;
    return `₹${Math.round(r)}`;
  }
  if (value >= 1e7) return `${(value / 1e7).toFixed(1)}Cr`;
  if (value >= 1e5) return `${(value / 1e5).toFixed(1)}L`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(value >= 1e4 ? 0 : 1)}k`;
  return String(Math.round(value));
}

/** Line chart with labeled X/Y axes, grid, and readable tick values. */
function AxisLineChart({
  data,
  color = "#38bdf8",
  format = "count",
  yLabel,
  xLabel,
}: {
  data: SeriesPoint[];
  color?: string;
  format?: AxisFormat;
  yLabel?: string;
  xLabel?: string;
}) {
  const w = 520;
  const h = 220;
  const padL = 52;
  const padR = 16;
  const padT = 16;
  const padB = 36;
  const plotW = w - padL - padR;
  const plotH = h - padT - padB;
  const maxVal = niceMax(Math.max(0, ...data.map((d) => d.value)) * 1.05);
  const ticks = 4;
  const yTicks = Array.from({ length: ticks + 1 }, (_, i) => (maxVal * i) / ticks);
  const gid = `axis-${color.replace("#", "")}-${format}-${data.length}`;

  const points = data.map((d, i) => {
    const x = padL + (data.length <= 1 ? plotW / 2 : (i * plotW) / (data.length - 1));
    const y = padT + plotH - (d.value / maxVal) * plotH;
    return { ...d, x, y };
  });
  const linePts = points.map((p) => `${p.x},${p.y}`).join(" ");
  const area =
    points.length > 0
      ? `M ${points[0].x},${padT + plotH} ${points.map((p) => `L ${p.x},${p.y}`).join(" ")} L ${points[points.length - 1].x},${padT + plotH} Z`
      : "";

  return (
    <div className="w-full">
      {yLabel ? <p className="mb-1 text-[10px] font-medium text-gray-500">{yLabel}</p> : null}
      <svg viewBox={`0 0 ${w} ${h}`} className="h-52 w-full" role="img" aria-label="Line chart">
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.28" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Grid + Y ticks */}
        {yTicks.map((tick) => {
          const y = padT + plotH - (tick / maxVal) * plotH;
          return (
            <g key={`y-${tick}`}>
              <line
                x1={padL}
                y1={y}
                x2={padL + plotW}
                y2={y}
                stroke="rgba(255,255,255,0.08)"
                strokeWidth="1"
              />
              <text
                x={padL - 8}
                y={y + 3}
                textAnchor="end"
                fill="#9ca3af"
                fontSize="10"
                fontFamily="system-ui, sans-serif"
              >
                {formatAxis(tick, format)}
              </text>
            </g>
          );
        })}

        {/* Axes */}
        <line
          x1={padL}
          y1={padT}
          x2={padL}
          y2={padT + plotH}
          stroke="rgba(255,255,255,0.25)"
          strokeWidth="1.25"
        />
        <line
          x1={padL}
          y1={padT + plotH}
          x2={padL + plotW}
          y2={padT + plotH}
          stroke="rgba(255,255,255,0.25)"
          strokeWidth="1.25"
        />

        {area ? <path d={area} fill={`url(#${gid})`} /> : null}
        {points.length > 1 ? (
          <polyline fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" points={linePts} />
        ) : null}

        {points.map((p) => (
          <g key={p.label}>
            <circle cx={p.x} cy={p.y} r="4" fill="#0d1528" stroke={color} strokeWidth="2" />
            <text
              x={p.x}
              y={padT + plotH + 16}
              textAnchor="middle"
              fill="#9ca3af"
              fontSize="10"
              fontFamily="system-ui, sans-serif"
            >
              {p.label}
            </text>
            <title>
              {p.label}: {formatAxis(p.value, format)}
            </title>
          </g>
        ))}
      </svg>
      {xLabel ? <p className="mt-0.5 text-center text-[10px] font-medium text-gray-500">{xLabel}</p> : null}
    </div>
  );
}

/** Vertical bar chart with labeled X/Y axes. */
function AxisBarChart({
  data,
  color = "#34d399",
  format = "percent",
  yLabel,
  xLabel,
}: {
  data: SeriesPoint[];
  color?: string;
  format?: AxisFormat;
  yLabel?: string;
  xLabel?: string;
}) {
  const w = 420;
  const h = 220;
  const padL = 48;
  const padR = 16;
  const padT = 20;
  const padB = 40;
  const plotW = w - padL - padR;
  const plotH = h - padT - padB;
  const rawMax = Math.max(0, ...data.map((d) => d.value));
  const maxVal = format === "percent" ? 100 : niceMax(rawMax * 1.1 || 1);
  const ticks = 4;
  const yTicks = Array.from({ length: ticks + 1 }, (_, i) => (maxVal * i) / ticks);
  const barGap = 0.35;
  const slot = plotW / Math.max(1, data.length);
  const barW = slot * (1 - barGap);

  return (
    <div className="w-full">
      {yLabel ? <p className="mb-1 text-[10px] font-medium text-gray-500">{yLabel}</p> : null}
      <svg viewBox={`0 0 ${w} ${h}`} className="h-52 w-full" role="img" aria-label="Bar chart">
        {yTicks.map((tick) => {
          const y = padT + plotH - (tick / maxVal) * plotH;
          return (
            <g key={`by-${tick}`}>
              <line
                x1={padL}
                y1={y}
                x2={padL + plotW}
                y2={y}
                stroke="rgba(255,255,255,0.08)"
                strokeWidth="1"
              />
              <text
                x={padL - 8}
                y={y + 3}
                textAnchor="end"
                fill="#9ca3af"
                fontSize="10"
                fontFamily="system-ui, sans-serif"
              >
                {formatAxis(tick, format)}
              </text>
            </g>
          );
        })}
        <line
          x1={padL}
          y1={padT}
          x2={padL}
          y2={padT + plotH}
          stroke="rgba(255,255,255,0.25)"
          strokeWidth="1.25"
        />
        <line
          x1={padL}
          y1={padT + plotH}
          x2={padL + plotW}
          y2={padT + plotH}
          stroke="rgba(255,255,255,0.25)"
          strokeWidth="1.25"
        />
        {data.map((d, i) => {
          const bh = (d.value / maxVal) * plotH;
          const x = padL + i * slot + (slot - barW) / 2;
          const y = padT + plotH - bh;
          return (
            <g key={d.label}>
              <rect x={x} y={y} width={barW} height={Math.max(2, bh)} rx="6" fill={color} />
              <text
                x={x + barW / 2}
                y={y - 6}
                textAnchor="middle"
                fill="#e5e7eb"
                fontSize="11"
                fontWeight="600"
                fontFamily="system-ui, sans-serif"
              >
                {formatAxis(d.value, format)}
              </text>
              <text
                x={x + barW / 2}
                y={padT + plotH + 16}
                textAnchor="middle"
                fill="#9ca3af"
                fontSize="10"
                fontFamily="system-ui, sans-serif"
              >
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
      {xLabel ? <p className="mt-0.5 text-center text-[10px] font-medium text-gray-500">{xLabel}</p> : null}
    </div>
  );
}

/** Donut / pie with slice percentages and a value legend. */
function DonutChart({
  slices,
  centerLabel,
  centerValue,
}: {
  slices: Array<{ label: string; value: number; color: string }>;
  centerLabel?: string;
  centerValue?: string;
}) {
  const size = 180;
  const cx = size / 2;
  const cy = size / 2;
  const r = 68;
  const stroke = 28;
  const total = slices.reduce((s, x) => s + Math.max(0, x.value), 0) || 1;
  const circumference = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div className="flex flex-wrap items-center gap-6">
      <svg viewBox={`0 0 ${size} ${size}`} className="h-44 w-44 shrink-0" role="img" aria-label="Pie chart">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
        {slices.map((slice) => {
          const pct = Math.max(0, slice.value) / total;
          const dash = pct * circumference;
          const gap = circumference - dash;
          const el = (
            <circle
              key={slice.label}
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke={slice.color}
              strokeWidth={stroke}
              strokeDasharray={`${dash} ${gap}`}
              strokeDashoffset={-offset}
              strokeLinecap="butt"
              transform={`rotate(-90 ${cx} ${cy})`}
            />
          );
          offset += dash;
          return el;
        })}
        <circle cx={cx} cy={cy} r={r - stroke / 2 - 2} fill="#0d1528" />
        {centerLabel ? (
          <text
            x={cx}
            y={cy - 6}
            textAnchor="middle"
            fill="#9ca3af"
            fontSize="10"
            fontFamily="system-ui, sans-serif"
          >
            {centerLabel}
          </text>
        ) : null}
        {centerValue ? (
          <text
            x={cx}
            y={cy + 12}
            textAnchor="middle"
            fill="#ffffff"
            fontSize="13"
            fontWeight="600"
            fontFamily="system-ui, sans-serif"
          >
            {centerValue}
          </text>
        ) : null}
      </svg>
      <ul className="min-w-[160px] space-y-2.5 text-[11px]">
        {slices.map((slice) => {
          const pct = Math.round((Math.max(0, slice.value) / total) * 1000) / 10;
          return (
            <li key={slice.label} className="flex items-start gap-2">
              <span
                className="mt-1 h-2.5 w-2.5 shrink-0 rounded-sm"
                style={{ background: slice.color }}
              />
              <div>
                <p className="font-medium text-gray-200">{slice.label}</p>
                <p className="text-gray-500">
                  {inrCompact(slice.value)} · <span className="text-gray-300">{pct}%</span>
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function DivBadge({ name }: { name: string }) {
  const palette = [
    "bg-sky-500/15 text-sky-200",
    "bg-violet-500/15 text-violet-200",
    "bg-emerald-500/15 text-emerald-200",
    "bg-amber-500/15 text-amber-200",
    "bg-rose-500/15 text-rose-200",
  ];
  const idx = Math.abs([...name].reduce((s, c) => s + c.charCodeAt(0), 0)) % palette.length;
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${palette[idx]}`}>
      {name}
    </span>
  );
}

export default function AdminAnalyticsWorkspace({
  initialAudience = "individual",
  onNavigate,
}: Props) {
  const [audience, setAudience] = useState<Audience>(initialAudience);
  const [tab, setTab] = useState<TabId>("overview");
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [divisionFilter, setDivisionFilter] = useState<string | null>(null);
  const [learnerQ, setLearnerQ] = useState("");

  useEffect(() => {
    setAudience(initialAudience);
  }, [initialAudience]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/analytics/command-center?audience=${audience}`, {
        cache: "no-store",
        credentials: "include",
      });
      const json = (await res.json()) as DashboardPayload | { ok?: false; message?: string };
      if (!res.ok || !json.ok) {
        throw new Error(("message" in json && json.message) || "Could not load analytics");
      }
      setData(json as DashboardPayload);
      setDivisionFilter(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load analytics");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [audience]);

  useEffect(() => {
    void load();
  }, [load]);

  const isOrg = audience === "organisation";

  const tabs = useMemo(() => {
    const base: Array<{ id: TabId; label: string }> = [
      { id: "overview", label: "Overview" },
      { id: "learners", label: isOrg ? "Workforce" : "Learners" },
      { id: "courses", label: "Courses" },
      { id: "revenue", label: "Revenue" },
      { id: isOrg ? "corporate" : "plans", label: isOrg ? "Corporate" : "Subscriptions" },
      { id: "training", label: "Training modes" },
      { id: "insights", label: "AI insights" },
    ];
    return base;
  }, [isOrg]);

  useEffect(() => {
    if (isOrg && tab === "plans") setTab("corporate");
    if (!isOrg && tab === "corporate") setTab("plans");
  }, [isOrg, tab]);

  const filteredCourses = useMemo(() => {
    if (!data) return [];
    if (!divisionFilter) return data.courses.topCourses;
    return data.courses.topCourses.filter((c) => c.division === divisionFilter);
  }, [data, divisionFilter]);

  const filteredDirectory = useMemo(() => {
    if (!data) return [];
    const q = learnerQ.trim().toLowerCase();
    if (!q) return data.learners.directory;
    return data.learners.directory.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q) ||
        r.course.toLowerCase().includes(q),
    );
  }, [data, learnerQ]);

  const o = data?.overview;
  const insightTone: Record<string, string> = {
    growth: "border-sky-400/30 bg-sky-500/5",
    renewal: "border-violet-400/30 bg-violet-500/5",
    performer: "border-emerald-400/30 bg-emerald-500/5",
    risk: "border-amber-400/30 bg-amber-500/5",
  };
  const insightMetric: Record<string, string> = {
    growth: "text-sky-300",
    renewal: "text-violet-300",
    performer: "text-emerald-300",
    risk: "text-amber-300",
  };

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-300/80">
            Command center
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-white">
            {isOrg ? "Organization analytics" : "Individual analytics"}
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-gray-400">
            {isOrg
              ? "Corporate accounts, seat utilisation, course performance, and training ROI."
              : "Learner growth, engagement, revenue, subscriptions, and course performance."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div
            className="inline-flex rounded-xl border border-white/10 bg-black/40 p-1"
            role="tablist"
            aria-label="Analytics audience"
          >
            <button
              type="button"
              role="tab"
              aria-selected={!isOrg}
              onClick={() => setAudience("individual")}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition ${
                !isOrg
                  ? "bg-emerald-500 text-black"
                  : "text-gray-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              <User className="h-3.5 w-3.5" /> Individual
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={isOrg}
              onClick={() => setAudience("organisation")}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition ${
                isOrg ? "bg-amber-500 text-black" : "text-gray-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Building2 className="h-3.5 w-3.5" /> Organization
            </button>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-2 text-[11px] text-gray-300 hover:bg-white/5 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>
      </header>

      <nav className="flex flex-wrap gap-1.5 border-b border-white/10 pb-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
              tab === t.id
                ? "bg-white/10 text-white"
                : "text-gray-500 hover:bg-white/5 hover:text-gray-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {error ? (
        <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </p>
      ) : null}

      {loading && !data ? (
        <p className="flex items-center gap-2 text-sm text-gray-400">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading analytics…
        </p>
      ) : null}

      {data && o && tab === "overview" ? (
        <div className="space-y-4">
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Kpi
              label={isOrg ? "Employees enrolled" : "Total registered learners"}
              value={n(o.kpis.totalLearners)}
              sub={
                <span className="text-emerald-400">
                  ↑ {o.kpis.learnerGrowthPct}% · {n(o.kpis.newLearnersYtd)} new this year
                </span>
              }
              icon={Users}
              tone="sky"
            />
            <Kpi
              label="Active learners"
              value={n(o.kpis.activeLearners)}
              sub={`${n(o.kpis.activeDaily)} daily · ${n(o.kpis.activeWeekly)} weekly`}
              icon={Zap}
              tone="emerald"
            />
            <Kpi
              label="Inactive learners"
              value={n(o.kpis.inactiveLearners)}
              sub={`30d: ${n(o.kpis.inactive30)} · 60d: ${n(o.kpis.inactive60)} · 90d+: ${n(o.kpis.inactive90plus)}`}
              icon={Clock}
              tone="amber"
            />
            <Kpi
              label="Lifetime revenue"
              value={inrCompact(o.kpis.lifetimeRevenuePaise)}
              sub={`${inrCompact(o.kpis.yearlyRevenuePaise)} yearly · ${inrCompact(o.kpis.monthlyRevenuePaise)} monthly`}
              icon={Wallet}
              tone="violet"
            />
          </section>

          <section className="grid gap-3 lg:grid-cols-2">
            <Card>
              <div className="mb-2 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-white">
                    {isOrg ? "Organisation growth" : "Learner growth"}
                  </h2>
                  <p className="text-[11px] text-gray-500">Registered over time</p>
                </div>
                <button
                  type="button"
                  onClick={() => setTab("learners")}
                  className="text-[11px] text-sky-300 hover:underline"
                >
                  View analytics
                </button>
              </div>
              <p className="mb-1 text-xl font-semibold text-white">
                {n(o.kpis.totalLearners)}{" "}
                <span className="text-sm font-normal text-emerald-400">↑ {o.kpis.learnerGrowthPct}%</span>
              </p>
              <AxisLineChart
                data={o.learnerGrowth}
                color="#38bdf8"
                format="count"
                yLabel={isOrg ? "Organisations" : "Learners"}
                xLabel="Year"
              />
            </Card>
            <Card>
              <div className="mb-2 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-white">Revenue growth</h2>
                  <p className="text-[11px] text-gray-500">Lifetime revenue by year</p>
                </div>
                <button
                  type="button"
                  onClick={() => setTab("revenue")}
                  className="text-[11px] text-emerald-300 hover:underline"
                >
                  View revenue
                </button>
              </div>
              <p className="mb-1 text-xl font-semibold text-white">
                {inrCompact(o.kpis.lifetimeRevenuePaise)}{" "}
                <span className="text-sm font-normal text-emerald-400">↑ {o.kpis.revenueYoY}%</span>
              </p>
              <AxisLineChart
                data={o.revenueGrowth}
                color="#34d399"
                format="rupees"
                yLabel="Revenue (₹)"
                xLabel="Year"
              />
            </Card>
          </section>

          <section className="grid gap-3 xl:grid-cols-5">
            <Card className="xl:col-span-3">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-white">Last 24 hours purchase activity</h2>
                  <p className="text-[11px] text-gray-500">Latest checkouts across divisions</p>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate?.("Orders")}
                  className="text-[11px] text-amber-300 hover:underline"
                >
                  All transactions
                </button>
              </div>
              <div className="overflow-auto">
                <table className="w-full min-w-[720px] text-left text-[11px]">
                  <thead className="text-[10px] uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="pb-2">Time</th>
                      <th className="pb-2">Student</th>
                      <th className="pb-2">Country</th>
                      <th className="pb-2">Course</th>
                      <th className="pb-2">Division</th>
                      <th className="pb-2">Training</th>
                      <th className="pb-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {o.purchaseActivity.length ? (
                      o.purchaseActivity.map((row) => (
                        <tr key={row.id}>
                          <td className="py-2.5 text-gray-400">{fmtTime(row.at)}</td>
                          <td className="py-2.5 font-medium text-white">{row.student}</td>
                          <td className="py-2.5 text-gray-400">{row.country}</td>
                          <td className="py-2.5 text-gray-200">{row.course}</td>
                          <td className="py-2.5">
                            <DivBadge name={row.division} />
                          </td>
                          <td className="py-2.5 text-gray-400">{row.training}</td>
                          <td className="py-2.5 text-right font-semibold text-amber-200">
                            {rupees(row.amountPaise)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="py-6 text-center text-gray-600">
                          No purchases in the last 24 hours.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>

            <Card className="xl:col-span-2">
              <h2 className="text-sm font-semibold text-white">Learner journey</h2>
              <p className="mb-4 text-[11px] text-gray-500">From enrollment to certification</p>
              <div className="space-y-3">
                {o.journey.map((step) => (
                  <div key={step.key}>
                    <div className="mb-1 flex justify-between text-[11px]">
                      <span className="text-gray-300">{step.label}</span>
                      <span className="font-semibold text-white">{n(step.value)}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-white/10">
                      <div
                        className={`h-full rounded-full ${
                          step.tone === "emerald" || step.tone === "teal"
                            ? "bg-emerald-400"
                            : step.tone === "violet"
                              ? "bg-violet-400"
                              : "bg-sky-400"
                        }`}
                        style={{ width: `${step.barPct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setTab("learners")}
                className="mt-4 inline-flex items-center gap-1 text-[11px] text-sky-300 hover:underline"
              >
                Explore learner analytics <ArrowRight className="h-3 w-3" />
              </button>
            </Card>
          </section>
        </div>
      ) : null}

      {data && tab === "learners" ? (
        <div className="space-y-4">
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <Kpi
              label={isOrg ? "Total seats" : "Total learners"}
              value={n(data.learners.kpis.total)}
              sub={<span className="text-emerald-400">+{data.learners.kpis.growthPct}% this year</span>}
              icon={Users}
              tone="sky"
            />
            <Kpi
              label="Active learners"
              value={n(data.learners.kpis.active)}
              sub={`${n(data.learners.kpis.weeklyActive)} weekly active`}
              icon={Zap}
              tone="emerald"
            />
            <Kpi
              label="Completed"
              value={n(data.learners.kpis.completed)}
              sub={`${data.learners.kpis.completedPct}% of total`}
              icon={Award}
              tone="violet"
            />
            <Kpi
              label="In progress"
              value={n(data.learners.kpis.inProgress)}
              sub={`Across ${n(data.learners.kpis.coursesCount)} courses`}
              icon={Activity}
              tone="amber"
            />
            <Kpi
              label="Inactive"
              value={n(data.learners.kpis.inactive)}
              sub={`${n(data.learners.kpis.inactive90plus)} for 90+ days`}
              icon={Clock}
              tone="rose"
            />
          </section>

          <section className="grid gap-3 lg:grid-cols-2">
            <Card>
              <h2 className="text-sm font-semibold text-white">Engagement overview</h2>
              <p className="mb-2 text-[11px] text-gray-500">Daily learning activity</p>
              <AxisLineChart
                data={data.learners.engagementSeries}
                color="#a78bfa"
                format="count"
                yLabel="Active learners"
                xLabel="Day of week"
              />
              <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[11px]">
                <div className="rounded-lg bg-white/5 p-2">
                  <p className="text-gray-500">Daily active</p>
                  <p className="font-semibold text-white">{n(data.learners.activeDaily)}</p>
                </div>
                <div className="rounded-lg bg-white/5 p-2">
                  <p className="text-gray-500">Weekly active</p>
                  <p className="font-semibold text-white">{n(data.learners.activeWeekly)}</p>
                </div>
                <div className="rounded-lg bg-white/5 p-2">
                  <p className="text-gray-500">Monthly active</p>
                  <p className="font-semibold text-white">{n(data.learners.activeMonthly)}</p>
                </div>
              </div>
            </Card>
            <Card>
              <h2 className="text-sm font-semibold text-white">Inactivity breakdown</h2>
              <p className="mb-4 text-[11px] text-gray-500">Candidates for engagement campaigns</p>
              <div className="space-y-3">
                {data.learners.inactivity.map((row) => {
                  const max = Math.max(1, ...data.learners.inactivity.map((i) => i.value));
                  return (
                    <div key={row.label}>
                      <div className="mb-1 flex justify-between text-[11px]">
                        <span className="text-gray-300">{row.label}</span>
                        <span className="font-semibold text-white">{n(row.value)}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full bg-amber-400"
                          style={{ width: `${Math.max(4, Math.round((row.value / max) * 100))}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="mt-4 text-[11px] text-amber-200/80">
                {n(data.learners.kpis.inactive)} learners are candidates for an engagement campaign.
              </p>
            </Card>
          </section>

          <Card>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold text-white">
                  {isOrg ? "Organisation directory" : "Learner directory"}
                </h2>
                <p className="text-[11px] text-gray-500">Search and review recent accounts</p>
              </div>
              <input
                value={learnerQ}
                onChange={(e) => setLearnerQ(e.target.value)}
                placeholder="Search learners or courses…"
                className="w-full max-w-xs rounded-lg border border-white/10 bg-black/30 px-3 py-1.5 text-xs text-white placeholder:text-gray-600"
              />
            </div>
            <div className="overflow-auto">
              <table className="w-full min-w-[900px] text-left text-[11px]">
                <thead className="text-[10px] uppercase text-gray-500">
                  <tr>
                    <th className="pb-2">Student</th>
                    <th className="pb-2">Country</th>
                    <th className="pb-2">Registered</th>
                    <th className="pb-2">Last login</th>
                    <th className="pb-2">Course</th>
                    <th className="pb-2">Progress</th>
                    <th className="pb-2">Certificate</th>
                    <th className="pb-2">Subscription</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredDirectory.map((row) => (
                    <tr key={row.email}>
                      <td className="py-2.5">
                        <div className="flex items-center gap-2">
                          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-sky-500/20 text-[10px] font-semibold text-sky-200">
                            {initials(row.name)}
                          </span>
                          <div>
                            <p className="font-medium text-white">{row.name}</p>
                            <p className="font-mono text-[10px] text-gray-500">{row.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 text-gray-400">{row.country}</td>
                      <td className="py-2.5 text-gray-400">{fmtWhen(row.registeredAt)}</td>
                      <td className="py-2.5 text-gray-400">{fmtWhen(row.lastLoginAt)}</td>
                      <td className="py-2.5 text-gray-200">{row.course}</td>
                      <td className="py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-white/10">
                            <div
                              className="h-full rounded-full bg-emerald-400"
                              style={{ width: `${row.progress}%` }}
                            />
                          </div>
                          <span className="text-gray-300">{row.progress}%</span>
                        </div>
                      </td>
                      <td className="py-2.5">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] ${
                            row.certificate === "Issued"
                              ? "bg-emerald-500/15 text-emerald-300"
                              : row.certificate === "Pending"
                                ? "bg-amber-500/15 text-amber-300"
                                : "bg-white/5 text-gray-500"
                          }`}
                        >
                          {row.certificate}
                        </span>
                      </td>
                      <td className="py-2.5 text-gray-400">{row.subscription}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      ) : null}

      {data && tab === "courses" ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-sky-300/80">
                Academic performance
              </p>
              <h2 className="text-xl font-semibold text-white">Course performance</h2>
              <p className="text-sm text-gray-400">
                See which divisions and programs are driving learning outcomes.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate?.("Reports")}
              className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-gray-300 hover:bg-white/5"
            >
              <Download className="h-3.5 w-3.5" /> Export report
            </button>
          </div>

          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Kpi
              label="Total courses"
              value={n(data.courses.kpis.totalCourses)}
              sub={`Across ${n(data.courses.kpis.divisions)} divisions`}
              icon={Layers}
              tone="sky"
            />
            <Kpi
              label="Total enrollments"
              value={n(data.courses.kpis.totalEnrollments)}
              sub={<span className="text-emerald-400">+{data.courses.kpis.enrollmentGrowthPct}% this year</span>}
              icon={Users}
              tone="violet"
            />
            <Kpi
              label="Avg. completion"
              value={`${data.courses.kpis.avgCompletionPct}%`}
              sub="Across published programs"
              icon={Target}
              tone="emerald"
            />
            <Kpi
              label="Average rating"
              value={`${data.courses.kpis.avgRating} / 5`}
              sub="From learner outcomes"
              icon={Award}
              tone="amber"
            />
          </section>

          <div>
            <h3 className="text-sm font-semibold text-white">Performance by division</h3>
            <p className="mb-3 text-[11px] text-gray-500">
              Explore learning and commercial outcomes across every business vertical.
            </p>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {data.courses.divisions.map((d) => (
                <button
                  key={d.name}
                  type="button"
                  onClick={() => setDivisionFilter(divisionFilter === d.name ? null : d.name)}
                  className={`rounded-2xl border p-4 text-left transition ${
                    divisionFilter === d.name
                      ? "border-sky-400/50 bg-sky-500/10"
                      : "border-white/10 bg-[#0d1528] hover:border-white/20"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="rounded-lg bg-white/5 p-2">
                      <Layers className="h-4 w-4 text-sky-300" />
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-gray-500" />
                  </div>
                  <p className="mt-3 font-semibold text-white">{d.name}</p>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-[10px]">
                    <div>
                      <p className="text-gray-500">Courses</p>
                      <p className="font-semibold text-white">{d.courses}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Learners</p>
                      <p className="font-semibold text-white">{n(d.learners)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Revenue</p>
                      <p className="font-semibold text-amber-200">{inrCompact(d.revenuePaise)}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-[11px] text-gray-400">
                    <span>Completion {d.completionPct}%</span>
                    <span>★ {d.rating.toFixed(1)}</span>
                  </div>
                  <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-sky-400"
                      style={{ width: `${d.barPct}%` }}
                    />
                  </div>
                </button>
              ))}
              {!data.courses.divisions.length ? (
                <p className="text-sm text-gray-600">No division data yet.</p>
              ) : null}
            </div>
          </div>

          <Card>
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white">Top performing courses</h3>
                <p className="text-[11px] text-gray-500">
                  {divisionFilter ? `Showing ${divisionFilter} courses` : "All divisions"}
                </p>
              </div>
              {divisionFilter ? (
                <button
                  type="button"
                  onClick={() => setDivisionFilter(null)}
                  className="text-[11px] text-sky-300 hover:underline"
                >
                  Clear filter
                </button>
              ) : null}
            </div>
            <div className="overflow-auto">
              <table className="w-full min-w-[800px] text-left text-[11px]">
                <thead className="text-[10px] uppercase text-gray-500">
                  <tr>
                    <th className="pb-2">Course</th>
                    <th className="pb-2">Division</th>
                    <th className="pb-2">Enrollment</th>
                    <th className="pb-2">Completion</th>
                    <th className="pb-2">Revenue</th>
                    <th className="pb-2">Mode</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredCourses.map((c) => (
                    <tr key={c.slug}>
                      <td className="py-2.5 font-medium text-white">{c.title}</td>
                      <td className="py-2.5">
                        <DivBadge name={c.division} />
                      </td>
                      <td className="py-2.5 text-gray-300">{n(c.enrollments)}</td>
                      <td className="py-2.5 text-emerald-300">{c.completionPct}%</td>
                      <td className="py-2.5 text-amber-200">{inrCompact(c.revenuePaise)}</td>
                      <td className="py-2.5 text-gray-400">{c.mode}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      ) : null}

      {data && tab === "revenue" ? (
        <div className="space-y-4">
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <Kpi
              label="Last 24 hours"
              value={inrCompact(data.revenue.kpis.last24hPaise)}
              sub={`Across ${n(data.revenue.kpis.last24hCount)} purchases`}
              icon={Zap}
              tone="violet"
            />
            <Kpi
              label="Monthly revenue"
              value={inrCompact(data.revenue.kpis.monthlyPaise)}
              sub={
                <span className="text-emerald-400">
                  ↑ {data.revenue.kpis.monthlyGrowthPct}% vs previous month
                </span>
              }
              icon={Wallet}
              tone="emerald"
            />
            <Kpi
              label="6 month revenue"
              value={inrCompact(data.revenue.kpis.sixMonthPaise)}
              sub="Strong growth"
              icon={Calendar}
              tone="violet"
            />
            <Kpi
              label="Year revenue"
              value={inrCompact(data.revenue.kpis.yearPaise)}
              sub="Year to date"
              icon={Target}
              tone="sky"
            />
            <Kpi
              label="Lifetime revenue"
              value={inrCompact(data.revenue.kpis.lifetimePaise)}
              sub={
                <span className="text-emerald-400">
                  ↑ {data.revenue.kpis.lifetimeGrowthPct}% vs last year
                </span>
              }
              icon={Layers}
              tone="amber"
            />
          </section>

          <Card>
            <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold text-white">Revenue timeline</h2>
                <p className="text-[11px] text-gray-500">Financial performance across years</p>
                <p className="mt-2 text-2xl font-semibold text-white">
                  {inrCompact(data.revenue.kpis.yearPaise)}{" "}
                  <span className="text-sm font-normal text-emerald-400">
                    ↑ {data.revenue.kpis.lifetimeGrowthPct}%
                  </span>
                </p>
              </div>
            </div>
            <AxisLineChart
              data={data.revenue.timeline}
              color="#34d399"
              format="rupees"
              yLabel="Revenue (₹)"
              xLabel="Year"
            />
          </Card>

          <section className="grid gap-3 lg:grid-cols-2">
            <Card>
              <h3 className="text-sm font-semibold text-white">Revenue by training type</h3>
              <p className="mb-4 text-[11px] text-gray-500">How learners choose to learn</p>
              <div className="space-y-4">
                {data.revenue.byTrainingType.map((row) => (
                  <div key={row.key}>
                    <div className="mb-1 flex justify-between text-[11px]">
                      <span className="text-gray-300">{row.label}</span>
                      <span className="font-semibold text-white">{inrCompact(row.revenuePaise)}</span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-white/10">
                      <div
                        className={`h-full rounded-full ${row.key === "live" ? "bg-emerald-400" : "bg-sky-400"}`}
                        style={{ width: `${Math.max(4, row.sharePct)}%` }}
                      />
                    </div>
                    <p className="mt-1 text-[10px] text-gray-500">{row.sharePct}% of lifetime revenue</p>
                  </div>
                ))}
              </div>
            </Card>
            <Card>
              <h3 className="text-sm font-semibold text-white">
                {isOrg ? "Corporate contribution" : "Organisation share"}
              </h3>
              <p className="mb-4 text-[11px] text-gray-500">Enterprise training revenue</p>
              <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-emerald-500/15 p-2 text-emerald-300">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[11px] text-gray-500">Corporate revenue</p>
                    <p className="text-xl font-semibold text-white">
                      {inrCompact(data.revenue.corporatePaise || (isOrg ? data.revenue.kpis.lifetimePaise : 0))}
                    </p>
                    <p className="text-[11px] text-gray-500">
                      {data.revenue.corporateSharePct || (isOrg ? 100 : 0)}% of total lifetime revenue
                    </p>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => (isOrg ? setTab("corporate") : onNavigate?.("Organization Team"))}
                className="mt-4 inline-flex items-center gap-1 text-[11px] text-emerald-300 hover:underline"
              >
                View corporate clients <ArrowRight className="h-3 w-3" />
              </button>
            </Card>
          </section>

          <Card>
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white">Recent transactions</h3>
                <p className="text-[11px] text-gray-500">Latest learning purchases</p>
              </div>
              <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] text-emerald-300">
                Last activity
              </span>
            </div>
            <div className="overflow-auto">
              <table className="w-full min-w-[560px] text-left text-[11px]">
                <thead className="text-[10px] uppercase text-gray-500">
                  <tr>
                    <th className="pb-2">Email</th>
                    <th className="pb-2">Items</th>
                    <th className="pb-2">Status</th>
                    <th className="pb-2">When</th>
                    <th className="pb-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {data.revenue.recentPayments.map((p) => (
                    <tr key={p.id}>
                      <td className="py-2 font-mono text-[10px] text-violet-200/90">{p.email}</td>
                      <td className="py-2 text-gray-400">{p.itemCount}</td>
                      <td className="py-2 capitalize text-gray-300">{p.status}</td>
                      <td className="py-2 text-gray-500">{fmtWhen(p.at)}</td>
                      <td className="py-2 text-right font-semibold text-amber-200">
                        {rupees(p.amountPaise)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      ) : null}

      {data && tab === "plans" && data.subscriptions ? (
        <div className="space-y-4">
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Kpi
              label="Active subscribers"
              value={n(data.subscriptions.kpis.activeSubscribers)}
              sub={`Across ${n(data.subscriptions.kpis.planCount)} plans`}
              icon={Users}
              tone="violet"
            />
            <Kpi
              label="Subscription revenue"
              value={inrCompact(data.subscriptions.kpis.subscriptionRevenuePaise)}
              sub={`${data.subscriptions.kpis.revenueSharePct}% of lifetime revenue`}
              icon={CreditCard}
              tone="emerald"
            />
            <Kpi
              label="Upcoming renewals"
              value={n(data.subscriptions.kpis.upcomingRenewals)}
              sub="In the next 30 days"
              icon={RefreshCw}
              tone="amber"
            />
            <Kpi
              label="Avg. plan duration"
              value={`${data.subscriptions.kpis.avgPlanYears} years`}
              sub="Across all members"
              icon={Calendar}
              tone="violet"
            />
          </section>

          <div>
            <h3 className="text-sm font-semibold text-white">Plans at a glance</h3>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              {data.subscriptions.plans.map((p, i) => (
                <Card
                  key={p.title}
                  className={i === 0 ? "border-sky-400/40" : undefined}
                >
                  <p className="text-[11px] text-gray-500">
                    {i === 0 ? "Most popular plan" : i === 1 ? "Growing steadily" : "Highest lifetime value"}
                  </p>
                  <p className="mt-1 font-semibold text-white">{p.title}</p>
                  <p className="mt-3 text-2xl font-semibold text-white">{n(p.subscribers)}</p>
                  <p className="text-[11px] text-gray-500">subscribers</p>
                  <p className="mt-2 font-semibold text-amber-200">{inrCompact(p.revenuePaise)}</p>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                    <div
                      className={`h-full rounded-full ${i === 0 ? "bg-sky-400" : i === 1 ? "bg-violet-400" : "bg-emerald-400"}`}
                      style={{ width: `${p.barPct}%` }}
                    />
                  </div>
                  <p className="mt-1 text-[10px] text-gray-500">{p.sharePct}% of subscriber base</p>
                </Card>
              ))}
              {!data.subscriptions.plans.length ? (
                <p className="text-sm text-gray-600">No active subscriptions yet.</p>
              ) : null}
            </div>
          </div>

          <Card>
            <h3 className="mb-3 text-sm font-semibold text-white">Subscriber directory</h3>
            <div className="overflow-auto">
              <table className="w-full min-w-[900px] text-left text-[11px]">
                <thead className="text-[10px] uppercase text-gray-500">
                  <tr>
                    <th className="pb-2">Subscriber</th>
                    <th className="pb-2">Plan</th>
                    <th className="pb-2">Purchase</th>
                    <th className="pb-2">Expiry</th>
                    <th className="pb-2">Courses</th>
                    <th className="pb-2">Completed</th>
                    <th className="pb-2">Certificates</th>
                    <th className="pb-2">Last login</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {data.subscriptions.directory.map((s) => (
                    <tr key={s.email + s.plan}>
                      <td className="py-2.5">
                        <div className="flex items-center gap-2">
                          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-500/20 text-[10px] font-semibold text-violet-200">
                            {initials(s.name)}
                          </span>
                          <div>
                            <p className="font-medium text-white">{s.name}</p>
                            <p className="font-mono text-[10px] text-gray-500">{s.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5">
                        <span className="rounded-full bg-sky-500/15 px-2 py-0.5 text-[10px] text-sky-200">
                          {s.plan}
                        </span>
                      </td>
                      <td className="py-2.5 text-gray-400">{fmtWhen(s.purchaseDate)}</td>
                      <td className="py-2.5 text-gray-400">{fmtWhen(s.expiryDate)}</td>
                      <td className="py-2.5 text-gray-300">{s.coursesAccessed}</td>
                      <td className="py-2.5 text-gray-300">{s.completed}</td>
                      <td className="py-2.5 text-emerald-300">{s.certificates} downloaded</td>
                      <td className="py-2.5 text-gray-400">{fmtWhen(s.lastLoginAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      ) : null}

      {data && tab === "corporate" && data.corporate ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="text-xl font-semibold text-white">Corporate clients</h2>
              <p className="text-sm text-gray-400">
                Overview of company accounts, employee learning, and training ROI.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate?.("Organization Team")}
              className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-gray-300 hover:bg-white/5"
            >
              <Download className="h-3.5 w-3.5" /> Export report
            </button>
          </div>

          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Kpi
              label="Corporate clients"
              value={n(data.corporate.kpis.clients)}
              sub="Active accounts"
              icon={Building2}
              tone="sky"
            />
            <Kpi
              label="Employees enrolled"
              value={n(data.corporate.kpis.employeesEnrolled)}
              sub="Across all accounts"
              icon={Users}
              tone="violet"
            />
            <Kpi
              label="Corporate revenue"
              value={inrCompact(data.corporate.kpis.corporateRevenuePaise)}
              sub={`${data.corporate.kpis.revenueSharePct}% of lifetime revenue`}
              icon={Wallet}
              tone="emerald"
            />
            <Kpi
              label="Avg. completion"
              value={`${data.corporate.kpis.avgCompletionPct}%`}
              sub="Across client accounts"
              icon={Target}
              tone="amber"
            />
          </section>

          <Card>
            <div className="mb-3 flex items-center gap-2">
              <h3 className="text-sm font-semibold text-white">Company portfolio</h3>
              <span className="rounded-full bg-sky-500/15 px-2 py-0.5 text-[10px] text-sky-200">
                {n(data.corporate.kpis.clients)} active clients
              </span>
            </div>
            <div className="overflow-auto">
              <table className="w-full min-w-[800px] text-left text-[11px]">
                <thead className="text-[10px] uppercase text-gray-500">
                  <tr>
                    <th className="pb-2">Company</th>
                    <th className="pb-2">Employees</th>
                    <th className="pb-2">Assigned courses</th>
                    <th className="pb-2">Active learners</th>
                    <th className="pb-2">Completion</th>
                    <th className="pb-2">Certificates</th>
                    <th className="pb-2 text-right">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {data.corporate.portfolio.map((c) => (
                    <tr key={c.company + c.employees}>
                      <td className="py-2.5 font-medium text-white">{c.company}</td>
                      <td className="py-2.5 text-gray-300">{n(c.employees)}</td>
                      <td className="py-2.5 text-gray-300">{c.assignedCourses}</td>
                      <td className="py-2.5 text-gray-300">{n(c.activeLearners)}</td>
                      <td className="py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-white/10">
                            <div
                              className="h-full rounded-full bg-emerald-400"
                              style={{ width: `${c.completionPct}%` }}
                            />
                          </div>
                          <span>{c.completionPct}%</span>
                        </div>
                      </td>
                      <td className="py-2.5 text-gray-300">{n(c.certificates)}</td>
                      <td className="py-2.5 text-right font-semibold text-amber-200">
                        {inrCompact(c.revenuePaise)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <section className="grid gap-3 lg:grid-cols-2">
            {data.corporate.workforce ? (
              <Card>
                <h3 className="text-sm font-semibold text-white">
                  {data.corporate.workforce.company} · workforce
                </h3>
                <p className="mb-4 text-[11px] text-gray-500">Employee learning status</p>
                <div className="flex h-3 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="bg-emerald-400"
                    style={{
                      width: `${Math.max(
                        4,
                        Math.round(
                          (data.corporate.workforce.completed /
                            Math.max(
                              1,
                              data.corporate.workforce.completed +
                                data.corporate.workforce.inProgress +
                                data.corporate.workforce.inactive,
                            )) *
                            100,
                        ),
                      )}%`,
                    }}
                  />
                  <div
                    className="bg-sky-400"
                    style={{
                      width: `${Math.max(
                        4,
                        Math.round(
                          (data.corporate.workforce.inProgress /
                            Math.max(
                              1,
                              data.corporate.workforce.completed +
                                data.corporate.workforce.inProgress +
                                data.corporate.workforce.inactive,
                            )) *
                            100,
                        ),
                      )}%`,
                    }}
                  />
                  <div className="flex-1 bg-amber-400" />
                </div>
                <div className="mt-3 flex flex-wrap gap-4 text-[11px]">
                  <span className="text-emerald-300">
                    {n(data.corporate.workforce.completed)} Completed
                  </span>
                  <span className="text-sky-300">
                    {n(data.corporate.workforce.inProgress)} In progress
                  </span>
                  <span className="text-amber-300">
                    {n(data.corporate.workforce.inactive)} Inactive
                  </span>
                </div>
                <p className="mt-3 text-[11px] text-gray-500">
                  Employees enrolled in {data.corporate.workforce.assignedCourses} assigned courses.
                </p>
              </Card>
            ) : null}
            <Card>
              <h3 className="text-sm font-semibold text-white">Employee tracking</h3>
              <p className="mb-3 text-[11px] text-gray-500">Recent learning activity in accounts</p>
              <div className="overflow-auto">
                <table className="w-full text-left text-[11px]">
                  <thead className="text-[10px] uppercase text-gray-500">
                    <tr>
                      <th className="pb-2">Employee</th>
                      <th className="pb-2">Course</th>
                      <th className="pb-2">Progress</th>
                      <th className="pb-2">Certificate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {data.corporate.employeeTracking.map((e, i) => (
                      <tr key={`${e.employee}-${i}`}>
                        <td className="py-2 text-white">{e.employee}</td>
                        <td className="py-2 text-gray-400">{e.course}</td>
                        <td className="py-2 text-gray-300">{e.progress}%</td>
                        <td className="py-2">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] ${
                              e.certificate === "Issued"
                                ? "bg-emerald-500/15 text-emerald-300"
                                : "bg-amber-500/15 text-amber-300"
                            }`}
                          >
                            {e.certificate}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {!data.corporate.employeeTracking.length ? (
                      <tr>
                        <td colSpan={4} className="py-4 text-gray-600">
                          No employee activity yet.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </Card>
          </section>
        </div>
      ) : null}

      {data && tab === "training" ? (
        <div className="space-y-4">
          <section className="grid gap-3 lg:grid-cols-2">
            <Card className="border-sky-400/20">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Video className="h-4 w-4 text-sky-300" />
                  <h3 className="font-semibold text-white">Self paced training</h3>
                </div>
                <span className="rounded-full bg-sky-500/15 px-2 py-0.5 text-[10px] text-sky-200">
                  ON-DEMAND
                </span>
              </div>
              <p className="mt-1 text-[11px] text-gray-500">
                Learn independently, at any time and from anywhere.
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3 text-[11px]">
                <div>
                  <p className="text-gray-500">Courses</p>
                  <p className="text-lg font-semibold text-white">{n(data.training.selfPaced.courses)}</p>
                </div>
                <div>
                  <p className="text-gray-500">Learners</p>
                  <p className="text-lg font-semibold text-white">{n(data.training.selfPaced.learners)}</p>
                </div>
                <div>
                  <p className="text-gray-500">Completion</p>
                  <p className="text-lg font-semibold text-white">
                    {data.training.selfPaced.completionPct}%
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Revenue</p>
                  <p className="text-lg font-semibold text-amber-200">
                    {inrCompact(data.training.selfPaced.revenuePaise)}
                  </p>
                </div>
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-sky-400"
                  style={{ width: `${Math.max(4, data.training.selfPaced.completionPct)}%` }}
                />
              </div>
              <p className="mt-1 text-[10px] text-gray-500">
                {data.training.selfPaced.completionPct}% completion rate
              </p>
            </Card>

            <Card className="border-emerald-400/20">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-emerald-300" />
                  <h3 className="font-semibold text-white">Live tutor led training</h3>
                </div>
                <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] text-emerald-200">
                  INSTRUCTOR-LED
                </span>
              </div>
              <p className="mt-1 text-[11px] text-gray-500">
                Interactive sessions guided by expert trainers.
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3 text-[11px]">
                <div>
                  <p className="text-gray-500">Courses</p>
                  <p className="text-lg font-semibold text-white">
                    {n(data.training.liveTutorLed.courses)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Learners</p>
                  <p className="text-lg font-semibold text-white">
                    {n(data.training.liveTutorLed.learners)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Completion</p>
                  <p className="text-lg font-semibold text-white">
                    {data.training.liveTutorLed.completionPct}%
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Revenue</p>
                  <p className="text-lg font-semibold text-amber-200">
                    {inrCompact(data.training.liveTutorLed.revenuePaise)}
                  </p>
                </div>
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-emerald-400"
                  style={{ width: `${Math.max(4, data.training.liveTutorLed.completionPct)}%` }}
                />
              </div>
              <p className="mt-1 text-[10px] text-gray-500">
                {data.training.liveTutorLed.completionPct}% completion rate
              </p>
            </Card>
          </section>

          <section className="grid gap-3 lg:grid-cols-2">
            <Card>
              <h3 className="text-sm font-semibold text-white">Completion comparison</h3>
              <p className="mb-2 text-[11px] text-gray-500">Learning outcomes by delivery format</p>
              <AxisBarChart
                data={[
                  { label: "Self paced", value: data.training.selfPaced.completionPct },
                  { label: "Live tutor led", value: data.training.liveTutorLed.completionPct },
                ]}
                color="#34d399"
                format="percent"
                yLabel="Completion %"
                xLabel="Training mode"
              />
            </Card>
            <Card>
              <h3 className="text-sm font-semibold text-white">Revenue mix</h3>
              <p className="mb-3 text-[11px] text-gray-500">Lifetime revenue by training format</p>
              <DonutChart
                centerLabel="Total"
                centerValue={inrCompact(
                  data.training.selfPaced.revenuePaise + data.training.liveTutorLed.revenuePaise,
                )}
                slices={[
                  {
                    label: "Self paced",
                    value: data.training.selfPaced.revenuePaise,
                    color: "#38bdf8",
                  },
                  {
                    label: "Live tutor led",
                    value: data.training.liveTutorLed.revenuePaise,
                    color: "#34d399",
                  },
                ]}
              />
            </Card>
          </section>

          <Card>
            <h3 className="text-sm font-semibold text-white">Batch analytics</h3>
            <p className="mb-3 text-[11px] text-gray-500">
              Monitor attendance and completion for active cohorts
            </p>
            <div className="overflow-auto">
              <table className="w-full min-w-[700px] text-left text-[11px]">
                <thead className="text-[10px] uppercase text-gray-500">
                  <tr>
                    <th className="pb-2">Batch name</th>
                    <th className="pb-2">Trainer</th>
                    <th className="pb-2">Students</th>
                    <th className="pb-2">Attendance</th>
                    <th className="pb-2">Completion</th>
                    <th className="pb-2">Mode</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {data.training.batches.length ? (
                    data.training.batches.map((b) => (
                      <tr key={b.name}>
                        <td className="py-2.5 font-medium text-white">{b.name}</td>
                        <td className="py-2.5 text-gray-400">{b.trainer}</td>
                        <td className="py-2.5 text-gray-300">{b.students}</td>
                        <td className="py-2.5 text-gray-300">{b.attendance}%</td>
                        <td className="py-2.5">
                          <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-emerald-300">
                            {b.completion}%
                          </span>
                        </td>
                        <td className="py-2.5 text-gray-400">{b.mode}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-gray-600">
                        No active batches yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      ) : null}

      {data && tab === "insights" ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-xl font-semibold text-white">AI business insights</h2>
            <span className="inline-flex items-center gap-1 rounded-full border border-violet-400/30 bg-violet-500/10 px-2.5 py-1 text-[11px] text-violet-200">
              <Sparkles className="h-3 w-3" /> Live insights
            </span>
          </div>
          <div className="rounded-2xl border border-sky-400/20 bg-gradient-to-r from-[#0b1a3a] to-[#12284f] p-6">
            <p className="text-lg font-semibold tracking-wide text-white">
              YOUR BUSINESS, AT A GLANCE.
            </p>
            <p className="mt-1 text-sm text-sky-100/80">From data to decisive action.</p>
            <p className="mt-2 max-w-xl text-[11px] text-sky-100/60">
              Surfaces opportunities and risks from live LMS data for{" "}
              {isOrg ? "organisation" : "individual"} learning.
            </p>
          </div>
          <p className="text-[11px] uppercase tracking-wider text-gray-500">
            Insights for you · {data.insights.length}
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            {data.insights.map((ins) => (
              <article
                key={ins.badge + ins.headline}
                className={`rounded-2xl border p-4 ${insightTone[ins.kind] ?? "border-white/10 bg-[#0d1528]"}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <Sparkles className={`h-4 w-4 ${insightMetric[ins.kind] ?? "text-gray-400"}`} />
                  <span className="rounded-full bg-black/30 px-2 py-0.5 text-[10px] font-semibold text-gray-300">
                    {ins.badge}
                  </span>
                </div>
                <p className={`mt-3 text-3xl font-semibold ${insightMetric[ins.kind] ?? "text-white"}`}>
                  {ins.metric}
                </p>
                <p className="mt-2 font-semibold text-white">{ins.headline}</p>
                <p className="mt-1 text-[11px] leading-relaxed text-gray-400">{ins.body}</p>
                <button
                  type="button"
                  onClick={() => onNavigate?.(ins.hrefMenu)}
                  className={`mt-3 inline-flex items-center gap-1 text-[11px] font-medium hover:underline ${insightMetric[ins.kind] ?? "text-sky-300"}`}
                >
                  {ins.action} <ArrowRight className="h-3 w-3" />
                </button>
              </article>
            ))}
          </div>
        </div>
      ) : null}

      {data ? (
        <p className="text-[10px] text-gray-600">
          {isOrg ? "Organization" : "Individual"} analytics · updated{" "}
          {new Date(data.generatedAt).toLocaleString("en-IN")}
        </p>
      ) : null}
    </div>
  );
}
