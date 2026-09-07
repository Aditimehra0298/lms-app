import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import {
  ADMIN_SESSION_COOKIE,
  verifyAdminSessionClaimsActive,
} from "@/lib/server/admin-session";
import { isMainAdminEmail } from "@/lib/server/admin-emails";

export const dynamic = "force-dynamic";

/**
 * Server-side exclusive admin gate (Node runtime — checks DB/file sid registry).
 * Middleware alone cannot enforce one-device lock on Edge.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const jar = await cookies();
  const token = jar.get(ADMIN_SESSION_COOKIE)?.value;
  const claims = await verifyAdminSessionClaimsActive(token);

  if (!claims?.email || !isMainAdminEmail(claims.email)) {
    redirect("/account?admin=1&reason=session");
  }

  return <>{children}</>;
}
