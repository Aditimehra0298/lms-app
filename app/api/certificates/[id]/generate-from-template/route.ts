import { NextResponse } from "next/server";
import { generateCertificateFromCourseTemplate } from "@/lib/server/local-certificate-fallback";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Params = { params: Promise<{ id: string }> };

/** Overlay learner details on the course's uploaded certificate template and save PDF. */
export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  if (!id?.trim()) {
    return NextResponse.json({ ok: false, message: "Missing certificate id" }, { status: 400 });
  }

  let body: { email?: string; forceRegenerate?: boolean };
  try {
    body = (await request.json()) as { email?: string; forceRegenerate?: boolean };
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ ok: false, message: "email required" }, { status: 400 });
  }

  try {
    const result = await generateCertificateFromCourseTemplate({
      certificateId: id.trim(),
      learnerEmail: email,
      forceRegenerate: body.forceRegenerate === true,
    });
    if (!result.ok) {
      return NextResponse.json(result, { status: 409 });
    }
    return NextResponse.json(result);
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error("[certificates/generate-from-template]", err);
    return NextResponse.json(
      {
        ok: false,
        message: `Could not generate certificate from course template. ${detail}`,
      },
      { status: 503 },
    );
  }
}
