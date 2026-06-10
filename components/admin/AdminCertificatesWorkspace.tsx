"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { AdminContent, ManagedCourse } from "@/lib/content-schema";
import { defaultAdminContent } from "@/lib/content-schema";
import AdminGlobalCertificatesPanel from "@/components/admin/AdminGlobalCertificatesPanel";
import type { AdminCertificateCourseOption } from "@/components/admin/AdminCourseCertificateApprovals";

function isSelfPaced(c: ManagedCourse): boolean {
  return !c.learningFormat || c.learningFormat === "self-paced";
}

/** Certificates under Users & Access — templates + all issued certs (no course required). */
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
    const selfPaced = (content?.managedCourses ?? []).filter(isSelfPaced).map((c) => ({
      slug: c.slug,
      title: c.title?.trim() || c.slug,
    }));
    const tutorLed = (content?.tutorLedPrograms ?? []).map((p) => ({
      slug: p.slug,
      title: `${p.title?.trim() || p.slug} (Tutor-led)`,
    }));
    const bySlug = new Map<string, AdminCertificateCourseOption>();
    for (const row of [...selfPaced, ...tutorLed]) {
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
      <p className="text-[11px] text-gray-500">
        Upload global defaults under <strong className="text-gray-400">All courses</strong>, or per-program samples in{" "}
        <strong className="text-gray-400">Self-paced → Certificate</strong> or{" "}
        <strong className="text-gray-400">Tutor Led → Certificate</strong>.
      </p>
    </div>
  );
}
