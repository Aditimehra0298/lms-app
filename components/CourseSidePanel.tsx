"use client";

import { X } from "lucide-react";
import type { ReactNode } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
};

export default function CourseSidePanel({ open, onClose, title, subtitle, children }: Props) {
  if (!open) return null;

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-[2px]"
        aria-label="Close panel"
        onClick={onClose}
      />
      <aside
        className="fixed inset-y-0 right-0 z-[201] flex w-full max-w-md flex-col border-l border-[#FFB800]/30 bg-zinc-950 shadow-[-12px_0_48px_rgba(0,0,0,0.55)]"
        role="dialog"
        aria-labelledby="course-side-panel-title"
      >
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div>
            <p id="course-side-panel-title" className="text-lg font-bold text-white">
              {title}
            </p>
            {subtitle ? <p className="mt-0.5 text-xs text-zinc-400">{subtitle}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-zinc-400 transition hover:bg-white/5 hover:text-white"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
      </aside>
    </>
  );
}
