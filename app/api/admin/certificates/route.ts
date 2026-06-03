import { NextResponse } from "next/server";
import {
  listAdminCertificatesAll,
  listAdminCertificatesForCourse,
} from "@/lib/server/n8n-certificate-service";

export const dynamic = "force-dynamic";

/** List certificate rows for admin — all courses, or filter by courseSlug. */
export async function GET(request: Request) {
  const courseSlug = new URL(request.url).searchParams.get("courseSlug")?.trim();
  try {
    const certificates = courseSlug
      ? await listAdminCertificatesForCourse(courseSlug)
      : await listAdminCertificatesAll();
    return NextResponse.json({ ok: true, certificates });
  } catch (err) {
    console.error("[admin/certificates]", err);
    return NextResponse.json({ ok: false, message: "Could not load certificates." }, { status: 503 });
  }
}
