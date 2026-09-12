"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Copy, ExternalLink, FolderOpen, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import AdminTutorLedCatalogLandingEditor from "@/components/admin/AdminTutorLedCatalogLandingEditor";
import type { AdminContent, TutorLedCatalogLandingStored } from "@/lib/content-schema";
import type { TutorLedProgramStored } from "@/lib/default-tutor-led-programs";
import { adminApiErrorMessage, adminMutationHeaders } from "@/lib/admin-csrf-client";
import {
  blankTutorLedCatalogLanding,
  mergeTutorLedCatalogPages,
  slugifyTutorLedCatalog,
  tutorLedCatalogPublicHref,
} from "@/lib/tutor-led-catalog-landings";

/**
 * Create many ISO-style tutor-led catalog landings. Each one is a single
 * category thumbnail; Description opens its designed landing.
 */
export default function AdminTutorLedCatalogLandingsWorkspace() {
  const [catalogs, setCatalogs] = useState<TutorLedCatalogLandingStored[]>([]);
  const [programs, setPrograms] = useState<TutorLedProgramStored[]>([]);
  const [categories, setCategories] = useState<{ slug: string; title: string }[]>([]);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/content", { cache: "no-store", credentials: "include" });
      if (!res.ok) throw new Error(`Load failed (${res.status})`);
      const data = (await res.json()) as AdminContent;
      setCatalogs(mergeTutorLedCatalogPages(data.tutorLedCatalogPages, data.tutorLedCatalogPage));
      setPrograms(Array.isArray(data.tutorLedPrograms) ? data.tutorLedPrograms : []);
      setCategories(
        (data.categories ?? [])
          .filter((c) => c.isActive !== false)
          .map((c) => ({ slug: c.slug, title: c.title })),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load catalogs.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const persist = async (next: TutorLedCatalogLandingStored[], nextPrograms = programs) => {
    setSaving(true);
    setError(null);
    try {
      const put = await fetch("/api/admin/content", {
        method: "PUT",
        headers: adminMutationHeaders(),
        credentials: "include",
        body: JSON.stringify({ tutorLedCatalogPages: next, tutorLedPrograms: nextPrograms }),
      });
      if (!put.ok) {
        const errBody = await put.json().catch(() => ({}));
        throw new Error(adminApiErrorMessage(errBody, `Save failed (${put.status}).`));
      }
      setCatalogs(next);
      setPrograms(nextPrograms);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
      throw e;
    } finally {
      setSaving(false);
    }
  };

  const selected = catalogs.find((c) => c.slug === selectedSlug) ?? null;
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return catalogs.filter((c) => {
      if (categoryFilter && c.category !== categoryFilter) return false;
      if (!q) return true;
      return (
        c.cardTitle.toLowerCase().includes(q) ||
        c.slug.toLowerCase().includes(q) ||
        c.page.hero.subtitle.toLowerCase().includes(q)
      );
    });
  }, [catalogs, search, categoryFilter]);
  const field =
    "mt-0 w-full rounded-xl border border-white/[0.07] bg-[#060b14]/90 px-3 py-2.5 text-sm text-white outline-none placeholder:text-gray-600 focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20";

  const createNew = async () => {
    const draft = blankTutorLedCatalogLanding();
    const next = [...catalogs, draft];
    await persist(next);
    setSelectedSlug(draft.slug);
  };

  const duplicate = async (slug: string) => {
    const src = catalogs.find((c) => c.slug === slug);
    if (!src) return;
    const copy: TutorLedCatalogLandingStored = {
      ...structuredClone(src),
      slug: slugifyTutorLedCatalog(`${src.slug}-copy-${Date.now()}`),
      published: false,
      cardTitle: `${src.cardTitle} (copy)`,
    };
    const next = [...catalogs, copy];
    await persist(next);
    setSelectedSlug(copy.slug);
  };

  const remove = async (slug: string) => {
    if (!window.confirm("Delete this catalog landing? Programs stay in Live programs.")) return;
    const next = catalogs.filter((c) => c.slug !== slug);
    await persist(next);
    if (selectedSlug === slug) setSelectedSlug(null);
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#0b1224] px-4 py-10 text-sm text-gray-400">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading catalog landings…
      </div>
    );
  }

  if (selected) {
    return (
      <AdminTutorLedCatalogLandingEditor
        catalog={selected}
        categories={categories}
        programs={programs}
        saving={saving}
        saved={saved}
        error={error}
        onBack={() => setSelectedSlug(null)}
        onChange={(next) => {
          setCatalogs((list) => list.map((row) => (row.slug === selected.slug ? next : row)));
        }}
        onProgramsChange={setPrograms}
        onSave={async (next) => {
          const list = catalogs.map((row) => (row.slug === selected.slug || row.slug === next.slug ? next : row));
          setCatalogs(list);
          await persist(list, programs);
          setSelectedSlug(next.slug);
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0b1224] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] bg-black/20 px-4 py-4 sm:px-5">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-emerald-500/15 ring-1 ring-emerald-400/25">
              <FolderOpen className="h-5 w-5 text-emerald-300" aria-hidden />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white sm:text-base">Catalog</h2>
              <p className="text-[11px] text-gray-500">
                Select a row to edit, or create a new tutor-led course. Students pick a level on one landing.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-white/10 bg-black/40 px-3 py-1 text-[11px] font-medium text-gray-300">
              {filtered.length} shown
              {catalogs.length !== filtered.length ? ` · ${catalogs.length} total` : ""}
            </span>
            <button
              type="button"
              onClick={() => void createNew()}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-violet-900/40 transition hover:from-violet-500 hover:to-indigo-500 disabled:opacity-60"
            >
              <Plus className="h-4 w-4" /> New course
            </button>
          </div>
        </div>
        <div className="flex flex-wrap items-end gap-3 border-b border-white/[0.05] px-4 py-3 sm:px-5">
          <label className="flex min-w-[14rem] flex-1 flex-col gap-1.5 text-[11px] font-medium text-gray-500">
            Search courses
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search title or slug…"
              className={field}
            />
          </label>
          <label className="flex max-w-xs flex-col gap-1.5 text-[11px] font-medium text-gray-500">
            Filter by category
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className={`${field} cursor-pointer`}
            >
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.title}
                </option>
              ))}
            </select>
          </label>
        </div>
        {error ? (
          <p className="mx-4 mb-4 mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs text-rose-100 sm:mx-5">
            {error}
          </p>
        ) : null}
        {saved ? (
          <p className="mx-4 mb-4 mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-100 sm:mx-5">
            Saved.
          </p>
        ) : null}
      </section>

      <section className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0d1528] shadow-[0_16px_48px_rgba(0,0,0,0.35)]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-xs">
            <thead>
              <tr className="border-b border-white/[0.08] bg-white/[0.03] text-[10px] font-bold uppercase tracking-wider text-gray-500">
                {["Course", "Slug", "Category", "Levels", "Price", "Status", "Actions"].map((h) => (
                  <th key={h} className="px-4 py-3 font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-14 text-center">
                    <p className="text-sm font-medium text-gray-400">No courses match this filter</p>
                    <p className="mt-1 text-[11px] text-gray-600">Add a new tutor-led course, then click Save.</p>
                  </td>
                </tr>
              ) : (
                filtered.map((catalog) => {
                  const catTitle = categories.find((x) => x.slug === catalog.category)?.title ?? catalog.category;
                  const thumb = catalog.page.hero.backgroundImage || catalog.page.pageThumbnail;
                  const levelPrices = catalog.page.programs
                    .map((card) => {
                      const live = programs.find((p) => p.slug === card.enrollSlug);
                      return live?.price || card.price;
                    })
                    .filter((n) => n > 0);
                  const minPrice = levelPrices.length ? Math.min(...levelPrices) : 0;
                  const maxPrice = levelPrices.length ? Math.max(...levelPrices) : 0;
                  const priceLabel =
                    !minPrice
                      ? ""
                      : minPrice === maxPrice
                        ? `₹${minPrice.toLocaleString("en-IN")}`
                        : `₹${minPrice.toLocaleString("en-IN")} – ₹${maxPrice.toLocaleString("en-IN")}`;
                  return (
                    <tr key={catalog.slug} className="border-l-2 border-l-transparent transition hover:bg-violet-500/[0.06]">
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => setSelectedSlug(catalog.slug)}
                          className="flex w-full max-w-md items-center gap-3 text-left"
                        >
                          <div className="relative h-14 w-24 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-black/50">
                            {thumb ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={thumb} alt="" className="h-full w-full object-cover" />
                            ) : null}
                            <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent px-1.5 pb-1 pt-3">
                              <p className="truncate text-[10px] font-bold tabular-nums text-amber-300">
                                {priceLabel || "Set in Pricing"}
                              </p>
                            </div>
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-white">{catalog.cardTitle}</p>
                            <p className="truncate text-[11px] text-gray-500">{catalog.page.hero.subtitle}</p>
                          </div>
                        </button>
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] text-violet-200/90">{catalog.slug}</td>
                      <td className="px-4 py-3 text-gray-300">{catTitle}</td>
                      <td className="px-4 py-3 text-gray-300">{catalog.page.programs.length}</td>
                      <td className="px-4 py-3 font-semibold tabular-nums text-amber-300">
                        <span className="block">{priceLabel || "—"}</span>
                        {levelPrices.length > 1 ? (
                          <span className="mt-0.5 block text-[10px] font-medium text-gray-500">
                            {levelPrices.length} level prices
                          </span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                            catalog.published ? "bg-emerald-500/20 text-emerald-300" : "bg-amber-500/15 text-amber-200"
                          }`}
                        >
                          {catalog.published ? "Live" : "Draft"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <button
                            type="button"
                            title="Edit course"
                            onClick={() => setSelectedSlug(catalog.slug)}
                            className="rounded-lg p-2 text-gray-400 transition hover:bg-violet-500/20 hover:text-violet-100"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <Link
                            href={tutorLedCatalogPublicHref(catalog.slug)}
                            target="_blank"
                            rel="noreferrer"
                            title="Preview"
                            className="rounded-lg p-2 text-gray-400 transition hover:bg-white/10 hover:text-white"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Link>
                          <button
                            type="button"
                            title="Duplicate"
                            onClick={() => void duplicate(catalog.slug)}
                            className="rounded-lg p-2 text-gray-400 transition hover:bg-white/10 hover:text-white"
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            title="Delete"
                            onClick={() => void remove(catalog.slug)}
                            className="rounded-lg p-2 text-gray-500 transition hover:bg-red-500/15 hover:text-red-300"
                          >
                            <Trash2 className="h-4 w-4" />
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
    </div>
  );
}
