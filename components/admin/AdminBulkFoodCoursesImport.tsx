"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Sparkles, Upload, CheckCircle2, AlertCircle } from "lucide-react";
import { parseBulkCourseImportText } from "@/lib/bulk-food-course-import";

const EXAMPLE = `HACCP Food Safety Level 3
Advanced HACCP course for supervisors and team leaders. Covers hazard analysis, CCP monitoring, verification, and audit documentation for food manufacturing and catering.

---

BRCGS Issue 9 Internal Auditor
Self-paced training on BRCGS Global Standard Issue 9. Learn audit planning, non-conformance reporting, and corrective action for food sites.

---

FSSC 22000 Version 6 Foundation
Introduction to FSSC 22000 food safety certification. Modules on PRPs, HACCP, food fraud, and management system requirements.`;

type ResultRow = {
  title: string;
  slug: string;
  ok: boolean;
  message?: string;
};

type Props = {
  onSaved?: () => void;
};

export default function AdminBulkFoodCoursesImport({ onSaved }: Props) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<ResultRow[] | null>(null);
  const [savedCount, setSavedCount] = useState(0);

  const parsedCount = parseBulkCourseImportText(text).length;

  const checkConfig = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/courses/bulk-generate", { cache: "no-store" });
      const data = (await res.json()) as { configured?: boolean };
      setConfigured(Boolean(data.configured));
    } catch {
      setConfigured(false);
    }
  }, []);

  useEffect(() => {
    if (open) void checkConfig();
  }, [open, checkConfig]);

  const runImport = async (save: boolean) => {
    setBusy(true);
    setError(null);
    setResults(null);
    setSavedCount(0);
    try {
      const res = await fetch("/api/admin/courses/bulk-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, category: "food-safety", save, skipExisting: true }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        message?: string;
        results?: ResultRow[];
        generated?: number;
        saved?: boolean;
      };
      if (!res.ok || !data.ok) {
        throw new Error(data.message ?? "Import failed");
      }
      setResults(data.results ?? []);
      if (data.saved) {
        setSavedCount(data.generated ?? 0);
        onSaved?.();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-emerald-500/25 bg-gradient-to-br from-emerald-950/40 via-[#0b1224] to-[#070b14] shadow-lg">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left sm:px-5"
      >
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-500/20 ring-1 ring-emerald-400/30">
            <Sparkles className="h-5 w-5 text-emerald-200" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white">Quick import — food courses (AI)</p>
            <p className="text-[11px] text-gray-400">
              Paste your course list + descriptions. AI fills landing pages as drafts — you edit images &amp; publish
              later.
            </p>
          </div>
        </div>
        <span className="shrink-0 text-xs text-emerald-300/90">{open ? "Hide" : "Show"}</span>
      </button>

      {open ? (
        <div className="space-y-4 border-t border-white/[0.06] px-4 pb-5 pt-4 sm:px-5">
          {configured === false ? (
            <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
              Add <code className="font-mono">OPENAI_API_KEY=sk-…</code> to <code className="font-mono">.env.local</code>{" "}
              and restart <code className="font-mono">npm run dev</code>.
            </p>
          ) : null}

          <div className="grid gap-4 lg:grid-cols-2">
            <label className="block">
              <span className="text-[11px] font-medium text-gray-400">Paste course list</span>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={14}
                placeholder={EXAMPLE}
                className="mt-1.5 w-full resize-y rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 font-mono text-[11px] leading-relaxed text-gray-200 outline-none focus:border-emerald-500/40"
              />
              <p className="mt-1.5 text-[10px] text-gray-500">
                Format: <strong className="text-gray-400">first line = title</strong>, rest = description. Separate
                courses with a line containing only <code className="font-mono">---</code>. Or paste JSON{" "}
                <code className="font-mono">[{`{ "title", "description" }`}]</code>.
                {parsedCount > 0 ? (
                  <span className="ml-1 text-emerald-300"> · {parsedCount} course(s) detected</span>
                ) : null}
              </p>
            </label>

            <div className="space-y-3 text-xs text-gray-400">
              <p className="font-medium text-gray-300">What gets created (draft)</p>
              <ul className="list-inside list-disc space-y-1 text-[11px] leading-relaxed">
                <li>Title, subtitle, hero text, highlights, FAQs</li>
                <li>Instructor bio &amp; overview sections</li>
                <li>SEO title &amp; description</li>
                <li>Placeholder cover: <code className="font-mono">/course-food-safety.png</code></li>
                <li>Status: <strong className="text-amber-200">Draft</strong> (not live until you publish)</li>
              </ul>
              <p className="text-[11px] leading-relaxed">
                After import, open each course in this workspace to upload your real images, set prices, and click{" "}
                <strong className="text-gray-300">Publish</strong>.
              </p>
              <button
                type="button"
                onClick={() => setText(EXAMPLE)}
                className="text-[11px] text-emerald-300 underline hover:text-emerald-200"
              >
                Load example format
              </button>
            </div>
          </div>

          {error ? (
            <p className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {error}
            </p>
          ) : null}

          {results?.length ? (
            <div className="rounded-xl border border-white/10 bg-black/30 p-3">
              <p className="mb-2 text-xs font-semibold text-white">
                {savedCount > 0 ? (
                  <>
                    <CheckCircle2 className="mr-1 inline h-4 w-4 text-emerald-400" />
                    Saved {savedCount} draft course(s) to catalog
                  </>
                ) : (
                  "Preview results"
                )}
              </p>
              <ul className="max-h-40 space-y-1 overflow-y-auto text-[11px]">
                {results.map((r) => (
                  <li key={r.slug} className={r.ok ? "text-gray-300" : "text-amber-200"}>
                    {r.ok ? "✓" : "✗"} <span className="font-medium">{r.title}</span>{" "}
                    <code className="font-mono text-violet-300/90">/courses/{r.slug}</code>
                    {r.message ? <span className="text-gray-500"> — {r.message}</span> : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy || parsedCount === 0 || configured === false}
              onClick={() => void runImport(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Generate &amp; save {parsedCount > 0 ? `${parsedCount} course(s)` : ""}
            </button>
            <button
              type="button"
              disabled={busy || parsedCount === 0 || configured === false}
              onClick={() => void runImport(false)}
              className="rounded-xl border border-white/15 px-4 py-2.5 text-xs font-semibold text-gray-200 hover:bg-white/5 disabled:opacity-50"
            >
              Preview only (no save)
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
