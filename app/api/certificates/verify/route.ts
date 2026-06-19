import { NextResponse } from "next/server";
import { verifyCertificateLookup } from "@/lib/server/certificate-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const number = url.searchParams.get("number")?.trim();
  const delegate = url.searchParams.get("delegate")?.trim();
  if (!number && !delegate) {
    return NextResponse.json(
      { ok: false, message: "number or delegate query required" },
      { status: 400 },
    );
  }
  try {
    const certificate = await verifyCertificateLookup({ number, delegate });
    if (!certificate) {
      return NextResponse.json(
        { ok: false, verified: false, message: "Certificate not found or not yet published." },
        { status: 404 },
      );
    }
    return NextResponse.json({ ok: true, verified: true, certificate });
  } catch (err) {
    console.error("[certificates/verify]", err);
    return NextResponse.json({ ok: false, message: "Verification unavailable." }, { status: 503 });
  }
}
