"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import type {
  AdminContent,
  CategoryPageEditorConfig,
  CategoryPageLevelFilter,
  CategoryPageWhyItem,
  CategoryWhyTone,
  ManagedCourse,
} from "@/lib/content-schema";
import {
  canonicalCategorySlug,
  getCategoryEditorTemplate,
  getDefaultHeroImageForCategory,
  mergeCategoryPageConfig,
} from "@/lib/category-page-resolve";
import { Eye, X } from "lucide-react";

const TONES: CategoryWhyTone[] = ["amber", "emerald", "blue", "violet"];

/** Suggestions only — admins can type any Lucide export name (e.g. `ShieldCheck`). */
const LUCIDE_ICON_SUGGESTIONS = [
  "ScrollText",
  "Award",
  "Users",
  "Leaf",
  "BookOpen",
  "ShieldCheck",
  "GraduationCap",
  "Briefcase",
  "Building2",
  "HeartHandshake",
  "Globe2",
  "Sparkles",
  "BadgeCheck",
  "Microscope",
  "Factory",
];

type Props = {
  open: boolean;
  categorySlug: string;
  categoryTitle: string;
  onClose: () => void;
  /** Opens full-page iframe preview (stay in admin; no forced new window). */
  onOpenPreview?: (slug: string) => void;
};

