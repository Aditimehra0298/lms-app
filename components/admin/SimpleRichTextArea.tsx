"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bold, Italic, Type } from "lucide-react";
import { formatSimpleRichTextBlock } from "@/lib/simple-rich-text";
import { stripRichTextFormatting, wrapRichTextSelection } from "@/lib/rich-text-edit";

type Props = {
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  placeholder?: string;
  className?: string;
  hint?: string;
  label?: string;
  showPreview?: boolean;
};

type FormatKind = "bold" | "italic" | "normal";

export default function SimpleRichTextArea({
  value,
  onChange,
  rows = 4,
  placeholder,
  className = "",
  hint,
  label,
  showPreview = true,
}: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [activeFormat, setActiveFormat] = useState<FormatKind>("normal");

  const applyWrap = useCallback(
    (before: string, after: string, kind: FormatKind) => {
      const el = ref.current;
      if (!el) return;
      const { next, cursor } = wrapRichTextSelection(
        value,
        el.selectionStart,
        el.selectionEnd,
        before,
        after,
      );
      onChange(next);
      setActiveFormat(kind);
      requestAnimationFrame(() => {
        el.focus();
        el.setSelectionRange(cursor, cursor);
      });
    },
    [value, onChange],
  );

  const strip = useCallback(() => {
    onChange(stripRichTextFormatting(value));
    setActiveFormat("normal");
  }, [value, onChange]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      if (e.key === "b") {
        e.preventDefault();
        applyWrap("**", "**", "bold");
      } else if (e.key === "i") {
        e.preventDefault();
        applyWrap("*", "*", "italic");
      }
    };
    el.addEventListener("keydown", onKey);
    return () => el.removeEventListener("keydown", onKey);
  }, [applyWrap]);

  const toolBtn = (kind: FormatKind, active: boolean) =>
    `inline-flex min-w-[4.25rem] items-center justify-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] font-semibold transition ${
      active
        ? "bg-white text-[#0f1628] shadow-sm"
        : "text-gray-300 hover:bg-white/10 hover:text-white"
    }`;

  const hasPreview = showPreview && value.trim().length > 0;

  return (
    <div className="overflow-hidden rounded-xl border border-white/[0.1] bg-[#060b14]/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] ring-1 ring-black/40">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.08] bg-[#0a101c]/90 px-2 py-1.5 sm:px-3">
        <div className="flex items-center gap-2">
          {label ? (
            <span className="text-[10px] font-medium uppercase tracking-wide text-gray-500">{label}</span>
          ) : null}
          <div
            className="inline-flex rounded-lg border border-white/10 bg-black/50 p-0.5"
            role="toolbar"
            aria-label="Text formatting"
          >
            <button
              type="button"
              title="Bold (Ctrl+B)"
              className={toolBtn("bold", activeFormat === "bold")}
              onClick={() => applyWrap("**", "**", "bold")}
            >
              <Bold className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
              Bold
            </button>
            <button
              type="button"
              title="Italic (Ctrl+I)"
              className={toolBtn("italic", activeFormat === "italic")}
              onClick={() => applyWrap("*", "*", "italic")}
            >
              <Italic className="h-3.5 w-3.5" aria-hidden />
              Italic
            </button>
            <button
              type="button"
              title="Normal — remove formatting"
              className={toolBtn("normal", activeFormat === "normal")}
              onClick={strip}
            >
              <Type className="h-3.5 w-3.5" aria-hidden />
              Normal
            </button>
          </div>
        </div>
        <span className="text-[10px] text-gray-600">{hint ?? "Ctrl+B · Ctrl+I"}</span>
      </div>

      <textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        placeholder={placeholder}
        className={`block w-full resize-y border-0 bg-transparent px-3 py-2.5 text-sm leading-relaxed text-white outline-none placeholder:text-gray-600 focus:ring-0 ${className}`}
      />

      {hasPreview ? (
        <div className="border-t border-white/[0.08] bg-[#0f1628]/60 px-3 py-2.5">
          <p className="mb-1.5 text-[9px] font-bold uppercase tracking-wider text-gray-500">Preview</p>
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2.5 text-sm leading-relaxed text-gray-200">
            {formatSimpleRichTextBlock(value)}
          </div>
        </div>
      ) : null}
    </div>
  );
}
