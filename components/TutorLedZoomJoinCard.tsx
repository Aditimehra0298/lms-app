"use client";

import type { TutorLedProgramStored } from "@/lib/default-tutor-led-programs";
import { TutorLedLiveZoomPanel } from "@/components/TutorLedLiveZoomPanel";

type Props = {
  program: Pick<
    TutorLedProgramStored,
    "liveJoinUrl" | "zoomMeetingId" | "zoomPasscode" | "title" | "schedule"
  >;
  compact?: boolean;
};

/** @deprecated Prefer TutorLedLiveZoomPanel — kept for existing imports. */
export function TutorLedZoomJoinCard({ program, compact = false }: Props) {
  return <TutorLedLiveZoomPanel program={program} variant={compact ? "compact" : "full"} />;
}
