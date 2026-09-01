import { NextResponse } from "next/server";
import { isMainAdminEmail } from "@/lib/server/admin-emails";
import { verifyPassword } from "@/lib/server/password-hash";
import { fetchLmsUserProfile } from "@/lib/server/lms-user-profile";
import { prisma } from "@/lib/prisma";
import { getClientIps } from "@/lib/request-ip";
import { resolveLearnerCountry, ipsForStorage } from "@/lib/server/resolve-learner-country";

export const dynamic = "force-dynamic";

/** Email + password login for Individual / Organisation (not admin, not Google-only). */
export async function POST(request: Request) {
  let body: { email?: string; password?: string };
  try {
    body = (await request.json()) as { email?: string; password?: string };
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  const password = body.password ?? "";

  if (!email || !password) {
    return NextResponse.json({ ok: false, message: "Email and password are required." }, { status: 400 });
  }

  if (isMainAdminEmail(email)) {
    return NextResponse.json(
      { ok: false, message: "Use the Admin profile to sign in as administrator." },
      { status: 403 },
    );
  }

  const user = await prisma.lmsUser.findUnique({
    where: { email },
    select: { passwordHash: true, accountType: true, countryCode: true },
  });

  if (!user) {
    return NextResponse.json({ ok: false, message: "Invalid email or password." }, { status: 401 });
  }

  if (!user.passwordHash) {
    return NextResponse.json(
      {
        ok: false,
        message:
          "No password on this account. Sign in with Google or use Forgot password to set a new password.",
      },
      { status: 401 },
    );
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    return NextResponse.json({ ok: false, message: "Invalid email or password." }, { status: 401 });
  }

  const ips = getClientIps(request);
  const geo = await resolveLearnerCountry(request, ips);
  const storedIps = ipsForStorage(ips, geo);
  await prisma.lmsUser.update({
    where: { email },
    data: {
      lastLoginAt: new Date(),
      ipv4: storedIps.ipv4 ?? undefined,
      ipv6: storedIps.ipv6 ?? undefined,
      ...(!user.countryCode
        ? {
            countryCode: geo.countryCode,
            countryName: geo.countryName,
          }
        : {}),
    },
  });

  const profile = await fetchLmsUserProfile(email);
  return NextResponse.json({ ok: true, profile });
}
