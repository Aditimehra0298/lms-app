import { NextResponse } from "next/server";
import { requestCourseCertificate } from "@/lib/server/n8n-certificate-service";

export const dynamic = "force-dynamic";

/** Start certificate generation (n8n or builtin) after exam pass. */
export async function POST(request: Request) {
  let body: {
    learnerEmail?: string;
    learnerName?: string;
    courseSlug?: string;
    scorePercent?: number;
    forceRetry?: boolean;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON" }, { status: 400 });
  }

  try {
    const result = await requestCourseCertificate({
      learnerEmail: body.learnerEmail ?? "",
      learnerName: body.learnerName,
      courseSlug: body.courseSlug ?? "",
      scorePercent: body.scorePercent,
      forceRetry: body.forceRetry === true,
    });
    if (!result.ok) {
      return NextResponse.json(result, { status: 400 });
    }
    return NextResponse.json(result);
  } catch (err) {
    console.error("[certificates/request]", err);
    return NextResponse.json({ ok: false, message: "Certificate request failed." }, { status: 503 });
  }
}
