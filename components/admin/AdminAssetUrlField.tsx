"use client";

import { useState } from "react";
import { Upload } from "lucide-react";

type SourceMode = "upload" | "url";

type Props = {
  label: string;
  value: string;
  onChange: (url: string) => void;
  onUpload: (file: File) => Promise<void>;
  uploading?: boolean;
  accept?: string;
  urlPlaceholder?: string;
  uploadLabel?: string;
  /** Text area instead of URL (e.g. Notes). */
  multiline?: boolean;
  urlOnly?: boolean;
};

export default function AdminAssetUrlField({
  label,
  value,
  onChange,
  onUpload,
  uploading = false,
  accept,
  urlPlaceholder,
  uploadLabel = "Upload file",
  multiline = false,
  urlOnly = false,
}: Props) {
  const [mode, setMode] = useState<SourceMode>(value.trim().startsWith("http") || value.trim().startsWith("/") ? "url" : "upload");

  return (
    <div className="rounded-lg border border-white/10 bg-[#0a1120] p-3">
      <p className="mb-2 text-[11px] font-medium text-gray-300">{label}</p>
      {!multiline && !urlOnly ? (
        <div className="mb-2 flex flex-wrap gap-3 text-xs">
          <label className="inline-flex cursor-pointer items-center gap-2 text-gray-300">
            <input
              type="radio"
              name={`${label}-src`}
              checked={mode === "upload"}
              onChange={() => setMode("upload")}
              className="accent-violet-500"
            />
            Upload
          </label>
          <label className="inline-flex cursor-pointer items-center gap-2 text-gray-300">
            <input
              type="radio"
              name={`${label}-src`}
              checked={mode === "url"}
              onChange={() => setMode("url")}
              className="accent-violet-500"
            />
            URL
          </label>
        </div>
      ) : null}

      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={4}
          placeholder="Lesson notes for learners"
          className="w-full resize-y rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs outline-none focus:border-violet-500/40"
        />
      ) : mode === "upload" && !urlOnly ? (
        <div className="space-y-2">
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-violet-500/35 bg-violet-500/15 py-2 text-xs text-violet-100 hover:bg-violet-500/25">
            <Upload className="h-3.5 w-3.5" />
            {uploading ? "Uploading…" : uploadLabel}
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
          {value ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="truncate text-[10px] text-gray-400">{value}</span>
              <button
                type="button"
                onClick={() => onChange("")}
                className="text-[10px] text-rose-300 hover:text-rose-200"
              >
                Clear
              </button>
            </div>
          ) : null}
        </div>
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={urlPlaceholder ?? "https://…"}
          className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs outline-none focus:border-violet-500/40"
        />
      )}
    </div>
  );
}
