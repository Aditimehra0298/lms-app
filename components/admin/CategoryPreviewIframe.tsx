"use client";

import { ExternalLink, X } from "lucide-react";
import { useEffect, useState } from "react";

type Props = {
  categorySlug: string;
  onClose: () => void;
};

export default function CategoryPreviewIframe({ categorySlug, onClose }: Props) {
  const path = `/courses/category/${categorySlug}`;
  /** Explicit origin avoids localhost vs 127.0.0.1 mismatches; iframe only mounts after client knows origin. */
  const [iframeSrc, setIframeSrc] = useState<string | null>(null);

  useEffect(() => {
    setIframeSrc(`${window.location.origin}${path}`);
  }, [path]);

  return (
    <div className="fixed inset-0 z-[120] flex flex-col bg-black/90 p-3 sm:p-6">
      <div className="mb-2 flex shrink-0 items-center justify-between gap-3 rounded-xl border border-white/15 bg-[#0b1224] px-3 py-2">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-violet-300">Live preview</p>
          <p className="text-sm font-medium text-white">{path}</p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={path}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-lg border border-white/20 px-3 py-1.5 text-[11px] text-gray-200 hover:bg-white/10"
          >
            <ExternalLink size={12} /> Open in tab
          </a>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 hover:bg-white/10 hover:text-white"
            aria-label="Close preview"
          >
            <X size={18} />
          </button>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden rounded-xl border border-white/15 bg-black shadow-2xl">
        {iframeSrc ? (
          <iframe
            title="Category preview"
            src={iframeSrc}
            className="h-full w-full border-0 bg-[#070707]"
            referrerPolicy="strict-origin-when-cross-origin"
          />
        ) : (
          <div className="flex h-full min-h-[200px] items-center justify-center text-sm text-gray-500">
            Preparing preview…
          </div>
        )}
      </div>
    </div>
  );
}
