/**
 * Helpers for Zoom Premium / recurring meeting links on tutor-led programs.
 * Paste your link from Zoom → Meetings → copy invitation, or use Personal Meeting ID.
 */

import type { TutorLedProgramStored } from "@/lib/default-tutor-led-programs";

export type ZoomMeetingFields = {
  liveJoinUrl?: string;
  zoomMeetingId?: string;
  zoomPasscode?: string;
};

/** True if URL looks like a Zoom join or start link. */
export function isZoomJoinUrl(url: string): boolean {
  const u = url.trim();
  if (!u) return false;
  try {
    const host = new URL(u).hostname.toLowerCase();
    return (
      host === "zoom.us" ||
      host.endsWith(".zoom.us") ||
      host === "zoom.com" ||
      host.endsWith(".zoom.com") ||
      host.endsWith(".zoomgov.com")
    );
  } catch {
    return /zoom\.(us|com|gov)/i.test(u);
  }
}

/** Parse meeting id and passcode from a Zoom invite link. */
export function parseZoomMeetingFromUrl(url: string): { meetingId?: string; passcode?: string } {
  const trimmed = url.trim();
  if (!trimmed) return {};
  try {
    const parsed = new URL(trimmed);
    const path = parsed.pathname;
    let meetingId: string | undefined;

    const jMatch = path.match(/\/j\/(\d+)/i);
    if (jMatch) meetingId = jMatch[1];
    else {
      const myMatch = path.match(/\/my\/(\d+)/i);
      if (myMatch) meetingId = myMatch[1];
    }

    const passcode =
      parsed.searchParams.get("pwd") ??
      parsed.searchParams.get("password") ??
      undefined;

    return { meetingId, passcode: passcode || undefined };
  } catch {
    const digits = trimmed.replace(/\D/g, "");
    if (digits.length >= 9 && digits.length <= 12) return { meetingId: digits };
    return {};
  }
}

