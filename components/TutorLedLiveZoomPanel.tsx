"use client";

import { useMemo, useState } from "react";
import type { TutorLedProgramStored } from "@/lib/default-tutor-led-programs";
import {
  getZoomMeetingDisplay,
  ZOOM_JOIN_STEPS,
  type ZoomMeetingFields,
} from "@/lib/zoom-meeting";
import { Copy, ExternalLink, MonitorPlay, Video } from "lucide-react";

type Props = {
  program: Pick<TutorLedProgramStored, "liveJoinUrl" | "zoomMeetingId" | "zoomPasscode" | "title" | "schedule">;
  variant?: "full" | "compact";
  id?: string;
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

function ZoomBrandBadge() {
  return (
    <span className="inline-flex items-center rounded-md bg-[#2D8CFF] px-2.5 py-1 text-[11px] font-bold tracking-tight text-white shadow-sm">
      zoom
    </span>
  );
}

export function TutorLedLiveZoomPanel({
  program,
  variant = "full",
  id = "zoom-live",
}: Props) {
  const [copied, setCopied] = useState<string | null>(null);
  const zoom = useMemo(() => getZoomMeetingDisplay(program as ZoomMeetingFields), [program]);
  const compact = variant === "compact";

  const onCopy = async (key: string, value: string) => {
    const ok = await copyText(value);
    if (ok) {
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    }
  };

  if (!zoom.hasZoom) {
    return (
      <div
        id={id}
        className="rounded-2xl border border-amber-500/25 bg-gradient-to-br from-amber-500/10 to-zinc-950/80 p-4 md:p-5"
      >
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-amber-500/30 bg-amber-500/10">
            <Video className="h-5 w-5 text-amber-300" aria-hidden />
          </div>
          <div>
            <p className="text-sm font-bold text-white">Live Zoom classroom</p>
            <p className="mt-1 text-xs leading-relaxed text-zinc-400">
              Your trainer will share the Zoom meeting link before your first session. Check back here when it is time to join.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <section
      id={id}
      className={
        compact
          ? "overflow-hidden rounded-2xl border border-[#2D8CFF]/35 bg-gradient-to-br from-[#0c1e3a]/80 to-zinc-950/90"
          : "overflow-hidden rounded-2xl border border-[#2D8CFF]/40 bg-gradient-to-br from-[#0a1628] via-[#0c1e3a]/60 to-zinc-950 shadow-[0_0_48px_rgba(45,140,255,0.08)]"
      }
      aria-label="Zoom live classroom"
    >
      <div className="border-b border-[#2D8CFF]/20 bg-[#2D8CFF]/10 px-4 py-3 md:px-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <ZoomBrandBadge />
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-sky-200">Live on Zoom</p>
              <p className="text-[11px] text-zinc-400">Tutor-led training · {program.title}</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/35 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold text-emerald-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden />
            Meeting ready
          </span>
        </div>
      </div>

      <div className={compact ? "space-y-3 p-4" : "grid gap-5 p-4 md:grid-cols-[minmax(0,1fr)_minmax(220px,280px)] md:p-5"}>
        <div className="min-w-0 space-y-4">
          {!compact ? (
            <p className="text-sm leading-relaxed text-zinc-300">
              All live sessions for this cohort use the same Zoom meeting attached by your trainer. Join from here —
              no separate links per class.
            </p>
          ) : null}

          {zoom.joinUrl ? (
            <a
              href={zoom.joinUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#2D8CFF] py-3.5 text-sm font-bold text-white shadow-[0_8px_28px_rgba(45,140,255,0.35)] transition hover:bg-[#2681eb]"
            >
              <Video className="h-4 w-4" aria-hidden />
              Join Live Session on Zoom
              <ExternalLink className="h-3.5 w-3.5 opacity-90" aria-hidden />
            </a>
          ) : null}

          <div className="grid gap-2 sm:grid-cols-2">
            {zoom.meetingIdFormatted ? (
              <div className="rounded-xl border border-white/10 bg-black/35 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Meeting ID</p>
                <div className="mt-1.5 flex items-center justify-between gap-2">
                  <p className="font-mono text-lg font-bold tracking-[0.12em] text-white">
                    {zoom.meetingIdFormatted}
                  </p>
                  <button
                    type="button"
                    onClick={() => void onCopy("id", zoom.meetingId ?? "")}
                    className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-white/15 bg-white/5 px-2 py-1 text-[10px] font-semibold text-zinc-300 hover:bg-white/10"
                  >
                    <Copy className="h-3 w-3" aria-hidden />
                    {copied === "id" ? "Copied" : "Copy"}
                  </button>
                </div>
              </div>
            ) : null}

            {zoom.passcode ? (
              <div className="rounded-xl border border-white/10 bg-black/35 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Passcode</p>
                <div className="mt-1.5 flex items-center justify-between gap-2">
                  <p className="font-mono text-lg font-bold tracking-wide text-white">{zoom.passcode}</p>
                  <button
                    type="button"
                    onClick={() => void onCopy("pwd", zoom.passcode ?? "")}
                    className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-white/15 bg-white/5 px-2 py-1 text-[10px] font-semibold text-zinc-300 hover:bg-white/10"
                  >
                    <Copy className="h-3 w-3" aria-hidden />
                    {copied === "pwd" ? "Copied" : "Copy"}
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          {zoom.joinUrl ? (
            <div className="rounded-xl border border-white/10 bg-black/30 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Join link</p>
              <div className="mt-1.5 flex items-start gap-2">
                <p className="min-w-0 flex-1 break-all font-mono text-[11px] leading-relaxed text-sky-200/90">
                  {zoom.joinUrl}
                </p>
                <button
                  type="button"
                  onClick={() => void onCopy("url", zoom.joinUrl ?? "")}
                  className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-sky-400/30 bg-sky-500/10 px-2 py-1 text-[10px] font-semibold text-sky-200 hover:bg-sky-500/20"
                >
                  <Copy className="h-3 w-3" aria-hidden />
                  {copied === "url" ? "Copied" : "Copy"}
                </button>
              </div>
            </div>
          ) : null}
        </div>

        {!compact ? (
          <div className="rounded-xl border border-white/10 bg-black/25 p-4">
            <p className="inline-flex items-center gap-2 text-xs font-bold text-zinc-200">
              <MonitorPlay className="h-4 w-4 text-[#2D8CFF]" aria-hidden />
              How to join on Zoom
            </p>
            <ol className="mt-3 space-y-2.5">
              {ZOOM_JOIN_STEPS.map((step, i) => (
                <li key={step} className="flex gap-2.5 text-xs leading-relaxed text-zinc-400">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-[#2D8CFF]/40 bg-[#2D8CFF]/10 text-[10px] font-bold text-sky-300">
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
            {program.schedule?.trim() ? (
              <p className="mt-4 border-t border-white/10 pt-3 text-[11px] text-zinc-500">
                <span className="font-semibold text-zinc-400">Schedule: </span>
                {program.schedule}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
