import { NextResponse } from "next/server";
import {
  assertAdminCsrf,
  readAdminSessionClaims,
  readAdminSessionEmail,
} from "@/lib/server/admin-session";
import {
  assertLearnerCsrf,
  readLearnerSessionClaims,
  readLearnerSessionEmail,
} from "@/lib/server/learner-session";

export type TicketAuth =
  | { role: "admin"; email: string }
  | { role: "learner"; email: string };

/** Admin session wins; otherwise learner session. */
export function resolveTicketAuth(request: Request): TicketAuth | null {
  const admin = readAdminSessionEmail(request);
  if (admin) return { role: "admin", email: admin };
  const learner = readLearnerSessionEmail(request);
  if (learner) return { role: "learner", email: learner };
  return null;
}

/** Auth + CSRF for ticket/issue write methods. */
export function resolveTicketMutationAuth(
  request: Request,
): TicketAuth | { error: NextResponse } {
  const adminClaims = readAdminSessionClaims(request);
  if (adminClaims?.email && adminClaims.sid) {
    const csrfError = assertAdminCsrf(request, adminClaims);
    if (csrfError) {
      return {
        error: NextResponse.json(
          { ok: false, error: csrfError },
          { status: 403, headers: { "Cache-Control": "no-store" } },
        ),
      };
    }
    // Exclusive sid is enforced by readAdminSessionEmail for admin role paths that use it;
    // mutation paths should prefer readAdminSessionEmail which checks sid sync.
    const admin = readAdminSessionEmail(request);
    if (!admin) {
      return {
        error: NextResponse.json(
          { ok: false, error: "Admin session expired. Sign in again." },
          { status: 403, headers: { "Cache-Control": "no-store" } },
        ),
      };
    }
    return { role: "admin", email: admin };
  }

  const learnerClaims = readLearnerSessionClaims(request);
  if (learnerClaims?.email) {
    const csrfError = assertLearnerCsrf(request, learnerClaims);
    if (csrfError) {
      return {
        error: NextResponse.json(
          { ok: false, error: csrfError },
          { status: 403, headers: { "Cache-Control": "no-store" } },
        ),
      };
    }
    return { role: "learner", email: learnerClaims.email };
  }

  return { error: ticketAuthRequiredResponse() };
}

export function ticketAuthRequiredResponse(): NextResponse {
  return NextResponse.json(
    { ok: false, error: "Sign in required." },
    { status: 401, headers: { "Cache-Control": "no-store" } },
  );
}

export function ticketForbiddenResponse(): NextResponse {
  return NextResponse.json(
    { ok: false, error: "Forbidden." },
    { status: 403, headers: { "Cache-Control": "no-store" } },
  );
}

/** Admin may see any ticket; learner only their own (case-insensitive email match). */
export function canAccessTicket(
  auth: TicketAuth,
  ticketEmail: string | null | undefined,
): boolean {
  if (auth.role === "admin") return true;
  const owner = ticketEmail?.trim().toLowerCase() ?? "";
  return Boolean(owner) && owner === auth.email;
}
