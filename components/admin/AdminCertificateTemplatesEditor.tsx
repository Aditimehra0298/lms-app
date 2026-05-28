"use client";

import { useCallback, useEffect, useState } from "react";
import { Save } from "lucide-react";
import type { AdminContent, GlobalCertificateAssets } from "@/lib/content-schema";
import AdminCertificateFileUpload from "@/components/admin/AdminCertificateFileUpload";

async function uploadAdminFile(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
  const data = (await res.json()) as { ok?: boolean; url?: string; error?: string };
  if (!res.ok || !data.url) throw new Error(data.error ?? "Upload failed");
  return data.url;
}

async function persistGlobalCertificateAssets(assets: GlobalCertificateAssets): Promise<void> {
  const res = await fetch("/api/admin/content", { cache: "no-store" });
  if (!res.ok) throw new Error("Could not load settings");
  const current = (await res.json()) as AdminContent;
  const put = await fetch("/api/admin/content", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...current,
      globalCertificateAssets: {
        templateImage: assets.templateImage?.trim(),
        badgeImage: assets.badgeImage?.trim(),
        transcriptFile: assets.transcriptFile?.trim(),
      },
    }),
  });
  if (!put.ok) throw new Error("Save failed");
}

type Props = {
  compact?: boolean;
};

export default function AdminCertificateTemplatesEditor({ compact = false }: Props) {
  const [assets, setAssets] = useState<GlobalCertificateAssets>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [uploading, setUploading] = useState<{
    template?: boolean;
    badge?: boolean;
    transcript?: boolean;
  }>({});
  const [uploadError, setUploadError] = useState<{
    template?: string;
    badge?: string;
    transcript?: string;
  }>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/content", { cache: "no-store" });
      if (!res.ok) throw new Error("Could not load settings");
      const data = (await res.json()) as AdminContent;
      setAssets(data.globalCertificateAssets ?? {});
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async (nextAssets: GlobalCertificateAssets) => {
    if (!nextAssets.templateImage?.trim() || !nextAssets.badgeImage?.trim() || !nextAssets.transcriptFile?.trim()) {
      setMessage("Please upload all 3 files: certificate design, badge, and transcript.");
      return false;
    }
    setSaving(true);
    setMessage("");
    try {
      await persistGlobalCertificateAssets(nextAssets);
      setMessage("Saved — templates ready for all courses.");
      return true;
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Save failed");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const runUpload = async (
    key: "template" | "badge" | "transcript",
    file: File,
    field: keyof GlobalCertificateAssets,
  ) => {
    setUploadError((e) => ({ ...e, [key]: undefined }));
    setUploading((u) => ({ ...u, [key]: true }));
    try {
      const url = await uploadAdminFile(file);
      const next = { ...assets, [field]: url };
      setAssets(next);
      setMessage("File uploaded — click Save templates when all 3 are ready.");
      const allReady = Boolean(next.templateImage && next.badgeImage && next.transcriptFile);
      if (allReady) await save(next);
    } catch (e) {
      setUploadError((err) => ({
        ...err,
        [key]: e instanceof Error ? e.message : "Upload failed",
      }));
    } finally {
      setUploading((u) => ({ ...u, [key]: false }));
    }
  };

  const hasTemplate = Boolean(assets.templateImage?.trim());
  const hasBadge = Boolean(assets.badgeImage?.trim());
  const hasTranscript = Boolean(assets.transcriptFile?.trim());

  if (loading) {
    return (
      <p className="rounded-xl border border-white/10 bg-black/25 px-4 py-6 text-center text-sm text-gray-400">
        Loading certificate templates…
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {!compact ? (
        <p className="text-xs leading-relaxed text-gray-400">
          Upload once — used for every course. After all 3 files are uploaded, they save automatically.
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <AdminCertificateFileUpload
          label="1. Certificate design"
          hint="Your certificate background (JPG or PNG)."
          uploaded={hasTemplate}
          previewUrl={assets.templateImage}
          accept="image/jpeg,image/png,image/webp,image/gif"
          kind="image"
          uploading={Boolean(uploading.template)}
          error={uploadError.template}
          onUpload={(file) => runUpload("template", file, "templateImage")}
        />
        <AdminCertificateFileUpload
          label="2. Badge"
          hint="Same badge on every certificate."
          uploaded={hasBadge}
          previewUrl={assets.badgeImage}
          accept="image/jpeg,image/png,image/webp,image/gif"
          kind="image"
          uploading={Boolean(uploading.badge)}
          error={uploadError.badge}
          onUpload={(file) => runUpload("badge", file, "badgeImage")}
        />
        <AdminCertificateFileUpload
          label="3. Transcript layout"
          hint="Transcript sample (PDF or image)."
          uploaded={hasTranscript}
          previewUrl={assets.transcriptFile}
          accept="application/pdf,image/jpeg,image/png,image/webp,image/gif"
          kind="transcript"
          uploading={Boolean(uploading.transcript)}
          error={uploadError.transcript}
          onUpload={(file) => runUpload("transcript", file, "transcriptFile")}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={saving}
          onClick={() => void save(assets)}
          className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-xs font-semibold text-white hover:bg-violet-500 disabled:opacity-50"
        >
          <Save className="h-3.5 w-3.5" aria-hidden />
          {saving ? "Saving…" : "Save templates"}
        </button>
        <span className="text-[11px] text-gray-500">
          {[hasTemplate, hasBadge, hasTranscript].filter(Boolean).length}/3 uploaded
        </span>
      </div>

      {message ? (
        <p
          className={`text-sm ${message.includes("Saved") || message.includes("ready") ? "text-emerald-300" : "text-rose-300"}`}
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
