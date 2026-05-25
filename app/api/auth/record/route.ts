import { NextResponse } from "next/server";
import type { AccountTypeId } from "@/lib/auth-profile";
import { pricingRegionForCountry } from "@/lib/country-pricing";
import { isAdminEmail, roleForEmail } from "@/lib/server/admin-emails";
import { hasRecentEmailVerification } from "@/lib/email-otp-service";
import { validateLearnerPassword } from "@/lib/password-policy";
import { hashPassword } from "@/lib/server/password-hash";
import {
  countryUpdateFields,
  pricingRegionForAuthResponse,
} from "@/lib/server/auth-country-persist";
import { resolveLearnerCountry } from "@/lib/server/resolve-learner-country";
import { fetchLmsUserProfile } from "@/lib/server/lms-user-profile";
import { prisma } from "@/lib/prisma";
import { getClientIps } from "@/lib/request-ip";

export const dynamic = "force-dynamic";

type Body = {
  email?: string;
  name?: string;
  action?: "login" | "register";
  accountType?: AccountTypeId;
  avatarUrl?: string;
  phone?: string;
  companyName?: string;
  personalEmail?: string;
  industryType?: string;
  companySize?: string;
  countryCode?: string;
  countryName?: string;
  googleLocale?: string;
  password?: string;
};

const ACCOUNT_TYPES = new Set<AccountTypeId>(["individual", "organisation", "self"]);

function trimOrNull(value?: string): string | null {
  const v = value?.trim();
  return v ? v : null;
}

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ ok: false, message: "Email is required" }, { status: 400 });
  }

  const accountType =
    body.accountType && ACCOUNT_TYPES.has(body.accountType) ? body.accountType : undefined;
  const action = body.action ?? "login";

  if (action === "register" && !isAdminEmail(email)) {
    const otpOk = await hasRecentEmailVerification(email);
    if (!otpOk) {
      return NextResponse.json(
        {
          ok: false,
          message: "Email must be verified with OTP before registration.",
          dbSaved: false,
        },
        { status: 403 },
      );
    }
    const policy = validateLearnerPassword(body.password ?? "");
    if (!policy.ok) {
      return NextResponse.json({ ok: false, message: policy.message, dbSaved: false }, { status: 400 });
    }
  }

  let passwordHash: string | undefined;
  if (action === "register" && body.password?.trim()) {
    passwordHash = await hashPassword(body.password.trim());
  }

  const ips = getClientIps(request);
  const geo = await resolveLearnerCountry(request, ips, {
    countryCode: body.countryCode,
    countryName: body.countryName,
    googleLocale: body.googleLocale,
  });
  const resolvedRegion = pricingRegionForCountry(geo.countryCode, geo.countryName);
  const hasManualCountry = Boolean(body.countryCode?.trim());

  const existing = await prisma.lmsUser
    .findUnique({
      where: { email },
      select: { countryCode: true, countryName: true },
    })
    .catch(() => null);

  const region = pricingRegionForAuthResponse(action, hasManualCountry, resolvedRegion, existing);
  const countryFields = countryUpdateFields(action, hasManualCountry, resolvedRegion, existing);

  const profile = {
    name: trimOrNull(body.name),
    accountType: accountType ?? null,
    avatarUrl: trimOrNull(body.avatarUrl),
    phone: trimOrNull(body.phone),
    companyName: trimOrNull(body.companyName),
    personalEmail: trimOrNull(body.personalEmail)?.toLowerCase() ?? null,
    industryType: trimOrNull(body.industryType),
    companySize: trimOrNull(body.companySize),
  };

  let dbSaved = false;
  let dbError: string | undefined;
  try {
    await prisma.lmsUser.upsert({
      where: { email },
      create: {
        email,
        name: profile.name,
        role: roleForEmail(email),
        accountType: profile.accountType,
        avatarUrl: profile.avatarUrl,
        phone: profile.phone,
        companyName: profile.companyName,
        personalEmail: profile.personalEmail,
        industryType: profile.industryType,
        companySize: profile.companySize,
        ipv4: ips.ipv4,
        ipv6: ips.ipv6,
        countryCode: resolvedRegion.countryCode,
        countryName: resolvedRegion.countryName,
        passwordHash,
        lastLoginAt: new Date(),
        emailVerifiedAt: action === "register" ? new Date() : undefined,
      },
      update: {
        name: profile.name ?? undefined,
        accountType: profile.accountType ?? undefined,
        avatarUrl: profile.avatarUrl ?? undefined,
        phone: profile.phone ?? undefined,
        companyName: profile.companyName ?? undefined,
        personalEmail: profile.personalEmail ?? undefined,
        industryType: profile.industryType ?? undefined,
        companySize: profile.companySize ?? undefined,
        ipv4: ips.ipv4 ?? undefined,
        ipv6: ips.ipv6 ?? undefined,
        ...countryFields,
        ...(passwordHash ? { passwordHash } : {}),
        lastLoginAt: new Date(),
        emailVerifiedAt: action === "register" ? new Date() : undefined,
      },
    });
    dbSaved = true;
  } catch (err) {
    dbSaved = false;
    dbError = err instanceof Error ? err.message : "Database save failed";
    console.error("[auth/record]", dbError);
  }

  if (action === "register" && !dbSaved) {
    const hint =
      dbError?.includes("passwordHash") || dbError?.includes("Unknown argument")
        ? "Restart the dev server after running: npm run db:push && npm run db:generate"
        : dbError;
    return NextResponse.json(
      {
        ok: false,
        dbSaved: false,
        dbError,
        message:
          hint ??
          "Registration could not be saved to the database. Ensure MySQL is running, then run: npm run db:push",
        ipv4: ips.ipv4,
        ipv6: ips.ipv6,
        region,
        countrySource: geo.source,
        action,
      },
      { status: 500 },
    );
  }

  const profile = dbSaved ? await fetchLmsUserProfile(email) : null;

  return NextResponse.json({
    ok: true,
    dbSaved,
    dbError,
    profile,
    ipv4: ips.ipv4,
    ipv6: ips.ipv6,
    region,
    countrySource: geo.source,
    action,
  });
}
