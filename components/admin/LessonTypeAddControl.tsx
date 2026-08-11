"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import type { CourseCurriculumKind } from "@/lib/content-schema";

const LESSON_TYPES: { label: string; kind: CourseCurriculumKind }[] = [
  { label: "Lecture", kind: "video" },
  { label: "Document", kind: "reading" },
  { label: "Assessment", kind: "exam" },
];

type Props = {
  onAdd: (kind: CourseCurriculumKind, title: string) => void;
  selectClassName?: string;
};

export default function LessonTypeAddControl({ onAdd, selectClassName }: Props) {
  const [kind, setKind] = useState<CourseCurriculumKind>("video");

  const add = () => {
    const label = LESSON_TYPES.find((o) => o.kind === kind)?.label ?? "Lesson";
    onAdd(kind, `${label} — New item`);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={kind}
        onChange={(e) => setKind(e.target.value as CourseCurriculumKind)}
        className={
          selectClassName ??
          "min-w-[10rem] flex-1 rounded-lg border border-white/10 bg-[#060b14] px-2.5 py-2 text-[11px] text-white outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20"
        }
      >
        {LESSON_TYPES.map((o) => (
          <option key={o.kind} value={o.kind}>
            {o.label}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={add}
        className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-2 text-[11px] font-semibold text-white shadow-md transition hover:bg-violet-500"
      >
        <Plus className="h-3.5 w-3.5" aria-hidden />
        Add lesson
      </button>
    </div>
  );
}
