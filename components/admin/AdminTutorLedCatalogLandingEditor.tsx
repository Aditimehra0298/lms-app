"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Award,
  Check,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  HelpCircle,
  Image as ImageIcon,
  LayoutDashboard,
  Loader2,
  Plus,
  Save,
  Sparkles,
  Trash2,
  Users,
  Video,
  X,
} from "lucide-react";
import AdminImageUrlUpload from "@/components/admin/AdminImageUrlUpload";
import FoodTutorLedCatalogLanding from "@/components/FoodTutorLedCatalogLanding";
import Iso22000CourseLanding from "@/components/Iso22000CourseLanding";
import type {
  TutorLedCatalogBatchRow,
  TutorLedCatalogLandingStored,
  TutorLedCatalogPageConfig,
  TutorLedCatalogProgramCard,
  TutorLedCatalogTheme,
} from "@/lib/content-schema";
import { mergeTutorLedCatalogPageConfig } from "@/lib/content-schema";
import { uploadAdminImageFile } from "@/lib/admin-upload-image";
import {
  applyLiveProgramsToCatalogPage,
  buildLiveCatalogBatchRows,
} from "@/lib/tutor-led-catalog-batches";
import { slugifyTutorLedCatalog, tutorLedCatalogPublicHref } from "@/lib/tutor-led-catalog-landings";
import { liveTutorCourseHref } from "@/lib/tutor-led-routes";
import { tutorLedLandingCopy } from "@/lib/iso-22000-landing-copy";
import type { TutorLedProgramStored } from "@/lib/default-tutor-led-programs";
import { ensureIso22000TutorLedPrograms, ISO_22000_TUTOR_LED_TEMPLATES } from "@/lib/iso-22000-tutor-led-seed";
import { AdminTutorLedLevelSteps, type TutorLedLevelStep } from "@/components/admin/AdminTutorLedLevelSteps";
import { programHasAnySessionZoom } from "@/lib/zoom-meeting";
import { AdminTutorLedSessionZoomList } from "@/components/admin/AdminTutorLedSessionZoomList";
import { syncProgramBatchFromSchedule } from "@/lib/tutor-led-batches";
import { extractScheduleTime } from "@/lib/my-learning-dashboard-events";
import {
  applyTrainingDays,
  catalogDurationLabel,
  getCurriculumSessionCount,
  parseTrainingDaysLabel,
} from "@/lib/tutor-led-training-schedule";

type SectionKey = "hero" | "programs" | "why" | "audience" | "batches" | "trainer" | "faqs" | "cta" | "basics";

type CourseStep = "course" | "levels" | TutorLedLevelStep | "publish" | "landing" | "batch-landing";

const COURSE_STEPS: { id: CourseStep; label: string }[] = [
  { id: "course", label: "Course" },
  { id: "levels", label: "Levels" },
  { id: "zoom", label: "Zoom & batch" },
  { id: "pricing", label: "Pricing" },
  { id: "assessment", label: "Final assessment" },
  { id: "students", label: "Students" },
  { id: "certificate", label: "Certificate" },
  { id: "publish", label: "Publish" },
  { id: "landing", label: "Landing design" },
  { id: "batch-landing", label: "Batch landing" },
];

type Props = {
  catalog: TutorLedCatalogLandingStored;
  categories: { slug: string; title: string }[];
  programs?: TutorLedProgramStored[];
  saving?: boolean;
  saved?: boolean;
  error?: string | null;
  onBack: () => void;
  onChange: (next: TutorLedCatalogLandingStored) => void;
  onProgramsChange?: (next: TutorLedProgramStored[]) => void;
  onSave: (catalog: TutorLedCatalogLandingStored) => void | Promise<void>;
};

const SECTIONS: { id: SectionKey; label: string; icon: typeof Sparkles }[] = [
  { id: "basics", label: "Catalog basics", icon: LayoutDashboard },
  { id: "hero", label: "Hero", icon: Sparkles },
  { id: "programs", label: "Training levels", icon: LayoutDashboard },
  { id: "why", label: "Why train with us", icon: Video },
  { id: "audience", label: "Who should attend", icon: Users },
  { id: "batches", label: "Upcoming batches", icon: Award },
  { id: "trainer", label: "Trainer", icon: Users },
  { id: "faqs", label: "FAQs", icon: HelpCircle },
  { id: "cta", label: "Bottom CTA", icon: ImageIcon },
];

const THEMES: TutorLedCatalogTheme[] = ["emerald", "sky", "violet", "gold"];

const inputCls =
  "w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none transition focus:border-amber-400/50";
const labelCls = "mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-gray-500";
const itemCls = "rounded-xl border border-white/[0.07] bg-black/30 p-3";

function blankProgram(): TutorLedCatalogProgramCard {
  return {
    id: `level-${Date.now()}`,
    title: "New level",
    tagline: "",
    bullets: [""],
    price: 9999,
    theme: "emerald",
    icon: "ShieldCheck",
    thumbnail: "/tutor-led-iso-hero.png",
    enrollSlug: "",
    matchPattern: "",
    durationLabel: "Duration: 5 Days",
    modeLabel: "Mode: Live Online",
    certificateLabel: "Certificate Included",
  };
}

