"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { AdminContent } from "@/lib/content-schema";
import { defaultAdminContent } from "@/lib/content-schema";
import AdminGlobalCertificatesPanel from "@/components/admin/AdminGlobalCertificatesPanel";
import type { AdminCertificateCourseOption } from "@/components/admin/AdminCourseCertificateApprovals";

/** Certificates under Users & Access — issue, review, and control learner access. */
export default function AdminCertificatesWorkspace() {
  const [content, setContent] = useState<AdminContent | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const res = await fetch("/api/admin/content", { cache: "no-store" });
      if (!res.ok) throw new Error(`Load failed (${res.status})`);
      const data = (await res.json()) as AdminContent;
      setContent(data);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Could not load admin content.");
      setContent(defaultAdminContent);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const certificateCourses = useMemo((): AdminCertificateCourseOption[] => {
    const selfPaced = (content?.managedCourses ?? []).map((c) => {
      const format =
        c.learningFormat === "interactive"
          ? "Interactive"
          : c.learningFormat === "live"
            ? "Live"
            : "Self-paced";
      return {
        slug: c.slug,
        title: `${c.title?.trim() || c.slug} (${format})`,
      };
    });
    const livePrograms = (content?.tutorLedPrograms ?? []).map((p) => {
      const kind = p.programKind === "workshop" ? "Workshop" : "Tutor-led";
      return {
        slug: p.slug,
        title: `${p.title?.trim() || p.slug} (${kind})`,
      };
    });
    const bySlug = new Map<string, AdminCertificateCourseOption>();
    for (const row of [...selfPaced, ...livePrograms]) {
      if (!bySlug.has(row.slug)) bySlug.set(row.slug, row);
    }
    return [...bySlug.values()].sort((a, b) => a.title.localeCompare(b.title));
  }, [content]);

  if (!content && !loadError) {
    return (
      <p className="rounded-xl border border-white/10 bg-[#0b1224] px-4 py-8 text-center text-sm text-gray-400">
        Loading certificates…
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {loadError ? (
        <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
          {loadError}
        </p>
      ) : null}
      <AdminGlobalCertificatesPanel certificateCourses={certificateCourses} />
    </div>
  );
}
