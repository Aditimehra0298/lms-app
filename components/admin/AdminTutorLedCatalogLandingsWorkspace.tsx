"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Copy, ExternalLink, Loader2, Plus, Trash2 } from "lucide-react";
import AdminTutorLedCatalogLandingEditor from "@/components/admin/AdminTutorLedCatalogLandingEditor";
import type { AdminContent, TutorLedCatalogLandingStored } from "@/lib/content-schema";
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
  const [categories, setCategories] = useState<{ slug: string; title: string }[]>([]);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/content", { cache: "no-store", credentials: "include" });
      if (!res.ok) throw new Error(`Load failed (${res.status})`);
      const data = (await res.json()) as AdminContent;
      setCatalogs(mergeTutorLedCatalogPages(data.tutorLedCatalogPages, data.tutorLedCatalogPage));
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

  const persist = async (next: TutorLedCatalogLandingStored[]) => {
    setSaving(true);
    setError(null);
    try {
      const put = await fetch("/api/admin/content", {
        method: "PUT",
        headers: adminMutationHeaders(),
        credentials: "include",
        body: JSON.stringify({ tutorLedCatalogPages: next }),
      });
      if (!put.ok) {
        const errBody = await put.json().catch(() => ({}));
        throw new Error(adminApiErrorMessage(errBody, `Save failed (${put.status}).`));
      }
      setCatalogs(next);
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
        saving={saving}
        saved={saved}
        error={error}
        onBack={() => setSelectedSlug(null)}
        onChange={(next) => {
          setCatalogs((list) => list.map((row) => (row.slug === selected.slug ? next : row)));
        }}
        onSave={async (next) => {
          const list = catalogs.map((row) => (row.slug === selected.slug || row.slug === next.slug ? next : row));
          setCatalogs(list);
          await persist(list);
          setSelectedSlug(next.slug);
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-white/10 bg-[#0b1224] p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-300">
              Tutor-led catalogs
            </p>
            <h1 className="mt-1 text-xl font-semibold text-white md:text-2xl">Catalog landings</h1>
            <p className="mt-1 max-w-2xl text-xs text-gray-400">
              Create as many designed landings as you need (ISO 22000, HACCP, CEH, …). Each catalog is{" "}
              <strong className="text-gray-200">one thumbnail</strong> on the category page. Description
              opens this landing. Add live Zoom levels under Live programs, then link their slugs here.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void createNew()}
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#6f55ff] px-4 py-2 text-xs font-semibold text-white hover:bg-[#7d63ff] disabled:opacity-60"
          >
            <Plus className="h-3.5 w-3.5" /> New catalog landing
          </button>
        </div>
        {error ? (
          <p className="mt-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-100">{error}</p>
        ) : null}
        {saved ? (
          <p className="mt-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-100">
            Saved.
          </p>
        ) : null}
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {catalogs.map((catalog) => (
          <article key={catalog.slug} className="flex flex-col rounded-xl border border-white/10 bg-[#0d1528] p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-violet-300">
                  {catalog.category}
                </p>
                <h2 className="mt-1 text-sm font-bold text-white">{catalog.cardTitle}</h2>
                <p className="mt-1 font-mono text-[11px] text-gray-500">/{catalog.slug}</p>
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                  catalog.published ? "bg-emerald-500/20 text-emerald-200" : "bg-white/10 text-gray-400"
                }`}
              >
                {catalog.published ? "Live" : "Draft"}
              </span>
            </div>
            <p className="mt-3 line-clamp-2 text-xs text-zinc-400">{catalog.page.hero.subtitle}</p>
            <p className="mt-2 text-[11px] text-gray-500">
              {catalog.page.programs.length} level{catalog.page.programs.length === 1 ? "" : "s"}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSelectedSlug(catalog.slug)}
                className="rounded-lg bg-[#f5b942] px-3 py-1.5 text-[11px] font-semibold text-black"
              >
                Design landing
              </button>
              <Link
                href={tutorLedCatalogPublicHref(catalog.slug)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-lg border border-white/15 px-3 py-1.5 text-[11px] text-white hover:bg-white/10"
              >
                Preview <ExternalLink className="h-3 w-3" />
              </Link>
              <button
                type="button"
                onClick={() => void duplicate(catalog.slug)}
                className="inline-flex items-center gap-1 rounded-lg border border-white/15 px-3 py-1.5 text-[11px] text-gray-200 hover:bg-white/10"
              >
                <Copy className="h-3 w-3" /> Duplicate
              </button>
              <button
                type="button"
                onClick={() => void remove(catalog.slug)}
                className="inline-flex items-center gap-1 rounded-lg border border-rose-500/30 px-3 py-1.5 text-[11px] text-rose-200 hover:bg-rose-500/10"
              >
                <Trash2 className="h-3 w-3" /> Delete
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
