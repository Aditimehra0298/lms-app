"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Award,
  ClipboardCheck,
  Download,
  Loader2,
  RefreshCw,
  Search,
} from "lucide-react";
import { getLearnerEmail } from "@/lib/learner-session-client";
import type { SkillsAssessmentRow } from "@/lib/admin-skills-assessment-types";

type Stats = {
  total: number;
  moduleExams: number;
  courseCompletions: number;
  certificates: number;
  passed: number;
  failed: number;
};

type TypeFilter = "all" | "module_exam" | "course_completion" | "certificate";
type StatusFilter = "all" | "passed" | "failed" | "completed" | "ready" | "pending";

function formatWhen(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function typeLabel(t: SkillsAssessmentRow["assessmentType"]): string {
  if (t === "module_exam") return "Module exam";
  if (t === "course_completion") return "Course complete";
  return "Certificate";
}

type CourseOption = { slug: string; title: string };

export default function AdminGlobalSkillsAssessmentsWorkspace() {
  const [rows, setRows] = useState<SkillsAssessmentRow[]>([]);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [courseFilter, setCourseFilter] = useState<string>("all");

  const adminHeaders = useCallback((): Record<string, string> => {
    const email = getLearnerEmail();
    return {
      ...(email ? { "x-admin-email": email } : {}),
    };
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: "1000" });
      if (searchQuery.trim()) params.set("q", searchQuery.trim());
      if (typeFilter !== "all") params.set("type", typeFilter);
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (courseFilter !== "all") params.set("course", courseFilter);

      const res = await fetch(`/api/admin/skills-assessments?${params}`, {
        cache: "no-store",
        headers: adminHeaders(),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        assessments?: SkillsAssessmentRow[];
        courses?: CourseOption[];
        stats?: Stats;
        message?: string;
      };
      if (!res.ok || !data.ok) {
        setError(data.message ?? "Could not load assessments.");
        setRows([]);
        setStats(null);
        return;
      }
      setRows(data.assessments ?? []);
      setCourses(data.courses ?? []);
      setStats(data.stats ?? null);
    } catch {
      setError("Network error while loading assessments database.");
    } finally {
      setLoading(false);
    }
  }, [searchQuery, typeFilter, statusFilter, courseFilter, adminHeaders]);

  useEffect(() => {
    void load();
  }, [load]);

  const skillAreas = useMemo(() => {
    const set = new Set(rows.map((r) => r.skillArea).filter(Boolean));
    return Array.from(set).sort();
  }, [rows]);

  const exportCsv = () => {
    const cols = [
      "Learner",
      "Email",
      "Reg ID",
      "Skill area",
      "Course",
      "Assessment",
      "Type",
      "Score %",
      "Passed",
      "Status",
      "Certificate #",
      "Assessed at",
    ];
    const esc = (v: string) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const lines = [
      cols.map(esc).join(","),
      ...rows.map((r) =>
        [
          r.learnerName ?? "",
          r.learnerEmail,
          r.registrationId != null ? String(r.registrationId) : "",
          r.skillArea,
          r.courseTitle,
          r.assessmentTitle,
          typeLabel(r.assessmentType),
          r.scorePercent != null ? String(r.scorePercent) : "",
          r.passed == null ? "" : r.passed ? "yes" : "no",
          r.status,
          r.certificateNumber ?? "",
          r.assessedAt ?? "",
        ]
          .map(esc)
          .join(","),
      ),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sft-global-skills-assessments-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-[#0c1428] via-[#0a101c] to-[#070b14]">
        <div className="border-b border-white/[0.06] bg-violet-500/[0.07] px-4 py-5 sm:px-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex gap-4">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-violet-500/20 ring-1 ring-violet-400/30">
                <ClipboardCheck className="h-6 w-6 text-violet-200" aria-hidden />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-violet-300/90">
                  SFT database
                </p>
                <h1 className="mt-1 text-xl font-bold text-white sm:text-2xl">
                  Global Skills Assessments
                </h1>
                <p className="mt-2 max-w-2xl text-xs leading-relaxed text-gray-400">
                  Central SFT Global Skills Assessments database: module exams, course completions,
                  and certificates — including foundation courses such as{" "}
                  <span className="text-gray-300">GDPR EU Data Protection Foundation</span> and all
                  other published programmes.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={exportCsv}
                disabled={!rows.length}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-gray-200 hover:bg-white/10 disabled:opacity-40"
              >
                <Download className="h-3.5 w-3.5" />
                Export CSV
              </button>
              <button
                type="button"
                onClick={() => void load()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#f5b942] px-3 py-2 text-xs font-semibold text-black"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </button>
            </div>
          </div>
        </div>

        {stats ? (
          <div className="grid gap-3 border-b border-white/[0.06] p-4 sm:grid-cols-2 lg:grid-cols-6">
            {[
              ["Total records", stats.total, "text-white"],
              ["Module exams", stats.moduleExams, "text-sky-200"],
              ["Completions", stats.courseCompletions, "text-emerald-200"],
              ["Certificates", stats.certificates, "text-amber-200"],
              ["Passed", stats.passed, "text-emerald-300"],
              ["Failed", stats.failed, "text-rose-300"],
            ].map(([label, value, tone]) => (
              <article
                key={String(label)}
                className="rounded-xl border border-white/10 bg-black/20 px-3 py-2.5"
              >
                <p className="text-[10px] uppercase tracking-wide text-gray-500">{label}</p>
                <p className={`mt-1 text-xl font-semibold ${tone}`}>{value}</p>
              </article>
            ))}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-2 p-4">
          <div className="inline-flex min-w-[220px] flex-1 items-center gap-2 rounded-lg border border-white/10 bg-black/30 px-2.5 py-2 text-xs">
            <Search className="h-3.5 w-3.5 text-gray-500" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search email, name, course (e.g. foundation), skill, certificate…"
              className="w-full bg-transparent outline-none placeholder:text-gray-600"
            />
          </div>
          <select
            value={courseFilter}
            onChange={(e) => setCourseFilter(e.target.value)}
            className="max-w-[260px] rounded-lg border border-white/10 bg-black/30 px-2.5 py-2 text-xs outline-none"
          >
            <option value="all">All courses</option>
            {courses.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.title}
              </option>
            ))}
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
            className="rounded-lg border border-white/10 bg-black/30 px-2.5 py-2 text-xs outline-none"
          >
            <option value="all">All types</option>
            <option value="module_exam">Module exams</option>
            <option value="course_completion">Course completions</option>
            <option value="certificate">Certificates</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="rounded-lg border border-white/10 bg-black/30 px-2.5 py-2 text-xs outline-none"
          >
            <option value="all">All statuses</option>
            <option value="passed">Passed</option>
            <option value="failed">Failed</option>
            <option value="completed">Completed</option>
            <option value="ready">Certificate ready</option>
            <option value="pending">Pending</option>
          </select>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs text-rose-100">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-gray-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading assessments database…
        </div>
      ) : (
        <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#0d1528]">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <p className="text-xs text-gray-400">
              Showing <span className="font-semibold text-white">{rows.length}</span> record
              {rows.length === 1 ? "" : "s"}
              {skillAreas.length ? (
                <span className="text-gray-600"> · {skillAreas.length} skill area(s)</span>
              ) : null}
            </p>
            <Award className="h-4 w-4 text-amber-300/70" aria-hidden />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-left text-xs">
              <thead className="bg-white/[0.03] text-[10px] uppercase tracking-wide text-gray-500">
                <tr>
                  {[
                    "Learner",
                    "Skill area",
                    "Course",
                    "Assessment",
                    "Type",
                    "Score",
                    "Result",
                    "Status",
                    "Certificate",
                    "Assessed",
                  ].map((h) => (
                    <th key={h} className="whitespace-nowrap px-3 py-2.5 font-semibold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-3 py-10 text-center text-gray-500">
                      No assessment records yet. Results appear when learners take module exams or
                      earn certificates.
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => (
                    <tr key={r.id} className="hover:bg-white/[0.02]">
                      <td className="px-3 py-2.5">
                        <p className="font-medium text-gray-200">{r.learnerName || "—"}</p>
                        <p className="text-[10px] text-gray-500">{r.learnerEmail}</p>
                        {r.registrationId != null ? (
                          <p className="font-mono text-[10px] text-amber-200/70">
                            Reg {r.registrationId}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-3 py-2.5 text-violet-200/90">{r.skillArea}</td>
                      <td className="px-3 py-2.5">
                        <p className="text-gray-200">{r.courseTitle}</p>
                        <p className="font-mono text-[10px] text-gray-600">{r.courseSlug}</p>
                      </td>
                      <td className="px-3 py-2.5 text-gray-300">{r.assessmentTitle}</td>
                      <td className="px-3 py-2.5 text-gray-400">{typeLabel(r.assessmentType)}</td>
                      <td className="px-3 py-2.5 font-semibold text-gray-200">
                        {r.scorePercent != null ? `${r.scorePercent}%` : "—"}
                      </td>
                      <td className="px-3 py-2.5">
                        {r.passed == null ? (
                          "—"
                        ) : (
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                              r.passed
                                ? "bg-emerald-500/20 text-emerald-300"
                                : "bg-rose-500/20 text-rose-300"
                            }`}
                          >
                            {r.passed ? "Pass" : "Fail"}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 capitalize text-gray-400">{r.status}</td>
                      <td className="px-3 py-2.5 font-mono text-[10px] text-amber-200/80">
                        {r.certificateNumber || "—"}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-gray-500">
                        {formatWhen(r.assessedAt)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
