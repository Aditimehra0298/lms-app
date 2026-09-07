import { NextResponse } from "next/server";
import type { AccountTypeId } from "@/lib/auth-profile";
import { pricingRegionForCountry } from "@/lib/country-pricing";
import {
  getMainAdminEmail,
  isAdminEmail,
  isMainAdminEmail,
  roleForEmail,
} from "@/lib/server/admin-emails";
import { verifyAdminVerifyToken } from "@/lib/server/admin-verify-token";
import { attachAdminSession } from "@/lib/server/admin-session";
import { isAdminSessionHeldElsewhere } from "@/lib/server/admin-active-session";
import { attachLearnerSession } from "@/lib/server/learner-session";
import { fetchGoogleUserInfo } from "@/lib/server/google-userinfo";
import {
  ACCOUNT_BLOCKED_MESSAGE,
  isUserAccountBlocked,
} from "@/lib/server/user-account-status";
import {
  countryUpdateFields,
  pricingRegionForAuthResponse,
} from "@/lib/server/auth-country-persist";
import { resolveLearnerCountry, ipsForStorage } from "@/lib/server/resolve-learner-country";
import { fetchLmsUserProfile } from "@/lib/server/lms-user-profile";
import { prisma } from "@/lib/prisma";
import { registrationPeriodFromDate } from "@/lib/registration-ids";
import { getClientIps } from "@/lib/request-ip";
import { ensureUserIdentificationNumber } from "@/lib/server/user-identification";
import { queueWelcomeEmail } from "@/lib/welcome-email-service";
import { deriveGoogleAccountRecommendationSignals } from "@/lib/google-account-recommendation-signals";

export const dynamic = "force-dynamic";

type Body = {
  accessToken?: string;
  action?: "login" | "register";
  accountType?: AccountTypeId;
  countryCode?: string;
  countryName?: string;
  /** From step 1 admin password login — Google must match same email */
  adminVerifyToken?: string;
};

const ACCOUNT_TYPES = new Set<AccountTypeId>(["individual", "organisation", "self"]);

