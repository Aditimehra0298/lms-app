import { NextResponse } from "next/server";
import { verifyCertificateNumber } from "@/lib/server/certificate-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const number = new URL(request.url).searchParams.get("number")?.trim();
  if (!number) {
    return NextResponse.json({ ok: false, message: "number query required" }, { status: 400 });
  }
  try {
    const certificate = await verifyCertificateNumber(number);
    if (!certificate) {
      return NextResponse.json({ ok: false, verified: false, message: "Certificate not found." }, { status: 404 });
    }
    return NextResponse.json({ ok: true, verified: true, certificate });
  } catch (err) {
    console.error("[certificates/verify]", err);
    return NextResponse.json({ ok: false, message: "Verification unavailable." }, { status: 503 });
  }
}
