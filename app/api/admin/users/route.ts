import { NextResponse } from "next/server";
import { getMainAdminEmail, isMainAdminEmail } from "@/lib/server/admin-emails";
import { assertMainAdmin } from "@/lib/server/admin-api-auth";
import type { AdminUserListRow } from "@/lib/admin-user-types";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "private, no-store, max-age=0" };

const userSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  accountType: true,
  phone: true,
  personalEmail: true,
  companyName: true,
  industryType: true,
  companySize: true,
  countryCode: true,
  countryName: true,
  identificationNumber: true,
  registrationMonth: true,
  registrationYear: true,
  registrationMonthYear: true,
  emailVerifiedAt: true,
  lastLoginAt: true,
  createdAt: true,
  _count: { select: { purchases: true, certificates: true } },
  purchases: {
    orderBy: { createdAt: "desc" as const },
    take: 8,
    select: { courseSlug: true, title: true, createdAt: true },
  },
  organization: {
    select: {
      identificationNumber: true,
      companyName: true,
      workEmail: true,
      industryType: true,
      companySize: true,
      registrationMonthYear: true,
    },
  },
};

type UserRow = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  accountType: string | null;
  phone: string | null;
  personalEmail: string | null;
  companyName: string | null;
  industryType: string | null;
  companySize: string | null;
  countryCode: string | null;
  countryName: string | null;
  identificationNumber: number | null;
  registrationMonth: number | null;
  registrationYear: number | null;
  registrationMonthYear: string | null;
  emailVerifiedAt: Date | null;
  lastLoginAt: Date | null;
  createdAt: Date;
  _count: { purchases: number; certificates: number };
  purchases: { courseSlug: string; title: string; createdAt: Date }[];
  organization: {
    identificationNumber: number;
    companyName: string;
    workEmail: string;
    industryType: string | null;
    companySize: string | null;
    registrationMonthYear: string | null;
  } | null;
};

function serializeUser(user: UserRow, mainAdminEmail: string): AdminUserListRow {
  const isMainAdmin = user.email.toLowerCase() === mainAdminEmail;
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role?.trim() || "learner",
    accountType: user.accountType,
    phone: user.phone,
    personalEmail: user.personalEmail,
    companyName: user.companyName,
    industryType: user.industryType,
    companySize: user.companySize,
    countryCode: user.countryCode,
    countryName: user.countryName,
    identificationNumber: user.identificationNumber,
    registrationMonth: user.registrationMonth,
    registrationYear: user.registrationYear,
    registrationMonthYear: user.registrationMonthYear,
    emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null,
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
    purchaseCount: user._count.purchases,
    certificateCount: user._count.certificates,
    isMainAdmin,
    panelAccess: isMainAdmin ? "full" : "none",
    organization: user.organization
      ? {
          identificationNumber: user.organization.identificationNumber,
          companyName: user.organization.companyName,
          workEmail: user.organization.workEmail,
          industryType: user.organization.industryType,
          companySize: user.organization.companySize,
          registrationMonthYear: user.organization.registrationMonthYear,
        }
      : null,
    recentPurchases: user.purchases.map((p) => ({
      courseSlug: p.courseSlug,
      title: p.title,
      enrolledAt: p.createdAt.toISOString(),
    })),
  };
}

