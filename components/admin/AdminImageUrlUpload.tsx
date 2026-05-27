"use client";

import Image from "next/image";
import { Upload } from "lucide-react";
import { useState } from "react";

const fieldClass =
  "mt-1.5 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none placeholder:text-gray-600 focus:border-violet-500/35";

type Props = {
  label: string;
  value: string;
  onChange: (url: string) => void;
  onUploadFile: (file: File) => Promise<void>;
  uploading?: boolean;
  placeholder?: string;
  hint?: string;
  className?: string;
  /** Hide the stored URL/path by default. */
  obscureValue?: boolean;
};

export default function AdminImageUrlUpload({
  label,
  value,
  onChange,
  onUploadFile,
  uploading = false,
  placeholder,
  hint,
  className = "block md:col-span-2",
  obscureValue = false,
}: Props) {
  const showPreview = value.trim().startsWith("/") || value.trim().startsWith("http");
  const [revealed, setRevealed] = useState(false);

  return (
    <div className={className}>
      <span className="text-[11px] text-gray-500">{label}</span>
      <div className="relative">
        <input
          type={obscureValue && !revealed ? "password" : "text"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`${fieldClass} font-mono text-[12px] ${obscureValue ? "pr-20" : ""}`}
          placeholder={placeholder}
          autoComplete="off"
          spellCheck={false}
        />
        {obscureValue ? (
          <button
            type="button"
            onClick={() => setRevealed((v) => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md border border-white/10 bg-black/40 px-2 py-1 text-[10px] font-semibold text-gray-300 hover:bg-black/55"
          >
            {revealed ? "Hide" : "Show"}
          </button>
        ) : null}
      </div>
      <label className="mt-2 flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-violet-400/35 bg-violet-500/[0.07] px-3 py-2.5 text-xs font-semibold text-violet-100 transition hover:border-violet-400/55 hover:bg-violet-500/15">
        <Upload className="h-3.5 w-3.5 shrink-0" aria-hidden />
        {uploading ? "Uploading…" : "Upload image from computer"}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          disabled={uploading}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void onUploadFile(f);
            e.target.value = "";
          }}
        />
      </label>
      {hint ? <p className="mt-1 text-[10px] text-gray-600">{hint}</p> : null}
      {showPreview ? (
        <div className="relative mt-3 aspect-video max-w-xs overflow-hidden rounded-lg border border-white/10">
          <Image src={value.trim()} alt="" fill unoptimized className="object-cover" />
        </div>
      ) : null}
    </div>
  );
}
