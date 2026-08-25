"use client";

import { useCallback, useEffect, useState } from "react";
import { Maximize2, X, ZoomIn, ZoomOut } from "lucide-react";

type Props = {
  src: string;
  alt?: string;
  /** Larger frame for question stems / case-study graphics. */
  variant?: "question" | "option";
};

/**
 * Readable exam image: full-width light canvas, scroll for tall graphics,
 * and a zoom lightbox so dense case-study diagrams stay legible.
 */
export default function ExamQuestionImage({
  src,
  alt = "Question figure",
  variant = "question",
}: Props) {
  const [open, setOpen] = useState(false);
  const [zoom, setZoom] = useState(1);

  const close = useCallback(() => {
    setOpen(false);
    setZoom(1);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, close]);

  const isQuestion = variant === "question";

  return (
    <>
      <figure
        className={`mt-4 overflow-hidden rounded-xl border border-white/15 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)] ${
          isQuestion ? "bg-white" : "bg-zinc-50"
        }`}
      >
        <div className="flex items-center justify-between gap-2 border-b border-zinc-200/80 bg-zinc-100 px-3 py-2">
          <p className="text-[11px] font-medium text-zinc-600">
            {isQuestion ? "Case study / figure — scroll or open full view to read clearly" : "Option image"}
          </p>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-md border border-zinc-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-zinc-800 hover:bg-zinc-50"
          >
            <Maximize2 className="h-3.5 w-3.5" />
            Open full view
          </button>
        </div>

        <div
          className={`exam-figure-scroll w-full overflow-auto ${
            isQuestion ? "max-h-[min(72vh,820px)]" : "max-h-56"
          }`}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(true);
            }}
            className="block w-full cursor-zoom-in p-2 sm:p-3 text-left"
            title="Click to open full view"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={alt}
              className={`mx-auto h-auto w-full object-contain object-top ${
                isQuestion ? "min-h-[280px]" : "max-h-48"
              }`}
            />
          </button>
        </div>
      </figure>

      {open ? (
        <div
          className="fixed inset-0 z-[80] flex flex-col bg-black/85 p-3 sm:p-5"
          role="dialog"
          aria-modal="true"
          aria-label="Full size figure"
          onClick={close}
        >
          <div
            className="mx-auto flex w-full max-w-6xl items-center justify-between gap-2 rounded-t-xl border border-white/15 bg-[#121826] px-3 py-2"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="truncate text-sm text-zinc-200">{alt}</p>
            <div className="flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(0.5, Number((z - 0.25).toFixed(2))))}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-white/15 bg-white/5 text-white hover:bg-white/10"
                aria-label="Zoom out"
              >
                <ZoomOut className="h-4 w-4" />
              </button>
              <span className="min-w-[3rem] text-center text-xs tabular-nums text-zinc-300">
                {Math.round(zoom * 100)}%
              </span>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(3, Number((z + 0.25).toFixed(2))))}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-white/15 bg-white/5 text-white hover:bg-white/10"
                aria-label="Zoom in"
              >
                <ZoomIn className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setZoom(1)}
                className="rounded-md border border-white/15 bg-white/5 px-2 py-1.5 text-[11px] text-zinc-200 hover:bg-white/10"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={close}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-white/15 bg-white/5 text-white hover:bg-white/10"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div
            className="mx-auto w-full max-w-6xl flex-1 overflow-auto rounded-b-xl border border-t-0 border-white/15 bg-zinc-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex min-h-full items-start justify-center p-4 sm:p-6">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt={alt}
                style={{ transform: `scale(${zoom})`, transformOrigin: "top center" }}
                className="h-auto w-full max-w-none transition-transform duration-150"
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
