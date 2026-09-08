"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  Check,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Loader2,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import AdminImageUrlUpload from "@/components/admin/AdminImageUrlUpload";
import {
  defaultTutorLedCatalogPageConfig,
  mergeTutorLedCatalogPageConfig,
  type TutorLedCatalogPageConfig,
  type TutorLedCatalogProgramCard,
  type TutorLedCatalogTheme,
} from "@/lib/content-schema";
import { uploadAdminImageFile } from "@/lib/admin-upload-image";

type SectionKey =
  | "page"
  | "hero"
  | "programs"
  | "why"
  | "audience"
  | "batches"
  | "trainer"
  | "faqs"
  | "cta";

const THEMES: TutorLedCatalogTheme[] = ["emerald", "sky", "violet", "gold"];

const ICON_OPTIONS = [
  "Award",
  "BookOpen",
  "Briefcase",
  "Building2",
  "ClipboardCheck",
  "FileText",
  "GraduationCap",
  "Headphones",
  "Mic2",
  "Monitor",
  "Search",
  "ShieldCheck",
  "Trophy",
  "Users",
  "Video",
  "Leaf",
  "Clock",
];

const inputCls =
  "w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none transition focus:border-[#f59e0b]/60";
const labelCls = "block text-[11px] font-medium uppercase tracking-wider text-gray-500 mb-1.5";
const itemCls = "rounded-xl border border-white/[0.07] bg-black/30 p-3 space-y-3";

