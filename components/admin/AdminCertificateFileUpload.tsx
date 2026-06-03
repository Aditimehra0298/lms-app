"use client";

import Image from "next/image";
import { CheckCircle2, FileText, Upload } from "lucide-react";
import { useEffect, useState } from "react";
import { resolveProtectedMediaUrl } from "@/lib/media-client";

type Props = {
  label: string;
  hint: string;
  /** Stored path after upload — not shown to editors. */
  uploaded: boolean;
  previewUrl?: string;
  accept: string;
  kind: "image" | "pdf" | "transcript";
  uploading: boolean;
  error?: string;
  onUpload: (file: File) => Promise<void>;
};

export default function AdminCertificateFileUpload({
  label,
  hint,
  uploaded,
  previewUrl,
  accept,
  kind,
  uploading,
  error,
  onUpload,
}: Props) {
  const [resolvedPreview, setResolvedPreview] = useState("");

  useEffect(() => {
    const raw = previewUrl?.trim() ?? "";
    if (!raw) {
      setResolvedPreview("");
      return;
    }
    if (raw.startsWith("http://") || raw.startsWith("https://")) {
      setResolvedPreview(raw);
      return;
    }
    void resolveProtectedMediaUrl(raw, { scope: "admin" }).then(setResolvedPreview);
  }, [previewUrl]);

  const isImageUrl = (url: string) =>
    /\.(jpe?g|png|webp|gif)(\?|$)/i.test(url) || url.includes("image/");

  const showImagePreview =
    Boolean(resolvedPreview.trim()) &&
    (kind === "image" || (kind === "transcript" && isImageUrl(previewUrl ?? "")));

  const fileTypeHint =
    kind === "image"
      ? "JPG, PNG, or WebP"
      : kind === "transcript"
        ? "PDF or image (JPG, PNG, WebP)"
        : "PDF";

  return (
    <div className="rounded-xl border border-white/10 bg-black/25 p-4">
      <p className="text-sm font-semibold text-white">{label}</p>
      <p className="mt-1 text-[11px] leading-relaxed text-gray-500">{hint}</p>

      <label className="mt-4 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-amber-400/35 bg-amber-500/[0.06] px-4 py-6 text-center transition hover:border-amber-400/55 hover:bg-amber-500/10">
        <Upload className="h-5 w-5 text-amber-300" aria-hidden />
        <span className="text-xs font-semibold text-amber-100">
          {uploading ? "Uploading…" : uploaded ? "Replace file" : "Choose file from computer"}
        </span>
        <span className="text-[10px] text-gray-500">{fileTypeHint}</span>
        <input
          type="file"
          accept={accept}
          className="hidden"
          disabled={uploading}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void onUpload(f);
            e.target.value = "";
          }}
        />
      </label>

      {uploaded ? (
        <p className="mt-3 flex items-center gap-1.5 text-xs font-medium text-emerald-300">
          <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />
          Uploaded
        </p>
      ) : (
        <p className="mt-3 text-xs text-gray-500">Not uploaded yet</p>
      )}

      {error ? <p className="mt-2 text-xs text-rose-300">{error}</p> : null}

      {showImagePreview ? (
        <div className="relative mt-3 aspect-[297/210] max-w-full overflow-hidden rounded-lg border border-white/10">
          <Image src={resolvedPreview} alt="" fill unoptimized className="object-cover" />
        </div>
      ) : null}

      {(kind === "pdf" || kind === "transcript") && uploaded && !showImagePreview ? (
        <p className="mt-3 flex items-center gap-2 text-xs text-gray-400">
          <FileText className="h-4 w-4 text-violet-300" aria-hidden />
          Transcript file saved (all courses)
        </p>
      ) : null}
    </div>
  );
}
