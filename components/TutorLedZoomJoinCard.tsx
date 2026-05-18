"use client";

import { useMemo, useState } from "react";
import type { TutorLedProgramStored } from "@/lib/default-tutor-led-programs";
import {
  formatZoomMeetingId,
  isZoomJoinUrl,
  resolveZoomJoinUrl,
} from "@/lib/zoom-meeting";
import { Copy, ExternalLink, Video } from "lucide-react";

type Props = {
  program: Pick<TutorLedProgramStored, "liveJoinUrl" | "zoomMeetingId" | "zoomPasscode" | "title">;
  compact?: boolean;
};

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function TutorLedZoomJoinCard({ program, compact = false }: Props) {
  const [copied, setCopied] = useState<string | null>(null);
  const joinUrl = useMemo(() => resolveZoomJoinUrl(program), [program]);
  const meetingId = program.zoomMeetingId?.trim();
  const passcode = program.zoomPasscode?.trim();
  const hasZoom = Boolean(joinUrl && isZoomJoinUrl(joinUrl));

  if (!hasZoom && !meetingId) {
    return (
      <p className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-[11px] text-amber-100/80">
        Your trainer has not added a Zoom link yet. Check announcements or contact support.
      </p>
    );
  }

  const onCopy = async (key: string, value: string) => {
    const ok = await copyText(value);
    setCopied(ok ? key : null);
    if (ok) setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div
      id="zoom-live"
      className={
        compact
          ? "rounded-xl border border-sky-500/25 bg-sky-500/5 p-3"
          : "rounded-xl border border-sky-500/30 bg-gradient-to-br from-sky-950/40 to-black/40 p-4"
      }
    >
      <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-sky-300">
        <Video className="h-3.5 w-3.5" aria-hidden />
        Zoom Premium — live classroom
      </p>
      {!compact ? (
        <p className="mt-1 text-xs text-zinc-400">
          Join 5–10 minutes early from your LMS classroom. Use the same link for every live session in{" "}
          {program.title}.
        </p>
      ) : null}

      {meetingId ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 bg-black/30 px-3 py-2">
          <div>
            <p className="text-[10px] text-zinc-500">Meeting ID</p>
            <p className="font-mono text-sm font-semibold text-white">{formatZoomMeetingId(meetingId)}</p>
          </div>
          <button
            type="button"
            onClick={() => void onCopy("id", meetingId.replace(/\s/g, ""))}
            className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2 py-1 text-[10px] text-zinc-300 hover:bg-white/5"
          >
            <Copy className="h-3 w-3" aria-hidden />
            {copied === "id" ? "Copied" : "Copy"}
          </button>
        </div>
      ) : null}

      {passcode ? (
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 bg-black/30 px-3 py-2">
          <div>
            <p className="text-[10px] text-zinc-500">Passcode</p>
            <p className="font-mono text-sm font-semibold text-white">{passcode}</p>
          </div>
          <button
            type="button"
            onClick={() => void onCopy("pwd", passcode)}
            className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2 py-1 text-[10px] text-zinc-300 hover:bg-white/5"
          >
            <Copy className="h-3 w-3" aria-hidden />
            {copied === "pwd" ? "Copied" : "Copy"}
          </button>
        </div>
      ) : null}

      {joinUrl ? (
        <a
          href={joinUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#2D8CFF] py-3 text-sm font-bold text-white shadow-[0_8px_24px_rgba(45,140,255,0.35)] transition hover:bg-[#2681eb] ${compact ? "py-2.5 text-xs" : ""}`}
        >
          <Video className="h-4 w-4" aria-hidden />
          Join live on Zoom
          <ExternalLink className="h-3.5 w-3.5 opacity-80" aria-hidden />
        </a>
      ) : null}
    </div>
  );
}