export default function CategoryPageEditorModal({
  open,
  categorySlug,
  categoryTitle,
  onClose,
  onOpenPreview,
}: Props) {
  const [draft, setDraft] = useState<CategoryPageEditorConfig | null>(null);
  const [coursesInCategory, setCoursesInCategory] = useState<ManagedCourse[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);
  const [uploadingHero, setUploadingHero] = useState(false);

  useEffect(() => {
    if (!open || !categorySlug) return;
    setDraft(null);
    setCoursesInCategory([]);
    setLoadError(null);
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/content", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to load content");
        const data = (await res.json()) as AdminContent;
        if (cancelled) return;
        let merged: CategoryPageEditorConfig;
        try {
          merged = mergeCategoryPageConfig(categorySlug, data);
        } catch {
          merged = getCategoryEditorTemplate(categorySlug);
          setLoadError("Saved category settings were invalid; showing defaults.");
        }
        setDraft(merged);
        const key = canonicalCategorySlug(categorySlug);
        const list = (data.managedCourses ?? []).filter(
          (c) => canonicalCategorySlug(c.category) === key && c.published,
        );
        setCoursesInCategory(list);
      } catch {
        if (!cancelled) {
          setLoadError("Could not load admin content.");
          setDraft(getCategoryEditorTemplate(categorySlug));
          setCoursesInCategory([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, categorySlug]);

  const uploadHeroBanner = async (file: File) => {
    setUploadingHero(true);
    setLoadError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const data = (await res.json()) as { ok?: boolean; url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error ?? "Upload failed");
      setDraft((p) => (p ? { ...p, heroImage: data.url! } : p));
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Hero image upload failed.");
    } finally {
      setUploadingHero(false);
    }
  };

  const persist = async () => {
    if (!draft) return;
    setSaving(true);
    setLoadError(null);
    try {
      const res = await fetch("/api/admin/content", { cache: "no-store" });
      if (!res.ok) throw new Error("load");
      const full = (await res.json()) as AdminContent;
      const next: AdminContent = {
        ...full,
        categoryPages: {
          ...(full.categoryPages ?? {}),
          [categorySlug]: draft,
        },
      };
      const put = await fetch("/api/admin/content", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
      if (!put.ok) throw new Error("save");
      onClose();
    } catch {
      setLoadError("Save failed. Try again.");
    } finally {
      setSaving(false);
    }
  };

  const uploadInstructorPhoto = async (index: number, file: File) => {
    setUploadingIdx(index);
    setLoadError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const data = (await res.json()) as { ok?: boolean; url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error ?? "Upload failed");
      updateInstructor(index, "photo", data.url);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Image upload failed.");
    } finally {
      setUploadingIdx(null);
    }
  };

  if (!open) return null;

  if (!draft) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4">
        <p className="rounded-xl border border-white/15 bg-[#0b1224] px-6 py-4 text-sm text-gray-300">
          Loading editor…
        </p>
      </div>
    );
  }

  const visibleCourses = coursesInCategory.filter((c) => !draft.hiddenCourseSlugs.includes(c.slug));
  const hiddenCourses = coursesInCategory.filter((c) => draft.hiddenCourseSlugs.includes(c.slug));

  const toggleCourseHidden = (slug: string, hide: boolean) => {
    setDraft((prev) => {
      if (!prev) return prev;
      const set = new Set(prev.hiddenCourseSlugs);
      if (hide) set.add(slug);
      else set.delete(slug);
      return { ...prev, hiddenCourseSlugs: [...set] };
    });
  };

  const updateInstructor = (
    index: number,
    field: keyof CategoryPageEditorConfig["instructors"][0],
    value: string,
  ) => {
    setDraft((prev) => {
      if (!prev) return prev;
      const next = [...prev.instructors];
      next[index] = { ...next[index], [field]: value };
      return { ...prev, instructors: next };
    });
  };

  const updateWhy = (index: number, patch: Partial<CategoryPageWhyItem>) => {
    setDraft((prev) => {
      if (!prev) return prev;
      const next = [...prev.whyLearn];
      next[index] = { ...next[index], ...patch };
      return { ...prev, whyLearn: next };
    });
  };

  const updateLevelRow = (index: number, patch: Partial<CategoryPageLevelFilter>) => {
    setDraft((prev) => {
      if (!prev) return prev;
      const next = [...prev.levelFilters];
      next[index] = { ...next[index], ...patch };
      return { ...prev, levelFilters: next };
    });
  };

  const addLevelRow = () => {
    setDraft((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        levelFilters: [...prev.levelFilters, { value: "custom", label: "New level" }],
      };
    });
  };

  const removeLevelRow = (index: number) => {
    setDraft((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        levelFilters: prev.levelFilters.filter((_, i) => i !== index),
      };
    });
  };

  const renderCourseList = (list: ManagedCourse[], opts: { hidden: boolean }) => (
    <div className="space-y-2">
      {list.length === 0 ? (
        <p className="text-[11px] text-gray-500">None</p>
      ) : (
        list.map((c) => (
          <label
            key={c.slug}
            className={`flex cursor-pointer items-start gap-2 rounded-lg border px-2 py-2 text-xs ${
              opts.hidden
                ? "border-amber-500/25 bg-amber-500/5 hover:bg-amber-500/10"
                : "border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10"
            }`}
          >
            <input
              type="checkbox"
              className="mt-0.5"
              checked={!opts.hidden}
              onChange={(e) => toggleCourseHidden(c.slug, !e.target.checked)}
            />
            <span>
              <span className="font-medium text-gray-200">{c.title}</span>
              <span className="mt-0.5 block text-[10px] text-gray-500">{c.slug}</span>
              {opts.hidden ? (
                <span className="mt-1 inline-block rounded bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-amber-200">
                  Hidden on category page
                </span>
              ) : null}
            </span>
          </label>
        ))
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center overflow-y-auto bg-black/75 p-4 sm:items-center">
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-white/15 bg-[#0b1224] shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-white/10 px-4 py-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-violet-300">Category page</p>
            <h2 className="text-lg font-semibold text-white">{categoryTitle}</h2>
            <p className="text-[11px] text-gray-500">
              Slug <span className="text-gray-400">{categorySlug}</span> — preview stays in admin (
              <Eye size={11} className="inline align-text-bottom" /> popup).
            </p>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              title="Preview this category page"
              onClick={() => onOpenPreview?.(categorySlug)}
              className="rounded-lg p-2 text-amber-200 hover:bg-white/10"
            >
              <Eye size={18} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-gray-400 hover:bg-white/10 hover:text-white"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto px-4 py-4">
          {loadError ? (
            <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
              {loadError}
            </p>
          ) : null}

          <section>
            <h3 className="text-sm font-semibold text-white">Hero banner image</h3>
            <p className="mt-1 text-[11px] text-gray-500">
              Full-width background behind the title. Upload a wide image (e.g. 1600×900) or paste a
              URL. Clear the field and save to revert to the built-in default for this category.
            </p>
            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start">
              <div className="relative h-28 w-full shrink-0 overflow-hidden rounded-xl border border-white/15 bg-black/50 sm:h-32 sm:w-52">
                {draft.heroImage ? (
                  <Image
                    src={draft.heroImage}
                    alt=""
                    fill
                    unoptimized
                    className="object-cover object-center"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-[11px] text-gray-600">
                    No image
                  </div>
                )}
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <label className="cursor-pointer rounded-lg border border-violet-400/40 bg-violet-500/15 px-3 py-2 text-center text-[11px] font-semibold text-violet-100 hover:bg-violet-500/25 sm:text-left">
                  {uploadingHero ? "Uploading…" : "Upload hero image"}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    disabled={uploadingHero}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void uploadHeroBanner(f);
                      e.target.value = "";
                    }}
                  />
                </label>
                <input
                  value={draft.heroImage}
                  onChange={(e) => setDraft((p) => (p ? { ...p, heroImage: e.target.value } : p))}
                  className="w-full rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 font-mono text-[11px] outline-none focus:border-violet-500/40"
                  placeholder={getDefaultHeroImageForCategory(categorySlug)}
                />
                <button
                  type="button"
                  onClick={() =>
                    setDraft((p) =>
                      p
                        ? {
                            ...p,
                            heroImage: getCategoryEditorTemplate(categorySlug).heroImage,
                          }
                        : p,
                    )
                  }
                  className="self-start text-[11px] text-violet-300 underline hover:text-violet-200"
                >
                  Reset to built-in default
                </button>
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-sm font-semibold text-white">Hero introduction</h3>
            <p className="mt-1 text-[11px] text-gray-500">
              Leave empty to use the default subtitle for this category.
            </p>
            <textarea
              value={draft.heroSubtitle}
              onChange={(e) => setDraft((p) => (p ? { ...p, heroSubtitle: e.target.value } : p))}
              rows={3}
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-violet-500/40"
              placeholder="Paragraph under the hero title..."
            />
          </section>

          <section>
            <h3 className="text-sm font-semibold text-white">Courses visibility</h3>
            <p className="mt-1 text-[11px] text-gray-500">
              Hidden courses stay published — they only disappear from this category URL.
            </p>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-emerald-500/20 bg-black/25 p-3">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-emerald-300">
                  Shown on page ({visibleCourses.length})
                </p>
                {coursesInCategory.length === 0 ? (
                  <p className="text-xs text-gray-500">No published courses in this category.</p>
                ) : (
                  renderCourseList(visibleCourses, { hidden: false })
                )}
              </div>
              <div className="rounded-xl border border-amber-500/25 bg-black/25 p-3">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-amber-300">
                  Hidden content ({hiddenCourses.length})
                </p>
                {coursesInCategory.length === 0 ? (
                  <p className="text-xs text-gray-500">—</p>
                ) : (
                  renderCourseList(hiddenCourses, { hidden: true })
                )}
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-sm font-semibold text-white">Instructors</h3>
            <p className="mt-1 text-[11px] text-gray-500">
              Upload a photo (stored under /uploads/admin) or paste an image URL.
            </p>
            <div className="mt-3 grid gap-3">
              {draft.instructors.map((inst, i) => (
                <div
                  key={i}
                  className="grid gap-2 rounded-xl border border-white/10 bg-black/25 p-3 sm:grid-cols-[auto_1fr]"
                >
                  <div className="flex flex-col items-center gap-2 sm:items-start">
                    <div className="relative h-20 w-20 overflow-hidden rounded-lg border border-white/15 bg-black/50">
                      {inst.photo ? (
                        <Image src={inst.photo} alt="" fill unoptimized className="object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-[10px] text-gray-600">
                          No photo
                        </div>
                      )}
                    </div>
                    <label className="cursor-pointer rounded-lg border border-violet-400/40 bg-violet-500/15 px-2 py-1 text-[10px] font-semibold text-violet-100 hover:bg-violet-500/25">
                      {uploadingIdx === i ? "Uploading…" : "Upload image"}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        className="hidden"
                        disabled={uploadingIdx !== null}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) void uploadInstructorPhoto(i, f);
                          e.target.value = "";
                        }}
                      />
                    </label>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <input
                      value={inst.name}
                      onChange={(e) => updateInstructor(i, "name", e.target.value)}
                      className="rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-xs outline-none"
                      placeholder="Name"
                    />
                    <input
                      value={inst.role}
                      onChange={(e) => updateInstructor(i, "role", e.target.value)}
                      className="rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-xs outline-none"
                      placeholder="Role"
                    />
                    <input
                      value={inst.years}
                      onChange={(e) => updateInstructor(i, "years", e.target.value)}
                      className="rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-xs outline-none"
                      placeholder="Experience"
                    />
                    <input
                      value={inst.photo}
                      onChange={(e) => updateInstructor(i, "photo", e.target.value)}
                      className="sm:col-span-2 rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-xs outline-none"
                      placeholder="Photo URL (optional if uploaded)"
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-white">Level filters (dropdown)</h3>
              <button
                type="button"
                onClick={addLevelRow}
                className="rounded-lg border border-white/15 px-2 py-1 text-[11px] text-violet-200 hover:bg-white/10"
              >
                + Add level
              </button>
            </div>
            <p className="mt-1 text-[11px] text-gray-500">
              First row: label “All levels”, value empty.
            </p>
            <div className="mt-3 space-y-2">
              {draft.levelFilters.map((row, i) => (
                <div key={i} className="flex flex-wrap items-center gap-2">
                  <input
                    value={row.label}
                    onChange={(e) => updateLevelRow(i, { label: e.target.value })}
                    className="min-w-[140px] flex-1 rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-xs outline-none"
                    placeholder="Label"
                  />
                  <input
                    value={row.value}
                    onChange={(e) => updateLevelRow(i, { value: e.target.value })}
                    className="w-32 rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-xs outline-none"
                    placeholder="value-slug"
                  />
                  <button
                    type="button"
                    onClick={() => removeLevelRow(i)}
                    className="text-[11px] text-red-300 hover:underline"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-sm font-semibold text-white">Why learn blocks</h3>
            <p className="mt-1 text-[11px] leading-relaxed text-gray-500">
              <strong className="text-gray-400">Icon:</strong> type the Lucide React component name
              (e.g. <code className="text-violet-300">ShieldCheck</code>,{" "}
              <code className="text-violet-300">GraduationCap</code>). If it exists in the library it
              renders; otherwise the site falls back safely. Suggestions in the dropdown are optional.
            </p>
            <datalist id="lucide-icon-suggestions">
              {LUCIDE_ICON_SUGGESTIONS.map((n) => (
                <option key={n} value={n} />
              ))}
            </datalist>
            <div className="mt-3 space-y-3">
              {draft.whyLearn.map((row, i) => (
                <div key={i} className="space-y-2 rounded-xl border border-white/10 bg-black/25 p-3">
                  <input
                    value={row.label}
                    onChange={(e) => updateWhy(i, { label: e.target.value })}
                    className="w-full rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-xs outline-none"
                    placeholder="Title"
                  />
                  <input
                    value={row.desc}
                    onChange={(e) => updateWhy(i, { desc: e.target.value })}
                    className="w-full rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-xs outline-none"
                    placeholder="Subtitle / description"
                  />
                  <textarea
                    value={row.quote ?? ""}
                    onChange={(e) => updateWhy(i, { quote: e.target.value })}
                    rows={2}
                    className="w-full rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-xs leading-snug text-gray-200 outline-none placeholder:text-gray-600"
                    placeholder="Optional quote or wisdom line under this block…"
                  />
                  <div className="flex flex-wrap items-end gap-2">
                    <label className="flex min-w-[160px] flex-1 flex-col gap-1">
                      <span className="text-[10px] uppercase tracking-wide text-gray-500">
                        Icon code (Lucide name)
                      </span>
                      <input
                        list="lucide-icon-suggestions"
                        value={row.icon}
                        onChange={(e) => updateWhy(i, { icon: e.target.value })}
                        className="rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 font-mono text-[11px] outline-none focus:border-violet-500/40"
                        placeholder="ShieldCheck"
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-[10px] uppercase tracking-wide text-gray-500">Tone</span>
                      <select
                        value={row.tone}
                        onChange={(e) =>
                          updateWhy(i, { tone: e.target.value as CategoryWhyTone })
                        }
                        className="rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-xs outline-none"
                      >
                        {TONES.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-white/10 px-4 py-3">
          <button
            type="button"
            onClick={() => onOpenPreview?.(categorySlug)}
            className="rounded-lg border border-amber-400/35 bg-amber-500/10 px-4 py-2 text-xs font-medium text-amber-100 hover:bg-amber-500/15"
          >
            Preview popup
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/15 px-4 py-2 text-xs font-medium text-gray-300 hover:bg-white/10"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => void persist()}
            className="rounded-lg bg-[#f5b942] px-4 py-2 text-xs font-semibold text-black hover:brightness-110 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save category page"}
          </button>
        </div>
      </div>
    </div>
  );
}
