import { NextResponse } from "next/server";
import { listLearnerCertificates } from "@/lib/server/n8n-certificate-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const email = new URL(request.url).searchParams.get("email")?.trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ ok: false, message: "email query required" }, { status: 400 });
  }
  try {
    const certificates = await listLearnerCertificates(email);
    return NextResponse.json({ ok: true, certificates });
  } catch (err) {
    console.error("[certificates GET]", err);
    return NextResponse.json(
      { ok: false, message: "Could not load certificates. Run npm run db:push if the table is new." },
      { status: 503 },
    );
  }
}
