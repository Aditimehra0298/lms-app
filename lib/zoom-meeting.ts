/**
 * Helpers for Zoom Premium / recurring meeting links on tutor-led programs.
 * Paste your link from Zoom → Meetings → copy invitation, or use Personal Meeting ID.
 */

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
  "In Zoom: Meetings → your recurring or PMI meeting → Copy invitation → paste the join link below.",
  "Premium: use a fixed Personal Meeting ID (PMI) so the same link works every cohort.",
  "If Zoom shows a passcode, add it in the passcode field (or keep it in the link as ?pwd=…).",
  "Learners tap Join Live Session — Zoom opens in a new tab (app or browser).",
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
  "Click Join Live Session — Zoom opens in your browser or desktop app.",
  "Enter the passcode if Zoom prompts you (shown below).",
  "Allow camera and microphone when asked by Zoom.",
] as const;
