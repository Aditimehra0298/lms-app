import { NextResponse } from "next/server";
import { listLearnerCertificates } from "@/lib/server/n8n-certificate-service";
import {
  learnerAuthRequiredResponse,
  requireLearnerSessionEmail,
} from "@/lib/server/learner-session";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const email = requireLearnerSessionEmail(request);
  if (!email) return learnerAuthRequiredResponse();

  try {
    const certificates = await listLearnerCertificates(email);
    return NextResponse.json(
      { ok: true, certificates },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    console.error("[certificates GET]", err);
    return NextResponse.json(
      {
        ok: false,
        message: "Could not load certificates. Run npm run db:push if the table is new.",
      },
      { status: 503 },
    );
  }
}
