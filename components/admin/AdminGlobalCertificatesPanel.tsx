"use client";

import { useMemo, useRef, useState } from "react";
import { Award, Cpu } from "lucide-react";
import AdminCourseCertificateApprovals, {
  type AdminCertificateCourseOption,
} from "@/components/admin/AdminCourseCertificateApprovals";
import AdminCertificateTemplatesEditor from "@/components/admin/AdminCertificateTemplatesEditor";
import AdminCertificateIssuePanel from "@/components/admin/AdminCertificateIssuePanel";
import { AdminPanelSection } from "@/components/admin/AdminCourseTabShell";

/** All courses — shared template upload + full certificate list. */
export const ALL_COURSES_CERT_VALUE = "__all__";

type Props = {
  certificateCourses: AdminCertificateCourseOption[];
};

/** Certificates admin: issue to users, designs, and control learner access. */
export default function AdminGlobalCertificatesPanel({ certificateCourses }: Props) {
  const [selectedCourse, setSelectedCourse] = useState(ALL_COURSES_CERT_VALUE);
  const listRefreshKey = useRef(0);
  const [, bump] = useState(0);

  const sortedCourses = useMemo(
    () => [...certificateCourses].sort((a, b) => a.title.localeCompare(b.title)),
    [certificateCourses],
  );

  const selectedTitle = useMemo(() => {
    if (selectedCourse === ALL_COURSES_CERT_VALUE) return "All programs";
    return sortedCourses.find((c) => c.slug === selectedCourse)?.title ?? "";
  }, [selectedCourse, sortedCourses]);

  const isAllCourses = selectedCourse === ALL_COURSES_CERT_VALUE;
  const hasCourse = selectedCourse.length > 0;

  const refreshList = () => {
    listRefreshKey.current += 1;
    bump((n) => n + 1);
  };

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-2xl border border-amber-400/20 bg-gradient-to-br from-[#16100a] via-[#0c1428] to-[#070b14]">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(251,191,36,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(251,191,36,0.5) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
          aria-hidden
        />
        <div className="relative border-b border-white/[0.06] px-4 py-5 sm:px-6">
          <div className="flex gap-4">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-amber-500/20 ring-1 ring-amber-400/35 shadow-[0_0_30px_rgba(245,158,11,0.2)]">
              <Award className="h-6 w-6 text-amber-200" aria-hidden />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-300/90">
                Users &amp; access
              </p>
              <h1 className="mt-1 text-xl font-bold text-white sm:text-2xl">Certificates control</h1>
              <p className="mt-2 max-w-2xl text-xs leading-relaxed text-gray-400">
                Issue certificates to specific learners, choose the program, and decide who can see or download
                them. Designs can use global defaults or per-program uploads.
              </p>
            </div>
          </div>
        </div>
        <div className="relative flex flex-wrap gap-2 px-4 py-3 text-[10px] sm:px-6">
          {[
            "Issue to any learner",
            "Show / hide access",
            "Self-paced · Tutor-led · Workshops",
          ].map((chip) => (
            <span
              key={chip}
              className="inline-flex items-center gap-1 rounded-full border border-amber-400/20 bg-amber-500/10 px-2.5 py-1 text-amber-100"
            >
              <Cpu className="h-3 w-3" aria-hidden />
              {chip}
            </span>
          ))}
        </div>
      </div>

      <AdminCertificateIssuePanel courses={certificateCourses} onIssued={refreshList} />

      <AdminPanelSection title="Review issued certificates" step={1}>
        <label className="block text-[10px] font-semibold uppercase tracking-wide text-gray-500">
          Filter by program
        </label>
        <select
          value={selectedCourse}
          onChange={(e) => setSelectedCourse(e.target.value)}
          className="mt-1 w-full max-w-lg rounded-lg border border-white/15 bg-[#0a1020] px-3 py-2.5 text-sm text-white"
        >
          <option value={ALL_COURSES_CERT_VALUE}>All programs</option>
          {sortedCourses.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.title}
            </option>
          ))}
        </select>
        <p className="mt-2 text-xs text-gray-500">
          Showing: <strong className="text-gray-300">{selectedTitle}</strong>
        </p>
      </AdminPanelSection>

      {hasCourse && isAllCourses ? (
        <AdminPanelSection title="Global certificate design (fallback)" step={2}>
          <div className="mb-4 rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-100">
            Used when a program has not uploaded its own certificate, badge, or transcript design.
          </div>
          <AdminCertificateTemplatesEditor compact uploadStepOffset={2} />
        </AdminPanelSection>
      ) : null}

      {hasCourse && !isAllCourses ? (
        <div className="rounded-lg border border-violet-400/25 bg-violet-500/10 px-3 py-2 text-[11px] text-violet-100">
          Per-program designs: edit under <strong>Self-paced courses → Certificate</strong> or{" "}
          <strong>Tutor Led / Workshops → Certificate</strong>.
        </div>
      ) : null}

      {hasCourse ? (
        <AdminPanelSection
          title={isAllCourses ? "All issued certificates" : `Issued — ${selectedTitle}`}
          step={isAllCourses ? 3 : 2}
        >
          <p className="mb-3 text-[11px] text-gray-500">
            Allow or block learner download access for each certificate.
          </p>
          <AdminCourseCertificateApprovals
            key={`${listRefreshKey.current}-${selectedCourse}`}
            courses={certificateCourses}
            courseSlug={isAllCourses ? "" : selectedCourse}
            hideCourseFilter
          />
        </AdminPanelSection>
      ) : null}
    </div>
  );
}
