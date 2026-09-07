import { NextResponse } from "next/server";
import { getMainAdminEmail, isMainAdminEmail } from "@/lib/server/admin-emails";
import { assertMainAdmin } from "@/lib/server/admin-api-auth";
import type {
  AdminUserCertificateRow,
  AdminUserCourseProgressRow,
  AdminUserListRow,
} from "@/lib/admin-user-types";
import { prisma } from "@/lib/prisma";
import { readAdminContent } from "@/lib/server/content-store";
import { countLearnerCurriculumModules } from "@/lib/curriculum-learner-filter";
import { canonicalCourseSlug } from "@/lib/course-slug-aliases";
import { normalizeLearnerEmail } from "@/lib/learner-email";
import {
  readAllLearnerCourseProgressStore,
  type StoredLearnerCourseProgress,
} from "@/lib/server/learner-course-progress-store";

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
  ipv4: true,
  ipv6: true,
  identificationNumber: true,
  registrationMonth: true,
  registrationYear: true,
  registrationMonthYear: true,
  emailVerifiedAt: true,
  lastLoginAt: true,
  blockedAt: true,
  createdAt: true,
  _count: { select: { purchases: true, certificates: true } },
  purchases: {
    orderBy: { createdAt: "desc" as const },
    select: { courseSlug: true, title: true, createdAt: true },
  },
  certificates: {
    orderBy: { issuedAt: "desc" as const },
    select: {
      courseSlug: true,
      courseTitle: true,
      certificateNumber: true,
      status: true,
      issuedAt: true,
      scorePercent: true,
    },
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
  ipv4: string | null;
  ipv6: string | null;
  identificationNumber: number | null;
  registrationMonth: number | null;
  registrationYear: number | null;
  registrationMonthYear: string | null;
  emailVerifiedAt: Date | null;
  lastLoginAt: Date | null;
  blockedAt: Date | null;
  createdAt: Date;
  _count: { purchases: number; certificates: number };
  purchases: { courseSlug: string; title: string; createdAt: Date }[];
  certificates: {
    courseSlug: string;
    courseTitle: string;
    certificateNumber: string;
    status: string;
    issuedAt: Date;
    scorePercent: number | null;
  }[];
  organization: {
    identificationNumber: number;
    companyName: string;
    workEmail: string;
    industryType: string | null;
    companySize: string | null;
    registrationMonthYear: string | null;
  } | null;
};

function deriveStatus(
  completed: number,
  total: number,
): AdminUserCourseProgressRow["status"] {
  if (total > 0 && completed >= total) return "Completed";
  if (completed > 0) return "In Progress";
  return "Not Started";
}

function mapCertStatus(status?: string | null): AdminUserCourseProgressRow["certificateStatus"] {
  if (status === "pending" || status === "ready" || status === "failed") return status;
  return "none";
}

function findProgress(
  progressBySlug: Record<string, StoredLearnerCourseProgress> | undefined,
  slug: string,
): StoredLearnerCourseProgress | undefined {
  if (!progressBySlug) return undefined;
  if (progressBySlug[slug]) return progressBySlug[slug];
  for (const [key, value] of Object.entries(progressBySlug)) {
    if (canonicalCourseSlug(key) === slug) return value;
  }
  return undefined;
}

