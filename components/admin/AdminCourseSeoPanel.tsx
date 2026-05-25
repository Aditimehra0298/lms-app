"use client";

import Image from "next/image";
import { Search } from "lucide-react";
import type { ManagedCourse } from "@/lib/content-schema";
import { defaultSeoForCourse } from "@/lib/course-workspace-panels";
import AdminCourseTabShell, {
  AdminCourseSelectPrompt,
  AdminPanelSection,
} from "@/components/admin/AdminCourseTabShell";

const fieldClass =
  "mt-1.5 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none placeholder:text-gray-600 focus:border-violet-500/35";

type Props = {
  draft: ManagedCourse;
  setDraft: React.Dispatch<React.SetStateAction<ManagedCourse>>;
  canEdit: boolean;
  saving: boolean;
  onSave: () => void;
  onGoCourseInfo: () => void;
};

function patchSeo(draft: ManagedCourse, patch: Partial<NonNullable<ManagedCourse["seo"]>>): ManagedCourse["seo"] {
  return { ...(draft.seo ?? {}), ...patch };
}

export default function AdminCourseSeoPanel({
  draft,
  setDraft,
  canEdit,
  saving,
  onSave,
  onGoCourseInfo,
}: Props) {
  if (!canEdit) {
    return <AdminCourseSelectPrompt tabName="SEO" onGoCourseInfo={onGoCourseInfo} />;
  }

  const defaults = defaultSeoForCourse(draft);
  const seo = draft.seo ?? {};
  const previewTitle = seo.metaTitle?.trim() || defaults.metaTitle || draft.title;
  const previewDesc =
    seo.metaDescription?.trim() || defaults.metaDescription || draft.subtitle || "Course description…";
  const previewUrl = draft.slug ? `sftrainings.com › courses › ${draft.slug}` : "sftrainings.com › courses › …";

  return (
    <AdminCourseTabShell
      courseTitle={draft.title}
      tabTitle="SEO & sharing"
      description="How this course appears in Google search and when shared on LinkedIn, WhatsApp, etc. Leave fields empty to use sensible defaults from the course title and subtitle."
      icon={<Search className="h-6 w-6 text-sky-300" aria-hidden />}
      onSave={onSave}
      saving={saving}
      saveLabel="Save SEO"
      aside={
        <AdminPanelSection title="Google preview">
          <div className="rounded-lg border border-white/10 bg-white p-3 text-left">
            <p className="truncate text-[11px] text-[#202124]">{previewUrl}</p>
            <p className="mt-0.5 line-clamp-2 text-base font-medium text-[#1a0dab]">{previewTitle}</p>
            <p className="mt-0.5 line-clamp-3 text-[13px] leading-snug text-[#4d5156]">{previewDesc}</p>
          </div>
          {seo.noIndex ? (
            <p className="mt-2 text-[11px] text-amber-300/90">No-index is on — search engines should not list this page.</p>
          ) : null}
        </AdminPanelSection>
      }
    >
      <AdminPanelSection title="Search listing" step={1}>
        <label className="block">
          <span className="text-[11px] text-gray-500">Page title (browser tab &amp; Google)</span>
          <input
            value={seo.metaTitle ?? ""}
            onChange={(e) => setDraft((d) => ({ ...d, seo: patchSeo(d, { metaTitle: e.target.value }) }))}
            placeholder={defaults.metaTitle}
            className={fieldClass}
          />
          <p className="mt-1 text-[10px] text-gray-600">Aim for 50–60 characters. Empty uses course title.</p>
        </label>
        <label className="mt-3 block">
          <span className="text-[11px] text-gray-500">Meta description</span>
          <textarea
            value={seo.metaDescription ?? ""}
            onChange={(e) => setDraft((d) => ({ ...d, seo: patchSeo(d, { metaDescription: e.target.value }) }))}
            placeholder={defaults.metaDescription}
            rows={3}
            className={`${fieldClass} resize-y`}
          />
          <p className="mt-1 text-[10px] text-gray-600">Aim for 140–160 characters. Empty uses course subtitle.</p>
        </label>
        <label className="mt-3 block">
          <span className="text-[11px] text-gray-500">Focus keyword (internal reference)</span>
          <input
            value={seo.focusKeyword ?? ""}
            onChange={(e) => setDraft((d) => ({ ...d, seo: patchSeo(d, { focusKeyword: e.target.value }) }))}
            placeholder="e.g. HACCP food safety certification"
            className={fieldClass}
          />
        </label>
      </AdminPanelSection>

      <AdminPanelSection title="Social share image" step={2}>
        <label className="block">
          <span className="text-[11px] text-gray-500">Open Graph image URL</span>
          <input
            value={seo.ogImage ?? ""}
            onChange={(e) => setDraft((d) => ({ ...d, seo: patchSeo(d, { ogImage: e.target.value }) }))}
            placeholder={draft.image || "/course-food-safety.png"}
            className={`${fieldClass} font-mono text-[12px]`}
          />
        </label>
        {(seo.ogImage || draft.image)?.trim() ? (
          <div className="relative mt-3 aspect-[1.91/1] max-w-sm overflow-hidden rounded-lg border border-white/10">
            <Image
              src={seo.ogImage?.trim() || draft.image}
              alt="OG preview"
              fill
              unoptimized
              className="object-cover"
            />
          </div>
        ) : null}
      </AdminPanelSection>

      <AdminPanelSection title="Indexing" step={3}>
        <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2.5 text-xs">
          <span>
            <span className="font-medium text-amber-100">Hide from search engines (noindex)</span>
            <span className="mt-0.5 block text-[10px] text-gray-500">Use for drafts or private programs</span>
          </span>
          <input
            type="checkbox"
            checked={!!seo.noIndex}
            onChange={(e) => setDraft((d) => ({ ...d, seo: patchSeo(d, { noIndex: e.target.checked }) }))}
            className="accent-amber-500"
          />
        </label>
        <button
          type="button"
          onClick={() =>
            setDraft((d) => ({
              ...d,
              seo: defaultSeoForCourse(d),
            }))
          }
          className="mt-3 text-[11px] font-medium text-violet-300 hover:text-violet-200"
        >
          Reset SEO to defaults from course title
        </button>
      </AdminPanelSection>
    </AdminCourseTabShell>
  );
}
