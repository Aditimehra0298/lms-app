"use client";

import { CloudUpload, FileText, X } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { learnerUploadHeaders } from "@/lib/course-qa-client";
import { readJsonResponse } from "@/lib/safe-json";

const ACCEPT = ".png,.jpg,.jpeg,.webp,.gif,.pdf";
const MAX_MB = 10;

type Props = {
  label?: string;
  courseSlug?: string;
  fileUrl: string;
  fileName: string;
  onUploaded: (url: string, name: string) => void;
  onClear: () => void;
  disabled?: boolean;
  compact?: boolean;
};

export function CommunityFileUploadZone({
  label = "Attach screenshot / file (optional)",
  courseSlug,
  fileUrl,
  fileName,
  onUploaded,
  onClear,
  disabled = false,
  compact = false,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const uploadFile = useCallback(
    async (file: File) => {
      setError(null);
      if (file.size > MAX_MB * 1024 * 1024) {
        setError(`File too large (max ${MAX_MB}MB).`);
        return;
      }
      setUploading(true);
      try {
        const fd = new FormData();
        fd.append("file", file);
        if (courseSlug) fd.append("courseSlug", courseSlug);
        const res = await fetch("/api/learner/upload", {
          method: "POST",
          headers: learnerUploadHeaders(),
          body: fd,
        });
        const data = await readJsonResponse(res, {} as { ok?: boolean; url?: string; error?: string });
        if (!res.ok || !data.ok || !data.url) {
          setError(data.error ?? "Upload failed.");
          return;
        }
        onUploaded(data.url, file.name);
      } catch {
        setError("Could not upload file. Try again.");
      } finally {
        setUploading(false);
      }
    },
    [courseSlug, onUploaded],
  );

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (disabled || uploading) return;
    const file = e.dataTransfer.files?.[0];
    if (file) void uploadFile(file);
  };

  if (fileUrl) {
    return (
      <div className={compact ? "space-y-1" : "space-y-2"}>
        {label ? (
          <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">{label}</span>
        ) : null}
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5">
          <FileText className="h-4 w-4 shrink-0 text-emerald-300" aria-hidden />
          <span className="min-w-0 flex-1 truncate text-xs text-emerald-100">{fileName || "File attached"}</span>
          <button
            type="button"
            onClick={onClear}
            disabled={disabled}
            className="rounded p-1 text-zinc-400 hover:bg-white/10 hover:text-white disabled:opacity-50"
            aria-label="Remove file"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={compact ? "space-y-1" : "space-y-2"}>
      {label ? (
        <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">{label}</span>
      ) : null}
      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled && !uploading) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => !disabled && !uploading && inputRef.current?.click()}
        className={`rounded-xl border border-dashed px-4 text-center transition ${
          compact ? "py-5" : "py-8"
        } ${
          dragOver
            ? "border-violet-400/50 bg-violet-500/10"
            : "border-white/15 bg-black/30 hover:border-violet-400/35"
        } ${disabled || uploading ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
      >
        <CloudUpload className="mx-auto h-6 w-6 text-violet-300/80" aria-hidden />
        <p className="mt-2 text-xs font-medium text-zinc-300">
          {uploading ? "Uploading…" : "Drag & drop files here or click to upload"}
        </p>
        <p className="mt-1 text-[10px] text-zinc-500">Max file size: {MAX_MB}MB (PDF, PNG, JPG)</p>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="sr-only"
          disabled={disabled || uploading}
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) void uploadFile(file);
          }}
        />
      </div>
      {error ? <p className="text-[11px] text-red-300">{error}</p> : null}
    </div>
  );
}
