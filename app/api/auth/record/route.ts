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
import { resolveLearnerCountry, ipsForStorage } from "@/lib/server/resolve-learner-country";
import { fetchLmsUserProfile } from "@/lib/server/lms-user-profile";
import { prisma } from "@/lib/prisma";
import { registrationPeriodFromDate } from "@/lib/registration-ids";
import { ensureOrganizationProfile } from "@/lib/server/organization-identification";
import { ensureUserIdentificationNumber } from "@/lib/server/user-identification";
import { getClientIps } from "@/lib/request-ip";
import { queueWelcomeEmail } from "@/lib/welcome-email-service";
import { queueAdminActivityEmail } from "@/lib/server/admin-activity-email";
import { attachLearnerSession, readLearnerSessionEmail } from "@/lib/server/learner-session";

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

  // POC-M-02: never create/update profiles for arbitrary emails without proof of ownership.
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
  } else if (action === "login") {
    const sessionEmail = readLearnerSessionEmail(request);
    if (!sessionEmail || sessionEmail !== email) {
      return NextResponse.json(
        {
          ok: false,
          message: "Sign in required before updating your profile record.",
          dbSaved: false,
        },
        { status: 401 },
      );
    }
  } else if (action !== "register") {
    return NextResponse.json({ ok: false, message: "Invalid action", dbSaved: false }, { status: 400 });
  }

  let passwordHash: string | undefined;
  if (action === "register" && body.password?.trim()) {
    passwordHash = await hashPassword(body.password.trim());
  }

  const ipsHeader = getClientIps(request);
  const geo = await resolveLearnerCountry(request, ipsHeader, {
    countryCode: body.countryCode,
    countryName: body.countryName,
    googleLocale: body.googleLocale,
  });
  const ips = ipsForStorage(ipsHeader, geo);
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

  const userFields = {
    name: trimOrNull(body.name),
    accountType: accountType ?? null,
    avatarUrl: trimOrNull(body.avatarUrl),
    phone: trimOrNull(body.phone),
    companyName: trimOrNull(body.companyName),
    personalEmail: trimOrNull(body.personalEmail)?.toLowerCase() ?? null,
    industryType: trimOrNull(body.industryType),
    companySize: trimOrNull(body.companySize),
  };

  const registrationPeriod = action === "register" ? registrationPeriodFromDate() : null;

  let dbSaved = false;
  let dbError: string | undefined;
  try {
    await prisma.lmsUser.upsert({
      where: { email },
      create: {
        email,
        name: userFields.name,
        role: roleForEmail(email),
        accountType: userFields.accountType,
        avatarUrl: userFields.avatarUrl,
        phone: userFields.phone,
        companyName: userFields.companyName,
        personalEmail: userFields.personalEmail,
        industryType: userFields.industryType,
        companySize: userFields.companySize,
        ipv4: ips.ipv4,
        ipv6: ips.ipv6,
        countryCode: resolvedRegion.countryCode,
        countryName: resolvedRegion.countryName,
        passwordHash,
        lastLoginAt: new Date(),
        emailVerifiedAt: action === "register" ? new Date() : undefined,
        ...(registrationPeriod
          ? {
              registrationMonth: registrationPeriod.registrationMonth,
              registrationYear: registrationPeriod.registrationYear,
              registrationMonthYear: registrationPeriod.registrationMonthYear,
            }
          : {}),
      },
      update:
        action === "login"
          ? {
              ipv4: ips.ipv4 ?? undefined,
              ipv6: ips.ipv6 ?? undefined,
              lastLoginAt: new Date(),
            }
          : {
              name: userFields.name ?? undefined,
              accountType: userFields.accountType ?? undefined,
              avatarUrl: userFields.avatarUrl ?? undefined,
              phone: userFields.phone ?? undefined,
              companyName: userFields.companyName ?? undefined,
              personalEmail: userFields.personalEmail ?? undefined,
              industryType: userFields.industryType ?? undefined,
              companySize: userFields.companySize ?? undefined,
              ipv4: ips.ipv4 ?? undefined,
              ipv6: ips.ipv6 ?? undefined,
              ...countryFields,
              ...(passwordHash ? { passwordHash } : {}),
              lastLoginAt: new Date(),
              emailVerifiedAt: action === "register" ? new Date() : undefined,
            },
    });
    dbSaved = true;
    if (action === "register" && registrationPeriod) {
      await prisma.lmsUser.updateMany({
        where: { email, registrationMonthYear: null },
        data: {
          registrationMonth: registrationPeriod.registrationMonth,
          registrationYear: registrationPeriod.registrationYear,
          registrationMonthYear: registrationPeriod.registrationMonthYear,
        },
      });
    }
    const savedUser = await prisma.lmsUser.findUnique({
      where: { email },
      select: { id: true, accountType: true },
    });
    const isOrg =
      userFields.accountType === "organisation" || savedUser?.accountType === "organisation";
    if (action === "register") {
      if (isOrg && userFields.companyName) {
        await ensureOrganizationProfile({
          workEmail: email,
          companyName: userFields.companyName,
          personalEmail: userFields.personalEmail,
          industryType: userFields.industryType,
          companySize: userFields.companySize,
          userId: savedUser?.id,
          registrationPeriod: registrationPeriod ?? undefined,
        });
      } else if (!isOrg) {
        await ensureUserIdentificationNumber(email);
      }
    } else if (isOrg && userFields.companyName) {
      void ensureOrganizationProfile({
        workEmail: email,
        companyName: userFields.companyName,
        personalEmail: userFields.personalEmail,
        industryType: userFields.industryType,
        companySize: userFields.companySize,
        userId: savedUser?.id,
      }).catch((e) => console.error("[auth/record] organization", e));
    }
  } catch (err) {
    dbSaved = false;
    dbError = err instanceof Error ? err.message : "Database save failed";
    console.error("[auth/record]", dbError);
  }

  if (action === "register" && !dbSaved) {
    return NextResponse.json(
      {
        ok: false,
        dbSaved: false,
        message:
          "Registration could not be saved to the database. Please try again or contact support.",
        ipv4: ips.ipv4,
        ipv6: ips.ipv6,
        region,
        countrySource: geo.source,
        action,
      },
      { status: 500 },
    );
  }

  const userProfile = dbSaved ? await fetchLmsUserProfile(email) : null;

  if (action === "register" && dbSaved && !existing && !isAdminEmail(email)) {
    queueWelcomeEmail({
      email,
      learnerName: userProfile?.name ?? userFields.name,
      method: "email",
      accountType: userProfile?.accountType ?? accountType ?? null,
    });
    queueAdminActivityEmail({
      kind: "registration",
      subject: `[Registration] ${email}`,
      title: "New learner registration",
      detail: `${userProfile?.name ?? userFields.name ?? email} created an account with email/password.`,
      lines: {
        Email: email,
        Name: userProfile?.name ?? userFields.name,
        Method: "email",
        Account: userProfile?.accountType ?? accountType ?? "individual",
      },
    });
  }

  const res = NextResponse.json({
    ok: true,
    dbSaved,
    profile: userProfile,
    ipv4: ips.ipv4,
    ipv6: ips.ipv6,
    region,
    countrySource: geo.source,
    action,
  });
  if (dbSaved && !isAdminEmail(email)) {
    return attachLearnerSession(res, email);
  }
  return res;
}
