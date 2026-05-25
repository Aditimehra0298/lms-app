import { NextResponse } from "next/server";
import type { TutorLedProgramStored } from "@/lib/default-tutor-led-programs";
import type { ZoomSessionRecording } from "@/lib/zoom-session-types";
import { newLearningMaterialId } from "@/lib/tutor-led-learning-tools";
import { AdminContent } from "@/lib/content-schema";
import { readAdminContent, writeAdminContent } from "@/lib/server/content-store";
import {
  fetchMeetingRecordings,
  fetchUserRecordings,
  isZoomApiConfigured,
  zoomApiConfigHint,
} from "@/lib/server/zoom-client";

export const dynamic = "force-dynamic";

type Body = {
  slug?: string;
  meetingId?: string;
  persist?: boolean;
  /** Also add each recording as a webbook download row for the downloads panel */
  addToMaterials?: boolean;
};

function mergeRecordingsIntoProgram(
  program: TutorLedProgramStored,
  recordings: ZoomSessionRecording[],
  addToMaterials: boolean,
): TutorLedProgramStored {
  const existing = program.zoomRecordings ?? [];
  const byId = new Map(existing.map((r) => [r.id, r]));
  for (const r of recordings) byId.set(r.id, r);
  const zoomRecordings = Array.from(byId.values()).sort((a, b) =>
    (b.recordedAt ?? "").localeCompare(a.recordedAt ?? ""),
  );

  let learningMaterials = program.learningMaterials ?? [];
  if (addToMaterials) {
    for (const rec of recordings) {
      const url = rec.playUrl || rec.downloadUrl;
      if (!url) continue;
      const title = rec.topic || "Session recording";
      const already = learningMaterials.some(
        (m) => m.downloadUrl === url || m.title === title,
      );
      if (already) continue;
      learningMaterials = [
        ...learningMaterials,
        {
          id: newLearningMaterialId(),
          kind: "webbook" as const,
          title: `${title}${rec.recordedAt ? ` · ${rec.recordedAt.slice(0, 10)}` : ""}`,
          downloadUrl: url,
        },
      ];
    }
  }

  return { ...program, zoomRecordings, learningMaterials };
}

export async function POST(request: Request) {
  if (!isZoomApiConfigured()) {
    return NextResponse.json({ ok: false, error: zoomApiConfigHint() }, { status: 503 });
  }

  try {
    const body = (await request.json()) as Body;
    const content = await readAdminContent();
    const slug = body.slug?.trim();
    const program = slug ? content.tutorLedPrograms.find((p) => p.slug === slug) : undefined;
    const meetingId =
      body.meetingId?.trim() || program?.zoomMeetingId?.trim() || program?.zoomMeetingUuid?.trim();

    let recordings: ZoomSessionRecording[] = [];
    if (meetingId) {
      recordings = await fetchMeetingRecordings(meetingId);
    }
    if (recordings.length === 0) {
      recordings = await fetchUserRecordings();
      if (program?.title) {
        const needle = program.title.toLowerCase();
        const filtered = recordings.filter((r) => r.topic.toLowerCase().includes(needle));
        if (filtered.length > 0) recordings = filtered;
      }
    }

    if (body.persist && slug && program) {
      const nextPrograms = content.tutorLedPrograms.map((p) =>
        p.slug === slug
          ? mergeRecordingsIntoProgram(p, recordings, body.addToMaterials !== false)
          : p,
      );
      await writeAdminContent({ ...content, tutorLedPrograms: nextPrograms });
    }

    return NextResponse.json({
      ok: true,
      count: recordings.length,
      recordings,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Zoom API error";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
