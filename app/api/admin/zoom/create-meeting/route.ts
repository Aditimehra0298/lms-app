import { NextResponse } from "next/server";
import type { TutorLedProgramStored } from "@/lib/default-tutor-led-programs";
import { parseZoomMeetingFromUrl } from "@/lib/zoom-meeting";
import { AdminContent } from "@/lib/content-schema";
import { readAdminContent, writeAdminContent } from "@/lib/server/content-store";
import {
  createZoomMeeting,
  isZoomApiConfigured,
  zoomApiConfigHint,
} from "@/lib/server/zoom-client";

export const dynamic = "force-dynamic";

type Body = {
  topic?: string;
  startTime?: string;
  durationMinutes?: number;
  timezone?: string;
  slug?: string;
  persist?: boolean;
};

function applyMeetingToProgram(
  program: TutorLedProgramStored,
  meeting: { id: string; uuid: string; joinUrl: string; password: string },
): TutorLedProgramStored {
  const parsed = parseZoomMeetingFromUrl(meeting.joinUrl);
  return {
    ...program,
    liveJoinUrl: meeting.joinUrl,
    zoomMeetingId: parsed.meetingId ?? meeting.id,
    zoomPasscode: parsed.passcode ?? meeting.password,
    zoomMeetingUuid: meeting.uuid || program.zoomMeetingUuid,
  };
}

export async function POST(request: Request) {
  if (!isZoomApiConfigured()) {
    return NextResponse.json({ ok: false, error: zoomApiConfigHint() }, { status: 503 });
  }

  try {
    const body = (await request.json()) as Body;
    const content = await readAdminContent();
    const slug = body.slug?.trim();
    const program = slug
      ? content.tutorLedPrograms.find((p) => p.slug === slug)
      : undefined;
    const topic = body.topic?.trim() || program?.title || "Live tutor-led session";

    const meeting = await createZoomMeeting({
      topic,
      startTime: body.startTime,
      durationMinutes: body.durationMinutes,
      timezone: body.timezone,
    });

    const patch = {
      id: meeting.id,
      uuid: meeting.uuid,
      joinUrl: meeting.joinUrl,
      startUrl: meeting.startUrl,
      password: meeting.password,
      topic: meeting.topic,
    };

    if (body.persist && slug && program) {
      const nextPrograms = content.tutorLedPrograms.map((p) =>
        p.slug === slug ? applyMeetingToProgram(p, meeting) : p,
      );
      const nextContent: AdminContent = { ...content, tutorLedPrograms: nextPrograms };
      await writeAdminContent(nextContent);
    }

    return NextResponse.json({ ok: true, meeting: patch });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Zoom API error";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
