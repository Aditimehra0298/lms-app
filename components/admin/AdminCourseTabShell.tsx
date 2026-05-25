"use client";

import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

type Props = {
  courseTitle: string;
  tabTitle: string;
  description: string;
  icon?: ReactNode;
  onSave?: () => void;
  saving?: boolean;
  saveLabel?: string;
  children: ReactNode;
  aside?: ReactNode;
};

export default function AdminCourseTabShell({
  courseTitle,
  tabTitle,
  description,
  icon,
  onSave,
  saving = false,
  saveLabel = "Save",
  children,
  aside,
}: Props) {
  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-white/10 bg-[#0b1224] p-4">
        <div className="min-w-0 flex-1">
          <nav className="mb-2 flex flex-wrap items-center gap-1 text-[11px] text-gray-500">
            <span>Courses</span>
            <ChevronRight className="h-3 w-3 shrink-0" />
            <span className="max-w-[200px] truncate font-medium text-violet-300">{courseTitle || "New course"}</span>
            <ChevronRight className="h-3 w-3 shrink-0" />
            <span className="text-gray-400">{tabTitle}</span>
          </nav>
          <h2 className="flex flex-wrap items-center gap-2 text-xl font-semibold text-white md:text-2xl">
            {icon}
            {tabTitle}
          </h2>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-gray-400">{description}</p>
        </div>
        {onSave ? (
          <button
            type="button"
            disabled={saving}
            onClick={onSave}
            className="shrink-0 rounded-lg bg-[#6f55ff] px-4 py-2 text-xs font-semibold text-white hover:bg-[#7d63ff] disabled:opacity-50"
          >
            {saving ? "Saving…" : saveLabel}
          </button>
        ) : null}
      </div>
      <div className={aside ? "mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(240px,300px)]" : "mt-4"}>
        <div className="space-y-4">{children}</div>
        {aside ? <div className="space-y-4">{aside}</div> : null}
      </div>
    </>
  );
}

/** Amber callout when no course selected */
export function AdminCourseSelectPrompt({
  tabName,
  onGoCourseInfo,
}: {
  tabName: string;
  onGoCourseInfo: () => void;
}) {
  return (
    <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-8 text-center">
      <p className="text-sm font-medium text-amber-100">Select or create a course</p>
      <p className="mt-2 text-xs text-amber-200/80">
        Open <strong>Course Info</strong>, pick a course from the catalog or create one, then use <strong>{tabName}</strong>.
      </p>
      <button
        type="button"
        onClick={onGoCourseInfo}
        className="mt-4 rounded-lg bg-[#6f55ff] px-4 py-2 text-xs font-semibold text-white hover:bg-[#7d63ff]"
      >
        Go to Course Info
      </button>
    </div>
  );
}

export function AdminPanelSection({
  title,
  step,
  children,
  className = "",
}: {
  title: string;
  step?: number;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-xl border border-white/10 bg-[#0d1528] p-4 ${className}`}>
      <div className="mb-3 flex items-center gap-2">
        {step != null ? (
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-600/30 text-[11px] font-bold text-violet-200">
            {step}
          </span>
        ) : null}
        <h3 className="text-sm font-semibold text-white">{title}</h3>
      </div>
      {children}
    </section>
  );
}

export const adminToggleRow =
  "flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-white/10 bg-black/25 px-3 py-2.5 text-xs text-gray-200";