function buildCourseProgress(
  user: UserRow,
  progressBySlug: Record<string, StoredLearnerCourseProgress> | undefined,
  moduleCountBySlug: Map<string, number>,
  titleBySlug: Map<string, string>,
): AdminUserCourseProgressRow[] {
  const certBySlug = new Map(
    user.certificates.map((c) => [canonicalCourseSlug(c.courseSlug), c] as const),
  );
  const purchaseBySlug = new Map(
    user.purchases.map((p) => [canonicalCourseSlug(p.courseSlug), p] as const),
  );

  const slugs = new Set<string>();
  for (const p of user.purchases) slugs.add(canonicalCourseSlug(p.courseSlug));
  for (const slug of Object.keys(progressBySlug ?? {})) {
    const key = canonicalCourseSlug(slug);
    if (key) slugs.add(key);
  }
  for (const c of user.certificates) slugs.add(canonicalCourseSlug(c.courseSlug));

  const rows: AdminUserCourseProgressRow[] = [];
  for (const slug of slugs) {
    if (!slug) continue;
    const purchase = purchaseBySlug.get(slug);
    const progress = findProgress(progressBySlug, slug);
    const cert = certBySlug.get(slug);
    const completedModules = progress?.completedModules?.length ?? 0;
    const totalModules = moduleCountBySlug.get(slug) ?? 0;
    const examScores = progress?.examScores ?? {};
    const examEntries = Object.values(examScores);
    const examAttemptCount = examEntries.length;
    const examPassedCount = examEntries.filter((e) => e.passed).length;
    const lastExamPercent =
      examEntries.length > 0
        ? examEntries.reduce((best, e) => (e.percent > best ? e.percent : best), 0)
        : null;
    const percent =
      totalModules > 0
        ? Math.min(100, Math.round((completedModules / totalModules) * 100))
        : completedModules > 0
          ? 100
          : 0;
    const status =
      cert?.status === "ready" || (totalModules > 0 && completedModules >= totalModules)
        ? "Completed"
        : deriveStatus(completedModules, totalModules);

    rows.push({
      courseSlug: slug,
      title:
        purchase?.title?.trim() ||
        cert?.courseTitle?.trim() ||
        titleBySlug.get(slug) ||
        slug,
      enrolledAt: purchase?.createdAt.toISOString() ?? null,
      completedModules,
      totalModules,
      percent: status === "Completed" && percent < 100 && totalModules > 0 ? 100 : percent,
      status,
      examPassedCount,
      examAttemptCount,
      lastExamPercent,
      updatedAt: progress?.updatedAt ?? null,
      certificateStatus: mapCertStatus(cert?.status),
      certificateNumber: cert?.certificateNumber ?? null,
    });
  }

  rows.sort((a, b) => {
    const order = { Completed: 0, "In Progress": 1, "Not Started": 2 };
    const d = order[a.status] - order[b.status];
    if (d !== 0) return d;
    return a.title.localeCompare(b.title);
  });
  return rows;
}

function serializeCertificates(user: UserRow): AdminUserCertificateRow[] {
  return user.certificates.map((c) => ({
    courseSlug: c.courseSlug,
    courseTitle: c.courseTitle,
    certificateNumber: c.certificateNumber,
    status: c.status,
    issuedAt: c.issuedAt.toISOString(),
    scorePercent: c.scorePercent,
  }));
}

function serializeUser(
  user: UserRow,
  mainAdminEmail: string,
  opts?: {
    progressBySlug?: Record<string, StoredLearnerCourseProgress>;
    moduleCountBySlug?: Map<string, number>;
    titleBySlug?: Map<string, string>;
  },
): AdminUserListRow {
  const isMainAdmin = user.email.toLowerCase() === mainAdminEmail;
  const courseProgress = buildCourseProgress(
    user,
    opts?.progressBySlug,
    opts?.moduleCountBySlug ?? new Map(),
    opts?.titleBySlug ?? new Map(),
  );
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
    ipv4: user.ipv4,
    ipv6: user.ipv6,
    identificationNumber: user.identificationNumber,
    registrationMonth: user.registrationMonth,
    registrationYear: user.registrationYear,
    registrationMonthYear: user.registrationMonthYear,
    emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null,
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    blockedAt: user.blockedAt?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
    purchaseCount: user._count.purchases,
    certificateCount: user._count.certificates,
    isMainAdmin,
    panelAccess: isMainAdmin ? "full" : "none",
    isBlocked: Boolean(user.blockedAt),
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
    courseProgress,
    certificates: serializeCertificates(user),
  };
}

