"use client";

import { useEffect, useState } from "react";
import { Check, ExternalLink, Loader2, Plus, Save, Star, Trash2 } from "lucide-react";
import Link from "next/link";
import AdminTestimonialPhotoField from "@/components/admin/AdminTestimonialPhotoField";
import type { HomePageConfig, HomePageSectionMeta, HomePageTestimonial } from "@/lib/content-schema";
import { defaultHomePageConfig } from "@/lib/content-schema";
import { loadHomePageFromAdmin, saveHomePageToAdmin } from "@/lib/admin-home-page-persist";

export default function AdminTestimonialsPageEditor() {
  const [config, setConfig] = useState<HomePageConfig>(defaultHomePageConfig);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      setConfig(await loadHomePageFromAdmin());
      setLoading(false);
    })();
  }, []);

  const setMeta = (patch: Partial<HomePageSectionMeta>) =>
    setConfig((p) => ({ ...p, testimonialsPage: { ...p.testimonialsPage, ...patch } }));

  const setTestimonial = (i: number, patch: Partial<HomePageTestimonial>) =>
    setConfig((p) => ({
      ...p,
      testimonials: p.testimonials.map((t, idx) => (idx === i ? { ...t, ...patch } : t)),
    }));

  const addTestimonial = () =>
    setConfig((p) => ({
      ...p,
      testimonials: [...p.testimonials, { quote: "", name: "", role: "", photo: "" }],
    }));

  const removeTestimonial = (i: number) =>
    setConfig((p) => ({ ...p, testimonials: p.testimonials.filter((_, idx) => idx !== i) }));

  const save = async () => {
    setSaving(true);
    const ok = await saveHomePageToAdmin(config);
    setSaving(false);
    if (ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    }
  };

  const inputCls =
    "w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none transition focus:border-[#f59e0b]/60";
  const labelCls = "block text-[11px] font-medium uppercase tracking-wider text-gray-500 mb-1.5";
  const itemCls = "rounded-xl border border-white/[0.07] bg-black/30 p-3 space-y-2";

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-3 py-20">
        <Loader2 className="h-8 w-8 animate-spin text-[#f59e0b]" />
        <span className="text-sm text-gray-400">Loading testimonials editor...</span>
      </div>
    );
  }

  const published = config.testimonials.filter((t) => t.quote.trim() && t.name.trim()).length;

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-white/[0.07] bg-linear-to-r from-[#0d1528] via-[#12182e] to-[#0d1528] p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20 text-amber-300">
              <Star size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Testimonials</h2>
              <p className="mt-1 text-xs text-gray-400">
                Edits <code className="rounded bg-white/5 px-1 text-[#f59e0b]">/testimonials</code> and the home page testimonials section.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/testimonials"
              target="_blank"
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-2 text-xs text-gray-300 hover:border-[#f59e0b]/40 hover:text-[#f59e0b]"
            >
              <ExternalLink size={14} /> Preview
            </Link>
            <button
              type="button"
              onClick={() => void save()}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-[#f59e0b] px-4 py-2 text-xs font-bold text-black disabled:opacity-60"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : saved ? <Check size={14} /> : <Save size={14} />}
              {saving ? "Saving..." : saved ? "Saved" : "Save changes"}
            </button>
          </div>
        </div>
        <p className="mt-3 text-[11px] text-gray-500">
          {published} published testimonial{published === 1 ? "" : "s"}. About page quotes are edited under About Page.
        </p>
      </section>

      <section className="rounded-2xl border border-white/[0.07] bg-[#0b1224] p-5 space-y-3">
        <h3 className="text-sm font-semibold text-white">Page heading</h3>
        <div>
          <label className={labelCls}>Badge</label>
          <input
            className={inputCls}
            value={config.testimonialsPage.badge}
            onChange={(e) => setMeta({ badge: e.target.value })}
          />
        </div>
        <div>
          <label className={labelCls}>Title</label>
          <input
            className={inputCls}
            value={config.testimonialsPage.title}
            onChange={(e) => setMeta({ title: e.target.value })}
          />
        </div>
        <div>
          <label className={labelCls}>Subtitle</label>
          <textarea
            className={inputCls}
            rows={2}
            value={config.testimonialsPage.subtitle}
            onChange={(e) => setMeta({ subtitle: e.target.value })}
          />
        </div>
      </section>

      <section className="rounded-2xl border border-white/[0.07] bg-[#0b1224] p-5 space-y-3">
        <h3 className="text-sm font-semibold text-white">Learner reviews</h3>
        {config.testimonials.map((t, idx) => (
          <div key={idx} className={itemCls}>
            <textarea
              className={inputCls}
              rows={3}
              value={t.quote}
              onChange={(e) => setTestimonial(idx, { quote: e.target.value })}
              placeholder="Quote"
            />
            <div className="grid gap-2 sm:grid-cols-2">
              <input
                className={inputCls}
                value={t.name}
                onChange={(e) => setTestimonial(idx, { name: e.target.value })}
                placeholder="Name"
              />
              <input
                className={inputCls}
                value={t.role}
                onChange={(e) => setTestimonial(idx, { role: e.target.value })}
                placeholder="Role / company"
              />
            </div>
            <AdminTestimonialPhotoField
              value={t.photo ?? ""}
              onChange={(url) => setTestimonial(idx, { photo: url })}
              name={t.name}
            />
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => removeTestimonial(idx)}
                className="inline-flex items-center gap-1 rounded-lg border border-red-500/20 bg-red-500/10 px-2 py-1.5 text-[11px] text-red-400 hover:bg-red-500/20"
              >
                <Trash2 size={12} /> Remove
              </button>
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={addTestimonial}
          className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-white/15 px-4 py-2.5 text-xs text-gray-300 hover:border-[#f59e0b]/40 hover:text-[#f59e0b]"
        >
          <Plus size={14} /> Add testimonial
        </button>
      </section>
    </div>
  );
}
