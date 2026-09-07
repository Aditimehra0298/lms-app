import { NextResponse } from "next/server";
import { assertCertificateOwnerOrAdmin } from "@/lib/server/certificate-access";
import { getCertificateById } from "@/lib/server/certificate-service";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  const { id } = await params;
  try {
    const certificate = await getCertificateById(id);
    if (!certificate) {
      return NextResponse.json({ ok: false, message: "Not found" }, { status: 404 });
    }

    const denied = assertCertificateOwnerOrAdmin(request, certificate.learnerEmail);
    if (denied) return denied;

    return NextResponse.json({ ok: true, certificate });
  } catch (err) {
    console.error("[certificates/id]", err);
    return NextResponse.json({ ok: false, message: "Unavailable" }, { status: 503 });
  }
}
