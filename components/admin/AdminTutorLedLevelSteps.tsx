"use client";

import { Video } from "lucide-react";
import AdminCourseStudentsPanel from "@/components/admin/AdminCourseStudentsPanel";
import { AdminProgramCertificateAssetsEditor } from "@/components/admin/AdminProgramCertificateAssetsEditor";
import { AdminTutorLedFinalAssessmentPanel } from "@/components/admin/AdminTutorLedFinalAssessmentPanel";
import { AdminTutorLedPricingPanel } from "@/components/admin/AdminTutorLedPricingPanel";
import { patchProgramCertificateConfig } from "@/lib/course-certificate-config";
import type { TutorLedProgramStored } from "@/lib/default-tutor-led-programs";

const field =
  "mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs text-white outline-none focus:border-violet-500/40";

export type TutorLedLevelStep = "zoom" | "pricing" | "assessment" | "students" | "certificate";

type Props = {
  step: TutorLedLevelStep;
  program: TutorLedProgramStored | null;
  onChange: (next: TutorLedProgramStored) => void;
};

export function AdminTutorLedLevelSteps({ step, program, onChange }: Props) {
  if (!program) {
    return (
      <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-6 text-sm text-amber-100">
        Pick a level on the <strong>Levels</strong> step first (Basic, Implementer, Internal, or Lead).
        Each level has its own Zoom meeting, batch, price, and student list.
      </div>
    );
  }

  const setDraft: React.Dispatch<React.SetStateAction<TutorLedProgramStored | null>> = (action) => {
    const next = typeof action === "function" ? action(program) : action;
    if (next) onChange(next);
  };

  if (step === "zoom") {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-sky-500/25 bg-sky-500/10 p-4">
          <div className="flex items-center gap-2 text-sky-100">
            <Video className="h-4 w-4" />
            <h3 className="text-sm font-semibold">Zoom &amp; batch — {program.title}</h3>
          </div>
          <p className="mt-1 text-xs text-sky-100/80">
            This meeting is only for learners who buy this level on the shared landing page. The other
            levels keep their own Zoom links and batches.
          </p>
        </div>
        <label className="block">
          <span className="text-[11px] text-gray-500">Zoom join link</span>
          <input
            className={field}
            value={program.liveJoinUrl ?? ""}
            onChange={(e) => onChange({ ...program, liveJoinUrl: e.target.value })}
            placeholder="https://zoom.us/j/…"
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="text-[11px] text-gray-500">Meeting ID</span>
            <input
              className={field}
              value={program.zoomMeetingId ?? ""}
              onChange={(e) => onChange({ ...program, zoomMeetingId: e.target.value })}
              placeholder="123 456 7890"
            />
          </label>
          <label className="block">
            <span className="text-[11px] text-gray-500">Passcode</span>
            <input
              className={field}
              value={program.zoomPasscode ?? ""}
              onChange={(e) => onChange({ ...program, zoomPasscode: e.target.value })}
            />
          </label>
          <label className="block">
            <span className="text-[11px] text-gray-500">Next batch date</span>
            <input
              className={field}
              value={program.nextBatchDate}
              onChange={(e) => onChange({ ...program, nextBatchDate: e.target.value })}
              placeholder="12 Oct 2026"
            />
          </label>
          <label className="block">
            <span className="text-[11px] text-gray-500">Schedule</span>
            <input
              className={field}
              value={program.schedule}
              onChange={(e) => onChange({ ...program, schedule: e.target.value })}
              placeholder="Mon–Fri · 10:00 AM IST"
            />
          </label>
          <label className="block">
            <span className="text-[11px] text-gray-500">Batch name</span>
            <input
              className={field}
              value={program.batchLabel}
              onChange={(e) => onChange({ ...program, batchLabel: e.target.value })}
              placeholder="Basic Foundation Batch"
            />
          </label>
          <label className="block">
            <span className="text-[11px] text-gray-500">Seats left</span>
            <input
              type="number"
              className={field}
              value={program.seatsLeft}
              onChange={(e) => onChange({ ...program, seatsLeft: Number(e.target.value) || 0 })}
            />
          </label>
        </div>
        <p className="text-[11px] text-gray-500">
          Slug <span className="font-mono text-gray-300">{program.slug}</span>
          {program.liveJoinUrl?.trim() ? " · Zoom link saved" : " · add a Zoom link before the batch starts"}
        </p>
      </div>
    );
  }

  if (step === "pricing") {
    return <AdminTutorLedPricingPanel draft={program} setDraft={setDraft} />;
  }

  if (step === "assessment") {
    return <AdminTutorLedFinalAssessmentPanel draft={program} setDraft={setDraft} />;
  }

  if (step === "students") {
    return (
      <AdminCourseStudentsPanel
        courseTitle={program.title}
        workspaceCourseSlug={program.slug}
        canEdit
        onGoCourseInfo={() => undefined}
        batchContext={`${program.batchLabel || "Batch"} · ${program.nextBatchDate || "set batch date"} · Zoom is unique to this level.`}
      />
    );
  }

  return (
    <AdminProgramCertificateAssetsEditor
      programLabel="level"
      programTitle={program.title}
      certificateEnabled={program.certificateConfig?.enabled !== false}
      onCertificateEnabledChange={(on) => onChange(patchProgramCertificateConfig(program, { enabled: on }))}
      config={program.certificateConfig ?? {}}
      onPatch={(patch) => onChange(patchProgramCertificateConfig(program, patch))}
    />
  );
}
