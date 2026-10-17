import { NextResponse } from "next/server";
import { assertMainAdmin } from "@/lib/server/admin-api-auth";
import { prisma } from "@/lib/prisma";
import { readAllOrganizationTeams } from "@/lib/server/organization-team-store";

export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "private, no-store, max-age=0" };

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

type Audience = "individual" | "organisation";

function parseAudience(raw: string | null): Audience | null {
  const v = (raw ?? "").trim().toLowerCase();
  if (v === "individual" || v === "learner" || v === "personal") return "individual";
  if (v === "organisation" || v === "organization" || v === "org") return "organisation";
  return null;
}

function parsePriceToPaise(price: unknown): number {
  if (typeof price === "number" && Number.isFinite(price)) {
    return price > 10000 ? Math.round(price) : Math.round(price * 100);
  }
  const raw = String(price ?? "").replace(/[^\d.]/g, "");
  if (!raw) return 0;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return 0;
  // Values like "20000" are rupees; tiny decimals unlikely for course prices
  return Math.round(n * 100);
}

type PaymentItem = { slug?: string; title?: string; qty?: number; price?: string | number };

function itemsFromJson(items: unknown): PaymentItem[] {
  if (!Array.isArray(items)) return [];
  return items.filter((i) => i && typeof i === "object") as PaymentItem[];
}

async function courseTitleMap(slugs: string[]): Promise<Map<string, string>> {
  const unique = [...new Set(slugs.filter(Boolean))];
  if (!unique.length) return new Map();
  const rows = await prisma.lmsCourse.findMany({
    where: { slug: { in: unique } },
    select: { slug: true, title: true },
  });
  return new Map(rows.map((r) => [r.slug, r.title]));
}

function barPct(value: number, max: number): number {
  if (max <= 0) return 0;
  return Math.max(4, Math.round((value / max) * 100));
}

/**
 * GET /api/admin/analytics/command-center?audience=individual|organisation
 * Full analytics dashboard payloads (popular courses, engagement, revenue leaders).
 */
