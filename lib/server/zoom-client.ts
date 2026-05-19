import type { ZoomSessionRecording } from "@/lib/zoom-session-types";

type ZoomTokenCache = { accessToken: string; expiresAt: number };

let tokenCache: ZoomTokenCache | null = null;

export function isZoomApiConfigured(): boolean {
  return Boolean(
    process.env.ZOOM_ACCOUNT_ID?.trim() &&
      process.env.ZOOM_CLIENT_ID?.trim() &&
      process.env.ZOOM_CLIENT_SECRET?.trim() &&
      process.env.ZOOM_HOST_USER_ID?.trim(),
  );
}

export function zoomApiConfigHint(): string {
  return "Set ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET, and ZOOM_HOST_USER_ID in .env.local (Zoom Server-to-Server OAuth app).";
}

async function getAccessToken(): Promise<string> {
  if (tokenCache && Date.now() < tokenCache.expiresAt - 60_000) {
    return tokenCache.accessToken;
  }

  const accountId = process.env.ZOOM_ACCOUNT_ID!.trim();
  const clientId = process.env.ZOOM_CLIENT_ID!.trim();
  const clientSecret = process.env.ZOOM_CLIENT_SECRET!.trim();
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const res = await fetch(
    `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${encodeURIComponent(accountId)}`,
    {
      method: "POST",
      headers: { Authorization: `Basic ${basic}` },
    },
  );

  const data = (await res.json()) as {
    access_token?: string;
    expires_in?: number;
    error?: string;
    reason?: string;
  };

  if (!res.ok || !data.access_token) {
    throw new Error(data.reason ?? data.error ?? `Zoom OAuth failed (${res.status})`);
  }

  tokenCache = {
    accessToken: data.access_token,
    expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
  };
  return tokenCache.accessToken;
}

export type CreateZoomMeetingInput = {
  topic: string;
  /** ISO 8601, e.g. 2026-05-25T14:00:00Z — omit for a recurring-style room */
  startTime?: string;
  durationMinutes?: number;
  timezone?: string;
};

export type ZoomMeetingCreated = {
  id: string;
  uuid: string;
  joinUrl: string;
  startUrl: string;
  password: string;
  topic: string;
};

export async function createZoomMeeting(input: CreateZoomMeetingInput): Promise<ZoomMeetingCreated> {
  const hostUserId = process.env.ZOOM_HOST_USER_ID!.trim();
  const token = await getAccessToken();
  const cloudRecord = process.env.ZOOM_AUTO_RECORD_CLOUD !== "false";

  const body: Record<string, unknown> = {
    topic: input.topic,
    type: input.startTime ? 2 : 8,
    duration: input.durationMinutes ?? 90,
    timezone: input.timezone ?? "Asia/Kolkata",
    settings: {
      host_video: true,
      participant_video: true,
      join_before_host: true,
      waiting_room: true,
      auto_recording: cloudRecord ? "cloud" : "none",
      cloud_recording: cloudRecord,
    },
  };

  if (input.startTime) {
    body.start_time = input.startTime;
  }

  const res = await fetch(
    `https://api.zoom.us/v2/users/${encodeURIComponent(hostUserId)}/meetings`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
  );

  const data = (await res.json()) as {
    id?: number;
    uuid?: string;
    join_url?: string;
    start_url?: string;
    password?: string;
    topic?: string;
    message?: string;
  };

  if (!res.ok || !data.join_url || data.id == null) {
    throw new Error(data.message ?? `Zoom create meeting failed (${res.status})`);
  }

  return {
    id: String(data.id),
    uuid: data.uuid ?? "",
    joinUrl: data.join_url,
    startUrl: data.start_url ?? "",
    password: data.password ?? "",
    topic: data.topic ?? input.topic,
  };
}

function parseDurationMinutes(start?: string, end?: string): number | undefined {
  if (!start || !end) return undefined;
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (!Number.isFinite(ms) || ms <= 0) return undefined;
  return Math.round(ms / 60_000);
}

/** List cloud recordings for a meeting (by numeric meeting id). */
export async function fetchMeetingRecordings(meetingId: string): Promise<ZoomSessionRecording[]> {
  const token = await getAccessToken();
  const id = meetingId.replace(/\s/g, "");
  const res = await fetch(`https://api.zoom.us/v2/meetings/${encodeURIComponent(id)}/recordings`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (res.status === 404) return [];

  const data = (await res.json()) as {
    recording_files?: Array<{
      id?: string;
      file_type?: string;
      status?: string;
      play_url?: string;
      download_url?: string;
      recording_start?: string;
      recording_end?: string;
    }>;
    topic?: string;
    message?: string;
  };

  if (!res.ok) {
    throw new Error(data.message ?? `Zoom recordings failed (${res.status})`);
  }

  const topic = data.topic ?? "Session recording";
  const files = data.recording_files ?? [];
  const out: ZoomSessionRecording[] = [];

  for (const file of files) {
    if (file.file_type !== "MP4" || file.status !== "completed") continue;
    if (!file.play_url) continue;
    out.push({
      id: file.id ?? `rec-${out.length}`,
      topic,
      playUrl: file.play_url,
      downloadUrl: file.download_url,
      recordedAt: file.recording_start,
      durationMinutes: parseDurationMinutes(file.recording_start, file.recording_end),
    });
  }

  return out;
}

/** All recordings for the host user (fallback when meeting id is missing). */
export async function fetchUserRecordings(): Promise<ZoomSessionRecording[]> {
  const hostUserId = process.env.ZOOM_HOST_USER_ID!.trim();
  const token = await getAccessToken();
  const from = new Date();
  from.setMonth(from.getMonth() - 6);
  const params = new URLSearchParams({
    from: from.toISOString().slice(0, 10),
    to: new Date().toISOString().slice(0, 10),
    page_size: "100",
  });

  const res = await fetch(
    `https://api.zoom.us/v2/users/${encodeURIComponent(hostUserId)}/recordings?${params}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );

  const data = (await res.json()) as {
    meetings?: Array<{
      uuid?: string;
      id?: number;
      topic?: string;
      start_time?: string;
      recording_files?: Array<{
        id?: string;
        file_type?: string;
        status?: string;
        play_url?: string;
        download_url?: string;
        recording_start?: string;
        recording_end?: string;
      }>;
    }>;
    message?: string;
  };

  if (!res.ok) {
    throw new Error(data.message ?? `Zoom user recordings failed (${res.status})`);
  }

  const out: ZoomSessionRecording[] = [];
  for (const meeting of data.meetings ?? []) {
    const topic = meeting.topic ?? "Session recording";
    for (const file of meeting.recording_files ?? []) {
      if (file.file_type !== "MP4" || file.status !== "completed" || !file.play_url) continue;
      out.push({
        id: file.id ?? `${meeting.id}-${out.length}`,
        topic,
        playUrl: file.play_url,
        downloadUrl: file.download_url,
        recordedAt: file.recording_start ?? meeting.start_time,
        durationMinutes: parseDurationMinutes(file.recording_start, file.recording_end),
      });
    }
  }

  return out.sort((a, b) => (b.recordedAt ?? "").localeCompare(a.recordedAt ?? ""));
}
