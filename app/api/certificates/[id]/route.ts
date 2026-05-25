import { NextResponse } from "next/server";
import { getCertificateById } from "@/lib/server/certificate-service";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  try {
    const certificate = await getCertificateById(id);
    if (!certificate) {
      return NextResponse.json({ ok: false, message: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, certificate });
  } catch (err) {
    console.error("[certificates/id]", err);
    return NextResponse.json({ ok: false, message: "Unavailable" }, { status: 503 });
  }
}