export default function AdminTutorLedCatalogLandingEditor({
  catalog,
  categories,
  programs = [],
  saving = false,
  saved = false,
  error = null,
  onBack,
  onChange,
  onProgramsChange,
  onSave,
}: Props) {
  const page = mergeTutorLedCatalogPageConfig(catalog.page);
  const [step, setStep] = useState<CourseStep>("course");
  const [previewOpen, setPreviewOpen] = useState(true);
  const [open, setOpen] = useState<SectionKey | null>("hero");
  const [levelIndex, setLevelIndex] = useState(0);
  const [uploading, setUploading] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  const patchCatalog = (patch: Partial<TutorLedCatalogLandingStored>) =>
    onChange({ ...catalog, ...patch });

  const setPage = (updater: (p: TutorLedCatalogPageConfig) => TutorLedCatalogPageConfig) => {
    const next = updater(page);
    onChange({
      ...catalog,
      page: {
        ...next,
        pageThumbnail: next.hero.backgroundImage?.trim() || next.pageThumbnail,
      },
    });
  };

  const patchHero = (patch: Partial<TutorLedCatalogPageConfig["hero"]>) =>
    setPage((p) => ({ ...p, hero: { ...p.hero, ...patch } }));

  const upload = async (key: string, file: File, apply: (url: string) => void) => {
    setUploading(key);
    setLocalError(null);
    try {
      apply(await uploadAdminImageFile(file));
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(null);
    }
  };

  const displayError = error || localError;
  const publicHref = tutorLedCatalogPublicHref(catalog.slug);
  const selectedCard = page.programs[levelIndex] ?? page.programs[0] ?? null;
  const selectedProgram =
    programs.find((p) => p.slug === selectedCard?.enrollSlug?.trim()) ?? null;

  const programForCard = (card: TutorLedCatalogProgramCard): TutorLedProgramStored => {
    const slug = card.enrollSlug.trim() || slugifyTutorLedCatalog(card.title) || card.id;
    const existing = programs.find((p) => p.slug === slug);
    if (existing) return existing;
    const seeded = ISO_22000_TUTOR_LED_TEMPLATES.find((tpl) => tpl.slug === slug);
    const base = JSON.parse(
      JSON.stringify(seeded ?? ISO_22000_TUTOR_LED_TEMPLATES[0]),
    ) as TutorLedProgramStored;
    return {
      ...base,
      slug,
      title: card.title || base.title,
      subtitle: card.tagline || base.subtitle,
      price: card.price || base.price,
      liveJoinUrl: "",
      zoomMeetingId: "",
      zoomPasscode: "",
      curriculum: (base.curriculum ?? []).map((row) => ({
        ...row,
        liveJoinUrl: "",
        zoomMeetingId: "",
        zoomPasscode: "",
      })),
    };
  };

  const designedProgram = selectedCard ? selectedProgram ?? programForCard(selectedCard) : null;

  const saveLevelProgram = (cardIndex: number, next: TutorLedProgramStored) => {
    const durationLabel = catalogDurationLabel(getCurriculumSessionCount(next));
    const withBatch = syncProgramBatchFromSchedule(next);
    const list = programs.some((p) => p.slug === withBatch.slug)
      ? programs.map((p) => (p.slug === withBatch.slug ? withBatch : p))
      : [...programs, withBatch];
    onProgramsChange?.(list);
    setPage((p) => ({
      ...p,
      programs: p.programs.map((row, idx) =>
        idx === cardIndex
          ? { ...row, enrollSlug: next.slug, title: next.title, price: next.price, durationLabel }
          : row,
      ),
    }));
  };

  const updateProgram = (next: TutorLedProgramStored) => {
    const withBatch = syncProgramBatchFromSchedule(next);
    const list = programs.some((p) => p.slug === withBatch.slug)
      ? programs.map((p) => (p.slug === withBatch.slug ? withBatch : p))
      : [...programs, withBatch];
    onProgramsChange?.(list);
    if (selectedCard) {
      const durationLabel = catalogDurationLabel(getCurriculumSessionCount(withBatch));
      const extractedTime = extractScheduleTime(withBatch.schedule || "");
      const time =
        withBatch.schedule?.trim() && extractedTime && extractedTime !== "See program hub"
          ? extractedTime
          : "";
      setPage((p) => ({
        ...p,
        programs: p.programs.map((row, idx) =>
          idx === levelIndex
            ? { ...row, title: withBatch.title, price: withBatch.price, enrollSlug: withBatch.slug, durationLabel }
            : row,
        ),
        batches: {
          ...p.batches,
          rows: p.batches.rows.map((row) => {
            const slug =
              row.slug?.trim() ||
              p.programs.find((c) => c.id === row.programId || c.enrollSlug === row.programId)?.enrollSlug ||
              row.programId;
            if (slug !== withBatch.slug) return row;
            return {
              ...row,
              date: withBatch.nextBatchDate || row.date,
              time: time || row.time,
              seats: typeof withBatch.seatsLeft === "number" ? withBatch.seatsLeft : row.seats,
              durationLabel: durationLabel || row.durationLabel,
            };
          }),
        },
      }));
    }
  };

  const batchRowSlug = (row: TutorLedCatalogBatchRow): string =>
    row.slug?.trim() ||
    page.programs.find((p) => p.id === row.programId || p.enrollSlug === row.programId)?.enrollSlug ||
    row.programId;

  const syncProgramFromBatchRow = (row: TutorLedCatalogBatchRow) => {
    const slug = batchRowSlug(row);
    const live = programs.find((p) => p.slug === slug);
    if (!live || !onProgramsChange) return;
    const time = row.time.trim();
    const schedule = time
      ? live.schedule?.includes(time)
        ? live.schedule
        : live.schedule?.replace(/\([^)]*\)/, `(${time})`) || `Live (${time})`
      : live.schedule;
    onProgramsChange(
      programs.map((p) =>
        p.slug === slug
          ? syncProgramBatchFromSchedule({
              ...live,
              nextBatchDate: row.date,
              batchLabel: row.programLabel.trim() || live.batchLabel,
              seatsLeft: row.seats,
              schedule,
            })
          : p,
      ),
    );
  };

  const setBatch = (i: number, patch: Partial<TutorLedCatalogBatchRow>) => {
    const merged = { ...page.batches.rows[i], ...patch };
    setPage((p) => ({
      ...p,
      batches: {
        ...p.batches,
        rows: p.batches.rows.map((row, idx) => (idx === i ? { ...row, ...patch } : row)),
      },
    }));
    syncProgramFromBatchRow(merged);
  };

  const fillBatchesFromZoom = () => {
    const linked = page.programs
      .map((card) => programs.find((p) => p.slug === card.enrollSlug.trim()))
      .filter((p): p is TutorLedProgramStored => Boolean(p));
    const fromZoom = buildLiveCatalogBatchRows(linked);
    const rows: TutorLedCatalogBatchRow[] =
      fromZoom.length > 0
        ? fromZoom
        : page.programs.map((card) => ({
            date: "",
            time: "10:00 AM – 5:00 PM",
            programId: card.id,
            programLabel: card.title,
            seats: 12,
            slug: card.enrollSlug,
            durationLabel: card.durationLabel,
          }));
    setPage((p) => ({ ...p, batches: { ...p.batches, rows } }));
  };

  const landingFaqsFor = (program: TutorLedProgramStored) =>
    program.faqs?.length
      ? program.faqs
      : tutorLedLandingCopy(program).faqs.filter((f) => f.q !== "When is the next batch?");

  const addFourLevels = () => {
    if (catalog.slug === "iso-22000") {
      const seeded = ensureIso22000TutorLedPrograms(programs).programs;
      onProgramsChange?.(seeded);
      const existing = new Set(page.programs.map((row) => row.enrollSlug));
      const missing = ISO_22000_TUTOR_LED_TEMPLATES.filter((tpl) => !existing.has(tpl.slug)).map(
        (tpl, i) => ({
          ...blankProgram(),
          id: tpl.slug,
          title: tpl.title,
          tagline: tpl.subtitle,
          price: tpl.price,
          theme: (["emerald", "sky", "violet", "gold"] as const)[i % 4],
          enrollSlug: tpl.slug,
          popular: tpl.slug.includes("implementation"),
        }),
      );
      if (missing.length === 0 && page.programs.length > 0) return;
      setPage((p) => ({ ...p, programs: [...p.programs, ...missing] }));
      setLevelIndex(0);
      return;
    }

    const prefix = slugifyTutorLedCatalog(catalog.slug) || `catalog-${Date.now()}`;
    const have = new Set(programs.map((p) => p.slug));
    const nextPrograms = [...programs];
    const missing = ISO_22000_TUTOR_LED_TEMPLATES.map((tpl, i) => {
      const id = ["basic", "implementation", "internal-auditor", "lead-auditor"][i] ?? `level-${i}`;
      const enrollSlug = `${prefix}-${id}`;
      if (!have.has(enrollSlug)) {
        const clone = JSON.parse(JSON.stringify(tpl)) as TutorLedProgramStored;
        clone.slug = enrollSlug;
        clone.published = false;
        clone.liveJoinUrl = "";
        clone.zoomMeetingId = "";
        clone.zoomPasscode = "";
        clone.curriculum = (clone.curriculum ?? []).map((row) => ({
          ...row,
          liveJoinUrl: "",
          zoomMeetingId: "",
          zoomPasscode: "",
        }));
        clone.title = tpl.title.replace(/ISO 22000:2018/gi, "New program");
        nextPrograms.push(clone);
        have.add(enrollSlug);
      }
      return {
        ...blankProgram(),
        id,
        title: tpl.title.replace(/ISO 22000:2018/gi, "New program"),
        tagline: tpl.subtitle,
        price: tpl.price,
        theme: (["emerald", "sky", "violet", "gold"] as const)[i % 4],
        enrollSlug,
        popular: i === 1,
      };
    }).filter((row) => !page.programs.some((p) => p.enrollSlug === row.enrollSlug));
    onProgramsChange?.(nextPrograms);
    if (missing.length === 0 && page.programs.length > 0) return;
    setPage((p) => ({ ...p, programs: [...p.programs, ...missing] }));
    setLevelIndex(0);
  };

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-2xl border border-violet-500/30 bg-gradient-to-b from-[#101a32] via-[#0d1528] to-[#0a0f1c] shadow-[0_20px_60px_rgba(0,0,0,0.5)] ring-1 ring-violet-500/10">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/[0.06] bg-violet-500/[0.08] px-4 py-4 sm:px-6">
          <div>
            <button
              type="button"
              onClick={onBack}
              className="mb-2 inline-flex items-center gap-1 text-[11px] font-semibold text-violet-200 hover:text-white"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Catalog
            </button>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-violet-200/80">Course editor</p>
            <h1 className="mt-1 text-lg font-bold text-white">Edit “{catalog.cardTitle}”</h1>
            <p className="mt-2 max-w-xl text-xs leading-relaxed text-gray-400">
              Same steps as a self-paced course. Students buy from this landing and choose Basic, Implementer,
              Internal, or Lead. URL:{" "}
              <code className="rounded bg-black/40 px-1.5 py-0.5 font-mono text-[11px] text-violet-200">
                {publicHref}
              </code>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {!previewOpen ? (
              <button
                type="button"
                onClick={() => setPreviewOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-amber-400/40 px-3 py-2 text-xs font-semibold text-amber-100 hover:bg-amber-500/10"
              >
                Show landing preview
              </button>
            ) : null}
            <Link
              href={publicHref}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold text-white hover:bg-white/10"
            >
              Open public page <ExternalLink className="h-3.5 w-3.5" />
            </Link>
            <button
              type="button"
              onClick={() =>
                void onSave({
                  ...catalog,
                  page: {
                    ...page,
                    pageThumbnail: page.hero.backgroundImage?.trim() || page.pageThumbnail,
                  },
                })
              }
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#f5b942] px-4 py-2 text-xs font-semibold text-black hover:bg-[#e5a82e] disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : saved ? <Check className="h-3.5 w-3.5" /> : <Save className="h-3.5 w-3.5" />}
              {saving ? "Saving…" : saved ? "Saved" : "Save course"}
            </button>
          </div>
        </div>
        {displayError ? (
          <p className="mt-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-100">{displayError}</p>
        ) : null}
        {saved ? (
          <p className="mt-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-100">
            Saved. Refresh the public landing if it was already open in another tab.
          </p>
        ) : null}
      </section>

      <div className="flex flex-nowrap items-center gap-1 overflow-x-auto rounded-xl bg-black/35 p-1 ring-1 ring-white/[0.04]">
        {COURSE_STEPS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => {
              setStep(tab.id);
              if (tab.id === "students" || tab.id === "zoom") setPreviewOpen(false);
            }}
            className={`shrink-0 rounded-lg px-3 py-2.5 text-[11px] font-semibold transition sm:px-4 ${
              step === tab.id
                ? "bg-violet-600 text-white shadow-[0_4px_20px_rgba(111,85,255,0.35)]"
                : "text-gray-500 hover:bg-white/[0.04] hover:text-gray-200"
            }`}
          >
            {tab.id === "course" ? "Course" : tab.id === "levels" ? "Content" : tab.label}
          </button>
        ))}
      </div>

      <div className={`grid items-start gap-4 ${previewOpen && step !== "students" ? "xl:grid-cols-[minmax(0,28rem)_minmax(0,1fr)]" : ""}`}>
        <div className={`min-w-0 space-y-3 rounded-xl border border-white/10 bg-[#0d1528] p-4 ${step === "students" ? "xl:col-span-2" : ""}`}>
          {step === "course" ? (
            <div className="space-y-4">
              {renderSection("basics")}
              {renderSection("hero")}
            </div>
          ) : null}
          {step === "levels" ? (
            <div className="space-y-4">
              <p className="text-xs text-gray-400">
                Students stay on this landing and pick a level. Enroll opens checkout for that level only.
              </p>
              <button
                type="button"
                onClick={addFourLevels}
                className="rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-500"
              >
                Add Basic, Implementer, Internal, Lead
              </button>
              <div className="grid gap-2">
                {page.programs.map((program, i) => {
                  const live = programs.find((p) => p.slug === program.enrollSlug);
                  const active = i === levelIndex;
                  return (
                    <button
                      key={program.id}
                      type="button"
                      onClick={() => setLevelIndex(i)}
                      className={`rounded-xl border px-3 py-3 text-left ${
                        active ? "border-violet-400/60 bg-violet-500/10" : "border-white/10 bg-black/20"
                      }`}
                    >
                      <p className="text-sm font-semibold text-white">{program.title || `Level ${i + 1}`}</p>
                      <p className="mt-1 text-[11px] text-gray-400">
                        {program.enrollSlug || "No Zoom course linked"}
                        {live?.nextBatchDate ? ` · Batch ${live.nextBatchDate}` : ""}
                        {live ? ` · ${getCurriculumSessionCount(live)} day${getCurriculumSessionCount(live) === 1 ? "" : "s"}` : ""}
                        {live && programHasAnySessionZoom(live) ? " · Zoom set" : " · Zoom missing"}
                      </p>
                    </button>
                  );
                })}
              </div>
              {renderSection("programs")}
            </div>
          ) : null}
          {step === "zoom" ? (
            <div className="space-y-3">
              <p className="text-xs text-gray-400">
                <strong className="text-gray-200">1.</strong> Set how many training days.{" "}
                <strong className="text-gray-200">2.</strong> Set the batch date and class time.{" "}
                <strong className="text-gray-200">3.</strong> Paste a <strong className="text-gray-200">different</strong>{" "}
                Zoom link on each day. Catalog card duration follows training days. Upcoming batch dates, times,
                and seats on the public landing are edited in <strong className="text-gray-200">Landing design → Upcoming batches</strong>.
              </p>
              {page.programs.length === 0 ? (
                <p className="text-sm text-amber-100">Add levels first, then choose training days and Zoom links.</p>
              ) : (
                page.programs.map((card, i) => {
                  const live = programForCard(card);
                  const days = getCurriculumSessionCount(live);
                  return (
                    <div key={card.id} className="space-y-3 rounded-xl border border-sky-500/25 bg-sky-500/5 p-3">
                      <p className="text-sm font-semibold text-white">{card.title || `Level ${i + 1}`}</p>
                      <p className="text-[11px] text-gray-500">{live.slug}</p>
                      <label className="block">
                        <span className="text-[11px] font-semibold text-sky-200">1. How many days of training?</span>
                        <input
                          type="number"
                          min={1}
                          max={30}
                          className={inputCls}
                          value={
                            live.trainingDays ??
                            parseTrainingDaysLabel(card.durationLabel) ??
                            days
                          }
                          onChange={(e) =>
                            saveLevelProgram(i, applyTrainingDays(live, Number(e.target.value) || 1))
                          }
                        />
                        <p className="mt-1 text-[10px] text-gray-500">
                          Landing shows {catalogDurationLabel(days)}. Day 1–{days} plus the final exam.
                        </p>
                      </label>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <label className="block">
                          <span className="text-[11px] text-gray-500">2. Batch start date</span>
                          <input
                            className={inputCls}
                            value={live.nextBatchDate}
                            onChange={(e) => saveLevelProgram(i, { ...live, nextBatchDate: e.target.value })}
                            placeholder="12 Oct 2026"
                          />
                        </label>
                        <label className="block">
                          <span className="text-[11px] text-gray-500">Schedule / time</span>
                          <input
                            className={inputCls}
                            value={live.schedule}
                            onChange={(e) => saveLevelProgram(i, { ...live, schedule: e.target.value })}
                            placeholder="Mon–Fri (10:00 AM – 5:00 PM IST)"
                          />
                        </label>
                        <label className="block sm:col-span-2">
                          <span className="text-[11px] text-gray-500">Batch name</span>
                          <input
                            className={inputCls}
                            value={live.batchLabel}
                            onChange={(e) => saveLevelProgram(i, { ...live, batchLabel: e.target.value })}
                          />
                        </label>
                      </div>
                      <div className="rounded-lg border border-sky-500/20 bg-black/20 p-3">
                        <p className="mb-2 text-[11px] font-semibold text-sky-200">
                          3. Zoom link for each day (unique — not the same meeting)
                        </p>
                        <AdminTutorLedSessionZoomList
                          program={live}
                          onChange={(next) => saveLevelProgram(i, next)}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          ) : null}
          {step === "pricing" || step === "assessment" || step === "students" || step === "certificate" ? (
            <div className="space-y-3">
              {step === "students" ? (
                <div className="flex flex-wrap gap-2">
                  {page.programs.map((card, i) => (
                    <button
                      key={card.id}
                      type="button"
                      onClick={() => setLevelIndex(i)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                        i === levelIndex ? "bg-violet-600 text-white" : "border border-white/15 text-gray-300"
                      }`}
                    >
                      {card.title || `Level ${i + 1}`}
                    </button>
                  ))}
                </div>
              ) : null}
              <AdminTutorLedLevelSteps
                step={step}
                program={selectedProgram}
                onChange={updateProgram}
              />
            </div>
          ) : null}
          {step === "publish" ? (
            <div className="space-y-3 text-sm text-gray-300">
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={catalog.published}
                  onChange={(e) => patchCatalog({ published: e.target.checked })}
                />
                Publish this landing (one thumbnail on the category page)
              </label>
              <p className="text-xs text-gray-500">
                Save after Zoom, price, and assessment are set on each level. Publishing this landing also
                publishes the linked Zoom levels so enrolled learners see Join on their dashboard.
              </p>
            </div>
          ) : null}
          {step === "landing" ? (
            <div className="space-y-3">
              {SECTIONS.filter((section) => section.id !== "basics" && section.id !== "programs").map((section) => {
                const Icon = section.icon;
                const expanded = open === section.id;
                return (
                  <section key={section.id} className="overflow-hidden rounded-xl border border-white/10">
                    <button
                      type="button"
                      onClick={() => setOpen(expanded ? null : section.id)}
                      className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left"
                    >
                      <span className="inline-flex items-center gap-2 text-sm font-semibold text-white">
                        <Icon className="h-4 w-4 text-amber-300" />
                        {section.label}
                      </span>
                      {expanded ? <ChevronUp className="h-4 w-4 text-gray-500" /> : <ChevronDown className="h-4 w-4 text-gray-500" />}
                    </button>
                    {expanded ? <div className="space-y-4 border-t border-white/10 px-3 py-3">{renderSection(section.id)}</div> : null}
                  </section>
                );
              })}
            </div>
          ) : null}
          {step === "batch-landing" ? (
            <div className="space-y-4">
              <p className="text-xs leading-relaxed text-gray-400">
                Design the Description page for each level at{" "}
                <code className="rounded bg-black/40 px-1 font-mono text-[11px] text-violet-200">/tutor-led/[slug]</code>.
                Pick a level, then edit hero, about, outcomes, FAQs, and the next batch shown on that page.
              </p>
              {page.programs.length === 0 ? (
                <p className="text-sm text-amber-100">Add levels first, then design each batch landing.</p>
              ) : (
                <>
                  <div className="flex flex-wrap gap-2">
                    {page.programs.map((card, i) => (
                      <button
                        key={card.id}
                        type="button"
                        onClick={() => setLevelIndex(i)}
                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                          i === levelIndex ? "bg-violet-600 text-white" : "border border-white/15 text-gray-300"
                        }`}
                      >
                        {card.title || `Level ${i + 1}`}
                      </button>
                    ))}
                  </div>
                  {designedProgram ? (
                    <div className="space-y-3">
                      <div className="grid gap-2 sm:grid-cols-2">
                        <label className="block sm:col-span-2">
                          <span className={labelCls}>Title</span>
                          <input
                            className={inputCls}
                            value={designedProgram.title}
                            onChange={(e) => updateProgram({ ...designedProgram, title: e.target.value })}
                          />
                        </label>
                        <label className="block sm:col-span-2">
                          <span className={labelCls}>Tagline</span>
                          <input
                            className={inputCls}
                            value={designedProgram.subtitle}
                            onChange={(e) => updateProgram({ ...designedProgram, subtitle: e.target.value })}
                          />
                        </label>
                        <label className="block">
                          <span className={labelCls}>Badge</span>
                          <input
                            className={inputCls}
                            value={designedProgram.badge}
                            onChange={(e) => updateProgram({ ...designedProgram, badge: e.target.value })}
                          />
                        </label>
                        <label className="block">
                          <span className={labelCls}>Next batch date</span>
                          <input
                            className={inputCls}
                            value={designedProgram.nextBatchDate}
                            onChange={(e) => updateProgram({ ...designedProgram, nextBatchDate: e.target.value })}
                            placeholder="12 Oct 2026"
                          />
                        </label>
                        <label className="block">
                          <span className={labelCls}>Schedule / time</span>
                          <input
                            className={inputCls}
                            value={designedProgram.schedule}
                            onChange={(e) => updateProgram({ ...designedProgram, schedule: e.target.value })}
                            placeholder="Mon–Fri (10:00 AM – 5:00 PM IST)"
                          />
                        </label>
                        <label className="block">
                          <span className={labelCls}>Seats left</span>
                          <input
                            type="number"
                            min={0}
                            className={inputCls}
                            value={designedProgram.seatsLeft}
                            onChange={(e) =>
                              updateProgram({ ...designedProgram, seatsLeft: Number(e.target.value) || 0 })
                            }
                          />
                        </label>
                      </div>
                      <AdminImageUrlUpload
                        label="Description hero image"
                        value={designedProgram.heroSrc ?? ""}
                        onChange={(url) => updateProgram({ ...designedProgram, heroSrc: url, learnerHeroSrc: url })}
                        uploading={uploading === "batch-hero"}
                        onUploadFile={(file) =>
                          upload("batch-hero", file, (url) =>
                            updateProgram({ ...designedProgram, heroSrc: url, learnerHeroSrc: url }),
                          )
                        }
                      />
                      <label className="block">
                        <span className={labelCls}>About this batch</span>
                        <textarea
                          className={inputCls}
                          rows={6}
                          value={designedProgram.landingAbout ?? tutorLedLandingCopy(designedProgram).about}
                          onChange={(e) => updateProgram({ ...designedProgram, landingAbout: e.target.value })}
                        />
                      </label>
                      <label className="block">
                        <span className={labelCls}>What you will learn (one per line)</span>
                        <textarea
                          className={inputCls}
                          rows={4}
                          value={(designedProgram.landingAbout?.trim() && designedProgram.highlights?.length
                            ? designedProgram.highlights
                            : tutorLedLandingCopy(designedProgram).highlights
                          ).join("\n")}
                          onChange={(e) =>
                            updateProgram({
                              ...designedProgram,
                              landingAbout: designedProgram.landingAbout ?? tutorLedLandingCopy(designedProgram).about,
                              highlights: e.target.value.split("\n").map((line) => line.trim()).filter(Boolean),
                            })
                          }
                        />
                      </label>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <input
                          className={inputCls}
                          value={designedProgram.trainer.name}
                          onChange={(e) =>
                            updateProgram({
                              ...designedProgram,
                              trainer: { ...designedProgram.trainer, name: e.target.value },
                            })
                          }
                          placeholder="Trainer name"
                        />
                        <input
                          className={inputCls}
                          value={designedProgram.trainer.role}
                          onChange={(e) =>
                            updateProgram({
                              ...designedProgram,
                              trainer: { ...designedProgram.trainer, role: e.target.value },
                            })
                          }
                          placeholder="Trainer role"
                        />
                      </div>
                      <textarea
                        className={inputCls}
                        rows={3}
                        value={designedProgram.trainer.bio}
                        onChange={(e) =>
                          updateProgram({
                            ...designedProgram,
                            trainer: { ...designedProgram.trainer, bio: e.target.value },
                          })
                        }
                        placeholder="Trainer bio"
                      />
                      <div className="space-y-2">
                        <p className={labelCls}>FAQs on this landing</p>
                        {landingFaqsFor(designedProgram).map((faq, i) => (
                          <div key={`${faq.q}-${i}`} className={`${itemCls} space-y-2`}>
                            <input
                              className={inputCls}
                              value={faq.q}
                              onChange={(e) =>
                                updateProgram({
                                  ...designedProgram,
                                  faqs: landingFaqsFor(designedProgram).map((row, idx) =>
                                    idx === i ? { ...row, q: e.target.value } : row,
                                  ),
                                })
                              }
                              placeholder="Question"
                            />
                            <textarea
                              className={inputCls}
                              rows={2}
                              value={faq.a}
                              onChange={(e) =>
                                updateProgram({
                                  ...designedProgram,
                                  faqs: landingFaqsFor(designedProgram).map((row, idx) =>
                                    idx === i ? { ...row, a: e.target.value } : row,
                                  ),
                                })
                              }
                              placeholder="Answer"
                            />
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() =>
                            updateProgram({
                              ...designedProgram,
                              faqs: [...landingFaqsFor(designedProgram), { q: "New question?", a: "" }],
                            })
                          }
                          className="inline-flex items-center gap-1 text-xs font-semibold text-amber-200"
                        >
                          <Plus className="h-3.5 w-3.5" /> Add FAQ
                        </button>
                      </div>
                      <Link
                        href={`${liveTutorCourseHref(designedProgram.slug)}?preview=1`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-violet-200 hover:text-white"
                      >
                        Open public Description page <ExternalLink className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  ) : null}
                </>
              )}
            </div>
          ) : null}
        </div>

        {previewOpen ? (
        <div className="sticky top-4 min-w-0 overflow-hidden rounded-xl border border-amber-400/25 bg-black xl:max-h-[calc(100vh-6rem)] xl:overflow-auto">
          <div className="flex items-center justify-between gap-2 border-b border-white/10 bg-[#0b1224] px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-300">
              {step === "batch-landing" ? "Batch landing preview" : "Landing preview"}
            </p>
            <button
              type="button"
              onClick={() => setPreviewOpen(false)}
              className="inline-flex items-center gap-1 rounded-lg border border-white/15 px-2 py-1 text-[11px] font-semibold text-gray-200 hover:bg-white/10"
              aria-label="Close landing preview"
            >
              <X className="h-3.5 w-3.5" />
              Close
            </button>
          </div>
          {step === "batch-landing" && designedProgram ? (
            <Iso22000CourseLanding program={designedProgram} />
          ) : (
            <FoodTutorLedCatalogLanding page={applyLiveProgramsToCatalogPage(page, programs, true)} />
          )}
        </div>
        ) : null}
      </div>
    </div>
  );

  function renderSection(id: SectionKey) {
    if (id === "basics") {
      return (
        <>
          <label className="block">
            <span className={labelCls}>Card title (category thumbnail)</span>
            <input
              className={inputCls}
              value={catalog.cardTitle}
              onChange={(e) => patchCatalog({ cardTitle: e.target.value })}
            />
          </label>
          <label className="block">
            <span className={labelCls}>URL slug</span>
            <input
              className={inputCls}
              value={catalog.slug}
              onChange={(e) => patchCatalog({ slug: slugifyTutorLedCatalog(e.target.value) || catalog.slug })}
            />
            <p className="mt-1 text-[10px] text-gray-500">{publicHref}</p>
          </label>
          <label className="block">
            <span className={labelCls}>Category page</span>
            <select
              className={inputCls}
              value={catalog.category}
              onChange={(e) => patchCatalog({ category: e.target.value })}
            >
              {categories.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.title}
                </option>
              ))}
            </select>
          </label>
          <label className="inline-flex items-center gap-2 text-xs text-gray-200">
            <input
              type="checkbox"
              checked={catalog.published}
              onChange={(e) => patchCatalog({ published: e.target.checked })}
            />
            Published (show thumbnail + public landing)
          </label>
        </>
      );
    }

    if (id === "hero") {
      return (
        <>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="block">
              <span className={labelCls}>Eyebrow</span>
              <input className={inputCls} value={page.hero.eyebrow} onChange={(e) => patchHero({ eyebrow: e.target.value })} />
            </label>
            <label className="block">
              <span className={labelCls}>Heading</span>
              <input className={inputCls} value={page.hero.heading} onChange={(e) => patchHero({ heading: e.target.value })} />
            </label>
            <label className="block">
              <span className={labelCls}>Gold highlight</span>
              <input className={inputCls} value={page.hero.headingHighlight} onChange={(e) => patchHero({ headingHighlight: e.target.value })} />
            </label>
            <label className="block">
              <span className={labelCls}>CTA button</span>
              <input className={inputCls} value={page.hero.ctaText} onChange={(e) => patchHero({ ctaText: e.target.value })} />
            </label>
          </div>
          <label className="block">
            <span className={labelCls}>Subtitle</span>
            <textarea className={inputCls} rows={3} value={page.hero.subtitle} onChange={(e) => patchHero({ subtitle: e.target.value })} />
          </label>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="block">
              <span className={labelCls}>Quote on photo</span>
              <input className={inputCls} value={page.hero.asideQuote} onChange={(e) => patchHero({ asideQuote: e.target.value })} />
            </label>
            <label className="block">
              <span className={labelCls}>Cert card title</span>
              <input className={inputCls} value={page.hero.certCardTitle} onChange={(e) => patchHero({ certCardTitle: e.target.value })} />
            </label>
            <label className="block">
              <span className={labelCls}>Cert card subtitle</span>
              <input className={inputCls} value={page.hero.certCardSubtitle} onChange={(e) => patchHero({ certCardSubtitle: e.target.value })} />
            </label>
            <label className="block">
              <span className={labelCls}>Cert quote</span>
              <input className={inputCls} value={page.hero.certCardQuote} onChange={(e) => patchHero({ certCardQuote: e.target.value })} />
            </label>
          </div>
          <AdminImageUrlUpload
            label="Hero / catalog thumbnail"
            value={page.hero.backgroundImage}
            onChange={(url) => patchHero({ backgroundImage: url })}
            uploading={uploading === "hero"}
            onUploadFile={(file) => upload("hero", file, (url) => patchHero({ backgroundImage: url }))}
            hint="Used on the landing hero and as the category card thumbnail."
          />
          <div className="space-y-2">
            <p className={labelCls}>Hero chips</p>
            {page.hero.chips.map((chip, i) => (
              <div key={`${chip.label}-${i}`} className={`${itemCls} grid gap-2 md:grid-cols-[140px_1fr_auto]`}>
                <input className={inputCls} value={chip.icon} onChange={(e) => patchHero({ chips: page.hero.chips.map((c, idx) => (idx === i ? { ...c, icon: e.target.value } : c)) })} placeholder="Lucide icon" />
                <input className={inputCls} value={chip.label} onChange={(e) => patchHero({ chips: page.hero.chips.map((c, idx) => (idx === i ? { ...c, label: e.target.value } : c)) })} placeholder="Label" />
                <button type="button" onClick={() => patchHero({ chips: page.hero.chips.filter((_, idx) => idx !== i) })} className="rounded-lg border border-rose-500/30 px-2 text-rose-200">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => patchHero({ chips: [...page.hero.chips, { icon: "Award", label: "New chip" }] })}
              className="inline-flex items-center gap-1 text-xs font-semibold text-amber-200"
            >
              <Plus className="h-3.5 w-3.5" /> Add chip
            </button>
          </div>
        </>
      );
    }

    if (id === "programs") {
      return (
        <>
          <label className="block">
            <span className={labelCls}>Section title</span>
            <input className={inputCls} value={page.programsSection.title} onChange={(e) => setPage((p) => ({ ...p, programsSection: { ...p.programsSection, title: e.target.value } }))} />
          </label>
          <label className="block">
            <span className={labelCls}>Section subtitle</span>
            <textarea className={inputCls} rows={2} value={page.programsSection.subtitle} onChange={(e) => setPage((p) => ({ ...p, programsSection: { ...p.programsSection, subtitle: e.target.value } }))} />
          </label>
          {page.programs.map((program, i) => (
            <div key={program.id} className={`${itemCls} space-y-3`}>
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-white">Level {i + 1}</p>
                <label className="inline-flex items-center gap-2 text-xs text-gray-300">
                  <input
                    type="checkbox"
                    checked={Boolean(program.popular)}
                    onChange={(e) =>
                      setPage((p) => ({
                        ...p,
                        programs: p.programs.map((row, idx) => (idx === i ? { ...row, popular: e.target.checked } : row)),
                      }))
                    }
                  />
                  Most popular
                </label>
              </div>
              <div className="grid gap-2 md:grid-cols-2">
                <input className={inputCls} value={program.title} onChange={(e) => setProgram(i, { title: e.target.value })} placeholder="Title" />
                <input className={inputCls} value={program.tagline} onChange={(e) => setProgram(i, { tagline: e.target.value })} placeholder="Tagline" />
                <input className={inputCls} type="number" value={program.price} onChange={(e) => setProgram(i, { price: Number(e.target.value) || 0 })} placeholder="Price INR" />
                <select className={inputCls} value={program.theme} onChange={(e) => setProgram(i, { theme: e.target.value as TutorLedCatalogTheme })}>
                  {THEMES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                <input className={inputCls} value={program.icon} onChange={(e) => setProgram(i, { icon: e.target.value })} placeholder="Icon (ShieldCheck)" />
                <input className={inputCls} value={program.enrollSlug} onChange={(e) => setProgram(i, { enrollSlug: e.target.value })} placeholder="Enroll slug (iso-22000-basic)" />
                <label className="block md:col-span-1">
                  <span className="mb-1 block text-[10px] text-gray-500">Training days</span>
                  <input
                    className={inputCls}
                    type="number"
                    min={1}
                    max={30}
                    value={
                      programForCard(program).trainingDays ??
                      parseTrainingDaysLabel(program.durationLabel) ??
                      getCurriculumSessionCount(programForCard(program))
                    }
                    onChange={(e) =>
                      saveLevelProgram(i, applyTrainingDays(programForCard(program), Number(e.target.value) || 1))
                    }
                  />
                </label>
                <input className={inputCls} value={program.modeLabel} onChange={(e) => setProgram(i, { modeLabel: e.target.value })} />
                <input className={inputCls} value={program.certificateLabel} onChange={(e) => setProgram(i, { certificateLabel: e.target.value })} />
              </div>
              <label className="block">
                <span className={labelCls}>Bullets (one per line)</span>
                <textarea
                  className={inputCls}
                  rows={4}
                  value={program.bullets.join("\n")}
                  onChange={(e) => setProgram(i, { bullets: e.target.value.split("\n") })}
                />
              </label>
              <AdminImageUrlUpload
                label="Card thumbnail (optional)"
                value={program.thumbnail}
                onChange={(url) => setProgram(i, { thumbnail: url })}
                uploading={uploading === `prog-${i}`}
                onUploadFile={(file) => upload(`prog-${i}`, file, (url) => setProgram(i, { thumbnail: url }))}
              />
              <button type="button" onClick={() => setPage((p) => ({ ...p, programs: p.programs.filter((_, idx) => idx !== i) }))} className="text-xs text-rose-300">
                Remove level
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setPage((p) => ({ ...p, programs: [...p.programs, blankProgram()] }))}
            className="inline-flex items-center gap-1 text-xs font-semibold text-amber-200"
          >
            <Plus className="h-3.5 w-3.5" /> Add training level
          </button>
        </>
      );
    }

    if (id === "why") {
      return (
        <>
          <div className="grid gap-2 md:grid-cols-3">
            <input className={inputCls} value={page.why.eyebrow} onChange={(e) => setPage((p) => ({ ...p, why: { ...p.why, eyebrow: e.target.value } }))} placeholder="Eyebrow" />
            <input className={inputCls} value={page.why.titleLine1} onChange={(e) => setPage((p) => ({ ...p, why: { ...p.why, titleLine1: e.target.value } }))} placeholder="Title line 1" />
            <input className={inputCls} value={page.why.titleLine2} onChange={(e) => setPage((p) => ({ ...p, why: { ...p.why, titleLine2: e.target.value } }))} placeholder="Title line 2" />
          </div>
          {page.why.items.map((item, i) => (
            <div key={`${item.title}-${i}`} className={`${itemCls} grid gap-2 md:grid-cols-[120px_1fr_1fr_auto]`}>
              <input className={inputCls} value={item.icon} onChange={(e) => setWhyItem(i, { icon: e.target.value })} placeholder="Icon" />
              <input className={inputCls} value={item.title} onChange={(e) => setWhyItem(i, { title: e.target.value })} placeholder="Title" />
              <input className={inputCls} value={item.desc} onChange={(e) => setWhyItem(i, { desc: e.target.value })} placeholder="Description" />
              <button type="button" onClick={() => setPage((p) => ({ ...p, why: { ...p.why, items: p.why.items.filter((_, idx) => idx !== i) } }))} className="text-rose-300">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setPage((p) => ({ ...p, why: { ...p.why, items: [...p.why.items, { icon: "Award", title: "New reason", desc: "" }] } }))}
            className="inline-flex items-center gap-1 text-xs font-semibold text-amber-200"
          >
            <Plus className="h-3.5 w-3.5" /> Add reason
          </button>
        </>
      );
    }

    if (id === "audience") {
      return (
        <>
          <input className={inputCls} value={page.audience.eyebrow} onChange={(e) => setPage((p) => ({ ...p, audience: { ...p.audience, eyebrow: e.target.value } }))} placeholder="Eyebrow" />
          <input className={inputCls} value={page.audience.title} onChange={(e) => setPage((p) => ({ ...p, audience: { ...p.audience, title: e.target.value } }))} placeholder="Title" />
          <textarea className={inputCls} rows={2} value={page.audience.subtitle} onChange={(e) => setPage((p) => ({ ...p, audience: { ...p.audience, subtitle: e.target.value } }))} />
          <input className={inputCls} value={page.audience.investTitle} onChange={(e) => setPage((p) => ({ ...p, audience: { ...p.audience, investTitle: e.target.value } }))} placeholder="Invest title" />
          <textarea className={inputCls} rows={2} value={page.audience.investBody} onChange={(e) => setPage((p) => ({ ...p, audience: { ...p.audience, investBody: e.target.value } }))} />
          <AdminImageUrlUpload
            label="Invest in knowledge image"
            value={page.audience.investImage}
            onChange={(url) => setPage((p) => ({ ...p, audience: { ...p.audience, investImage: url } }))}
            uploading={uploading === "invest"}
            onUploadFile={(file) =>
              upload("invest", file, (url) =>
                setPage((p) => ({ ...p, audience: { ...p.audience, investImage: url } })),
              )
            }
          />
          {page.audience.items.map((item, i) => (
            <div key={`${item.label}-${i}`} className={`${itemCls} grid gap-2 md:grid-cols-[140px_1fr_auto]`}>
              <input className={inputCls} value={item.icon} onChange={(e) => setAudienceItem(i, { icon: e.target.value })} />
              <input className={inputCls} value={item.label} onChange={(e) => setAudienceItem(i, { label: e.target.value })} />
              <button type="button" onClick={() => setPage((p) => ({ ...p, audience: { ...p.audience, items: p.audience.items.filter((_, idx) => idx !== i) } }))} className="text-rose-300">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setPage((p) => ({ ...p, audience: { ...p.audience, items: [...p.audience.items, { icon: "Users", label: "New audience" }] } }))}
            className="inline-flex items-center gap-1 text-xs font-semibold text-amber-200"
          >
            <Plus className="h-3.5 w-3.5" /> Add audience
          </button>
        </>
      );
    }

    if (id === "batches") {
      return (
        <>
          <p className="text-xs leading-relaxed text-gray-400">
            Every field on this table is saved with the catalog landing. Linked Zoom levels update when you
            change date, time, seats, or program name. Description opens the designed batch page under Tutor Led.
          </p>
          <label className="block">
            <span className={labelCls}>Section title</span>
            <input
              className={inputCls}
              value={page.batches.eyebrow}
              onChange={(e) => setPage((p) => ({ ...p, batches: { ...p.batches, eyebrow: e.target.value } }))}
            />
          </label>
          <div className="grid gap-2 sm:grid-cols-2">
            <input
              className={inputCls}
              value={page.batches.viewAllLabel}
              onChange={(e) => setPage((p) => ({ ...p, batches: { ...p.batches, viewAllLabel: e.target.value } }))}
              placeholder="View all batches label"
            />
            <input
              className={inputCls}
              value={page.batches.viewAllHref}
              onChange={(e) => setPage((p) => ({ ...p, batches: { ...p.batches, viewAllHref: e.target.value } }))}
              placeholder="#food-tutor-led-programs"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={fillBatchesFromZoom}
              className="rounded-lg border border-sky-400/40 px-3 py-1.5 text-[11px] font-semibold text-sky-100 hover:bg-sky-500/10"
            >
              Load from Zoom dates
            </button>
            <button
              type="button"
              onClick={() =>
                setPage((p) => ({
                  ...p,
                  batches: {
                    ...p.batches,
                    rows: [
                      ...p.batches.rows,
                      {
                        date: "",
                        time: "10:00 AM – 5:00 PM",
                        programId: selectedCard?.id || "",
                        programLabel: selectedCard?.title || "New batch",
                        seats: 12,
                        slug: selectedCard?.enrollSlug || "",
                        durationLabel: selectedCard?.durationLabel || "",
                      },
                    ],
                  },
                }))
              }
              className="inline-flex items-center gap-1 text-xs font-semibold text-amber-200"
            >
              <Plus className="h-3.5 w-3.5" /> Add batch
            </button>
          </div>
          {page.batches.rows.length === 0 ? (
            <p className="text-sm text-amber-100">No upcoming batches yet. Add a row or load from Zoom dates.</p>
          ) : (
            page.batches.rows.map((row, i) => {
              const slug = batchRowSlug(row);
              return (
                <div key={`${row.programId}-${i}`} className={`${itemCls} grid gap-2`}>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <label className="block">
                      <span className="text-[10px] uppercase tracking-wider text-gray-500">Date</span>
                      <input
                        className={inputCls}
                        value={row.date}
                        onChange={(e) => setBatch(i, { date: e.target.value })}
                        placeholder="12 Oct 2026"
                      />
                    </label>
                    <label className="block">
                      <span className="text-[10px] uppercase tracking-wider text-gray-500">Time</span>
                      <input
                        className={inputCls}
                        value={row.time}
                        onChange={(e) => setBatch(i, { time: e.target.value })}
                        placeholder="10:00 AM – 5:00 PM"
                      />
                    </label>
                    <label className="block">
                      <span className="text-[10px] uppercase tracking-wider text-gray-500">Program</span>
                      <select
                        className={inputCls}
                        value={slug}
                        onChange={(e) => {
                          const card = page.programs.find(
                            (p) => p.enrollSlug === e.target.value || p.id === e.target.value,
                          );
                          setBatch(i, {
                            programId: card?.id || e.target.value,
                            slug: card?.enrollSlug || e.target.value,
                            programLabel: card?.title || row.programLabel,
                            durationLabel: card?.durationLabel || row.durationLabel,
                          });
                        }}
                      >
                        {page.programs.map((p) => (
                          <option key={p.id} value={p.enrollSlug || p.id}>
                            {p.title}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block">
                      <span className="text-[10px] uppercase tracking-wider text-gray-500">Label on table</span>
                      <input
                        className={inputCls}
                        value={row.programLabel}
                        onChange={(e) => setBatch(i, { programLabel: e.target.value })}
                      />
                    </label>
                    <label className="block">
                      <span className="text-[10px] uppercase tracking-wider text-gray-500">Duration</span>
                      <input
                        className={inputCls}
                        value={row.durationLabel ?? ""}
                        onChange={(e) => setBatch(i, { durationLabel: e.target.value })}
                        placeholder="Duration: 5 Days"
                      />
                    </label>
                    <label className="block">
                      <span className="text-[10px] uppercase tracking-wider text-gray-500">Seats left</span>
                      <input
                        type="number"
                        min={0}
                        className={inputCls}
                        value={row.seats}
                        onChange={(e) => setBatch(i, { seats: Number(e.target.value) || 0 })}
                      />
                    </label>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    {slug ? (
                      <Link
                        href={`${liveTutorCourseHref(slug)}?preview=1`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-violet-200 hover:text-white"
                      >
                        Open designed landing <ExternalLink className="h-3 w-3" />
                      </Link>
                    ) : (
                      <span />
                    )}
                    <button
                      type="button"
                      onClick={() =>
                        setPage((p) => ({
                          ...p,
                          batches: { ...p.batches, rows: p.batches.rows.filter((_, idx) => idx !== i) },
                        }))
                      }
                      className="inline-flex items-center gap-1 text-xs text-rose-300"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Remove
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </>
      );
    }

    if (id === "trainer") {
      return (
        <>
          <div className="grid gap-2 md:grid-cols-2">
            <input className={inputCls} value={page.trainer.name} onChange={(e) => setPage((p) => ({ ...p, trainer: { ...p.trainer, name: e.target.value } }))} placeholder="Name" />
            <input className={inputCls} value={page.trainer.role} onChange={(e) => setPage((p) => ({ ...p, trainer: { ...p.trainer, role: e.target.value } }))} placeholder="Role" />
            <input className={inputCls} value={page.trainer.experience} onChange={(e) => setPage((p) => ({ ...p, trainer: { ...p.trainer, experience: e.target.value } }))} placeholder="Experience" />
            <input className={inputCls} value={page.trainer.eyebrow} onChange={(e) => setPage((p) => ({ ...p, trainer: { ...p.trainer, eyebrow: e.target.value } }))} placeholder="Eyebrow" />
          </div>
          <textarea className={inputCls} rows={4} value={page.trainer.bio} onChange={(e) => setPage((p) => ({ ...p, trainer: { ...p.trainer, bio: e.target.value } }))} />
          <AdminImageUrlUpload
            label="Trainer photo"
            value={page.trainer.photo}
            onChange={(url) => setPage((p) => ({ ...p, trainer: { ...p.trainer, photo: url } }))}
            uploading={uploading === "trainer"}
            onUploadFile={(file) =>
              upload("trainer", file, (url) =>
                setPage((p) => ({ ...p, trainer: { ...p.trainer, photo: url } })),
              )
            }
          />
        </>
      );
    }

    if (id === "faqs") {
      return (
        <>
          <input className={inputCls} value={page.faqsSection.eyebrow} onChange={(e) => setPage((p) => ({ ...p, faqsSection: { ...p.faqsSection, eyebrow: e.target.value } }))} />
          {page.faqs.map((faq, i) => (
            <div key={`${faq.q}-${i}`} className={`${itemCls} space-y-2`}>
              <input className={inputCls} value={faq.q} onChange={(e) => setFaq(i, { q: e.target.value })} placeholder="Question" />
              <textarea className={inputCls} rows={2} value={faq.a} onChange={(e) => setFaq(i, { a: e.target.value })} placeholder="Answer" />
              <button type="button" onClick={() => setPage((p) => ({ ...p, faqs: p.faqs.filter((_, idx) => idx !== i) }))} className="text-xs text-rose-300">
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setPage((p) => ({ ...p, faqs: [...p.faqs, { q: "New question?", a: "" }] }))}
            className="inline-flex items-center gap-1 text-xs font-semibold text-amber-200"
          >
            <Plus className="h-3.5 w-3.5" /> Add FAQ
          </button>
        </>
      );
    }

    return (
      <div className="grid gap-2">
        <input className={inputCls} value={page.cta.heading} onChange={(e) => setPage((p) => ({ ...p, cta: { ...p.cta, heading: e.target.value } }))} placeholder="Heading" />
        <textarea className={inputCls} rows={2} value={page.cta.description} onChange={(e) => setPage((p) => ({ ...p, cta: { ...p.cta, description: e.target.value } }))} />
        <input className={inputCls} value={page.cta.buttonText} onChange={(e) => setPage((p) => ({ ...p, cta: { ...p.cta, buttonText: e.target.value } }))} placeholder="Button text" />
      </div>
    );
  }

  function setProgram(i: number, patch: Partial<TutorLedCatalogProgramCard>) {
    setPage((p) => ({ ...p, programs: p.programs.map((row, idx) => (idx === i ? { ...row, ...patch } : row)) }));
  }
  function setWhyItem(i: number, patch: Partial<TutorLedCatalogPageConfig["why"]["items"][number]>) {
    setPage((p) => ({ ...p, why: { ...p.why, items: p.why.items.map((row, idx) => (idx === i ? { ...row, ...patch } : row)) } }));
  }
  function setAudienceItem(i: number, patch: Partial<TutorLedCatalogPageConfig["audience"]["items"][number]>) {
    setPage((p) => ({
      ...p,
      audience: { ...p.audience, items: p.audience.items.map((row, idx) => (idx === i ? { ...row, ...patch } : row)) },
    }));
  }
  function setFaq(i: number, patch: Partial<TutorLedCatalogPageConfig["faqs"][number]>) {
    setPage((p) => ({ ...p, faqs: p.faqs.map((row, idx) => (idx === i ? { ...row, ...patch } : row)) }));
  }
}
