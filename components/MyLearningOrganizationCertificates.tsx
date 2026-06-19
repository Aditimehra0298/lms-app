"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Award, Download, FileText, Search, Share2, Users } from "lucide-react";
import type { ManagedCourse } from "@/lib/content-schema";
import type { TutorLedExploreCard, TutorLedLiveHubRow } from "@/lib/tutor-led-live-hub-enrich";
import {
  buildOrganizationTeamCertificates,
  buildOrganizationTeamProgress,
  buildOrganizationTeamTutorProgress,
  mergeOrganizationTeamCertificates,
  type OrgTeamCertificateRow,
} from "@/lib/organization-team-progress";

type Props = {
  courses: ManagedCourse[];
  tutorEnrollments: TutorLedLiveHubRow[];
  tutorExplore: TutorLedExploreCard[];
  companySize?: string | null;
};

const surface = "rounded-xl border border-white/[0.07] bg-[#101018]";

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function statusBadge(status: OrgTeamCertificateRow["status"]) {
  if (status === "ready") {
    return (
      <span className="inline-flex rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-300 ring-1 ring-emerald-500/25">
        Ready
      </span>
    );
  }
  return (
    <span className="inline-flex rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[10px] font-semibold text-amber-200 ring-1 ring-amber-500/25">
      Pending
    </span>
  );
}