function Section({
  title,
  open,
  onToggle,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-[#0d1528]">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-white/[0.03]"
      >
        <span className="text-sm font-semibold text-white">{title}</span>
        {open ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
      </button>
      {open ? <div className="space-y-4 border-t border-white/10 px-4 py-4">{children}</div> : null}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className={labelCls}>{label}</span>
      {children}
    </label>
  );
}

export default function AdminTutorLedCatalogPageEditor() {
  const [config, setConfig] = useState<TutorLedCatalogPageConfig>(defaultTutorLedCatalogPageConfig);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [open, setOpen] = useState<Record<SectionKey, boolean>>({
    page: true,
    hero: true,
    programs: true,
    why: false,
    audience: false,
    batches: false,
    trainer: false,
    faqs: false,
    cta: false,
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/content", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load content");
      const data = (await res.json()) as { tutorLedCatalogPage?: TutorLedCatalogPageConfig };
      setConfig(mergeTutorLedCatalogPageConfig(data.tutorLedCatalogPage));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
      setConfig(defaultTutorLedCatalogPageConfig);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const toggle = (key: SectionKey) => setOpen((s) => ({ ...s, [key]: !s[key] }));

  const patch = (next: Partial<TutorLedCatalogPageConfig>) =>
    setConfig((c) => ({ ...c, ...next }));

  const upload = async (key: string, file: File, apply: (url: string) => void) => {
    setUploadingKey(key);
    setError(null);
    try {
      apply(await uploadAdminImageFile(file));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploadingKey(null);
    }
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const put = await fetch("/api/admin/content", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tutorLedCatalogPage: config }),
      });
      if (!put.ok) {
        const body = (await put.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Save failed");
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const updateProgram = (i: number, patchProg: Partial<TutorLedCatalogProgramCard>) => {
    setConfig((c) => ({
      ...c,
      programs: c.programs.map((p, idx) => (idx === i ? { ...p, ...patchProg } : p)),
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-[#0d1528] px-6 py-16 text-sm text-gray-400">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading tutor-led landing…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-white/10 bg-[#0d1528] px-4 py-4">
        <div>
          <h2 className="text-lg font-bold text-white">Tutor-Led Landing Page</h2>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-gray-400">
            Edit every section on{" "}
            <code className="rounded bg-white/5 px-1 text-[11px] text-amber-200">/tutor-led</code> —
            hero, program cards (with thumbnails), why/attend blocks, batches, trainer, FAQs, and CTA.
            Use the <strong className="text-white">Live Zoom programs</strong> tab for Join links and enroll
            slugs.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/tutor-led"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold text-white hover:bg-white/10"
          >
            Preview
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#f5b942] px-4 py-2 text-xs font-bold text-black hover:bg-[#e5a82e] disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : saved ? <Check className="h-3.5 w-3.5" /> : <Save className="h-3.5 w-3.5" />}
            {saving ? "Saving…" : saved ? "Saved" : "Save landing"}
          </button>
        </div>
      </div>

      {error ? (
        <p className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-100">{error}</p>
      ) : null}

      <Section title="Page thumbnail" open={open.page} onToggle={() => toggle("page")}>
        <AdminImageUrlUpload
          label="Share / catalog thumbnail"
          value={config.pageThumbnail}
          onChange={(url) => patch({ pageThumbnail: url })}
          uploading={uploadingKey === "pageThumb"}
          onUploadFile={(file) => upload("pageThumb", file, (url) => patch({ pageThumbnail: url }))}
          hint="OG / share image. Also used as hero fallback when hero background is empty — shows full-bleed on /tutor-led."
        />
      </Section>

      <Section title="Hero" open={open.hero} onToggle={() => toggle("hero")}>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Eyebrow">
            <input className={inputCls} value={config.hero.eyebrow} onChange={(e) => patch({ hero: { ...config.hero, eyebrow: e.target.value } })} />
          </Field>
          <Field label="CTA text">
            <input className={inputCls} value={config.hero.ctaText} onChange={(e) => patch({ hero: { ...config.hero, ctaText: e.target.value } })} />
          </Field>
          <Field label="Heading">
            <input className={inputCls} value={config.hero.heading} onChange={(e) => patch({ hero: { ...config.hero, heading: e.target.value } })} />
          </Field>
          <Field label="Heading highlight">
            <input className={inputCls} value={config.hero.headingHighlight} onChange={(e) => patch({ hero: { ...config.hero, headingHighlight: e.target.value } })} />
          </Field>
          <Field label="CTA href">
            <input className={inputCls} value={config.hero.ctaHref} onChange={(e) => patch({ hero: { ...config.hero, ctaHref: e.target.value } })} />
          </Field>
          <Field label="Background alt text">
            <input className={inputCls} value={config.hero.backgroundAlt} onChange={(e) => patch({ hero: { ...config.hero, backgroundAlt: e.target.value } })} />
          </Field>
        </div>
        <Field label="Subtitle">
          <textarea className={`${inputCls} min-h-[80px]`} value={config.hero.subtitle} onChange={(e) => patch({ hero: { ...config.hero, subtitle: e.target.value } })} />
        </Field>
        <AdminImageUrlUpload
          label="Hero background image"
          value={config.hero.backgroundImage}
          onChange={(url) => patch({ hero: { ...config.hero, backgroundImage: url } })}
          uploading={uploadingKey === "heroBg"}
          onUploadFile={(file) =>
            upload("heroBg", file, (url) => patch({ hero: { ...config.hero, backgroundImage: url } }))
          }
        />
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Aside quote">
            <textarea className={`${inputCls} min-h-[70px]`} value={config.hero.asideQuote} onChange={(e) => patch({ hero: { ...config.hero, asideQuote: e.target.value } })} />
          </Field>
          <div className="space-y-3">
            <Field label="Cert card title">
              <input className={inputCls} value={config.hero.certCardTitle} onChange={(e) => patch({ hero: { ...config.hero, certCardTitle: e.target.value } })} />
            </Field>
            <Field label="Cert card subtitle">
              <input className={inputCls} value={config.hero.certCardSubtitle} onChange={(e) => patch({ hero: { ...config.hero, certCardSubtitle: e.target.value } })} />
            </Field>
          </div>
          <Field label="Cert card quote">
            <input className={inputCls} value={config.hero.certCardQuote} onChange={(e) => patch({ hero: { ...config.hero, certCardQuote: e.target.value } })} />
          </Field>
          <Field label="Cert card attribution">
            <input className={inputCls} value={config.hero.certCardAttribution} onChange={(e) => patch({ hero: { ...config.hero, certCardAttribution: e.target.value } })} />
          </Field>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className={labelCls + " mb-0"}>Hero feature chips</p>
            <button
              type="button"
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-300"
              onClick={() =>
                patch({
                  hero: {
                    ...config.hero,
                    chips: [...config.hero.chips, { icon: "Award", label: "New feature" }],
                  },
                })
              }
            >
              <Plus className="h-3.5 w-3.5" /> Add chip
            </button>
          </div>
          {config.hero.chips.map((chip, i) => (
            <div key={i} className={`${itemCls} md:grid md:grid-cols-[140px_1fr_auto] md:items-end md:gap-3 md:space-y-0`}>
              <Field label="Icon">
                <select
                  className={inputCls}
                  value={chip.icon}
                  onChange={(e) => {
                    const chips = config.hero.chips.map((c, idx) => (idx === i ? { ...c, icon: e.target.value } : c));
                    patch({ hero: { ...config.hero, chips } });
                  }}
                >
                  {ICON_OPTIONS.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Label">
                <input
                  className={inputCls}
                  value={chip.label}
                  onChange={(e) => {
                    const chips = config.hero.chips.map((c, idx) => (idx === i ? { ...c, label: e.target.value } : c));
                    patch({ hero: { ...config.hero, chips } });
                  }}
                />
              </Field>
              <button
                type="button"
                className="rounded-lg border border-rose-500/30 px-2 py-2 text-rose-300 hover:bg-rose-500/10"
                onClick={() =>
                  patch({ hero: { ...config.hero, chips: config.hero.chips.filter((_, idx) => idx !== i) } })
                }
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Program cards" open={open.programs} onToggle={() => toggle("programs")}>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Section title">
            <input
              className={inputCls}
              value={config.programsSection.title}
              onChange={(e) => patch({ programsSection: { ...config.programsSection, title: e.target.value } })}
            />
          </Field>
          <Field label="Section subtitle">
            <input
              className={inputCls}
              value={config.programsSection.subtitle}
              onChange={(e) => patch({ programsSection: { ...config.programsSection, subtitle: e.target.value } })}
            />
          </Field>
        </div>
        <div className="flex justify-end">
          <button
            type="button"
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-300"
            onClick={() =>
              setConfig((c) => ({
                ...c,
                programs: [
                  ...c.programs,
                  {
                    id: `program-${Date.now()}`,
                    title: "New Program",
                    tagline: "Short tagline",
                    bullets: ["Benefit one", "Benefit two"],
                    price: 9999,
                    theme: "emerald",
                    icon: "ShieldCheck",
                    thumbnail: "",
                    enrollSlug: "",
                    matchPattern: "",
                    durationLabel: "Duration: 5 Days",
                    modeLabel: "Mode: Live Online",
                    certificateLabel: "Certificate Included",
                  },
                ],
              }))
            }
          >
            <Plus className="h-3.5 w-3.5" /> Add program card
          </button>
        </div>
        {config.programs.map((prog, i) => (
          <div key={prog.id} className={itemCls}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-white">
                Card {i + 1}: {prog.title || "(untitled)"}
              </p>
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-lg border border-rose-500/30 px-2 py-1 text-[11px] text-rose-300 hover:bg-rose-500/10"
                onClick={() => setConfig((c) => ({ ...c, programs: c.programs.filter((_, idx) => idx !== i) }))}
              >
                <Trash2 className="h-3.5 w-3.5" /> Remove
              </button>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Id (for batch rows)">
                <input className={inputCls} value={prog.id} onChange={(e) => updateProgram(i, { id: e.target.value })} />
              </Field>
              <Field label="Title">
                <input className={inputCls} value={prog.title} onChange={(e) => updateProgram(i, { title: e.target.value })} />
              </Field>
              <Field label="Tagline">
                <input className={inputCls} value={prog.tagline} onChange={(e) => updateProgram(i, { tagline: e.target.value })} />
              </Field>
              <Field label="Price (INR number)">
                <input
                  type="number"
                  className={inputCls}
                  value={prog.price}
                  onChange={(e) => updateProgram(i, { price: Number(e.target.value) || 0 })}
                />
              </Field>
              <Field label="Theme color">
                <select
                  className={inputCls}
                  value={prog.theme}
                  onChange={(e) => updateProgram(i, { theme: e.target.value as TutorLedCatalogTheme })}
                >
                  {THEMES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Icon">
                <select className={inputCls} value={prog.icon} onChange={(e) => updateProgram(i, { icon: e.target.value })}>
                  {ICON_OPTIONS.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Enroll slug (tutor-led Zoom program)">
                <input
                  className={inputCls}
                  value={prog.enrollSlug}
                  placeholder="exact-slug-from-tutor-led-workspace"
                  onChange={(e) => updateProgram(i, { enrollSlug: e.target.value })}
                />
              </Field>
              <Field label="Match pattern (regex fallback)">
                <input
                  className={inputCls}
                  value={prog.matchPattern}
                  onChange={(e) => updateProgram(i, { matchPattern: e.target.value })}
                />
              </Field>
              <Field label="Duration label">
                <input className={inputCls} value={prog.durationLabel} onChange={(e) => updateProgram(i, { durationLabel: e.target.value })} />
              </Field>
              <Field label="Mode label">
                <input className={inputCls} value={prog.modeLabel} onChange={(e) => updateProgram(i, { modeLabel: e.target.value })} />
              </Field>
              <Field label="Certificate label">
                <input
                  className={inputCls}
                  value={prog.certificateLabel}
                  onChange={(e) => updateProgram(i, { certificateLabel: e.target.value })}
                />
              </Field>
              <label className="flex items-center gap-2 pt-6 text-sm text-zinc-300">
                <input
                  type="checkbox"
                  checked={Boolean(prog.popular)}
                  onChange={(e) => updateProgram(i, { popular: e.target.checked })}
                />
                Most popular badge
              </label>
            </div>
            <Field label="Bullets (one per line)">
              <textarea
                className={`${inputCls} min-h-[90px]`}
                value={prog.bullets.join("\n")}
                onChange={(e) =>
                  updateProgram(i, {
                    bullets: e.target.value
                      .split("\n")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  })
                }
              />
            </Field>
            <AdminImageUrlUpload
              label="Program card thumbnail"
              value={prog.thumbnail}
              onChange={(url) => updateProgram(i, { thumbnail: url })}
              uploading={uploadingKey === `prog-${i}`}
              onUploadFile={(file) => upload(`prog-${i}`, file, (url) => updateProgram(i, { thumbnail: url }))}
              hint="Shown large on /tutor-led program cards (16:10). Upload a clear photo or graphic — leave blank for a themed icon panel."
            />
          </div>
        ))}
      </Section>

      <Section title="Why train with us" open={open.why} onToggle={() => toggle("why")}>
        <div className="grid gap-3 md:grid-cols-3">
          <Field label="Eyebrow">
            <input className={inputCls} value={config.why.eyebrow} onChange={(e) => patch({ why: { ...config.why, eyebrow: e.target.value } })} />
          </Field>
          <Field label="Title line 1">
            <input className={inputCls} value={config.why.titleLine1} onChange={(e) => patch({ why: { ...config.why, titleLine1: e.target.value } })} />
          </Field>
          <Field label="Title line 2">
            <input className={inputCls} value={config.why.titleLine2} onChange={(e) => patch({ why: { ...config.why, titleLine2: e.target.value } })} />
          </Field>
        </div>
        {config.why.items.map((item, i) => (
          <div key={i} className={`${itemCls} md:grid md:grid-cols-[140px_1fr_1fr_auto] md:items-end md:gap-3 md:space-y-0`}>
            <Field label="Icon">
              <select
                className={inputCls}
                value={item.icon}
                onChange={(e) => {
                  const items = config.why.items.map((it, idx) => (idx === i ? { ...it, icon: e.target.value } : it));
                  patch({ why: { ...config.why, items } });
                }}
              >
                {ICON_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Title">
              <input
                className={inputCls}
                value={item.title}
                onChange={(e) => {
                  const items = config.why.items.map((it, idx) => (idx === i ? { ...it, title: e.target.value } : it));
                  patch({ why: { ...config.why, items } });
                }}
              />
            </Field>
            <Field label="Description">
              <input
                className={inputCls}
                value={item.desc}
                onChange={(e) => {
                  const items = config.why.items.map((it, idx) => (idx === i ? { ...it, desc: e.target.value } : it));
                  patch({ why: { ...config.why, items } });
                }}
              />
            </Field>
            <button
              type="button"
              className="rounded-lg border border-rose-500/30 px-2 py-2 text-rose-300"
              onClick={() => patch({ why: { ...config.why, items: config.why.items.filter((_, idx) => idx !== i) } })}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
        <button
          type="button"
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-300"
          onClick={() =>
            patch({
              why: {
                ...config.why,
                items: [...config.why.items, { icon: "Award", title: "New reason", desc: "Short description." }],
              },
            })
          }
        >
          <Plus className="h-3.5 w-3.5" /> Add reason
        </button>
      </Section>

      <Section title="Who should attend" open={open.audience} onToggle={() => toggle("audience")}>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Eyebrow">
            <input className={inputCls} value={config.audience.eyebrow} onChange={(e) => patch({ audience: { ...config.audience, eyebrow: e.target.value } })} />
          </Field>
          <Field label="Title">
            <input className={inputCls} value={config.audience.title} onChange={(e) => patch({ audience: { ...config.audience, title: e.target.value } })} />
          </Field>
        </div>
        <Field label="Subtitle">
          <input className={inputCls} value={config.audience.subtitle} onChange={(e) => patch({ audience: { ...config.audience, subtitle: e.target.value } })} />
        </Field>
        <Field label="Invest title (use line breaks)">
          <textarea
            className={`${inputCls} min-h-[70px]`}
            value={config.audience.investTitle}
            onChange={(e) => patch({ audience: { ...config.audience, investTitle: e.target.value } })}
          />
        </Field>
        <Field label="Invest body">
          <textarea
            className={`${inputCls} min-h-[70px]`}
            value={config.audience.investBody}
            onChange={(e) => patch({ audience: { ...config.audience, investBody: e.target.value } })}
          />
        </Field>
        <AdminImageUrlUpload
          label="Invest card image"
          value={config.audience.investImage}
          onChange={(url) => patch({ audience: { ...config.audience, investImage: url } })}
          uploading={uploadingKey === "invest"}
          onUploadFile={(file) =>
            upload("invest", file, (url) => patch({ audience: { ...config.audience, investImage: url } }))
          }
        />
        <Field label="Invest image alt">
          <input
            className={inputCls}
            value={config.audience.investImageAlt}
            onChange={(e) => patch({ audience: { ...config.audience, investImageAlt: e.target.value } })}
          />
        </Field>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className={labelCls + " mb-0"}>Audience pills</p>
            <button
              type="button"
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-300"
              onClick={() =>
                patch({
                  audience: {
                    ...config.audience,
                    items: [...config.audience.items, { icon: "Users", label: "New audience" }],
                  },
                })
              }
            >
              <Plus className="h-3.5 w-3.5" /> Add pill
            </button>
          </div>
          {config.audience.items.map((item, i) => (
            <div key={i} className={`${itemCls} md:grid md:grid-cols-[140px_1fr_auto] md:items-end md:gap-3 md:space-y-0`}>
              <Field label="Icon">
                <select
                  className={inputCls}
                  value={item.icon}
                  onChange={(e) => {
                    const items = config.audience.items.map((it, idx) =>
                      idx === i ? { ...it, icon: e.target.value } : it,
                    );
                    patch({ audience: { ...config.audience, items } });
                  }}
                >
                  {ICON_OPTIONS.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Label">
                <input
                  className={inputCls}
                  value={item.label}
                  onChange={(e) => {
                    const items = config.audience.items.map((it, idx) =>
                      idx === i ? { ...it, label: e.target.value } : it,
                    );
                    patch({ audience: { ...config.audience, items } });
                  }}
                />
              </Field>
              <button
                type="button"
                className="rounded-lg border border-rose-500/30 px-2 py-2 text-rose-300"
                onClick={() =>
                  patch({
                    audience: {
                      ...config.audience,
                      items: config.audience.items.filter((_, idx) => idx !== i),
                    },
                  })
                }
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Upcoming batches" open={open.batches} onToggle={() => toggle("batches")}>
        <p className="rounded-lg border border-sky-500/25 bg-sky-500/10 px-3 py-2 text-[11px] leading-relaxed text-sky-100/90">
          Live Zoom batches on <code className="text-amber-200">/tutor-led</code> come from{" "}
          <strong className="text-white">Admin → Tutor Led / Batches</strong> (
          <code className="text-amber-200">nextBatchDate</code>, schedule, seats). Rows below are a
          fallback only when no published program has a future batch date. After purchase, sessions
          appear on the learner calendar at My Learning → Calendar.
        </p>
        <Field label="Eyebrow">
          <input className={inputCls} value={config.batches.eyebrow} onChange={(e) => patch({ batches: { ...config.batches, eyebrow: e.target.value } })} />
        </Field>
        {config.batches.rows.map((row, i) => (
          <div key={i} className={`${itemCls} md:grid md:grid-cols-5 md:items-end md:gap-3 md:space-y-0`}>
            <Field label="Date">
              <input
                className={inputCls}
                value={row.date}
                onChange={(e) => {
                  const rows = config.batches.rows.map((r, idx) => (idx === i ? { ...r, date: e.target.value } : r));
                  patch({ batches: { ...config.batches, rows } });
                }}
              />
            </Field>
            <Field label="Time">
              <input
                className={inputCls}
                value={row.time}
                onChange={(e) => {
                  const rows = config.batches.rows.map((r, idx) => (idx === i ? { ...r, time: e.target.value } : r));
                  patch({ batches: { ...config.batches, rows } });
                }}
              />
            </Field>
            <Field label="Program id">
              <input
                className={inputCls}
                value={row.programId}
                onChange={(e) => {
                  const rows = config.batches.rows.map((r, idx) =>
                    idx === i ? { ...r, programId: e.target.value } : r,
                  );
                  patch({ batches: { ...config.batches, rows } });
                }}
              />
            </Field>
            <Field label="Program label">
              <input
                className={inputCls}
                value={row.programLabel}
                onChange={(e) => {
                  const rows = config.batches.rows.map((r, idx) =>
                    idx === i ? { ...r, programLabel: e.target.value } : r,
                  );
                  patch({ batches: { ...config.batches, rows } });
                }}
              />
            </Field>
            <div className="flex items-end gap-2">
              <Field label="Seats">
                <input
                  type="number"
                  className={inputCls}
                  value={row.seats}
                  onChange={(e) => {
                    const rows = config.batches.rows.map((r, idx) =>
                      idx === i ? { ...r, seats: Number(e.target.value) || 0 } : r,
                    );
                    patch({ batches: { ...config.batches, rows } });
                  }}
                />
              </Field>
              <button
                type="button"
                className="mb-0.5 rounded-lg border border-rose-500/30 px-2 py-2 text-rose-300"
                onClick={() =>
                  patch({
                    batches: {
                      ...config.batches,
                      rows: config.batches.rows.filter((_, idx) => idx !== i),
                    },
                  })
                }
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
        <button
          type="button"
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-300"
          onClick={() =>
            patch({
              batches: {
                ...config.batches,
                rows: [
                  ...config.batches.rows,
                  {
                    date: "1 Jan 2027",
                    time: "10:00 AM – 5:00 PM",
                    programId: config.programs[0]?.id ?? "basic",
                    programLabel: config.programs[0]?.title ?? "Basic",
                    seats: 20,
                  },
                ],
              },
            })
          }
        >
          <Plus className="h-3.5 w-3.5" /> Add batch row
        </button>
      </Section>

      <Section title="Trainer" open={open.trainer} onToggle={() => toggle("trainer")}>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Eyebrow">
            <input className={inputCls} value={config.trainer.eyebrow} onChange={(e) => patch({ trainer: { ...config.trainer, eyebrow: e.target.value } })} />
          </Field>
          <Field label="Name">
            <input className={inputCls} value={config.trainer.name} onChange={(e) => patch({ trainer: { ...config.trainer, name: e.target.value } })} />
          </Field>
          <Field label="Role">
            <input className={inputCls} value={config.trainer.role} onChange={(e) => patch({ trainer: { ...config.trainer, role: e.target.value } })} />
          </Field>
          <Field label="Experience">
            <input className={inputCls} value={config.trainer.experience} onChange={(e) => patch({ trainer: { ...config.trainer, experience: e.target.value } })} />
          </Field>
        </div>
        <Field label="Bio">
          <textarea
            className={`${inputCls} min-h-[100px]`}
            value={config.trainer.bio}
            onChange={(e) => patch({ trainer: { ...config.trainer, bio: e.target.value } })}
          />
        </Field>
        <AdminImageUrlUpload
          label="Trainer photo / thumbnail"
          value={config.trainer.photo}
          onChange={(url) => patch({ trainer: { ...config.trainer, photo: url } })}
          uploading={uploadingKey === "trainer"}
          onUploadFile={(file) =>
            upload("trainer", file, (url) => patch({ trainer: { ...config.trainer, photo: url } }))
          }
        />
        <Field label="Photo alt">
          <input className={inputCls} value={config.trainer.photoAlt} onChange={(e) => patch({ trainer: { ...config.trainer, photoAlt: e.target.value } })} />
        </Field>
      </Section>

      <Section title="FAQs" open={open.faqs} onToggle={() => toggle("faqs")}>
        <div className="grid gap-3 md:grid-cols-3">
          <Field label="Eyebrow">
            <input className={inputCls} value={config.faqsSection.eyebrow} onChange={(e) => patch({ faqsSection: { ...config.faqsSection, eyebrow: e.target.value } })} />
          </Field>
          <Field label="View all label">
            <input className={inputCls} value={config.faqsSection.viewAllLabel} onChange={(e) => patch({ faqsSection: { ...config.faqsSection, viewAllLabel: e.target.value } })} />
          </Field>
          <Field label="View all href">
            <input className={inputCls} value={config.faqsSection.viewAllHref} onChange={(e) => patch({ faqsSection: { ...config.faqsSection, viewAllHref: e.target.value } })} />
          </Field>
        </div>
        {config.faqs.map((faq, i) => (
          <div key={i} className={itemCls}>
            <div className="flex justify-between gap-2">
              <Field label="Question">
                <input
                  className={inputCls}
                  value={faq.q}
                  onChange={(e) => {
                    const faqs = config.faqs.map((f, idx) => (idx === i ? { ...f, q: e.target.value } : f));
                    patch({ faqs });
                  }}
                />
              </Field>
              <button
                type="button"
                className="mt-6 rounded-lg border border-rose-500/30 px-2 py-2 text-rose-300"
                onClick={() => patch({ faqs: config.faqs.filter((_, idx) => idx !== i) })}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <Field label="Answer">
              <textarea
                className={`${inputCls} min-h-[70px]`}
                value={faq.a}
                onChange={(e) => {
                  const faqs = config.faqs.map((f, idx) => (idx === i ? { ...f, a: e.target.value } : f));
                  patch({ faqs });
                }}
              />
            </Field>
          </div>
        ))}
        <button
          type="button"
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-300"
          onClick={() => patch({ faqs: [...config.faqs, { q: "New question?", a: "Answer…" }] })}
        >
          <Plus className="h-3.5 w-3.5" /> Add FAQ
        </button>
      </Section>

      <Section title="Bottom CTA" open={open.cta} onToggle={() => toggle("cta")}>
        <Field label="Heading">
          <input className={inputCls} value={config.cta.heading} onChange={(e) => patch({ cta: { ...config.cta, heading: e.target.value } })} />
        </Field>
        <Field label="Description">
          <textarea
            className={`${inputCls} min-h-[70px]`}
            value={config.cta.description}
            onChange={(e) => patch({ cta: { ...config.cta, description: e.target.value } })}
          />
        </Field>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Button text">
            <input className={inputCls} value={config.cta.buttonText} onChange={(e) => patch({ cta: { ...config.cta, buttonText: e.target.value } })} />
          </Field>
          <Field label="Button href">
            <input className={inputCls} value={config.cta.buttonHref} onChange={(e) => patch({ cta: { ...config.cta, buttonHref: e.target.value } })} />
          </Field>
        </div>
      </Section>

      <div className="flex justify-end pb-6">
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#f5b942] px-5 py-2.5 text-sm font-bold text-black hover:bg-[#e5a82e] disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          {saving ? "Saving…" : saved ? "Saved" : "Save landing"}
        </button>
      </div>
    </div>
  );
}
