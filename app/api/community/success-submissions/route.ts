import { NextResponse } from "next/server";
import {
  createCommunitySuccessSubmission,
  listSubmissionsForViewer,
} from "@/lib/server/community-success-submissions-store";
import {
  requireLearnerWriter,
  resolveLearnerViewer,
} from "@/lib/server/learner-request-identity";

export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "private, no-store, max-age=0" };

export async function GET(request: Request) {
  const viewer = resolveLearnerViewer(request);
  const rows = await listSubmissionsForViewer(viewer?.email);
  return NextResponse.json(
    {
      ok: true,
      submissions: rows.map((s) => ({
        id: s.id,
        courseSlug: s.courseSlug,
        courseTitle: s.courseTitle,
        externalPlatform: s.externalPlatform ?? null,
        body: s.body ?? "",
        attachmentUrl: s.attachmentUrl,
        status: s.status,
        authorName: s.authorName,
        isMine: viewer?.email ? s.authorEmail === viewer.email : false,
        createdAt: s.createdAt,
      })),
    },
    { headers: noStore },
  );
}

export async function POST(request: Request) {
  const learnerAuth = requireLearnerWriter(request);
  if ("response" in learnerAuth) return learnerAuth.response;
  const learner = learnerAuth;

  let body: {
    courseSlug?: string;
    courseTitle?: string;
    externalPlatform?: string;
    story?: string;
    attachmentUrl?: string;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON" }, { status: 400 });
  }

  const courseSlug = body.courseSlug?.trim() || "";
  const courseTitle = body.courseTitle?.trim() || "";
  const attachmentUrl = body.attachmentUrl?.trim() || "";
  const externalPlatform = body.externalPlatform?.trim() || "";
  const isExternal = courseSlug === "external";

  if (!courseSlug) {
    return NextResponse.json({ ok: false, message: "Select a course or external platform." }, { status: 400 });
  }
  if (isExternal && !externalPlatform) {
    return NextResponse.json(
      { ok: false, message: "Enter the platform or provider name (e.g. Coursera, LinkedIn)." },
      { status: 400 },
    );
  }
  if (!attachmentUrl) {
    return NextResponse.json(
      { ok: false, message: "Upload a certificate, badge, or screenshot." },
      { status: 400 },
    );
  }

  const created = await createCommunitySuccessSubmission({
    authorEmail: learner.email,
    authorName: learner.name,
    courseSlug,
    courseTitle: isExternal ? externalPlatform : courseTitle,
    externalPlatform: isExternal ? externalPlatform : undefined,
    body: body.story?.trim(),
    attachmentUrl,
  });

  return NextResponse.json({
    ok: true,
    submission: {
      id: created.id,
      courseSlug: created.courseSlug,
      courseTitle: created.courseTitle,
      externalPlatform: created.externalPlatform ?? null,
      body: created.body ?? "",
      attachmentUrl: created.attachmentUrl,
      status: created.status,
      authorName: created.authorName,
      isMine: true,
      createdAt: created.createdAt,
    },
  });
}
