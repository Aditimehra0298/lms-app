"use client";

import { useMemo, useState } from "react";
import { Award } from "lucide-react";
import AdminCourseCertificateApprovals, {
  type AdminCertificateCourseOption,
} from "@/components/admin/AdminCourseCertificateApprovals";
import AdminCertificateTemplatesEditor from "@/components/admin/AdminCertificateTemplatesEditor";
import { AdminPanelSection } from "@/components/admin/AdminCourseTabShell";

/** All courses — shared template upload + full certificate list. */
export const ALL_COURSES_CERT_VALUE = "__all__";

type Props = {
  certificateCourses: AdminCertificateCourseOption[];
};

/** Certificates admin: course first, then design upload, then learner list. */
export default function AdminGlobalCertificatesPanel({ certificateCourses }: Props) {
  const [selectedCourse, setSelectedCourse] = useState("");

  const sortedCourses = useMemo(
    () => [...certificateCourses].sort((a, b) => a.title.localeCompare(b.title)),
    [certificateCourses],
  );

  const selectedTitle = useMemo(() => {
    if (selectedCourse === ALL_COURSES_CERT_VALUE) return "All courses";
    return sortedCourses.find((c) => c.slug === selectedCourse)?.title ?? "";
  }, [selectedCourse, sortedCourses]);

  const isAllCourses = selectedCourse === ALL_COURSES_CERT_VALUE;
  const hasCourse = selectedCourse.length > 0;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-white/10 bg-[#0b1224] p-4">
        <h2 className="flex items-center gap-2 text-xl font-semibold text-white">
          <Award className="h-6 w-6 text-amber-300" aria-hidden />
          Certificates
        </h2>
        <p className="mt-1 max-w-2xl text-xs leading-relaxed text-gray-400">
          Start by choosing a course. Use <strong className="text-gray-300">All courses</strong> to set the shared
          certificate design (same layout for every course). Pick one course to view its learners only.
        </p>
      </div>

      <AdminPanelSection title="Choose course" step={1}>
        <label className="block text-[10px] font-semibold uppercase tracking-wide text-gray-500">
          Course
        </label>
        <select
          value={selectedCourse}
          onChange={(e) => setSelectedCourse(e.target.value)}
          className="mt-1 w-full max-w-lg rounded-lg border border-white/15 bg-[#0a1020] px-3 py-2.5 text-sm text-white"
        >
          <option value="">— Select a course —</option>
          <option value={ALL_COURSES_CERT_VALUE}>All courses (shared certificate design)</option>
          {sortedCourses.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.title}
            </option>
          ))}
        </select>
        {!hasCourse ? (
          <p className="mt-3 text-xs text-amber-200/90">
            Select a course above to continue with certificate design or issued certificates.
          </p>
        ) : (
          <p className="mt-2 text-xs text-gray-500">
            Working on: <strong className="text-gray-300">{selectedTitle}</strong>
          </p>
        )}
      </AdminPanelSection>

      {hasCourse && isAllCourses ? (
        <AdminPanelSection title="Certificate design (shared for every course)" step={2}>
          <div className="mb-4 rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-100">
            Steps 2–3: choose certificate design, badge, or transcript — then upload. Saved once for{" "}
            <strong>all courses</strong>.
          </div>
          <AdminCertificateTemplatesEditor compact uploadStepOffset={2} />
        </AdminPanelSection>
      ) : null}

      {hasCourse && !isAllCourses ? (
        <div className="rounded-lg border border-violet-400/25 bg-violet-500/10 px-3 py-2 text-[11px] text-violet-100">
          Certificate design is shared for every course. To upload or change the template, select{" "}
          <strong>All courses (shared certificate design)</strong> in step 1.
        </div>
      ) : null}

      {hasCourse ? (
        <AdminPanelSection
          title={isAllCourses ? "Issued certificates (all courses)" : `Issued certificates — ${selectedTitle}`}
          step={isAllCourses ? 3 : 2}
        >
          <p className="mb-3 text-[11px] text-gray-500">
            Learner name, email, phone, certificate #, delegate #, and download access.
          </p>
          <AdminCourseCertificateApprovals
            courses={certificateCourses}
            courseSlug={isAllCourses ? "" : selectedCourse}
            hideCourseFilter
          />
        </AdminPanelSection>
      ) : null}
    </div>
  );
}