/** Pull a Zoom join URL out of a pasted invite (full invitation text or a bare link). */
export function extractZoomJoinUrlFromText(raw: string): string | null {
  const text = raw.trim();
  if (!text) return null;
  const match = text.match(/https?:\/\/[^\s<>"']*(?:zoom\.us|zoom\.com|zoomgov\.com)\/[^\s<>"']*/i);
  if (match) return match[0].replace(/[),.;]+$/g, "");
  return isZoomJoinUrl(text) ? text : null;
}

/** Parse a Zoom join URL or a full “Copy invitation” paste. */
export function parseZoomInvitation(raw: string): {
  joinUrl?: string;
  meetingId?: string;
  passcode?: string;
} {
  const text = raw.trim();
  if (!text) return {};
  const joinUrl = extractZoomJoinUrlFromText(text) ?? undefined;
  const fromUrl = joinUrl ? parseZoomMeetingFromUrl(joinUrl) : parseZoomMeetingFromUrl(text);
  const idMatch = text.match(/Meeting ID:\s*([\d\s]+)/i);
  const pwdMatch = text.match(/(?:Passcode|Password):\s*(\S+)/i);
  const meetingId = fromUrl.meetingId || idMatch?.[1]?.replace(/\s/g, "") || undefined;
  const passcode = fromUrl.passcode || pwdMatch?.[1] || undefined;
  return {
    joinUrl: joinUrl || (meetingId ? `https://zoom.us/j/${meetingId}` : undefined),
    meetingId,
    passcode,
  };
}

/** Admin paste: store the join link and fill Meeting ID / passcode from it. */
export function applyZoomInvitePaste<T extends ZoomMeetingFields>(draft: T, pasted: string): T {
  const trimmed = pasted.trim();
  if (!trimmed) return { ...draft, liveJoinUrl: "" };
  const parsed = parseZoomInvitation(trimmed);
  const liveJoinUrl = parsed.joinUrl || trimmed;
  return {
    ...draft,
    liveJoinUrl,
    zoomMeetingId: parsed.meetingId || draft.zoomMeetingId || "",
    zoomPasscode: parsed.passcode || draft.zoomPasscode || "",
  };
}

/** Admin: typing a meeting ID builds a join URL when none is set. */
export function applyZoomMeetingIdField<T extends ZoomMeetingFields>(draft: T, raw: string): T {
  const zoomMeetingId = raw.replace(/\s/g, "");
  const liveJoinUrl = draft.liveJoinUrl?.trim()
    ? draft.liveJoinUrl
    : zoomMeetingId
      ? `https://zoom.us/j/${zoomMeetingId}`
      : "";
  return { ...draft, zoomMeetingId, liveJoinUrl };
}

/** Build the URL learners open in Zoom (web or app). */
export function buildZoomJoinUrl(fields: ZoomMeetingFields): string | null {
  const passcode = fields.zoomPasscode?.trim();
  let base = fields.liveJoinUrl?.trim() ?? "";

  if (!base && fields.zoomMeetingId?.trim()) {
    const id = fields.zoomMeetingId.replace(/\s/g, "");
    base = `https://zoom.us/j/${id}`;
  }

  if (!base) return null;

  if (passcode && isZoomJoinUrl(base)) {
    try {
      const parsed = new URL(base);
      if (!parsed.searchParams.get("pwd")) {
        parsed.searchParams.set("pwd", passcode);
        return parsed.toString();
      }
    } catch {
      /* use base as-is */
    }
  }

  return base;
}

/** Resolved join link for enrolled learners. */
export function resolveZoomJoinUrl(program: ZoomMeetingFields): string | null {
  return buildZoomJoinUrl(program);
}

/** Display meeting ID with spaces (Zoom style: 123 4567 8901). */
export function formatZoomMeetingId(id: string): string {
  const digits = id.replace(/\D/g, "");
  if (digits.length === 11) {
    return `${digits.slice(0, 3)} ${digits.slice(3, 7)} ${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
  }
  if (digits.length === 9) {
    return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
  }
  return id;
}

export const ZOOM_PREMIUM_ADMIN_HINTS = [
  "Create a new Zoom meeting for each training day. Do not reuse Day 1’s link on Day 2.",
  "Paste that day’s invitation on the matching session row. Learners also take a final exam after the last class.",
  "If Zoom shows a passcode, add it on that session (or keep it in the link as ?pwd=…).",
  "Learners tap Join on that day’s row — Zoom opens in a new tab (app or browser).",
] as const;

export type ZoomMeetingDisplay = {
  joinUrl: string | null;
  meetingId: string | null;
  meetingIdFormatted: string | null;
  passcode: string | null;
  hasZoom: boolean;
};

/** Structured meeting details for learner UI (admin-attached Zoom link). */
export function getZoomMeetingDisplay(fields: ZoomMeetingFields): ZoomMeetingDisplay {
  const joinUrl = resolveZoomJoinUrl(fields);
  const meetingId = fields.zoomMeetingId?.trim().replace(/\s/g, "") || null;
  const parsedFromUrl = joinUrl ? parseZoomMeetingFromUrl(joinUrl) : {};
  const id = meetingId || parsedFromUrl.meetingId || null;
  const passcode = fields.zoomPasscode?.trim() || parsedFromUrl.passcode || null;

  return {
    joinUrl,
    meetingId: id,
    meetingIdFormatted: id ? formatZoomMeetingId(id) : null,
    passcode,
    hasZoom: Boolean((joinUrl && isZoomJoinUrl(joinUrl)) || id),
  };
}

export const ZOOM_JOIN_STEPS = [
  "Join 5–10 minutes before the scheduled start time.",
  "Click Join on that day’s Zoom meeting — Zoom opens in your browser or desktop app.",
  "Enter the passcode if Zoom prompts you (shown below for that session).",
  "Allow camera and microphone when asked by Zoom.",
] as const;

function sessionHasOwnZoom(row: ZoomMeetingFields | undefined | null): boolean {
  return Boolean(row?.liveJoinUrl?.trim() || row?.zoomMeetingId?.trim());
}

/** True if any training day already has its own Zoom (do not reuse one meeting). */
export function programHasPerSessionZoom(
  program: Pick<TutorLedProgramStored, "curriculum">,
): boolean {
  return (program.curriculum ?? []).some((row) => sessionHasOwnZoom(row));
}

/**
 * Zoom for one live session. Each day has its own meeting.
 * Legacy programs with only a program-level link still work until per-day links are pasted.
 */
export function getCurriculumSessionZoom(
  program: Pick<TutorLedProgramStored, "curriculum" | "liveJoinUrl" | "zoomMeetingId" | "zoomPasscode">,
  sessionIndex: number,
): ZoomMeetingFields {
  const row = program.curriculum?.[sessionIndex];
  if (sessionHasOwnZoom(row)) {
    return {
      liveJoinUrl: row?.liveJoinUrl ?? "",
      zoomMeetingId: row?.zoomMeetingId ?? "",
      zoomPasscode: row?.zoomPasscode ?? "",
    };
  }
  if (programHasPerSessionZoom(program)) {
    return { liveJoinUrl: "", zoomMeetingId: "", zoomPasscode: "" };
  }
  return {
    liveJoinUrl: program.liveJoinUrl ?? "",
    zoomMeetingId: program.zoomMeetingId ?? "",
    zoomPasscode: program.zoomPasscode ?? "",
  };
}

export function applyCurriculumSessionZoomPaste<T extends TutorLedProgramStored>(
  program: T,
  sessionIndex: number,
  pasted: string,
): T {
  const curriculum = [...(program.curriculum ?? [])];
  const row = curriculum[sessionIndex];
  if (!row) return program;
  curriculum[sessionIndex] = applyZoomInvitePaste(row, pasted);
  return { ...program, curriculum };
}

export function applyCurriculumSessionMeetingId<T extends TutorLedProgramStored>(
  program: T,
  sessionIndex: number,
  raw: string,
): T {
  const curriculum = [...(program.curriculum ?? [])];
  const row = curriculum[sessionIndex];
  if (!row) return program;
  curriculum[sessionIndex] = applyZoomMeetingIdField(row, raw);
  return { ...program, curriculum };
}

export function applyCurriculumSessionPasscode<T extends TutorLedProgramStored>(
  program: T,
  sessionIndex: number,
  zoomPasscode: string,
): T {
  const curriculum = [...(program.curriculum ?? [])];
  const row = curriculum[sessionIndex];
  if (!row) return program;
  curriculum[sessionIndex] = { ...row, zoomPasscode };
  return { ...program, curriculum };
}

/** Any session (or legacy program-level) Zoom is ready. */
export function programHasAnySessionZoom(
  program: Pick<TutorLedProgramStored, "curriculum" | "liveJoinUrl" | "zoomMeetingId" | "zoomPasscode">,
): boolean {
  if (sessionHasOwnZoom(program)) return true;
  return (program.curriculum ?? []).some((row) => sessionHasOwnZoom(row));
}
