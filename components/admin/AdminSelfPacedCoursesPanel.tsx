"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Pencil, Plus, Trash2, Upload } from "lucide-react";
import type { AdminContent, ManagedCategory, ManagedCourse } from "@/lib/content-schema";
import { canonicalCategorySlug } from "@/lib/category-page-resolve";

function isSelfPacedCourse(c: ManagedCourse): boolean {
  return !c.learningFormat || c.learningFormat === "self-paced";
}

const emptyDraft = (): ManagedCourse => ({
  slug: "",
  title: "",
  subtitle: "",
  category: "",
  level: "Beginner",
  duration: "3h 00m",
  rating: "4.6",
  learners: "0",
  price: "$49.00",
  oldPrice: "$79.00",
  image: "/course-food-safety.png",
  published: true,
  learningFormat: "self-paced",
  instructorName: "",
  pageBadge: "",
  highlights: [],
  faqs: [],
  trainerRole: "",
  trainerExperience: "",
  trainerBio: "",
  trainerCertifications: [],
  trainerWorkedWith: [],
});

export default function AdminSelfPacedCoursesPanel() {
  const [content, setContent] = useState<AdminContent | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [categoryFilterSlug, setCategoryFilterSlug] = useState<string>("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [draft, setDraft] = useState<ManagedCourse>(emptyDraft);
  const [uploadingImage, setUploadingImage] = useState(false);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const res = await fetch("/api/admin/content", { cache: "no-store" });
      if (!res.ok) throw new Error("load");
      const data = (await res.json()) as AdminContent;
      setContent(data);
    } catch {
      setLoadError("Could not load admin content.");
      setContent(null);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const categories: ManagedCategory[] = useMemo(
    () => (content?.categories?.length ? content.categories : []),
    [content],
  );

  const selfPacedCourses = useMemo(() => {
    const list = content?.managedCourses ?? [];
    return list.filter(isSelfPacedCourse);
  }, [content]);

  const filteredCourses = useMemo(() => {
    if (!categoryFilterSlug) return selfPacedCourses;
    return selfPacedCourses.filter(
      (c) => canonicalCategorySlug(c.category) === canonicalCategorySlug(categoryFilterSlug),
    );
  }, [selfPacedCourses, categoryFilterSlug]);

  const openCreate = () => {
    const firstCat = categories[0]?.slug ?? "";
    setEditingSlug(null);
    setDraft({ ...emptyDraft(), category: firstCat });
    setEditorOpen(true);
  };

  const openEdit = (course: ManagedCourse) => {
    setEditingSlug(course.slug);
    setDraft({
      ...course,
      learningFormat: "self-paced",
    });
    setEditorOpen(true);
  };

  const persistManagedCourses = async (nextCourses: ManagedCourse[]) => {
    if (!content) return;
    setSaving(true);
    setLoadError(null);
    try {
      const payload: AdminContent = {
        ...content,
        managedCourses: nextCourses,
      };
      const put = await fetch("/api/admin/content", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!put.ok) throw new Error("save");
      await load();
      setEditorOpen(false);
    } catch {
      setLoadError("Save failed. Try again.");
    } finally {
      setSaving(false);
    }
  };

  const slugify = (s: string) =>
    s
      .toLowerCase()
      .replace(/&/g, "and")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

  const saveDraft = async () => {
    if (!content) return;
    const slug = editingSlug ?? slugify(draft.slug || draft.title);
    if (!slug.trim()) {
      setLoadError("Slug or title is required.");
      return;
    }
    const normalized: ManagedCourse = {
      ...draft,
      slug,
      learningFormat: "self-paced",
    };
    const others = (content.managedCourses ?? []).filter((c) => {
      if (editingSlug) return c.slug !== editingSlug;
      return c.slug !== slug;
    });
    await persistManagedCourses([...others, normalized]);
  };

  const deleteCourse = async (slug: string) => {
    if (!content) return;
    if (!window.confirm(`Remove course “${slug}” from the catalog?`)) return;
    const next = (content.managedCourses ?? []).filter((c) => c.slug !== slug);
    await persistManagedCourses(next);
  };

  const uploadCover = async (file: File) => {
    setUploadingImage(true);
    setLoadError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const data = (await res.json()) as { ok?: boolean; url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error ?? "Upload failed");
      setDraft((d) => ({ ...d, image: data.url! }));
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Image upload failed.");
    } finally {
      setUploadingImage(false);
    }
  };

  if (!content && !loadError) {
    return (
      <p className="rounded-xl border border-white/10 bg-[#0b1224] px-4 py-8 text-center text-sm text-gray-400">
        Loading course catalog…
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-white/10 bg-[#0b1224] p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-white md:text-2xl">Course information</h1>
            <p className="mt-1 max-w-2xl text-xs text-gray-400">
              Choose a <strong className="text-gray-300">category</strong>, then manage{" "}
              <strong className="text-gray-300">self-paced</strong> courses only. Update an existing post or add a new one.
              Interactive / live programs are managed elsewhere.
            </p>
          </div>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-lg bg-[#6f55ff] px-4 py-2 text-xs font-semibold text-white hover:bg-[#7d63ff]"
          >
            <Plus className="h-4 w-4" /> New self-paced course
          </button>
        </div>

        {loadError ? (
          <p className="mt-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-100">{loadError}</p>
        ) : null}

        <div className="mt-4 flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-[11px] text-gray-500">
            Category filter
            <select
              value={categoryFilterSlug}
              onChange={(e) => setCategoryFilterSlug(e.target.value)}
              className="min-w-[200px] rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-violet-500/40"
            >
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.title}
                </option>
              ))}
            </select>
          </label>
          <p className="text-[11px] text-gray-500">
            Showing {filteredCourses.length} self-paced course{filteredCourses.length === 1 ? "" : "s"}
            {categoryFilterSlug ? ` in this category` : ""}.
          </p>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-white/10 bg-[#0d1528]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-xs">
            <thead className="border-b border-white/10 text-gray-400">
              <tr>
                {["Course", "Slug", "Category", "Level", "Price", "Status", "Actions"].map((h) => (
                  <th key={h} className="px-3 py-2 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredCourses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-10 text-center text-gray-500">
                    No self-paced courses for this filter. Add one or pick another category.
                  </td>
                </tr>
              ) : (
                filteredCourses.map((c) => {
                  const catLabel = categories.find((x) => x.slug === c.category)?.title ?? c.category;
                  return (
                    <tr key={c.slug} className="border-b border-white/5 hover:bg-white/[0.02]">
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <div className="relative h-10 w-14 shrink-0 overflow-hidden rounded border border-white/10 bg-black/40">
                            <Image src={c.image} alt="" fill unoptimized className="object-cover" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-white">{c.title}</p>
                            <p className="truncate text-[10px] text-gray-500">{c.subtitle}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2 font-mono text-[11px] text-gray-400">{c.slug}</td>
                      <td className="px-3 py-2 text-gray-300">{catLabel}</td>
                      <td className="px-3 py-2 text-gray-400">{c.level}</td>
                      <td className="px-3 py-2 text-amber-300">{c.price}</td>
                      <td className="px-3 py-2">
                        <span
                          className={`rounded px-2 py-0.5 text-[10px] font-semibold ${
                            c.published ? "bg-emerald-500/20 text-emerald-300" : "bg-amber-500/15 text-amber-200"
                          }`}
                        >
                          {c.published ? "Published" : "Draft"}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex gap-1">
                          <button
                            type="button"
                            title="Edit"
                            onClick={() => openEdit(c)}
                            className="rounded p-1.5 text-gray-300 hover:bg-violet-500/20 hover:text-violet-100"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            title="Delete"
                            onClick={() => void deleteCourse(c.slug)}
                            className="rounded p-1.5 text-red-300/90 hover:bg-red-500/15"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {editorOpen ? (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 p-4 sm:items-center">
          <div
            role="dialog"
            className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0b1224] shadow-2xl"
          >
            <div className="border-b border-white/10 px-4 py-3">
              <h2 className="text-sm font-semibold text-white">
                {editingSlug ? "Update self-paced course" : "Add self-paced course"}
              </h2>
              <p className="text-[11px] text-gray-500">Posts saved here are always self-paced.</p>
            </div>
            <div className="space-y-3 overflow-y-auto p-4 text-xs">
              {!editingSlug ? (
                <label className="block">
                  <span className="text-gray-500">URL slug</span>
                  <input
                    value={draft.slug}
                    onChange={(e) => setDraft((d) => ({ ...d, slug: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 font-mono outline-none focus:border-violet-500/40"
                    placeholder="my-course-slug"
                  />
                </label>
              ) : (
                <p className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 font-mono text-gray-400">
                  Slug: {editingSlug}
                </p>
              )}
              <label className="block">
                <span className="text-gray-500">Title</span>
                <input
                  value={draft.title}
                  onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 outline-none focus:border-violet-500/40"
                />
              </label>
              <label className="block">
                <span className="text-gray-500">Subtitle</span>
                <input
                  value={draft.subtitle}
                  onChange={(e) => setDraft((d) => ({ ...d, subtitle: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 outline-none focus:border-violet-500/40"
                />
              </label>
              <label className="block">
                <span className="text-gray-500">Category</span>
                <select
                  value={draft.category}
                  onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 outline-none focus:border-violet-500/40"
                >
                  {categories.length === 0 ? (
                    <option value="">Add categories in Admin → Categories</option>
                  ) : (
                    categories.map((c) => (
                      <option key={c.slug} value={c.slug}>
                        {c.title}
                      </option>
                    ))
                  )}
                </select>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label className="block">
                  <span className="text-gray-500">Level</span>
                  <input
                    value={draft.level}
                    onChange={(e) => setDraft((d) => ({ ...d, level: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-2 py-2 outline-none"
                  />
                </label>
                <label className="block">
                  <span className="text-gray-500">Duration</span>
                  <input
                    value={draft.duration}
                    onChange={(e) => setDraft((d) => ({ ...d, duration: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-2 py-2 outline-none"
                  />
                </label>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label className="block">
                  <span className="text-gray-500">Price</span>
                  <input
                    value={draft.price}
                    onChange={(e) => setDraft((d) => ({ ...d, price: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-2 py-2 outline-none"
                  />
                </label>
                <label className="block">
                  <span className="text-gray-500">Old price</span>
                  <input
                    value={draft.oldPrice}
                    onChange={(e) => setDraft((d) => ({ ...d, oldPrice: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-2 py-2 outline-none"
                  />
                </label>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label className="block">
                  <span className="text-gray-500">Rating</span>
                  <input
                    value={draft.rating}
                    onChange={(e) => setDraft((d) => ({ ...d, rating: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-2 py-2 outline-none"
                  />
                </label>
                <label className="block">
                  <span className="text-gray-500">Learners label</span>
                  <input
                    value={draft.learners}
                    onChange={(e) => setDraft((d) => ({ ...d, learners: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-2 py-2 outline-none"
                  />
                </label>
              </div>
              <label className="block">
                <span className="text-gray-500">Cover image URL</span>
                <input
                  value={draft.image}
                  onChange={(e) => setDraft((d) => ({ ...d, image: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 font-mono text-[11px] outline-none"
                />
              </label>
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-violet-500/30 bg-violet-500/10 py-2 text-violet-100 hover:bg-violet-500/20">
                <Upload className="h-3.5 w-3.5" />
                {uploadingImage ? "Uploading…" : "Upload cover image"}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  disabled={uploadingImage}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void uploadCover(f);
                    e.target.value = "";
                  }}
                />
              </label>
              <label className="flex items-center gap-2 text-gray-300">
                <input
                  type="checkbox"
                  checked={draft.published}
                  onChange={(e) => setDraft((d) => ({ ...d, published: e.target.checked }))}
                  className="accent-emerald-500"
                />
                Published on site
              </label>
            </div>
            <div className="flex justify-end gap-2 border-t border-white/10 px-4 py-3">
              <button
                type="button"
                onClick={() => setEditorOpen(false)}
                className="rounded-lg border border-white/15 px-4 py-2 text-xs text-gray-300 hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void saveDraft()}
                className="rounded-lg bg-[#6f55ff] px-4 py-2 text-xs font-semibold text-white hover:bg-[#7d63ff] disabled:opacity-50"
              >
                {saving ? "Saving…" : editingSlug ? "Update" : "Add course"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