export async function GET(request: Request) {
  const denied = await assertMainAdmin(request);
  if (denied) return denied;

  const audience = parseAudience(new URL(request.url).searchParams.get("audience"));
  if (!audience) {
    return NextResponse.json(
      {
        ok: false,
        message: "Pass audience=individual or audience=organisation.",
      },
      { status: 400, headers: noStore },
    );
  }

  try {
    const since7 = daysAgo(7);
    const since30 = daysAgo(30);
    const since90 = daysAgo(90);

    const orgs = await prisma.lmsOrganization.findMany({
      select: {
        id: true,
        companyName: true,
        workEmail: true,
        industryType: true,
        companySize: true,
        identificationNumber: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
    const orgEmails = new Set(orgs.map((o) => o.workEmail.trim().toLowerCase()).filter(Boolean));

    if (audience === "organisation") {
      const teams = await readAllOrganizationTeams().catch(() => []);
      const teamByEmail = new Map(
        teams.map((t) => [t.workEmail.trim().toLowerCase(), t] as const),
      );

      const orgPaymentWhere = {
        OR: [
          { user: { accountType: "organisation" as const } },
          ...(orgEmails.size ? [{ learnerEmail: { in: [...orgEmails] } }] : []),
        ],
      };

      const [
        orgUsers,
        newOrgs7d,
        certsReady,
        certsPending,
        students,
        paidAgg7,
        paidAgg30,
        paidAggAll,
        paidCount,
        pendingCount,
        paidPayments,
        certsByOrg,
        purchasesBySlug,
      ] = await Promise.all([
        prisma.lmsUser.count({ where: { accountType: "organisation" } }),
        prisma.lmsOrganization.count({ where: { createdAt: { gte: since7 } } }),
        prisma.lmsCertificate.count({
          where: { holderType: "organisation", status: "ready" },
        }),
        prisma.lmsCertificate.count({
          where: { holderType: "organisation", status: "pending" },
        }),
        prisma.lmsStudent.count({ where: { organizationId: { not: null } } }),
        prisma.lmsPayment.aggregate({
          where: { status: "paid", paidAt: { gte: since7 }, ...orgPaymentWhere },
          _sum: { amount: true },
          _count: { _all: true },
        }),
        prisma.lmsPayment.aggregate({
          where: { status: "paid", paidAt: { gte: since30 }, ...orgPaymentWhere },
          _sum: { amount: true },
          _count: { _all: true },
        }),
        prisma.lmsPayment.aggregate({
          where: { status: "paid", ...orgPaymentWhere },
          _sum: { amount: true },
          _count: { _all: true },
        }),
        prisma.lmsPayment.count({ where: { status: "paid", ...orgPaymentWhere } }),
        prisma.lmsPayment.count({ where: { status: "pending", ...orgPaymentWhere } }),
        prisma.lmsPayment.findMany({
          where: { status: "paid", ...orgPaymentWhere },
          orderBy: { paidAt: "desc" },
          take: 400,
          select: {
            learnerEmail: true,
            amount: true,
            paidAt: true,
            createdAt: true,
            items: true,
            status: true,
            id: true,
          },
        }),
        prisma.lmsCertificate.groupBy({
          by: ["organizationId"],
          where: { holderType: "organisation", status: "ready", organizationId: { not: null } },
          _count: { _all: true },
          orderBy: { _count: { organizationId: "desc" } },
          take: 10,
        }),
        prisma.lmsPurchase.groupBy({
          by: ["courseSlug"],
          where: {
            OR: [
              { user: { accountType: "organisation" } },
              ...(orgEmails.size ? [{ learnerEmail: { in: [...orgEmails] } }] : []),
            ],
          },
          _count: { _all: true },
          orderBy: { _count: { courseSlug: "desc" } },
          take: 10,
        }),
      ]);

      let seatsAssigned = 0;
      let seatsCapacity = 0;
      for (const t of teams) {
        seatsCapacity += Number(t.seatLimit) || 0;
        seatsAssigned += Array.isArray(t.roster)
          ? t.roster.filter((r) => r.email?.trim() || r.invited).length
          : 0;
      }

      // Revenue by company + course from paid payments
      const spendByEmail = new Map<string, { revenuePaise: number; payments: number }>();
      const courseRev = new Map<
        string,
        { slug: string; title: string; revenuePaise: number; sales: number }
      >();
      for (const p of paidPayments) {
        const email = p.learnerEmail.trim().toLowerCase();
        const prev = spendByEmail.get(email) ?? { revenuePaise: 0, payments: 0 };
        prev.revenuePaise += p.amount;
        prev.payments += 1;
        spendByEmail.set(email, prev);

        const items = itemsFromJson(p.items);
        if (!items.length) continue;
        const qtyTotal = items.reduce((s, i) => s + Math.max(1, Number(i.qty) || 1), 0) || 1;
        for (const item of items) {
          const slug = (item.slug ?? "").trim();
          if (!slug) continue;
          const qty = Math.max(1, Number(item.qty) || 1);
          let line = parsePriceToPaise(item.price) * qty;
          if (line <= 0 && p.amount > 0) {
            line = Math.round((p.amount * qty) / qtyTotal);
          }
          const row = courseRev.get(slug) ?? {
            slug,
            title: (item.title ?? slug).trim() || slug,
            revenuePaise: 0,
            sales: 0,
          };
          row.revenuePaise += line;
          row.sales += qty;
          if (item.title?.trim()) row.title = item.title.trim();
          courseRev.set(slug, row);
        }
      }

      const topSpenders = [...spendByEmail.entries()]
        .map(([email, v]) => {
          const org = orgs.find((o) => o.workEmail.trim().toLowerCase() === email);
          return {
            email,
            company: org?.companyName ?? email,
            revenuePaise: v.revenuePaise,
            payments: v.payments,
          };
        })
        .sort((a, b) => b.revenuePaise - a.revenuePaise)
        .slice(0, 10);

      const titles = await courseTitleMap([
        ...purchasesBySlug.map((c) => c.courseSlug),
        ...courseRev.keys(),
      ]);

      const popularCourses = purchasesBySlug.map((c) => ({
        slug: c.courseSlug,
        title: titles.get(c.courseSlug) ?? c.courseSlug,
        enrollments: c._count._all,
        revenuePaise: courseRev.get(c.courseSlug)?.revenuePaise ?? 0,
      }));

      const topEarningCourses = [...courseRev.values()]
        .map((c) => ({
          ...c,
          title: titles.get(c.slug) ?? c.title,
        }))
        .sort((a, b) => b.revenuePaise - a.revenuePaise)
        .slice(0, 10);

      const certCountByOrgId = new Map(
        certsByOrg.map((c) => [c.organizationId!, c._count._all] as const),
      );

      const mostEngagedOrgs = orgs
        .map((o) => {
          const email = o.workEmail.trim().toLowerCase();
          const team = teamByEmail.get(email);
          const members = Array.isArray(team?.roster)
            ? team!.roster.filter((r) => r.email?.trim() || r.invited).length
            : 0;
          const spend = spendByEmail.get(email)?.revenuePaise ?? 0;
          const certs = certCountByOrgId.get(o.id) ?? 0;
          const engagementScore = members * 3 + certs * 5 + Math.round(spend / 10000);
          return {
            company: o.companyName,
            email: o.workEmail,
            orgId: o.identificationNumber,
            members,
            seatLimit: team?.seatLimit ?? null,
            certificates: certs,
            revenuePaise: spend,
            engagementScore,
            planId: team?.planId ?? null,
          };
        })
        .sort((a, b) => b.engagementScore - a.engagementScore)
        .slice(0, 10);

      const orgDirectory = orgs.slice(0, 15).map((o) => {
        const team = teamByEmail.get(o.workEmail.trim().toLowerCase());
        const rosterFilled = Array.isArray(team?.roster)
          ? team!.roster.filter((r) => r.email?.trim() || r.invited).length
          : 0;
        return {
          id: o.id,
          name: o.companyName,
          email: o.workEmail,
          industry: o.industryType,
          size: o.companySize,
          orgId: o.identificationNumber,
          registeredAt: o.createdAt.toISOString(),
          planId: team?.planId ?? null,
          seatLimit: team?.seatLimit ?? null,
          members: rosterFilled,
        };
      });

      const recentPayments = paidPayments.slice(0, 12).map((p) => ({
        id: p.id,
        email: p.learnerEmail,
        amountPaise: p.amount,
        status: p.status,
        at: (p.paidAt ?? p.createdAt).toISOString(),
        itemCount: itemsFromJson(p.items).length,
      }));

      const maxCourseEnroll = Math.max(1, ...popularCourses.map((c) => c.enrollments));
      const maxCourseRev = Math.max(1, ...topEarningCourses.map((c) => c.revenuePaise));
      const maxEngage = Math.max(1, ...mostEngagedOrgs.map((o) => o.engagementScore));

      return NextResponse.json(
        {
          ok: true,
          audience: "organisation" as const,
          title: "Organization Analytics Dashboard",
          generatedAt: new Date().toISOString(),
          kpis: {
            organisations: orgs.length,
            orgAccounts: orgUsers,
            newOrganisations7d: newOrgs7d,
            teamSeatsCapacity: seatsCapacity,
            teamSeatsAssigned: seatsAssigned,
            seatUtilizationPct:
              seatsCapacity > 0 ? Math.round((seatsAssigned / seatsCapacity) * 100) : 0,
            studentsLinked: students,
            certificatesReady: certsReady,
            certificatesPending: certsPending,
            paidPayments: paidCount,
            pendingPayments: pendingCount,
            revenue7dPaise: paidAgg7._sum.amount ?? 0,
            revenue7dCount: paidAgg7._count._all,
            revenue30dPaise: paidAgg30._sum.amount ?? 0,
            revenue30dCount: paidAgg30._count._all,
            revenueAllPaise: paidAggAll._sum.amount ?? 0,
            avgOrderPaise:
              paidCount > 0 ? Math.round((paidAggAll._sum.amount ?? 0) / paidCount) : 0,
          },
          popularCourses: popularCourses.map((c) => ({
            ...c,
            barPct: barPct(c.enrollments, maxCourseEnroll),
          })),
          topEarningCourses: topEarningCourses.map((c) => ({
            ...c,
            barPct: barPct(c.revenuePaise, maxCourseRev),
          })),
          mostEngaged: mostEngagedOrgs.map((o) => ({
            ...o,
            barPct: barPct(o.engagementScore, maxEngage),
          })),
          topSpenders,
          organisationDirectory: orgDirectory,
          recentPayments,
        },
        { headers: noStore },
      );
    }

    // ——— Individual ———
    const individualPaymentAnd = {
      AND: [
        {
          OR: [
            { user: { accountType: null } },
            { user: { accountType: { not: "organisation" as const } } },
            { userId: null },
          ],
        },
        ...(orgEmails.size ? [{ learnerEmail: { notIn: [...orgEmails] } }] : []),
      ],
    };

    const individualPurchaseWhere = {
      OR: [
        { user: { accountType: null } },
        { user: { accountType: { not: "organisation" as const } } },
        { userId: null },
      ],
    };

    const [
      learners,
      newLearners7d,
      activeLogins30d,
      enrollments,
      enrollments7d,
      certsReady,
      certsPending,
      certsVisible,
      paidAgg7,
      paidAgg30,
      paidAggAll,
      paidCount,
      pendingCount,
      failedCount,
      paidPayments,
      topCourses,
      topBuyers,
      certLeaders,
      recentLearners,
    ] = await Promise.all([
      prisma.lmsUser.count({
        where: {
          role: "learner",
          OR: [{ accountType: null }, { accountType: { not: "organisation" } }],
        },
      }),
      prisma.lmsUser.count({
        where: {
          role: "learner",
          createdAt: { gte: since7 },
          OR: [{ accountType: null }, { accountType: { not: "organisation" } }],
        },
      }),
      prisma.lmsUser.count({
        where: {
          role: "learner",
          lastLoginAt: { gte: since30 },
          OR: [{ accountType: null }, { accountType: { not: "organisation" } }],
        },
      }),
      prisma.lmsPurchase.count({ where: individualPurchaseWhere }),
      prisma.lmsPurchase.count({
        where: { ...individualPurchaseWhere, createdAt: { gte: since7 } },
      }),
      prisma.lmsCertificate.count({
        where: { holderType: "individual", status: "ready" },
      }),
      prisma.lmsCertificate.count({
        where: { holderType: "individual", status: "pending" },
      }),
      prisma.lmsCertificate.count({
        where: { holderType: "individual", status: "ready", visibleToLearner: true },
      }),
      prisma.lmsPayment.aggregate({
        where: { status: "paid", paidAt: { gte: since7 }, ...individualPaymentAnd },
        _sum: { amount: true },
        _count: { _all: true },
      }),
      prisma.lmsPayment.aggregate({
        where: { status: "paid", paidAt: { gte: since30 }, ...individualPaymentAnd },
        _sum: { amount: true },
        _count: { _all: true },
      }),
      prisma.lmsPayment.aggregate({
        where: { status: "paid", ...individualPaymentAnd },
        _sum: { amount: true },
        _count: { _all: true },
      }),
      prisma.lmsPayment.count({ where: { status: "paid", ...individualPaymentAnd } }),
      prisma.lmsPayment.count({ where: { status: "pending", ...individualPaymentAnd } }),
      prisma.lmsPayment.count({ where: { status: "failed", ...individualPaymentAnd } }),
      prisma.lmsPayment.findMany({
        where: { status: "paid", ...individualPaymentAnd },
        orderBy: { paidAt: "desc" },
        take: 500,
        select: {
          id: true,
          learnerEmail: true,
          amount: true,
          paidAt: true,
          createdAt: true,
          items: true,
          status: true,
        },
      }),
      prisma.lmsPurchase.groupBy({
        by: ["courseSlug"],
        where: individualPurchaseWhere,
        _count: { _all: true },
        orderBy: { _count: { courseSlug: "desc" } },
        take: 12,
      }),
      prisma.lmsPurchase.groupBy({
        by: ["learnerEmail"],
        where: {
          ...individualPurchaseWhere,
          createdAt: { gte: since90 },
        },
        _count: { _all: true },
        orderBy: { _count: { learnerEmail: "desc" } },
        take: 12,
      }),
      prisma.lmsCertificate.groupBy({
        by: ["learnerEmail"],
        where: { holderType: "individual", status: "ready" },
        _count: { _all: true },
        orderBy: { _count: { learnerEmail: "desc" } },
        take: 12,
      }),
      prisma.lmsUser.findMany({
        where: {
          role: "learner",
          OR: [{ accountType: null }, { accountType: { not: "organisation" } }],
        },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          name: true,
          email: true,
          createdAt: true,
          identificationNumber: true,
          countryName: true,
          lastLoginAt: true,
        },
      }),
    ]);

    const courseRev = new Map<
      string,
      { slug: string; title: string; revenuePaise: number; sales: number }
    >();
    const spendByEmail = new Map<string, { revenuePaise: number; payments: number }>();
    for (const p of paidPayments) {
      const email = p.learnerEmail.trim().toLowerCase();
      const prev = spendByEmail.get(email) ?? { revenuePaise: 0, payments: 0 };
      prev.revenuePaise += p.amount;
      prev.payments += 1;
      spendByEmail.set(email, prev);

      const items = itemsFromJson(p.items);
      if (!items.length) continue;
      const qtyTotal = items.reduce((s, i) => s + Math.max(1, Number(i.qty) || 1), 0) || 1;
      for (const item of items) {
        const slug = (item.slug ?? "").trim();
        if (!slug) continue;
        const qty = Math.max(1, Number(item.qty) || 1);
        let line = parsePriceToPaise(item.price) * qty;
        if (line <= 0 && p.amount > 0) line = Math.round((p.amount * qty) / qtyTotal);
        const row = courseRev.get(slug) ?? {
          slug,
          title: (item.title ?? slug).trim() || slug,
          revenuePaise: 0,
          sales: 0,
        };
        row.revenuePaise += line;
        row.sales += qty;
        if (item.title?.trim()) row.title = item.title.trim();
        courseRev.set(slug, row);
      }
    }

    const titles = await courseTitleMap([
      ...topCourses.map((c) => c.courseSlug),
      ...courseRev.keys(),
    ]);

    const engageEmails = [
      ...new Set([
        ...topBuyers.map((b) => b.learnerEmail.trim().toLowerCase()),
        ...certLeaders.map((c) => c.learnerEmail.trim().toLowerCase()),
        ...[...spendByEmail.entries()]
          .sort((a, b) => b[1].revenuePaise - a[1].revenuePaise)
          .slice(0, 12)
          .map(([e]) => e),
      ]),
    ].slice(0, 40);

    const engageUsers = engageEmails.length
      ? await prisma.lmsUser.findMany({
          where: { email: { in: engageEmails } },
          select: {
            email: true,
            name: true,
            lastLoginAt: true,
            identificationNumber: true,
            countryName: true,
          },
        })
      : [];
    const userByEmail = new Map(
      engageUsers.map((u) => [u.email.trim().toLowerCase(), u] as const),
    );

    const enrollByEmail = new Map(
      topBuyers.map((b) => [b.learnerEmail.trim().toLowerCase(), b._count._all] as const),
    );
    const certByEmail = new Map(
      certLeaders.map((c) => [c.learnerEmail.trim().toLowerCase(), c._count._all] as const),
    );

    const mostEngaged = engageEmails
      .map((email) => {
        const u = userByEmail.get(email);
        const enrollmentsN = enrollByEmail.get(email) ?? 0;
        const certificates = certByEmail.get(email) ?? 0;
        const spend = spendByEmail.get(email)?.revenuePaise ?? 0;
        const payments = spendByEmail.get(email)?.payments ?? 0;
        const engagementScore =
          enrollmentsN * 4 + certificates * 8 + payments * 2 + Math.round(spend / 50000);
        return {
          email,
          name: u?.name ?? email.split("@")[0],
          id: u?.identificationNumber ?? null,
          country: u?.countryName ?? null,
          lastLoginAt: u?.lastLoginAt?.toISOString() ?? null,
          enrollments: enrollmentsN,
          certificates,
          payments,
          revenuePaise: spend,
          engagementScore,
        };
      })
      .filter((r) => r.enrollments > 0 || r.certificates > 0 || r.payments > 0)
      .sort((a, b) => b.engagementScore - a.engagementScore)
      .slice(0, 12);

    const popularCourses = topCourses.map((c) => ({
      slug: c.courseSlug,
      title: titles.get(c.courseSlug) ?? c.courseSlug,
      enrollments: c._count._all,
      revenuePaise: courseRev.get(c.courseSlug)?.revenuePaise ?? 0,
    }));

    const topEarningCourses = [...courseRev.values()]
      .map((c) => ({ ...c, title: titles.get(c.slug) ?? c.title }))
      .sort((a, b) => b.revenuePaise - a.revenuePaise)
      .slice(0, 12);

    const topSpenders = [...spendByEmail.entries()]
      .map(([email, v]) => {
        const u = userByEmail.get(email);
        return {
          email,
          name: u?.name ?? email.split("@")[0],
          revenuePaise: v.revenuePaise,
          payments: v.payments,
        };
      })
      .sort((a, b) => b.revenuePaise - a.revenuePaise)
      .slice(0, 10);

    const maxEnroll = Math.max(1, ...popularCourses.map((c) => c.enrollments));
    const maxRev = Math.max(1, ...topEarningCourses.map((c) => c.revenuePaise));
    const maxEngage = Math.max(1, ...mostEngaged.map((u) => u.engagementScore));

    return NextResponse.json(
      {
        ok: true,
        audience: "individual" as const,
        title: "Individual Analytics Dashboard",
        generatedAt: new Date().toISOString(),
        kpis: {
          learners,
          newLearners7d,
          activeLogins30d,
          enrollments,
          enrollments7d,
          certificatesReady: certsReady,
          certificatesPending: certsPending,
          certificatesVisible: certsVisible,
          paidPayments: paidCount,
          pendingPayments: pendingCount,
          failedPayments: failedCount,
          revenue7dPaise: paidAgg7._sum.amount ?? 0,
          revenue7dCount: paidAgg7._count._all,
          revenue30dPaise: paidAgg30._sum.amount ?? 0,
          revenue30dCount: paidAgg30._count._all,
          revenueAllPaise: paidAggAll._sum.amount ?? 0,
          avgOrderPaise:
            paidCount > 0 ? Math.round((paidAggAll._sum.amount ?? 0) / paidCount) : 0,
          conversionPct:
            learners > 0 ? Math.round((paidCount / learners) * 1000) / 10 : 0,
        },
        popularCourses: popularCourses.map((c) => ({
          ...c,
          barPct: barPct(c.enrollments, maxEnroll),
        })),
        topEarningCourses: topEarningCourses.map((c) => ({
          ...c,
          barPct: barPct(c.revenuePaise, maxRev),
        })),
        mostEngaged: mostEngaged.map((u) => ({
          ...u,
          barPct: barPct(u.engagementScore, maxEngage),
        })),
        topSpenders,
        recentLearners: recentLearners.map((u) => ({
          name: u.name,
          email: u.email,
          id: u.identificationNumber,
          country: u.countryName,
          registeredAt: u.createdAt.toISOString(),
          lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
        })),
        recentPayments: paidPayments.slice(0, 12).map((p) => ({
          id: p.id,
          email: p.learnerEmail,
          amountPaise: p.amount,
          status: p.status,
          at: (p.paidAt ?? p.createdAt).toISOString(),
          itemCount: itemsFromJson(p.items).length,
        })),
      },
      { headers: noStore },
    );
  } catch (err) {
    console.error("[api/admin/analytics/command-center]", err);
    return NextResponse.json(
      { ok: false, message: "Could not load analytics dashboard." },
      { status: 503, headers: noStore },
    );
  }
}
