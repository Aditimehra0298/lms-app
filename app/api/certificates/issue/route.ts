import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * POC-D-01: Direct public issuance is disabled.
 * Learners: POST /api/certificates/request (session + enrollment + completion).
 * Admins: POST /api/admin/certificates/trigger (admin session + CSRF).
 */
export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      message:
        "Direct certificate issuance is not allowed. Complete the course as a signed-in learner, or ask an administrator to issue the certificate.",
    },
    { status: 403, headers: { "Cache-Control": "no-store" } },
  );
}
