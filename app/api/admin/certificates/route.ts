import { NextResponse } from "next/server";
import { listAdminCertificatesForCourse } from "@/lib/server/n8n-certificate-service";

export const dynamic = "force-dynamic";

/** List all certificate rows for a course (admin approvals). */
export async function GET(request: Request) {
  const courseSlug = new URL(request.url).searchParams.get("courseSlug")?.trim();
  if (!courseSlug) {
    return NextResponse.json({ ok: false, message: "courseSlug required" }, { status: 400 });
  }
  try {
    const certificates = await listAdminCertificatesForCourse(courseSlug);
    return NextResponse.json({ ok: true, certificates });
  } catch (err) {
    console.error("[admin/certificates]", err);
    return NextResponse.json({ ok: false, message: "Could not load certificates." }, { status: 503 });
  }
}
