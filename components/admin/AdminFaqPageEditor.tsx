"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, ExternalLink, HelpCircle, Loader2, Plus, Save, Trash2 } from "lucide-react";
import Link from "next/link";
import type { AdminContent, HomePageFaq, HomePageSectionMeta } from "@/lib/content-schema";
import { defaultAdminContent, defaultHomePageConfig } from "@/lib/content-schema";
import AdminImageUrlUpload from "@/components/admin/AdminImageUrlUpload";
import {
  FAQ_TARGET_HOME,
  applyFaqsToAdminContent,
  buildFaqTargetOptions,
  getFaqTargetOption,
  loadFaqsForTarget,
  loadHomeFaqExtras,
  type FaqTargetId,
} from "@/lib/admin-faq-targets";
import { uploadAdminImageFile } from "@/lib/admin-upload-image";
import { faqAvatarImageHint } from "@/lib/admin-image-hints";

export default function AdminFaqPageEditor() {
  const [content, setContent] = useState<AdminContent>(defaultAdminContent);
  const [targetId, setTargetId] = useState<FaqTargetId>(FAQ_TARGET_HOME);
  const [faqs, setFaqs] = useState<HomePageFaq[]>([]);
  const [faqPage, setFaqPage] = useState<HomePageSectionMeta>(defaultHomePageConfig.faqPage);
  const [faqImage, setFaqImage] = useState(defaultHomePageConfig.faqImage);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const targetOptions = useMemo(() => buildFaqTargetOptions(content), [content]);
  const activeTarget = getFaqTargetOption(targetOptions, targetId) ?? targetOptions[0];
  const isHomeTarget = targetId === FAQ_TARGET_HOME;

  const loadContent = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/content", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as AdminContent;
      setContent(data);
      const options = buildFaqTargetOptions(data);
      const first = options[0]?.id ?? FAQ_TARGET_HOME;
      setTargetId(first);
      setFaqs(loadFaqsForTarget(data, first));
      const extras = loadHomeFaqExtras(data);
      setFaqPage(extras.faqPage);
      setFaqImage(extras.faqImage);
    } catch {
      /* keep defaults */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadContent();
  }, [loadContent]);

  const selectTarget = (id: FaqTargetId) => {
    setTargetId(id);
    setFaqs(loadFaqsForTarget(content, id));
  };

  const setFaq = (i: number, patch: Partial<HomePageFaq>) =>
    setFaqs((list) => list.map((f, idx) => (idx === i ? { ...f, ...patch } : f)));

  const addFaq = () => setFaqs((list) => [...list, { q: "", a: "" }]);
  const removeFaq = (i: number) => setFaqs((list) => list.filter((_, idx) => idx !== i));

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/content", { cache: "no-store" });
      const current = res.ok ? ((await res.json()) as AdminContent) : content;
      const next = applyFaqsToAdminContent(
        current,
        targetId,
        faqs,
        isHomeTarget ? { faqPage, faqImage } : undefined,
      );
      const put = await fetch("/api/admin/content", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
      if (put.ok) {
        setContent(next);
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      }
    } catch {
      /* silent */
    } finally {
      setSaving(false);
    }
  };

  const inputCls =
    "w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none transition focus:border-[#f59e0b]/60";
  const labelCls = "block text-[11px] font-medium uppercase tracking-wider text-gray-500 mb-1.5";
  const itemCls = "rounded-xl border border-white/[0.07] bg-black/30 p-3";

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-3 py-20">
        <Loader2 className="h-8 w-8 animate-spin text-[#f59e0b]" />
        <span className="text-sm text-gray-400">Loading FAQ editor...</span>
      </div>
    );
  }

  const published = faqs.filter((f) => f.q.trim() && f.a.trim()).length;
  const faqPreviewHref = isHomeTarget
    ? "/faq"
    : activeTarget
      ? `/faq?section=${encodeURIComponent(targetId)}`
      : "/faq";

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-white/[0.07] bg-linear-to-r from-[#0d1528] via-[#12182e] to-[#0d1528] p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-300">
              <HelpCircle size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">FAQ Page</h2>
              <p className="mt-1 max-w-2xl text-xs text-gray-400">
                Choose which page&apos;s FAQs to edit. Changes save only to that page and appear on{" "}
                <code className="rounded bg-white/5 px-1 text-[#f59e0b]">/faq</code> under that section.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={faqPreviewHref}
              target="_blank"
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-2 text-xs text-gray-300 hover:border-[#f59e0b]/40 hover:text-[#f59e0b]"
            >
              <ExternalLink size={14} /> Preview on site
            </Link>
            {activeTarget && activeTarget.previewHref !== "/faq" ? (
              <Link
                href={activeTarget.previewHref}
                target="_blank"
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-2 text-xs text-gray-300 hover:border-[#f59e0b]/40 hover:text-[#f59e0b]"
              >
                <ExternalLink size={14} /> Open page
              </Link>
            ) : null}
            <button
              type="button"
              onClick={() => void save()}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-[#f59e0b] px-4 py-2 text-xs font-bold text-black disabled:opacity-60"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : saved ? <Check size={14} /> : <Save size={14} />}
              {saving ? "Saving..." : saved ? "Saved" : "Save this page"}
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-amber-500/25 bg-amber-500/10 p-4">
        <label className={labelCls} htmlFor="faq-page-select">
          Choose page to edit FAQs
        </label>
        <select
          id="faq-page-select"
          value={targetId}
          onChange={(e) => selectTarget(e.target.value)}
          className="mt-1 w-full max-w-2xl rounded-lg border border-white/15 bg-[#060b14] px-3 py-2.5 text-sm font-medium text-white outline-none focus:border-amber-400/50"
        >
          {targetOptions.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.label}
            </option>
          ))}
        </select>
        {activeTarget ? (
          <p className="mt-2 text-xs leading-relaxed text-amber-100/90">{activeTarget.description}</p>
        ) : null}
        <p className="mt-2 text-[11px] text-gray-500">
          {published} FAQ{published === 1 ? "" : "s"} in this page (empty rows hidden on the site).
        </p>
      </section>

      {isHomeTarget ? (
        <section className="rounded-2xl border border-white/[0.07] bg-[#0b1224] p-5 space-y-3">
          <h3 className="text-sm font-semibold text-white">/faq page heading (General section only)</h3>
          <div>
            <label className={labelCls}>Badge</label>
            <input className={inputCls} value={faqPage.badge} onChange={(e) => setFaqPage((p) => ({ ...p, badge: e.target.value }))} />
          </div>
          <div>
            <label className={labelCls}>Title</label>
            <input className={inputCls} value={faqPage.title} onChange={(e) => setFaqPage((p) => ({ ...p, title: e.target.value }))} />
          </div>
          <div>
            <label className={labelCls}>Subtitle</label>
            <textarea
              className={inputCls}
              rows={2}
              value={faqPage.subtitle}
              onChange={(e) => setFaqPage((p) => ({ ...p, subtitle: e.target.value }))}
            />
          </div>
          <AdminImageUrlUpload
            label="FAQ avatar image"
            value={faqImage ?? ""}
            onChange={setFaqImage}
            uploading={uploadingAvatar}
            onUploadFile={async (file) => {
              setUploadError(null);
              setUploadingAvatar(true);
              try {
                setFaqImage(await uploadAdminImageFile(file));
              } catch (e) {
                setUploadError(e instanceof Error ? e.message : "Upload failed");
              } finally {
                setUploadingAvatar(false);
              }
            }}
            hint={faqAvatarImageHint}
            placeholder="Upload or paste image URL"
            className="block"
          />
          {uploadError ? <p className="text-[11px] text-red-400">{uploadError}</p> : null}
        </section>
      ) : null}

      <section className="rounded-2xl border border-white/[0.07] bg-[#0b1224] p-5 space-y-3">
        <h3 className="text-sm font-semibold text-white">
          Questions &amp; answers — {activeTarget?.label ?? "Page"}
        </h3>
        {!isHomeTarget ? (
          <p className="text-xs text-gray-500">
            These FAQs appear on <strong className="text-gray-300">{activeTarget?.previewHref}</strong> and in the
            matching section on <Link href="/faq" className="text-amber-300 hover:underline">/faq</Link>.
          </p>
        ) : null}
        {faqs.length === 0 ? (
          <p className="rounded-lg border border-dashed border-white/15 py-6 text-center text-sm text-gray-500">
            No FAQs yet for this page. Click Add FAQ below.
          </p>
        ) : null}
        {faqs.map((faq, idx) => (
          <div key={idx} className={`space-y-2 ${itemCls}`}>
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-indigo-500/20 text-[10px] font-bold text-indigo-300">
                {idx + 1}
              </span>
              <input
                className={`${inputCls} flex-1`}
                value={faq.q}
                onChange={(e) => setFaq(idx, { q: e.target.value })}
                placeholder="Question"
              />
              <button
                type="button"
                onClick={() => removeFaq(idx)}
                className="rounded-lg border border-red-500/20 bg-red-500/10 p-2 text-red-400 hover:bg-red-500/20"
              >
                <Trash2 size={12} />
              </button>
            </div>
            <textarea
              className={inputCls}
              rows={3}
              value={faq.a}
              onChange={(e) => setFaq(idx, { a: e.target.value })}
              placeholder="Answer"
            />
          </div>
        ))}
        <button
          type="button"
          onClick={addFaq}
          className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-white/15 px-4 py-2.5 text-xs text-gray-300 hover:border-[#f59e0b]/40 hover:text-[#f59e0b]"
        >
          <Plus size={14} /> Add FAQ
        </button>
      </section>
    </div>
  );
}
