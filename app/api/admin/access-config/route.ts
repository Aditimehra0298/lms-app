import { NextResponse } from "next/server";
import {
  getAdminEmails,
  getMainAdminEmail,
  maskEmailForDisplay,
} from "@/lib/server/admin-emails";
import { assertMainAdmin } from "@/lib/server/admin-api-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "private, no-store, max-age=0" };

export async function GET(request: Request) {
  const denied = await assertMainAdmin(request);
  if (denied) return denied;

  const main = getMainAdminEmail();
  const delegates = getAdminEmails().filter((e) => e !== main);

  try {
    const adminUsers = await prisma.lmsUser.findMany({
      where: { role: "admin" },
      orderBy: { email: "asc" },
      select: {
        email: true,
        name: true,
        lastLoginAt: true,
        identificationNumber: true,
      },
    });

    const orgCount = await prisma.lmsOrganization.count();

    return NextResponse.json(
      {
        ok: true,
        panelAccess: {
          mainAdminConfigured: Boolean(main),
          mainAdminMasked: main ? maskEmailForDisplay(main) : null,
          delegateEmailsMasked: delegates.map(maskEmailForDisplay),
          note: "Only MAIN_ADMIN_EMAIL may open /admin. ADMIN_EMAILS is legacy; panel access is main account only.",
        },
        envKeys: ["MAIN_ADMIN_EMAIL", "ADMIN_EMAILS"],
        dbAdminUsers: adminUsers.map((u) => ({
          email: u.email,
          name: u.name,
          lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
          identificationNumber: u.identificationNumber,
          isMainAdmin: u.email.toLowerCase() === main,
        })),
        organizationCount: orgCount,
      },
      { headers: noStore },
    );
  } catch (err) {
    console.error("[admin/access-config]", err);
    return NextResponse.json(
      {
        ok: true,
        panelAccess: {
          mainAdminConfigured: Boolean(main),
          mainAdminMasked: main ? maskEmailForDisplay(main) : null,
          delegateEmailsMasked: delegates.map(maskEmailForDisplay),
          note: "Only MAIN_ADMIN_EMAIL may open /admin.",
        },
        envKeys: ["MAIN_ADMIN_EMAIL", "ADMIN_EMAILS"],
        dbAdminUsers: [],
        organizationCount: 0,
        dbUnavailable: true,
      },
      { headers: noStore },
    );
  }
}
