"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import type { AdminContent } from "@/lib/content-schema";
import { defaultAdminContent } from "@/lib/content-schema";
import type { TutorLedProgramStored } from "@/lib/default-tutor-led-programs";
import { defaultTutorLedPrograms } from "@/lib/default-tutor-led-programs";
import { TUTOR_LED_ICON_NAMES } from "@/lib/tutor-led-program-map";

function cloneProgram(p: TutorLedProgramStored): TutorLedProgramStored {
  return JSON.parse(JSON.stringify(p)) as TutorLedProgramStored;
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function newProgramFromTemplate(): TutorLedProgramStored {
  const base = cloneProgram(defaultTutorLedPrograms[0]);
  const id = `new-live-${Date.now()}`;
  return {
    ...base,
    slug: id,
    title: "New live program",
    published: false,
  };
}

export default function AdminTutorLedWorkspace() {
  const [content, setContent] = useState<AdminContent | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<TutorLedProgramStored | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  /** Slug when editor was opened (so renames replace the correct row). */
  const [originalSlug, setOriginalSlug] = useState<string | null>(null);

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
    } catch {
      setLoadError("Could not load admin content. Using defaults until save succeeds.");
      setContent(defaultAdminContent);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const persistPrograms = async (next: TutorLedProgramStored[]) => {
    if (!content) return;
    setSaving(true);
    setLoadError(null);
    try {
      const payload: AdminContent = { ...content, tutorLedPrograms: next };
      const put = await fetch("/api/admin/content", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!put.ok) throw new Error("save");
      await load();
      setDraft(null);
      setIsCreating(false);
      setOriginalSlug(null);
    } catch {
      setLoadError("Save failed. Try again.");
    } finally {
      setSaving(false);
    }
  };

  const openCreate = () => {
    setIsCreating(true);
    setOriginalSlug(null);
    setDraft(newProgramFromTemplate());
  };

  const openEdit = (p: TutorLedProgramStored) => {
    setIsCreating(false);
    setOriginalSlug(p.slug);
    setDraft(cloneProgram(p));
  };

  const saveDraft = async () => {
    if (!draft || !content) return;
    const slug = slugify(draft.slug || draft.title);
    if (!slug) {
      setLoadError("Slug is required (use letters, numbers, hyphens).");
      return;
    }
    const normalized = { ...draft, slug };

    if (isCreating) {
      if (programs.some((p) => p.slug === slug)) {
        setLoadError("That slug already exists. Change the slug before saving.");
        return;
      }
      await persistPrograms([...programs, normalized]);
      return;
    }

    if (programs.some((p) => p.slug === slug && p.slug !== originalSlug)) {
      setLoadError("Another program already uses that slug.");
      return;
    }
    const removed = programs.filter((p) => p.slug !== originalSlug);
    await persistPrograms([...removed, normalized]);
  };

  const deleteProgram = async (slug: string) => {
    if (!window.confirm(`Delete tutor-led program “${slug}”?`)) return;
    await persistPrograms(programs.filter((p) => p.slug !== slug));
    if (draft?.slug === slug) {
      setDraft(null);
      setIsCreating(false);
    }
  };

  if (!content && !loadError) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-white/10 bg-[#0b1224] px-4 py-16 text-sm text-gray-400">
        <Loader2 className="mr-2 h-5 w-5 animate-spin text-violet-400" /> Loading tutor-led programs…
      </div>
    );
  }

  const iconSelect = (value: string, onChange: (v: string) => void) => (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded border border-white/10 bg-black/40 px-2 py-1 text-[11px] text-white outline-none"
    >
      {TUTOR_LED_ICON_NAMES.map((n) => (
        <option key={n} value={n}>
          {n}
        </option>
      ))}
    </select>
  );

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-white/10 bg-[#0b1224] p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-white md:text-2xl">Tutor-led live programs</h1>
            <p className="mt-1 max-w-2xl text-xs text-gray-400">
              Each row is a public page at <strong className="text-gray-300">/tutor-led/your-slug</strong>. Mark{" "}
              <strong className="text-gray-300">Published</strong> so visitors can open it. Icon fields use Lucide icon
              names (same list everywhere).
            </p>
          </div>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-lg bg-[#6f55ff] px-4 py-2 text-xs font-semibold text-white hover:bg-[#7d63ff]"
          >
            <Plus className="h-4 w-4" /> New program
          </button>
        </div>
        {loadError ? (
          <p className="mt-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-100">{loadError}</p>
        ) : null}
      </div>

      <section className="overflow-hidden rounded-xl border border-white/10 bg-[#0d1528]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-xs">
            <thead className="border-b border-white/10 text-gray-400">
              <tr>
                {["Program", "Slug", "Published", "Preview", "Actions"].map((h) => (
                  <th key={h} className="px-3 py-2 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {programs.map((p) => (
                <tr key={p.slug} className="border-b border-white/5 hover:bg-white/[0.02]">
                  <td className="px-3 py-2 font-medium text-white">{p.title}</td>
                  <td className="px-3 py-2 font-mono text-[11px] text-gray-400">{p.slug}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`rounded px-2 py-0.5 text-[10px] font-semibold ${
                        p.published ? "bg-emerald-500/20 text-emerald-300" : "bg-amber-500/15 text-amber-200"
                      }`}
                    >
                      {p.published ? "Yes" : "No"}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <Link
                      href={`/tutor-led/${p.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-violet-300 underline hover:text-violet-200"
                    >
                      Open
                    </Link>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1">
                      <button
                        type="button"
                        title="Edit"
                        onClick={() => openEdit(p)}
                        className="rounded p-1.5 text-gray-300 hover:bg-violet-500/20 hover:text-violet-100"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        title="Delete"
                        onClick={() => void deleteProgram(p.slug)}
                        className="rounded p-1.5 text-red-300/90 hover:bg-red-500/15"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {draft ? (
        <section className="rounded-xl border border-violet-500/25 bg-[#0d1528] p-4">
          <h2 className="text-sm font-semibold text-white">{isCreating ? "New program" : `Editing — ${draft.slug}`}</h2>
          <div className="mt-4 max-h-[70vh] space-y-4 overflow-y-auto pr-1">
            <div className="grid gap-3 md:grid-cols-2">
              <label className="block md:col-span-2">
                <span className="text-[11px] text-gray-500">URL slug</span>
                <input
                  value={draft.slug}
                  onChange={(e) => setDraft({ ...draft, slug: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 font-mono text-xs outline-none"
                />
              </label>
              <label className="flex items-center gap-2 text-xs text-gray-300">
                <input
                  type="checkbox"
                  checked={draft.published}
                  onChange={(e) => setDraft({ ...draft, published: e.target.checked })}
                  className="accent-emerald-500"
                />
                Published (visible on site)
              </label>
              <label className="block md:col-span-2">
                <span className="text-[11px] text-gray-500">Title</span>
                <input
                  value={draft.title}
                  onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs outline-none"
                />
              </label>
              <label className="block md:col-span-2">
                <span className="text-[11px] text-gray-500">Subtitle</span>
                <textarea
                  value={draft.subtitle}
                  onChange={(e) => setDraft({ ...draft, subtitle: e.target.value })}
                  rows={2}
                  className="mt-1 w-full resize-y rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs outline-none"
                />
              </label>
              <label className="block">
                <span className="text-[11px] text-gray-500">Badge</span>
                <input
                  value={draft.badge}
                  onChange={(e) => setDraft({ ...draft, badge: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs outline-none"
                />
              </label>
              <label className="block md:col-span-2">
                <span className="text-[11px] text-gray-500">Breadcrumb (one segment per line, 3 lines: Home, parent, current)</span>
                <textarea
                  value={draft.breadcrumb.join("\n")}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      breadcrumb: e.target.value
                        .split("\n")
                        .map((s) => s.trim())
                        .filter(Boolean),
                    })
                  }
                  rows={3}
                  className="mt-1 w-full resize-y rounded-lg border border-white/10 bg-black/40 px-3 py-2 font-mono text-[11px] outline-none"
                />
              </label>
              <label className="block">
                <span className="text-[11px] text-gray-500">Sale price (number)</span>
                <input
                  type="number"
                  value={draft.price}
                  onChange={(e) => setDraft({ ...draft, price: Number(e.target.value) || 0 })}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs outline-none"
                />
              </label>
              <label className="block">
                <span className="text-[11px] text-gray-500">List price (number)</span>
                <input
                  type="number"
                  value={draft.originalPrice}
                  onChange={(e) => setDraft({ ...draft, originalPrice: Number(e.target.value) || 0 })}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs outline-none"
                />
              </label>
              <label className="block">
                <span className="text-[11px] text-gray-500">Discount label</span>
                <input
                  value={draft.discount}
                  onChange={(e) => setDraft({ ...draft, discount: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs outline-none"
                />
              </label>
              <label className="block">
                <span className="text-[11px] text-gray-500">Batch label</span>
                <input
                  value={draft.batchLabel}
                  onChange={(e) => setDraft({ ...draft, batchLabel: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs outline-none"
                />
              </label>
              <label className="flex items-center gap-2 text-xs text-gray-300">
                <input
                  type="checkbox"
                  checked={draft.seatsFilling}
                  onChange={(e) => setDraft({ ...draft, seatsFilling: e.target.checked })}
                  className="accent-amber-500"
                />
                Seats filling (urgency strip)
              </label>
              <label className="block">
                <span className="text-[11px] text-gray-500">Seats left</span>
                <input
                  type="number"
                  value={draft.seatsLeft}
                  onChange={(e) => setDraft({ ...draft, seatsLeft: Number(e.target.value) || 0 })}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs outline-none"
                />
              </label>
              <label className="block">
                <span className="text-[11px] text-gray-500">Next batch date (display)</span>
                <input
                  value={draft.nextBatchDate}
                  onChange={(e) => setDraft({ ...draft, nextBatchDate: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs outline-none"
                />
              </label>
              <label className="block">
                <span className="text-[11px] text-gray-500">Schedule</span>
                <input
                  value={draft.schedule}
                  onChange={(e) => setDraft({ ...draft, schedule: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs outline-none"
                />
              </label>
              <label className="block">
                <span className="text-[11px] text-gray-500">Language</span>
                <input
                  value={draft.language}
                  onChange={(e) => setDraft({ ...draft, language: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs outline-none"
                />
              </label>
              <div className="grid grid-cols-4 gap-2 md:col-span-2">
                {(["days", "hours", "mins", "secs"] as const).map((k) => (
                  <label key={k} className="block">
                    <span className="text-[11px] text-gray-500">Countdown {k}</span>
                    <input
                      type="number"
                      value={draft.countdown[k]}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          countdown: { ...draft.countdown, [k]: Number(e.target.value) || 0 },
                        })
                      }
                      className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-xs outline-none"
                    />
                  </label>
                ))}
              </div>
              <label className="block md:col-span-2">
                <span className="text-[11px] text-gray-500">Hero image path</span>
                <input
                  value={draft.heroSrc ?? ""}
                  onChange={(e) => setDraft({ ...draft, heroSrc: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 font-mono text-[11px] outline-none"
                />
              </label>
              <label className="block md:col-span-2">
                <span className="text-[11px] text-gray-500">Hero image alt</span>
                <input
                  value={draft.heroAlt ?? ""}
                  onChange={(e) => setDraft({ ...draft, heroAlt: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs outline-none"
                />
              </label>
            </div>

            <h3 className="border-t border-white/10 pt-3 text-xs font-semibold text-gray-300">Trainer</h3>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="block">
                <span className="text-[11px] text-gray-500">Name</span>
                <input
                  value={draft.trainer.name}
                  onChange={(e) => setDraft({ ...draft, trainer: { ...draft.trainer, name: e.target.value } })}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs outline-none"
                />
              </label>
              <label className="block">
                <span className="text-[11px] text-gray-500">Role</span>
                <input
                  value={draft.trainer.role}
                  onChange={(e) => setDraft({ ...draft, trainer: { ...draft.trainer, role: e.target.value } })}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs outline-none"
                />
              </label>
              <label className="block md:col-span-2">
                <span className="text-[11px] text-gray-500">Experience line</span>
                <input
                  value={draft.trainer.experience}
                  onChange={(e) => setDraft({ ...draft, trainer: { ...draft.trainer, experience: e.target.value } })}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs outline-none"
                />
              </label>
              <label className="block md:col-span-2">
                <span className="text-[11px] text-gray-500">Bio</span>
                <textarea
                  value={draft.trainer.bio}
                  onChange={(e) => setDraft({ ...draft, trainer: { ...draft.trainer, bio: e.target.value } })}
                  rows={3}
                  className="mt-1 w-full resize-y rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs outline-none"
                />
              </label>
              <label className="block md:col-span-2">
                <span className="text-[11px] text-gray-500">Certifications (comma-separated)</span>
                <input
                  value={draft.trainer.certifications.join(", ")}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      trainer: {
                        ...draft.trainer,
                        certifications: e.target.value
                          .split(",")
                          .map((s) => s.trim())
                          .filter(Boolean),
                      },
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs outline-none"
                />
              </label>
              <label className="block md:col-span-2">
                <span className="text-[11px] text-gray-500">Worked with (comma-separated)</span>
                <input
                  value={draft.trainer.workedWith.join(", ")}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      trainer: {
                        ...draft.trainer,
                        workedWith: e.target.value
                          .split(",")
                          .map((s) => s.trim())
                          .filter(Boolean),
                      },
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs outline-none"
                />
              </label>
            </div>

            <h3 className="border-t border-white/10 pt-3 text-xs font-semibold text-gray-300">Batch detail rows</h3>
            <div className="space-y-2">
              {draft.batchDetails.map((row, i) => (
                <div key={i} className="flex flex-wrap items-end gap-2 rounded-lg border border-white/10 bg-black/30 p-2">
                  {iconSelect(row.icon, (v) => {
                    const next = [...draft.batchDetails];
                    next[i] = { ...next[i], icon: v };
                    setDraft({ ...draft, batchDetails: next });
                  })}
                  <input
                    value={row.label}
                    onChange={(e) => {
                      const next = [...draft.batchDetails];
                      next[i] = { ...next[i], label: e.target.value };
                      setDraft({ ...draft, batchDetails: next });
                    }}
                    className="min-w-[120px] flex-1 rounded border border-white/10 bg-black/40 px-2 py-1 text-xs outline-none"
                    placeholder="Label"
                  />
                  <input
                    value={row.value}
                    onChange={(e) => {
                      const next = [...draft.batchDetails];
                      next[i] = { ...next[i], value: e.target.value };
                      setDraft({ ...draft, batchDetails: next });
                    }}
                    className="min-w-[160px] flex-[2] rounded border border-white/10 bg-black/40 px-2 py-1 text-xs outline-none"
                    placeholder="Value"
                  />
                  <button
                    type="button"
                    className="text-[11px] text-red-300"
                    onClick={() =>
                      setDraft({
                        ...draft,
                        batchDetails: draft.batchDetails.filter((_, j) => j !== i),
                      })
                    }
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="text-[11px] text-violet-300"
                onClick={() =>
                  setDraft({
                    ...draft,
                    batchDetails: [...draft.batchDetails, { icon: "Clock", label: "", value: "" }],
                  })
                }
              >
                + Add batch row
              </button>
            </div>

            <h3 className="border-t border-white/10 pt-3 text-xs font-semibold text-gray-300">Hero feature strip</h3>
            <div className="space-y-2">
              {draft.features.map((row, i) => (
                <div key={i} className="flex flex-wrap items-end gap-2 rounded-lg border border-white/10 bg-black/30 p-2">
                  {iconSelect(row.icon, (v) => {
                    const next = [...draft.features];
                    next[i] = { ...next[i], icon: v };
                    setDraft({ ...draft, features: next });
                  })}
                  <input
                    value={row.title}
                    onChange={(e) => {
                      const next = [...draft.features];
                      next[i] = { ...next[i], title: e.target.value };
                      setDraft({ ...draft, features: next });
                    }}
                    className="min-w-[120px] flex-1 rounded border border-white/10 bg-black/40 px-2 py-1 text-xs outline-none"
                    placeholder="Title"
                  />
                  <input
                    value={row.desc}
                    onChange={(e) => {
                      const next = [...draft.features];
                      next[i] = { ...next[i], desc: e.target.value };
                      setDraft({ ...draft, features: next });
                    }}
                    className="min-w-[180px] flex-[2] rounded border border-white/10 bg-black/40 px-2 py-1 text-xs outline-none"
                    placeholder="Description"
                  />
                  <button
                    type="button"
                    className="text-[11px] text-red-300"
                    onClick={() => setDraft({ ...draft, features: draft.features.filter((_, j) => j !== i) })}
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="text-[11px] text-violet-300"
                onClick={() =>
                  setDraft({
                    ...draft,
                    features: [...draft.features, { icon: "Video", title: "", desc: "" }],
                  })
                }
              >
                + Add feature
              </button>
            </div>

            <h3 className="border-t border-white/10 pt-3 text-xs font-semibold text-gray-300">Highlights (one per line)</h3>
            <textarea
              value={draft.highlights.join("\n")}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  highlights: e.target.value
                    .split("\n")
                    .map((s) => s.trim())
                    .filter(Boolean),
                })
              }
              rows={6}
              className="w-full resize-y rounded-lg border border-white/10 bg-black/40 px-3 py-2 font-mono text-[11px] outline-none"
            />

            <h3 className="border-t border-white/10 pt-3 text-xs font-semibold text-gray-300">Curriculum weeks</h3>
            <div className="space-y-2">
              {draft.curriculum.map((row, i) => (
                <div key={i} className="grid gap-2 rounded-lg border border-white/10 bg-black/30 p-2 sm:grid-cols-2 lg:grid-cols-5">
                  <input
                    type="number"
                    value={row.week}
                    onChange={(e) => {
                      const next = [...draft.curriculum];
                      next[i] = { ...next[i], week: Number(e.target.value) || 1 };
                      setDraft({ ...draft, curriculum: next });
                    }}
                    className="rounded border border-white/10 bg-black/40 px-2 py-1 text-xs outline-none"
                    placeholder="Week"
                  />
                  <input
                    value={row.label}
                    onChange={(e) => {
                      const next = [...draft.curriculum];
                      next[i] = { ...next[i], label: e.target.value };
                      setDraft({ ...draft, curriculum: next });
                    }}
                    className="rounded border border-white/10 bg-black/40 px-2 py-1 text-xs outline-none"
                    placeholder="Label"
                  />
                  <input
                    value={row.topic}
                    onChange={(e) => {
                      const next = [...draft.curriculum];
                      next[i] = { ...next[i], topic: e.target.value };
                      setDraft({ ...draft, curriculum: next });
                    }}
                    className="rounded border border-white/10 bg-black/40 px-2 py-1 text-xs outline-none sm:col-span-2"
                    placeholder="Topic"
                  />
                  <input
                    value={row.keyLearning}
                    onChange={(e) => {
                      const next = [...draft.curriculum];
                      next[i] = { ...next[i], keyLearning: e.target.value };
                      setDraft({ ...draft, curriculum: next });
                    }}
                    className="rounded border border-white/10 bg-black/40 px-2 py-1 text-xs outline-none lg:col-span-2"
                    placeholder="Key learning"
                  />
                  <input
                    value={row.sessionType}
                    onChange={(e) => {
                      const next = [...draft.curriculum];
                      next[i] = { ...next[i], sessionType: e.target.value };
                      setDraft({ ...draft, curriculum: next });
                    }}
                    className="rounded border border-white/10 bg-black/40 px-2 py-1 text-xs outline-none"
                    placeholder="Session type"
                  />
                  <button
                    type="button"
                    className="text-left text-[11px] text-red-300 lg:col-span-5"
                    onClick={() => setDraft({ ...draft, curriculum: draft.curriculum.filter((_, j) => j !== i) })}
                  >
                    Remove week
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="text-[11px] text-violet-300"
                onClick={() =>
                  setDraft({
                    ...draft,
                    curriculum: [
                      ...draft.curriculum,
                      {
                        week: draft.curriculum.length + 1,
                        label: "",
                        topic: "",
                        keyLearning: "",
                        sessionType: "Live",
                      },
                    ],
                  })
                }
              >
                + Add week
              </button>
            </div>

            <h3 className="border-t border-white/10 pt-3 text-xs font-semibold text-gray-300">Why choose (cards)</h3>
            <div className="space-y-2">
              {draft.whyChoose.map((row, i) => (
                <div key={i} className="flex flex-wrap items-end gap-2 rounded-lg border border-white/10 bg-black/30 p-2">
                  {iconSelect(row.icon, (v) => {
                    const next = [...draft.whyChoose];
                    next[i] = { ...next[i], icon: v };
                    setDraft({ ...draft, whyChoose: next });
                  })}
                  <input
                    value={row.title}
                    onChange={(e) => {
                      const next = [...draft.whyChoose];
                      next[i] = { ...next[i], title: e.target.value };
                      setDraft({ ...draft, whyChoose: next });
                    }}
                    className="min-w-[120px] flex-1 rounded border border-white/10 bg-black/40 px-2 py-1 text-xs outline-none"
                  />
                  <input
                    value={row.desc}
                    onChange={(e) => {
                      const next = [...draft.whyChoose];
                      next[i] = { ...next[i], desc: e.target.value };
                      setDraft({ ...draft, whyChoose: next });
                    }}
                    className="min-w-[160px] flex-[2] rounded border border-white/10 bg-black/40 px-2 py-1 text-xs outline-none"
                  />
                  <button
                    type="button"
                    className="text-[11px] text-red-300"
                    onClick={() => setDraft({ ...draft, whyChoose: draft.whyChoose.filter((_, j) => j !== i) })}
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="text-[11px] text-violet-300"
                onClick={() =>
                  setDraft({
                    ...draft,
                    whyChoose: [...draft.whyChoose, { icon: "Star", title: "", desc: "" }],
                  })
                }
              >
                + Add card
              </button>
            </div>

            <h3 className="border-t border-white/10 pt-3 text-xs font-semibold text-gray-300">FAQs</h3>
            <div className="space-y-2">
              {draft.faqs.map((faq, i) => (
                <div key={i} className="grid gap-2 rounded-lg border border-white/10 bg-black/30 p-2">
                  <input
                    value={faq.q}
                    onChange={(e) => {
                      const next = [...draft.faqs];
                      next[i] = { ...next[i], q: e.target.value };
                      setDraft({ ...draft, faqs: next });
                    }}
                    className="rounded border border-white/10 bg-black/40 px-2 py-1 text-xs outline-none"
                    placeholder="Question"
                  />
                  <textarea
                    value={faq.a}
                    onChange={(e) => {
                      const next = [...draft.faqs];
                      next[i] = { ...next[i], a: e.target.value };
                      setDraft({ ...draft, faqs: next });
                    }}
                    rows={2}
                    className="resize-y rounded border border-white/10 bg-black/40 px-2 py-1 text-xs outline-none"
                    placeholder="Answer"
                  />
                  <button
                    type="button"
                    className="text-left text-[11px] text-red-300"
                    onClick={() => setDraft({ ...draft, faqs: draft.faqs.filter((_, j) => j !== i) })}
                  >
                    Remove FAQ
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="text-[11px] text-violet-300"
                onClick={() => setDraft({ ...draft, faqs: [...draft.faqs, { q: "", a: "" }] })}
              >
                + Add FAQ
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2 border-t border-white/10 pt-4">
            <button
              type="button"
              disabled={saving}
              onClick={() => void saveDraft()}
              className="rounded-lg bg-[#6f55ff] px-4 py-2 text-xs font-semibold text-white hover:bg-[#7d63ff] disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save program"}
            </button>
            <button
              type="button"
              onClick={() => {
                setDraft(null);
                setIsCreating(false);
              }}
              className="rounded-lg border border-white/10 px-4 py-2 text-xs text-gray-400 hover:bg-white/5"
            >
              Close editor
            </button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
