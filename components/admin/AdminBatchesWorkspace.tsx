"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  ChevronRight,
  ExternalLink,
  Loader2,
  Radio,
  RefreshCw,
  Save,
  Search,
  Users,
} from "lucide-react";
import type { AdminContent } from "@/lib/content-schema";
import { defaultTutorLedPrograms, type TutorLedProgramStored } from "@/lib/default-tutor-led-programs";
import { isWorkshopProgram, workshopLandingHref } from "@/lib/workshop-program";

type BatchFilter = "all" | "tutor-led" | "workshop" | "upcoming";

type BatchDraft = {
  nextBatchDate: string;
  batchLabel: string;
  schedule: string;
};

function programLandingPath(p: TutorLedProgramStored): string {
  return isWorkshopProgram(p) ? workshopLandingHref(p.slug) : `/tutor-led/${p.slug}`;
}

function adminEditorPanel(p: TutorLedProgramStored): string {
  return isWorkshopProgram(p) ? "/admin?panel=workshops" : "/admin?panel=tutor-led";
}

export default function AdminBatchesWorkspace() {
  const [content, setContent] = useState<AdminContent | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [savingSlug, setSavingSlug] = useState<string | null>(null);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [listFilter, setListFilter] = useState<BatchFilter>("all");
  const [drafts, setDrafts] = useState<Record<string, BatchDraft>>({});

  const programs = useMemo(
    () => (content?.tutorLedPrograms?.length ? content.tutorLedPrograms : defaultTutorLedPrograms),
    [content?.tutorLedPrograms],
  );

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const res = await fetch("/api/admin/content", { cache: "no-store" });
      if (!res.ok) throw new Error("load");
      const data = (await res.json()) as AdminContent;
      setContent(data);
      const rows = data.tutorLedPrograms?.length ? data.tutorLedPrograms : defaultTutorLedPrograms;
      const nextDrafts: Record<string, BatchDraft> = {};
      for (const p of rows) {
        nextDrafts[p.slug] = {
          nextBatchDate: p.nextBatchDate ?? "",
          batchLabel: p.batchLabel ?? "",
          schedule: p.schedule ?? "",
        };
      }
      setDrafts(nextDrafts);
    } catch {
      setLoadError("Could not load live programs.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredPrograms = useMemo(() => {
    let list = programs;
    if (listFilter === "tutor-led") list = list.filter((p) => !isWorkshopProgram(p));
    else if (listFilter === "workshop") list = list.filter((p) => isWorkshopProgram(p));
    else if (listFilter === "upcoming") {
      list = list.filter((p) => (p.nextBatchDate ?? "").trim().length > 0);
    }
    const q = searchQuery.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.slug.toLowerCase().includes(q) ||
        (p.batchLabel ?? "").toLowerCase().includes(q),
    );
  }, [programs, listFilter, searchQuery]);

  const publishedCount = useMemo(() => programs.filter((p) => p.published).length, [programs]);
  const withDateCount = useMemo(
    () => programs.filter((p) => (p.nextBatchDate ?? "").trim().length > 0).length,
    [programs],
  );

  const patchDraft = (slug: string, patch: Partial<BatchDraft>) => {
    setDrafts((prev) => ({
      ...prev,
      [slug]: { ...prev[slug], ...patch },
    }));
  };

  const saveBatch = async (p: TutorLedProgramStored) => {
    if (!content) return;
    const draft = drafts[p.slug];
    if (!draft) return;
    setSavingSlug(p.slug);
    setLoadError(null);
    setSaveNotice(null);
    try {
      const nextPrograms = programs.map((row) =>
        row.slug === p.slug
          ? {
              ...row,
              nextBatchDate: draft.nextBatchDate.trim(),
              batchLabel: draft.batchLabel.trim() || row.batchLabel,
              schedule: draft.schedule.trim() || row.schedule,
            }
          : row,
      );
      const payload: AdminContent = { ...content, tutorLedPrograms: nextPrograms };
      const put = await fetch("/api/admin/content", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!put.ok) throw new Error("save");
      setSaveNotice(`Saved batch schedule for “${p.title || p.slug}”.`);
      await load();
    } catch {
      setLoadError("Save failed. Try again.");
    } finally {
      setSavingSlug(null);
    }
  };

  const isDirty = (p: TutorLedProgramStored) => {
    const d = drafts[p.slug];
    if (!d) return false;
    return (
      d.nextBatchDate !== (p.nextBatchDate ?? "") ||
      d.batchLabel !== (p.batchLabel ?? "") ||
      d.schedule !== (p.schedule ?? "")
    );
  };

  if (!content && !loadError) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-white/10 bg-[#0b1224] px-4 py-16 text-sm text-gray-400">
        <Loader2 className="mr-2 h-5 w-5 animate-spin text-amber-400" /> Loading batch schedules…
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-[#0c1428] via-[#0a101c] to-[#070b14]">
        <div className="border-b border-white/[0.06] bg-amber-500/[0.07] px-4 py-5 sm:px-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex gap-4">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-amber-500/20 ring-1 ring-amber-400/30">
                <Users className="h-6 w-6 text-amber-200" aria-hidden />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-300/90">
                  Live programs
                </p>
                <h1 className="mt-1 text-xl font-bold text-white sm:text-2xl">Batch schedule</h1>
                <p className="mt-2 max-w-2xl text-xs leading-relaxed text-gray-400">
                  Set <strong className="text-gray-300">next batch date</strong> and schedule copy for tutor-led
                  programs and workshops. Learners get calendar reminders after registration when a date is set.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-gray-400">
              <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
                {programs.length} programs
              </span>
              <span className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-emerald-200">
                {publishedCount} live
              </span>
              <span className="rounded-full border border-amber-500/25 bg-amber-500/10 px-2.5 py-1 text-amber-200">
                {withDateCount} with date
              </span>
              <button
                type="button"
                onClick={() => void load()}
                className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1 text-gray-300 hover:bg-white/5"
              >
                <RefreshCw className="h-3 w-3" /> Refresh
              </button>
            </div>
          </div>
        </div>

        {loadError ? (
          <p className="mx-4 mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs text-rose-100 sm:mx-6">
            {loadError}
          </p>
        ) : null}
        {saveNotice ? (
          <p className="mx-4 mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-100 sm:mx-6">
            {saveNotice}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-2 border-b border-white/[0.06] px-4 py-3 sm:px-6">
          {(
            [
              ["all", "All"],
              ["tutor-led", "Tutor-led"],
              ["workshop", "Workshops"],
              ["upcoming", "Has date"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setListFilter(id)}
              className={`rounded-lg px-3 py-1.5 text-[11px] font-semibold transition ${
                listFilter === id
                  ? "bg-amber-600 text-white"
                  : "border border-white/10 text-gray-400 hover:bg-white/5"
              }`}
            >
              {label}
            </button>
          ))}
          <label className="ml-auto flex min-w-[12rem] items-center gap-2 rounded-lg border border-white/10 bg-black/30 px-3 py-1.5">
            <Search className="h-3.5 w-3.5 text-gray-500" aria-hidden />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search title or slug…"
              className="w-full bg-transparent text-xs text-white outline-none placeholder:text-gray-600"
            />
          </label>
        </div>
      </div>

      {filteredPrograms.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/15 bg-[#0d1528]/60 px-6 py-14 text-center">
          <CalendarDays className="mx-auto mb-3 h-10 w-10 text-amber-400/40" aria-hidden />
          <p className="text-sm font-medium text-white">No programs match this filter</p>
          <p className="mt-1 text-xs text-gray-500">
            Create tutor-led programs or workshops first, then set their batch dates here.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {filteredPrograms.map((p) => {
            const draft = drafts[p.slug];
            const dirty = isDirty(p);
            const workshop = isWorkshopProgram(p);
            return (
              <li
                key={p.slug}
                className="rounded-xl border border-white/10 bg-[#0d1528] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-semibold text-white">{p.title || "Untitled"}</p>
                      <span
                        className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${
                          p.published ? "bg-emerald-500/20 text-emerald-300" : "bg-amber-500/15 text-amber-200"
                        }`}
                      >
                        {p.published ? "Live" : "Draft"}
                      </span>
                      <span
                        className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase ${
                          workshop ? "bg-rose-500/15 text-rose-200" : "bg-violet-500/15 text-violet-200"
                        }`}
                      >
                        {workshop ? (
                          <CalendarDays className="h-3 w-3" aria-hidden />
                        ) : (
                          <Radio className="h-3 w-3" aria-hidden />
                        )}
                        {workshop ? "Workshop" : "Tutor-led"}
                      </span>
                    </div>
                    <p className="mt-0.5 font-mono text-[10px] text-gray-500">{p.slug}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={programLandingPath(p)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1 text-[10px] text-gray-300 hover:bg-white/5"
                    >
                      <ExternalLink className="h-3 w-3" /> View
                    </Link>
                    <Link
                      href={adminEditorPanel(p)}
                      className="inline-flex items-center gap-1 rounded-lg border border-violet-500/30 bg-violet-500/10 px-2.5 py-1 text-[10px] text-violet-200 hover:bg-violet-500/20"
                    >
                      Full editor <ChevronRight className="h-3 w-3" />
                    </Link>
                  </div>
                </div>

                {draft ? (
                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    <label className="block">
                      <span className="text-[11px] text-gray-500">Next batch date</span>
                      <input
                        value={draft.nextBatchDate}
                        onChange={(e) => patchDraft(p.slug, { nextBatchDate: e.target.value })}
                        placeholder="e.g. 15 Jul 2026"
                        className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs text-white outline-none focus:border-amber-500/40"
                      />
                    </label>
                    <label className="block">
                      <span className="text-[11px] text-gray-500">Batch label</span>
                      <input
                        value={draft.batchLabel}
                        onChange={(e) => patchDraft(p.slug, { batchLabel: e.target.value })}
                        placeholder="e.g. July 2026 batch"
                        className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs text-white outline-none focus:border-amber-500/40"
                      />
                    </label>
                    <label className="block md:col-span-1">
                      <span className="text-[11px] text-gray-500">Schedule line</span>
                      <input
                        value={draft.schedule}
                        onChange={(e) => patchDraft(p.slug, { schedule: e.target.value })}
                        placeholder="e.g. Mon–Fri · 7–9 PM IST"
                        className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs text-white outline-none focus:border-amber-500/40"
                      />
                    </label>
                  </div>
                ) : null}

                <div className="mt-3 flex justify-end">
                  <button
                    type="button"
                    disabled={!dirty || savingSlug === p.slug}
                    onClick={() => void saveBatch(p)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {savingSlug === p.slug ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Save className="h-3.5 w-3.5" />
                    )}
                    Save batch
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