export async function GET(request: Request) {
  const denied = assertMainAdmin(request);
  if (denied) return denied;

  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim().toLowerCase() ?? "";
  const role = url.searchParams.get("role")?.trim().toLowerCase() ?? "";
  const accountType = url.searchParams.get("accountType")?.trim().toLowerCase() ?? "";
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? 100), 1), 200);
  const offset = Math.max(Number(url.searchParams.get("offset") ?? 0), 0);

  const mainAdminEmail = getMainAdminEmail();

  try {
    const where = {
      AND: [
        q
          ? {
              OR: [
                { email: { contains: q } },
                { name: { contains: q } },
                { phone: { contains: q } },
                { companyName: { contains: q } },
                { personalEmail: { contains: q } },
                ...(Number.isFinite(Number(q)) ? [{ identificationNumber: Number(q) }] : []),
              ],
            }
          : {},
        role && role !== "all" ? { role } : {},
        accountType && accountType !== "all"
          ? accountType === "unset"
            ? { accountType: null }
            : { accountType }
          : {},
      ],
    };

    const [total, users, roleCounts, accountTypeCounts, withPurchases, withCertificates] =
      await Promise.all([
        prisma.lmsUser.count({ where }),
        prisma.lmsUser.findMany({
          where,
          orderBy: [{ createdAt: "desc" }],
          take: limit,
          skip: offset,
          select: userSelect,
        }),
        prisma.lmsUser.groupBy({ by: ["role"], _count: { _all: true } }),
        prisma.lmsUser.groupBy({ by: ["accountType"], _count: { _all: true } }),
        prisma.lmsUser.count({ where: { purchases: { some: {} } } }),
        prisma.lmsUser.count({ where: { certificates: { some: {} } } }),
      ]);

    return NextResponse.json(
      {
        ok: true,
        total,
        limit,
        offset,
        stats: {
          totalUsers: total,
          byRole: Object.fromEntries(roleCounts.map((r) => [r.role || "learner", r._count._all])),
          byAccountType: Object.fromEntries(
            accountTypeCounts.map((r) => [r.accountType || "unset", r._count._all]),
          ),
          withPurchases,
          withCertificates,
        },
        users: users.map((u) => serializeUser(u, mainAdminEmail)),
      },
      { headers: noStore },
    );
  } catch (err) {
    console.error("[admin/users GET]", err);
    return NextResponse.json(
      {
        ok: false,
        message:
          "Could not load users. Ensure MySQL is running and run npm run db:push, then restart the dev server.",
      },
      { status: 503 },
    );
  }
}

export async function PATCH(request: Request) {
  const denied = assertMainAdmin(request);
  if (denied) return denied;

  let body: { email?: string; role?: string; accountType?: string | null };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ ok: false, message: "email required" }, { status: 400 });
  }

  const mainAdminEmail = getMainAdminEmail();
  const isTargetMain = isMainAdminEmail(email);

  const data: { role?: string; accountType?: string | null } = {};

  if (body.role !== undefined) {
    const nextRole = body.role.trim().toLowerCase();
    if (!["learner", "admin"].includes(nextRole)) {
      return NextResponse.json({ ok: false, message: "role must be learner or admin" }, { status: 400 });
    }
    if (isTargetMain && nextRole !== "admin") {
      return NextResponse.json(
        { ok: false, message: "The main administrator account must keep the admin role." },
        { status: 400 },
      );
    }
    data.role = nextRole;
  }

  if (body.accountType !== undefined) {
    const raw = body.accountType?.trim().toLowerCase() ?? null;
    if (raw && !["individual", "organisation", "self"].includes(raw)) {
      return NextResponse.json({ ok: false, message: "Invalid account type" }, { status: 400 });
    }
    data.accountType = raw;
  }

  if (!Object.keys(data).length) {
    return NextResponse.json({ ok: false, message: "No fields to update" }, { status: 400 });
  }

  try {
    const existing = await prisma.lmsUser.findUnique({ where: { email } });
    if (!existing) {
      return NextResponse.json({ ok: false, message: "User not found" }, { status: 404 });
    }

    const updated = await prisma.lmsUser.update({
      where: { email },
      data,
      select: userSelect,
    });

    return NextResponse.json(
      { ok: true, user: serializeUser(updated, mainAdminEmail) },
      { headers: noStore },
    );
  } catch (err) {
    console.error("[admin/users PATCH]", err);
    return NextResponse.json({ ok: false, message: "Update failed" }, { status: 500 });
  }
}
