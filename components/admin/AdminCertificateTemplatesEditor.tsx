"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Award, CheckCircle2, FileText, ImageIcon, Save } from "lucide-react";
import type { AdminContent, GlobalCertificateAssets } from "@/lib/content-schema";
import { DEFAULT_CERTIFICATE_TEMPLATE } from "@/lib/global-certificate-assets";
import AdminCertificateFileUpload from "@/components/admin/AdminCertificateFileUpload";

type UploadSlotId = "template" | "badge" | "transcript";

type UploadSlot = {
  id: UploadSlotId;
  field: keyof GlobalCertificateAssets;
  label: string;
  shortLabel: string;
  hint: string;
  accept: string;
  kind: "image" | "transcript";
  icon: typeof ImageIcon;
};

const UPLOAD_SLOTS: UploadSlot[] = [
  {
    id: "template",
    field: "templateImage",
    label: "Certificate background",
    shortLabel: "Certificate design",
    hint: "Background image used on every course certificate (JPG or PNG).",
    accept: "image/jpeg,image/png,image/webp,image/gif",
    kind: "image",
    icon: ImageIcon,
  },
  {
    id: "badge",
    field: "badgeImage",
    label: "Badge",
    shortLabel: "Badge",
    hint: "Same badge on every learner certificate.",
    accept: "image/jpeg,image/png,image/webp,image/gif",
    kind: "image",
    icon: Award,
  },
  {
    id: "transcript",
    field: "transcriptFile",
    label: "Transcript layout",
    shortLabel: "Transcript",
    hint: "Transcript PDF or image paired with the certificate.",
    accept: "application/pdf,image/jpeg,image/png,image/webp,image/gif",
    kind: "transcript",
    icon: FileText,
  },
];

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
  /** When set (e.g. 2), upload steps are labeled Step 3 / Step 4 after a course picker on the parent page. */
  uploadStepOffset?: number;
};

export default function AdminCertificateTemplatesEditor({
  compact = false,
  uploadStepOffset = 1,
}: Props) {
  const [assets, setAssets] = useState<GlobalCertificateAssets>({});
  const [selectedSlot, setSelectedSlot] = useState<UploadSlotId>("template");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [uploading, setUploading] = useState<Partial<Record<UploadSlotId, boolean>>>({});
  const [uploadError, setUploadError] = useState<Partial<Record<UploadSlotId, string>>>({});

  const active = useMemo(
    () => UPLOAD_SLOTS.find((s) => s.id === selectedSlot) ?? UPLOAD_SLOTS[0],
    [selectedSlot],
  );

  const slotUploaded = useCallback(
    (slot: UploadSlot) => Boolean(assets[slot.field]?.trim()),
    [assets],
  );

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
      setMessage("Upload all 3 parts: certificate design, badge, and transcript.");
      return false;
    }
    setSaving(true);
    setMessage("");
    try {
      await persistGlobalCertificateAssets(nextAssets);
      setMessage("Saved — one shared design for all courses.");
      return true;
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Save failed");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const runUpload = async (slot: UploadSlot, file: File) => {
    setUploadError((e) => ({ ...e, [slot.id]: undefined }));
    setUploading((u) => ({ ...u, [slot.id]: true }));
    try {
      const url = await uploadAdminFile(file);
      const next = { ...assets, [slot.field]: url };
      setAssets(next);
      setMessage(`${slot.shortLabel} uploaded. Choose the next part or save when all 3 are ready.`);
      const allReady = UPLOAD_SLOTS.every((s) => Boolean(next[s.field]?.trim()));
      if (allReady) await save(next);
    } catch (e) {
      setUploadError((err) => ({
        ...err,
        [slot.id]: e instanceof Error ? e.message : "Upload failed",
      }));
    } finally {
      setUploading((u) => ({ ...u, [slot.id]: false }));
    }
  };

  const useDefaultTemplate = () => {
    const next = { ...assets, templateImage: DEFAULT_CERTIFICATE_TEMPLATE };
    setAssets(next);
    setMessage("Default certificate background selected — upload badge and transcript, then save.");
  };

  const uploadedCount = UPLOAD_SLOTS.filter((s) => slotUploaded(s)).length;
  const stepChoose = uploadStepOffset;
  const stepUpload = uploadStepOffset + 1;

  if (loading) {
    return (
      <p className="rounded-xl border border-white/10 bg-black/25 px-4 py-6 text-center text-sm text-gray-400">
        Loading certificate design…
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {!compact ? (
        <p className="text-xs leading-relaxed text-gray-400">
          One design for <strong className="text-gray-300">all courses</strong>. Choose what to upload, then pick your
          file. Only learner name, email, phone, and certificate numbers change per person.
        </p>
      ) : null}

      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
          Step {stepChoose} — Choose what to upload
        </p>
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          {UPLOAD_SLOTS.map((slot) => {
            const done = slotUploaded(slot);
            const isActive = slot.id === selectedSlot;
            const Icon = slot.icon;
            return (
              <button
                key={slot.id}
                type="button"
                onClick={() => setSelectedSlot(slot.id)}
                className={`rounded-xl border px-3 py-3 text-left transition ${
                  isActive
                    ? "border-amber-400/50 bg-amber-500/15 ring-1 ring-amber-400/30"
                    : "border-white/10 bg-black/25 hover:border-white/20 hover:bg-white/5"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <Icon
                    className={`h-4 w-4 shrink-0 ${isActive ? "text-amber-300" : "text-gray-500"}`}
                    aria-hidden
                  />
                  {done ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" aria-hidden />
                  ) : (
                    <span className="text-[10px] text-gray-600">Pending</span>
                  )}
                </div>
                <p className={`mt-2 text-xs font-semibold ${isActive ? "text-amber-100" : "text-white"}`}>
                  {slot.shortLabel}
                </p>
                <p className="mt-0.5 text-[10px] text-gray-500">{done ? "Uploaded" : "Not set"}</p>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
          Step {stepUpload} — Upload {active.shortLabel.toLowerCase()}
        </p>
        <div className="mt-2 max-w-xl">
          {active.id === "template" ? (
            <button
              type="button"
              onClick={useDefaultTemplate}
              className="mb-3 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-left text-[11px] text-gray-300 hover:bg-white/5"
            >
              Or use the <strong className="text-white">built-in default</strong> certificate background (no file
              upload)
            </button>
          ) : null}
          <AdminCertificateFileUpload
            label={active.label}
            hint={active.hint}
            uploaded={slotUploaded(active)}
            previewUrl={assets[active.field]}
            accept={active.accept}
            kind={active.kind}
            uploading={Boolean(uploading[active.id])}
            error={uploadError[active.id]}
            onUpload={(file) => runUpload(active, file)}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={saving}
          onClick={() => void save(assets)}
          className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-xs font-semibold text-white hover:bg-violet-500 disabled:opacity-50"
        >
          <Save className="h-3.5 w-3.5" aria-hidden />
          {saving ? "Saving…" : "Save for all courses"}
        </button>
        <span className="text-[11px] text-gray-500">
          {uploadedCount}/3 parts ready · applies to every self-paced course
        </span>
      </div>

      {message ? (
        <p
          className={`text-sm ${message.includes("Saved") || message.includes("uploaded") ? "text-emerald-300" : "text-rose-300"}`}
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
