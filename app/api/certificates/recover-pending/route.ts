import { NextResponse } from "next/server";
import { recoverPendingCertificatesForEmail } from "@/lib/server/local-certificate-fallback";

export const dynamic = "force-dynamic";

/** Dev/admin: finish pending certificates when n8n callback cannot reach localhost. */
export async function POST(request: Request) {
  let body: { email?: string };
  try {
    body = (await request.json()) as { email?: string };
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ ok: false, message: "email required" }, { status: 400 });
  }

  const recovered = await recoverPendingCertificatesForEmail(email);
  return NextResponse.json({ ok: true, recovered, email });
}
