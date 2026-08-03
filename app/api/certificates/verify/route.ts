import { NextResponse } from "next/server";
import { verifyCertificateLookup } from "@/lib/server/certificate-service";

export const dynamic = "force-dynamic";

function hasLookupKey(input: {
  number?: string;
  delegate?: string;
  id?: string;
  q?: string;
}): boolean {
  return Boolean(input.number || input.delegate || input.id || input.q);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const email = url.searchParams.get("email")?.trim() || undefined;
  const number = url.searchParams.get("number")?.trim() || undefined;
  const delegate = url.searchParams.get("delegate")?.trim() || undefined;
  const id = url.searchParams.get("id")?.trim() || undefined;
  const q = url.searchParams.get("q")?.trim() || undefined;

  if (!email) {
    return NextResponse.json(
      { ok: false, message: "Email address is required." },
      { status: 400 },
    );
  }
  if (!hasLookupKey({ number, delegate, id, q })) {
    return NextResponse.json(
      { ok: false, message: "Certificate number is required." },
      { status: 400 },
    );
  }

  try {
    const certificate = await verifyCertificateLookup({ email, number, delegate, id, q });
    if (!certificate) {
      return NextResponse.json(
        {
          ok: false,
          verified: false,
          message: "No certificate matches this email and certificate number.",
        },
        { status: 404 },
      );
    }
    return NextResponse.json({ ok: true, verified: true, certificate });
  } catch (err) {
    console.error("[certificates/verify]", err);
    return NextResponse.json({ ok: false, message: "Verification unavailable." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  let body: { email?: string; number?: string; delegate?: string; id?: string; q?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON" }, { status: 400 });
  }

  const email = body.email?.trim() || undefined;
  const number = body.number?.trim() || undefined;
  const delegate = body.delegate?.trim() || undefined;
  const id = body.id?.trim() || undefined;
  const q = body.q?.trim() || undefined;

  if (!email) {
    return NextResponse.json(
      { ok: false, message: "Email address is required." },
      { status: 400 },
    );
  }
  if (!hasLookupKey({ number, delegate, id, q })) {
    return NextResponse.json(
      { ok: false, message: "Certificate number is required." },
      { status: 400 },
    );
  }

  try {
    const certificate = await verifyCertificateLookup({ email, number, delegate, id, q });
    if (!certificate) {
      return NextResponse.json(
        {
          ok: false,
          verified: false,
          message: "No certificate matches this email and certificate number.",
        },
        { status: 404 },
      );
    }
    return NextResponse.json({ ok: true, verified: true, certificate });
  } catch (err) {
    console.error("[certificates/verify POST]", err);
    return NextResponse.json({ ok: false, message: "Verification unavailable." }, { status: 503 });
  }
}