export function MyLearningOrganizationCertificates({
  courses,
  tutorEnrollments,
  tutorExplore,
  companySize,
}: Props) {
  const [query, setQuery] = useState("");

  const certificates = useMemo(() => {
    const selfPaced = buildOrganizationTeamProgress(courses, companySize);
    const tutorLed = buildOrganizationTeamTutorProgress(tutorEnrollments, tutorExplore, companySize);
    const fromProgress = buildOrganizationTeamCertificates(selfPaced, tutorLed);
    return mergeOrganizationTeamCertificates(fromProgress, true);
  }, [courses, tutorEnrollments, tutorExplore, companySize]);

  const filtered = certificates.filter((c) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      c.employeeName.toLowerCase().includes(q) ||
      c.employeeUserId.toLowerCase().includes(q) ||
      c.employeeEmail.toLowerCase().includes(q) ||
      c.courseTitle.toLowerCase().includes(q) ||
      c.certificateNumber.toLowerCase().includes(q) ||
      c.delegateNumber.toLowerCase().includes(q)
    );
  });

  const readyCount = certificates.filter((c) => c.status === "ready").length;
  const pendingCount = certificates.filter((c) => c.status === "pending").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold md:text-4xl">Team Certificate Records</h1>
        <p className="mt-2 max-w-2xl text-sm text-gray-400">
          Same certificate pattern as individual learners —{" "}
          <span className="font-mono text-xs text-amber-200/90">
            YYYY-MM-courseId-trainingId/userId
          </span>{" "}
          and delegate{" "}
          <span className="font-mono text-xs text-amber-200/90">YYYY-verifyNumber-userId</span>. One
          PDF per employee when they complete a program.
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-4">
        {[
          [Users, String(certificates.length), "Total records"],
          [Award, String(readyCount), "Ready to download"],
          [FileText, String(pendingCount), "Pending generation"],
          [
            Award,
            String(certificates.filter((c) => c.deliveryKind === "tutor-led").length),
            "Tutor-led certs",
          ],
        ].map(([Icon, value, label]) => {
          const StatIcon = Icon as typeof Users;
          return (
            <article key={label as string} className={`p-3 ${surface}`}>
              <StatIcon size={15} className="text-amber-400/80" />
              <p className="mt-2 text-2xl font-semibold text-white">{value as string}</p>
              <p className="text-[11px] text-zinc-500">{label as string}</p>
            </article>
          );
        })}
      </div>

      <div className="rounded-xl border border-violet-500/25 bg-violet-500/10 px-4 py-3 text-sm text-violet-100/90">
        <span className="font-semibold text-violet-200">Sample preview</span>
        <span className="text-violet-200/80">
          {" "}
          — table below shows example team certificate records (ready + pending) so you can review the
          layout before live employee data is connected.
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" aria-hidden />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, user ID, email, course, or certificate number…"
            className="w-full rounded-lg border border-white/10 bg-black/40 py-2 pl-9 pr-3 text-sm text-white outline-none focus:border-violet-500/40"
          />
        </div>
        <p className="text-sm text-gray-500">
          <Award className="mr-1 inline h-4 w-4 text-amber-400" aria-hidden />
          {filtered.length} record{filtered.length === 1 ? "" : "s"}
        </p>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/15 px-6 py-12 text-center">
          <p className="text-gray-400">
            No team certificates yet. A certificate is issued for each employee when they complete an
            assigned program — same flow as individual learners.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/10 bg-black/30">
          <table className="w-full min-w-[1040px] text-left text-sm">
            <thead className="border-b border-white/10 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-3 py-3 font-semibold">Employee</th>
                <th className="px-3 py-3 font-semibold">Course / program</th>
                <th className="px-3 py-3 font-semibold">Type</th>
                <th className="px-3 py-3 font-semibold">Certificate no.</th>
                <th className="px-3 py-3 font-semibold">Delegate ID</th>
                <th className="px-3 py-3 font-semibold">Score</th>
                <th className="px-3 py-3 font-semibold">Status</th>
                <th className="px-3 py-3 font-semibold">Earned</th>
                <th className="px-3 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row.id} className="border-b border-white/5 last:border-0">
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2.5">
                      <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/5 text-[10px] font-bold text-zinc-400 ring-1 ring-white/10">
                        {initials(row.employeeName)}
                      </span>
                      <div className="min-w-0">
                        <p className="font-semibold text-white">{row.employeeName}</p>
                        <p className="font-mono text-[10px] text-amber-200/90">{row.employeeUserId}</p>
                        <p className="truncate text-[10px] text-gray-500">{row.employeeEmail}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <p className="font-medium text-white">{row.courseTitle}</p>
                    <p className="text-[10px] text-gray-500">ID {row.identificationNumber}</p>
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                        row.deliveryKind === "tutor-led"
                          ? "bg-violet-500/15 text-violet-200"
                          : "bg-sky-500/15 text-sky-200"
                      }`}
                    >
                      {row.deliveryKind === "tutor-led" ? "Tutor led" : "Self-paced"}
                    </span>
                  </td>
                  <td className="px-3 py-3 font-mono text-xs text-violet-200">{row.certificateNumber}</td>
                  <td className="px-3 py-3 font-mono text-[11px] text-amber-200/90">{row.delegateNumber}</td>
                  <td className="px-3 py-3 font-mono text-xs text-amber-100">
                    {row.scorePercent != null ? `${row.scorePercent}%` : "—"}
                  </td>
                  <td className="px-3 py-3">{statusBadge(row.status)}</td>
                  <td className="px-3 py-3 text-xs text-gray-400">{row.earnedDate}</td>
                  <td className="px-3 py-3 text-right">
                    {row.status === "ready" ? (
                      <div className="flex flex-wrap justify-end gap-1.5">
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 rounded-md border border-emerald-400/40 bg-emerald-500/10 px-2.5 py-1.5 text-[10px] font-semibold text-emerald-100"
                          title="Per-employee PDF — same generation flow as individual certificates"
                        >
                          <Download className="h-3 w-3" aria-hidden />
                          Get PDF
                        </button>
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 rounded-md border border-white/15 px-2.5 py-1.5 text-[10px] font-semibold text-gray-300"
                        >
                          <Share2 className="h-3 w-3" aria-hidden />
                          Share
                        </button>
                      </div>
                    ) : (
                      <p className="text-[10px] text-gray-500">Awaiting completion / exam</p>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-center text-xs text-gray-500">
        Demo roster data until org employee API is connected. Each completed employee receives their
        own certificate record — same pattern as{" "}
        <Link href="/my-learning?tab=certificates" className="text-amber-200 hover:underline">
          individual certificates
        </Link>
        .
      </p>
    </div>
  );
}
