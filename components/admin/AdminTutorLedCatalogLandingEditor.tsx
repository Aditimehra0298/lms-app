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
} from "lucide-react";
import AdminImageUrlUpload from "@/components/admin/AdminImageUrlUpload";
import FoodTutorLedCatalogLanding from "@/components/FoodTutorLedCatalogLanding";
import type {
  TutorLedCatalogLandingStored,
  TutorLedCatalogPageConfig,
  TutorLedCatalogProgramCard,
  TutorLedCatalogTheme,
} from "@/lib/content-schema";
import { mergeTutorLedCatalogPageConfig } from "@/lib/content-schema";
import { uploadAdminImageFile } from "@/lib/admin-upload-image";
import { slugifyTutorLedCatalog, tutorLedCatalogPublicHref } from "@/lib/tutor-led-catalog-landings";

type SectionKey = "hero" | "programs" | "why" | "audience" | "batches" | "trainer" | "faqs" | "cta" | "basics";

type Props = {
  catalog: TutorLedCatalogLandingStored;
  categories: { slug: string; title: string }[];
  saving?: boolean;
  saved?: boolean;
  error?: string | null;
  onBack: () => void;
  onChange: (next: TutorLedCatalogLandingStored) => void;
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
  saving = false,
  saved = false,
  error = null,
  onBack,
  onChange,
  onSave,
}: Props) {
  const page = mergeTutorLedCatalogPageConfig(catalog.page);
  const [open, setOpen] = useState<SectionKey | null>("basics");
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

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-white/10 bg-[#0b1224] p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <button
              type="button"
              onClick={onBack}
              className="mb-2 inline-flex items-center gap-1 text-[11px] font-semibold text-violet-200 hover:text-white"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> All catalog landings
            </button>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-300">
              {catalog.category} · Tutor led catalog
            </p>
            <h1 className="mt-1 text-xl font-semibold text-white md:text-2xl">{catalog.cardTitle}</h1>
            <p className="mt-1 max-w-2xl text-xs text-gray-400">
              Edit on the left — live design on the right. This landing opens from the category{" "}
              <strong className="text-gray-200">Description</strong> thumbnail. Save to publish.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
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
              {saving ? "Saving…" : saved ? "Published" : "Save landing"}
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
      </div>

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
        <div className="space-y-3">
          {SECTIONS.map((section) => {
            const Icon = section.icon;
            const expanded = open === section.id;
            return (
              <section key={section.id} className="overflow-hidden rounded-xl border border-white/10 bg-[#0d1528]">
                <button
                  type="button"
                  onClick={() => setOpen(expanded ? null : section.id)}
                  className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                >
                  <span className="inline-flex items-center gap-2 text-sm font-semibold text-white">
                    <Icon className="h-4 w-4 text-amber-300" />
                    {section.label}
                  </span>
                  {expanded ? <ChevronUp className="h-4 w-4 text-gray-500" /> : <ChevronDown className="h-4 w-4 text-gray-500" />}
                </button>
                {expanded ? <div className="space-y-4 border-t border-white/10 px-4 py-4">{renderSection(section.id)}</div> : null}
              </section>
            );
          })}
        </div>

        <div className="sticky top-4 min-w-0 overflow-hidden rounded-xl border border-amber-400/25 bg-black xl:max-h-[calc(100vh-6rem)] xl:overflow-auto">
          <div className="flex items-center justify-between border-b border-white/10 bg-[#0b1224] px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-300">Live design</p>
            <p className="text-[10px] text-gray-500">Updates as you type · Save to publish</p>
          </div>
          <FoodTutorLedCatalogLanding page={page} />
        </div>
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
                <input className={inputCls} value={program.durationLabel} onChange={(e) => setProgram(i, { durationLabel: e.target.value })} />
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
          <input className={inputCls} value={page.batches.eyebrow} onChange={(e) => setPage((p) => ({ ...p, batches: { ...p.batches, eyebrow: e.target.value } }))} />
          {page.batches.rows.map((row, i) => (
            <div key={`${row.programId}-${i}`} className={`${itemCls} grid gap-2 md:grid-cols-5`}>
              <input className={inputCls} value={row.date} onChange={(e) => setBatch(i, { date: e.target.value })} placeholder="Date" />
              <input className={inputCls} value={row.time} onChange={(e) => setBatch(i, { time: e.target.value })} placeholder="Time" />
              <input className={inputCls} value={row.programLabel} onChange={(e) => setBatch(i, { programLabel: e.target.value })} placeholder="Program" />
              <input className={inputCls} value={row.programId} onChange={(e) => setBatch(i, { programId: e.target.value })} placeholder="Level id (basic)" />
              <div className="flex gap-2">
                <input className={inputCls} type="number" value={row.seats} onChange={(e) => setBatch(i, { seats: Number(e.target.value) || 0 })} placeholder="Seats" />
                <button type="button" onClick={() => setPage((p) => ({ ...p, batches: { ...p.batches, rows: p.batches.rows.filter((_, idx) => idx !== i) } }))} className="text-rose-300">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              setPage((p) => ({
                ...p,
                batches: {
                  ...p.batches,
                  rows: [...p.batches.rows, { date: "", time: "10:00 AM – 5:00 PM", programId: "basic", programLabel: "Basic", seats: 25 }],
                },
              }))
            }
            className="inline-flex items-center gap-1 text-xs font-semibold text-amber-200"
          >
            <Plus className="h-3.5 w-3.5" /> Add batch
          </button>
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
  function setBatch(i: number, patch: Partial<TutorLedCatalogPageConfig["batches"]["rows"][number]>) {
    setPage((p) => ({
      ...p,
      batches: { ...p.batches, rows: p.batches.rows.map((row, idx) => (idx === i ? { ...row, ...patch } : row)) },
    }));
  }
  function setFaq(i: number, patch: Partial<TutorLedCatalogPageConfig["faqs"][number]>) {
    setPage((p) => ({ ...p, faqs: p.faqs.map((row, idx) => (idx === i ? { ...row, ...patch } : row)) }));
  }
}
