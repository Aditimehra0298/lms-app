import { NextResponse } from "next/server";
import { readAdminSessionEmail } from "@/lib/server/admin-session";
import { readLearnerSessionEmail } from "@/lib/server/learner-session";

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
