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

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const el = document.createElement("textarea");
      el.value = text;
      el.setAttribute("readonly", "");
      el.style.position = "fixed";
      el.style.left = "-9999px";
      document.body.appendChild(el);
      el.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(el);
      return ok;
    } catch {
      return false;
    }
  }
}

export function TutorLedZoomJoinCard({ program, compact = false }: Props) {
  const [copied, setCopied] = useState<string | null>(null);
  const [copyError, setCopyError] = useState<string | null>(null);
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
    setCopyError(null);
    if (ok) {
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
      return;
    }
    setCopied(null);
    setCopyError(key);
    setTimeout(() => setCopyError(null), 2500);
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
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border-2 border-amber-400/60 bg-amber-500/15 px-4 py-3 shadow-[0_0_20px_rgba(251,191,36,0.2)] ring-2 ring-amber-400/35">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-200">Meeting ID</p>
            <p className="mt-0.5 font-mono text-xl font-bold tracking-[0.15em] text-white">
              {formatZoomMeetingId(meetingId)}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void onCopy("id", meetingId.replace(/\s/g, ""))}
            className="inline-flex shrink-0 items-center gap-1 rounded-lg border-2 border-amber-400/50 bg-black/40 px-3 py-1.5 text-[11px] font-semibold text-amber-100 hover:bg-amber-500/25"
          >
            <Copy className="h-3.5 w-3.5" aria-hidden />
            {copied === "id" ? "Copied!" : copyError === "id" ? "Select & copy" : "Copy"}
          </button>
        </div>
      ) : null}

      {passcode ? (
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3 rounded-xl border-2 border-violet-400/50 bg-violet-500/15 px-4 py-3 shadow-[0_0_16px_rgba(167,139,250,0.18)] ring-2 ring-violet-400/30">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-violet-200">Passcode</p>
            <p className="mt-0.5 font-mono text-lg font-bold tracking-wide text-white">{passcode}</p>
          </div>
          <button
            type="button"
            onClick={() => void onCopy("pwd", passcode)}
            className="inline-flex shrink-0 items-center gap-1 rounded-lg border-2 border-violet-400/50 bg-black/40 px-3 py-1.5 text-[11px] font-semibold text-violet-100 hover:bg-violet-500/25"
          >
            <Copy className="h-3.5 w-3.5" aria-hidden />
            {copied === "pwd" ? "Copied!" : copyError === "pwd" ? "Select & copy" : "Copy"}
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