export async function POST(request: Request) {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  if (!clientId) {
    return NextResponse.json(
      {
        ok: false,
        message:
          "Google sign-in is not configured. Add GOOGLE_CLIENT_ID and NEXT_PUBLIC_GOOGLE_CLIENT_ID to .env.local, then restart the dev server.",
      },
      { status: 503 },
    );
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON" }, { status: 400 });
  }

  const accessToken = body.accessToken?.trim();
  if (!accessToken) {
    return NextResponse.json({ ok: false, message: "Missing Google access token" }, { status: 400 });
  }

  let googleUser;
  try {
    googleUser = await fetchGoogleUserInfo(accessToken);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Google sign-in failed";
    return NextResponse.json({ ok: false, message }, { status: 401 });
  }

  const email = googleUser.email.trim().toLowerCase();
  const adminVerifyToken = body.adminVerifyToken?.trim();
  const isAdminProfile = body.accountType === "self";

  if (!adminVerifyToken && (await isUserAccountBlocked(email))) {
    return NextResponse.json({ ok: false, message: ACCOUNT_BLOCKED_MESSAGE }, { status: 403 });
  }

  if (isAdminProfile && !adminVerifyToken) {
    return NextResponse.json(
      {
        ok: false,
        message: "Enter admin email and password first.",
      },
      { status: 403 },
    );
  }

  if (adminVerifyToken) {
    if (!verifyAdminVerifyToken(adminVerifyToken, email)) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "Google verification failed or expired. Sign in again.",
        },
        { status: 403 },
      );
    }
    if (!isMainAdminEmail(email)) {
      const required = getMainAdminEmail();
      return NextResponse.json(
        {
          ok: false,
          message: `Admin access requires Google account ${required}. You signed in as ${email}.`,
        },
        { status: 403 },
      );
    }
  }

  const accountType =
    body.accountType && ACCOUNT_TYPES.has(body.accountType) ? body.accountType : "individual";
  const action = body.action ?? "login";
  const isAdminGoogleStep = Boolean(adminVerifyToken);
  const role = isAdminGoogleStep ? "admin" : roleForEmail(email);
  const name = googleUser.name?.trim() || null;
  const avatarUrl = googleUser.picture?.trim() || null;

  const ipsHeader = getClientIps(request);
  const geo = await resolveLearnerCountry(request, ipsHeader, {
    countryCode: body.countryCode,
    countryName: body.countryName,
    googleLocale: googleUser.locale,
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

  let dbSaved = false;
  let dbError: string | undefined;
  try {
    await prisma.lmsUser.upsert({
      where: { email },
      create: {
        email,
        name,
        role,
        accountType: adminVerifyToken ? "self" : accountType,
        avatarUrl,
        ipv4: ips.ipv4,
        ipv6: ips.ipv6,
        countryCode: resolvedRegion.countryCode,
        countryName: resolvedRegion.countryName,
        lastLoginAt: new Date(),
        emailVerifiedAt: new Date(),
      },
      update:
        action === "login" && existing && !isAdminGoogleStep
          ? {
              name: name ?? undefined,
              avatarUrl: avatarUrl ?? undefined,
              ipv4: ips.ipv4 ?? undefined,
              ipv6: ips.ipv6 ?? undefined,
              lastLoginAt: new Date(),
            }
          : {
              name: name ?? undefined,
              role: isAdminGoogleStep ? "admin" : undefined,
              accountType: isAdminGoogleStep ? "self" : accountType,
              avatarUrl: avatarUrl ?? undefined,
              ipv4: ips.ipv4 ?? undefined,
              ipv6: ips.ipv6 ?? undefined,
              ...countryFields,
              lastLoginAt: new Date(),
              emailVerifiedAt: new Date(),
            },
    });
    dbSaved = true;

    if (action === "register" && !existing && !isAdminGoogleStep) {
      const period = registrationPeriodFromDate();
      await prisma.lmsUser.updateMany({
        where: { email, registrationMonthYear: null },
        data: {
          registrationMonth: period.registrationMonth,
          registrationYear: period.registrationYear,
          registrationMonthYear: period.registrationMonthYear,
        },
      });
      if (accountType !== "organisation") {
        await ensureUserIdentificationNumber(email);
      }
    }
  } catch (err) {
    dbSaved = false;
    dbError = err instanceof Error ? err.message : "Database save failed";
    console.error("[auth/google]", dbError);
  }

  const profile = dbSaved ? await fetchLmsUserProfile(email) : null;

  const isNewLearner =
    dbSaved && !existing && !isAdminGoogleStep && !isAdminEmail(email);

  const googleRecommendationSignals = deriveGoogleAccountRecommendationSignals({
    email,
    locale: googleUser.locale,
    workspaceDomain: googleUser.hd,
  });

  // New Google users may use the Login tab — still send welcome email + n8n webhook.
  if (isNewLearner) {
    queueWelcomeEmail({
      email,
      learnerName: profile?.name ?? name,
      method: "google",
      accountType: profile?.accountType ?? accountType,
    });
  }

  const res = NextResponse.json({
    ok: true,
    dbSaved,
    dbError,
    email,
    name: profile?.name ?? name,
    avatarUrl: profile?.avatarUrl ?? avatarUrl,
    accountType: profile?.accountType ?? accountType,
    action,
    region,
    countrySource: geo.source,
    role: isAdminGoogleStep ? "admin" : (profile?.role ?? role),
    profile,
    googleRecommendationSignals,
  });
  if (isAdminGoogleStep && isMainAdminEmail(email)) {
    const held = await isAdminSessionHeldElsewhere(null);
    if (held.held) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "Admin panel is already signed in on another device. Sign out from that device first.",
          sessionActiveElsewhere: true,
        },
        { status: 409 },
      );
    }
    return attachAdminSession(res, email);
  }
  return attachLearnerSession(res, email);
}
