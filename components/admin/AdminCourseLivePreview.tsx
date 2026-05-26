"use client";

import Link from "next/link";
import { ExternalLink, Eye } from "lucide-react";

type Props = {
  slug: string;
  title?: string;
};

export default function AdminCourseLivePreview({ slug, title }: Props) {
  const href = `/courses/${slug}`;

  return (
    <aside className="w-full shrink-0 xl:sticky xl:top-4 xl:max-w-[380px]">
      <div className="overflow-hidden rounded-2xl border border-violet-500/25 bg-gradient-to-b from-[#0c1428] to-[#070b14] shadow-[0_16px_48px_rgba(0,0,0,0.4)] ring-1 ring-violet-500/10">
        <div className="flex items-center justify-between gap-2 border-b border-white/[0.06] bg-violet-500/[0.08] px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <Eye className="h-4 w-4 shrink-0 text-violet-300" aria-hidden />
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-violet-200/90">Live preview</p>
              <p className="truncate text-xs font-medium text-white">{title || slug}</p>
            </div>
          </div>
          <Link
            href={href}
            target="_blank"
            rel="noreferrer"
            className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-white/15 bg-black/40 px-2.5 py-1.5 text-[10px] font-semibold text-gray-200 hover:border-violet-400/40 hover:text-white"
          >
            Open <ExternalLink className="h-3 w-3" aria-hidden />
          </Link>
        </div>
        <iframe
          title={`Preview ${slug}`}
          src={href}
          className="h-[min(52vh,520px)] w-full border-0 bg-white sm:h-[min(58vh,600px)]"
        />
        <p className="border-t border-white/[0.06] px-3 py-2 text-center text-[10px] text-gray-500">
          Updates after you save — refresh preview if needed
        </p>
      </div>
    </aside>
  );
}
