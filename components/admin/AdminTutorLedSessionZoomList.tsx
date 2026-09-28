"use client";

import type { TutorLedProgramStored } from "@/lib/default-tutor-led-programs";
import { applyTrainingDays, getCurriculumSessionCount } from "@/lib/tutor-led-training-schedule";
import {
  applyCurriculumSessionMeetingId,
  applyCurriculumSessionPasscode,
  applyCurriculumSessionZoomPaste,
  getCurriculumSessionZoom,
  resolveZoomJoinUrl,
} from "@/lib/zoom-meeting";

const field =
  "mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs text-white outline-none focus:border-sky-500/40";

type Props = {
  program: TutorLedProgramStored;
  onChange: (next: TutorLedProgramStored) => void;
};

export function AdminTutorLedSessionZoomList({ program, onChange }: Props) {
  const days = getCurriculumSessionCount(program);
  const rows = (program.curriculum ?? []).slice(0, days);

  if (rows.length === 0) {
    return (
      <p className="text-xs text-amber-100">
        Set training days first, then paste a different Zoom link on each session.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-[11px] text-gray-400">
        Each live day needs its own Zoom meeting. Do not reuse Day 1’s link on Day 2. After the last class,
        learners take the final exam from their dashboard.
      </p>
      {rows.map((row, index) => {
        const zoom = getCurriculumSessionZoom(program, index);
        const join = resolveZoomJoinUrl(zoom);
        return (
          <div key={`${row.week}-${index}`} className="space-y-2 rounded-xl border border-sky-500/20 bg-black/25 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-white">
                {row.label || `Day ${index + 1}`}
                <span className="ml-2 text-[11px] font-normal text-gray-500">{row.topic}</span>
              </p>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  join ? "bg-emerald-500/15 text-emerald-200" : "bg-amber-500/15 text-amber-100"
                }`}
              >
                {join ? "Zoom set" : "Paste Zoom"}
              </span>
            </div>
            <label className="block">
              <span className="text-[11px] text-gray-500">Zoom join link or invitation (this session only)</span>
              <textarea
                className={`${field} min-h-[4rem] font-mono`}
                value={row.liveJoinUrl ?? ""}
                onChange={(e) => onChange(applyCurriculumSessionZoomPaste(program, index, e.target.value))}
                placeholder="https://zoom.us/j/… unique for this day"
              />
            </label>
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="block">
                <span className="text-[11px] text-gray-500">Meeting ID</span>
                <input
                  className={field}
                  value={row.zoomMeetingId ?? ""}
                  onChange={(e) => onChange(applyCurriculumSessionMeetingId(program, index, e.target.value))}
                />
              </label>
              <label className="block">
                <span className="text-[11px] text-gray-500">Passcode</span>
                <input
                  className={field}
                  value={row.zoomPasscode ?? ""}
                  onChange={(e) => onChange(applyCurriculumSessionPasscode(program, index, e.target.value))}
                />
              </label>
            </div>
          </div>
        );
      })}
      {rows.length < days ? (
        <button
          type="button"
          className="text-xs font-semibold text-sky-200 hover:text-white"
          onClick={() => onChange(applyTrainingDays(program, days))}
        >
          Rebuild missing session rows
        </button>
      ) : null}
    </div>
  );
}