export async function GET(request: Request) {
  const denied = await assertMainAdmin(request);
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

    const [total, users, roleCounts, accountTypeCounts, withPurchases, withCertificates, content, progressStore] =
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
        readAdminContent(),
        readAllLearnerCourseProgressStore(),
      ]);

    const moduleCountBySlug = new Map<string, number>();
    const titleBySlug = new Map<string, string>();
    for (const course of content.managedCourses ?? []) {
      const slug = canonicalCourseSlug(course.slug);
      if (!slug) continue;
      moduleCountBySlug.set(slug, countLearnerCurriculumModules(course.curriculum));
      titleBySlug.set(slug, course.title);
    }

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
        users: users.map((u) => {
          const email = normalizeLearnerEmail(u.email);
          return serializeUser(u, mainAdminEmail, {
            progressBySlug: progressStore[email] ?? {},
            moduleCountBySlug,
            titleBySlug,
          });
        }),
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
  const denied = await assertMainAdmin(request);
  if (denied) return denied;

  let body: {
    email?: string;
    role?: string;
    accountType?: string | null;
    /** true = block login; false = unblock */
    blocked?: boolean;
  };
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

  const data: { role?: string; accountType?: string | null; blockedAt?: Date | null } = {};

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

  if (body.blocked !== undefined) {
    if (isTargetMain && body.blocked) {
      return NextResponse.json(
        { ok: false, message: "Cannot block the main administrator account." },
        { status: 400 },
      );
    }
    data.blockedAt = body.blocked ? new Date() : null;
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

    const [content, progressStore] = await Promise.all([
      readAdminContent(),
      readAllLearnerCourseProgressStore(),
    ]);
    const moduleCountBySlug = new Map<string, number>();
    const titleBySlug = new Map<string, string>();
    for (const course of content.managedCourses ?? []) {
      const slug = canonicalCourseSlug(course.slug);
      if (!slug) continue;
      moduleCountBySlug.set(slug, countLearnerCurriculumModules(course.curriculum));
      titleBySlug.set(slug, course.title);
    }

    return NextResponse.json(
      {
        ok: true,
        user: serializeUser(updated, mainAdminEmail, {
          progressBySlug: progressStore[normalizeLearnerEmail(updated.email)] ?? {},
          moduleCountBySlug,
          titleBySlug,
        }),
      },
      { headers: noStore },
    );
  } catch (err) {
    console.error("[admin/users PATCH]", err);
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("blockedAt") || msg.includes("Unknown argument")) {
      return NextResponse.json(
        {
          ok: false,
          message: "Database needs update. On the server run: npx prisma db push && npm run db:generate",
        },
        { status: 503 },
      );
    }
    return NextResponse.json({ ok: false, message: "Update failed" }, { status: 500 });
  }
}

/** Remove a learner profile from the Users registry (purchases/certs kept by email). */
export async function DELETE(request: Request) {
  const denied = await assertMainAdmin(request);
  if (denied) return denied;

  let body: { email?: string };
  try {
    body = (await request.json()) as { email?: string };
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ ok: false, message: "email required" }, { status: 400 });
  }
  if (isMainAdminEmail(email)) {
    return NextResponse.json(
      { ok: false, message: "Cannot remove the main administrator account." },
      { status: 400 },
    );
  }

  try {
    const existing = await prisma.lmsUser.findUnique({ where: { email }, select: { id: true } });
    if (!existing) {
      return NextResponse.json({ ok: false, message: "User not found" }, { status: 404 });
    }
    await prisma.lmsUser.delete({ where: { email } });
    return NextResponse.json(
      { ok: true, message: `Removed ${email} from users. Course/purchase history by email was kept.` },
      { headers: noStore },
    );
  } catch (err) {
    console.error("[admin/users DELETE]", err);
    return NextResponse.json({ ok: false, message: "Could not remove user." }, { status: 500 });
  }
}
