import { NextResponse } from "next/server";
import { assertMainAdmin } from "@/lib/server/admin-api-auth";
import { getMainAdminEmail, maskEmailForDisplay } from "@/lib/server/admin-emails";
import { isRazorpayConfigured, getRazorpayKeyId } from "@/lib/server/razorpay-config";
import { prisma } from "@/lib/prisma";
import { readAdminContent } from "@/lib/server/content-store";

export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "private, no-store, max-age=0" };

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function GET(request: Request) {
  const denied = assertMainAdmin(request);
  if (denied) return denied;

  const url = new URL(request.url);
  const report = url.searchParams.get("report")?.trim() ?? "";

  try {
    if (report === "payments" || report === "users" || report === "certificates" || report === "organisations") {
      return NextResponse.json(await buildReport(report), { headers: noStore });
    }

    const main = getMainAdminEmail();
    const since7 = daysAgo(7);
    const since30 = daysAgo(30);

    const [
      userCount,
      adminCount,
      orgCount,
      purchaseCount,
      paymentPaid,
      paymentPending,
      paymentRefunded,
      paymentFailed,
      certReady,
      certPending,
      certBlocked,
      recentUsers,
      recentPayments,
      revenue30,
      revenue7,
      content,
    ] = await Promise.all([
      prisma.lmsUser.count(),
      prisma.lmsUser.count({ where: { role: "admin" } }),
      prisma.lmsOrganization.count(),
      prisma.lmsPurchase.count(),
      prisma.lmsPayment.count({ where: { status: "paid" } }),
      prisma.lmsPayment.count({ where: { status: "pending" } }),
      prisma.lmsPayment.count({ where: { status: "refunded" } }),
      prisma.lmsPayment.count({ where: { status: "failed" } }),
      prisma.lmsCertificate.count({ where: { status: "ready", visibleToLearner: true } }),
      prisma.lmsCertificate.count({ where: { status: "pending" } }),
      prisma.lmsCertificate.count({ where: { visibleToLearner: false } }),
      prisma.lmsUser.count({ where: { createdAt: { gte: since7 } } }),
      prisma.lmsPayment.count({ where: { createdAt: { gte: since7 } } }),
      prisma.lmsPayment.aggregate({
        where: { status: "paid", method: "razorpay", paidAt: { gte: since30 } },
        _sum: { amount: true },
        _count: { _all: true },
      }),
      prisma.lmsPayment.aggregate({
        where: { status: "paid", method: "razorpay", paidAt: { gte: since7 } },
        _sum: { amount: true },
        _count: { _all: true },
      }),
      readAdminContent(),
    ]);

    const courses = content.managedCourses?.length ?? 0;
    const tutorLed =
      content.tutorLedPrograms?.filter((p) => p.programKind !== "workshop").length ?? 0;
    const workshops =
      content.tutorLedPrograms?.filter((p) => p.programKind === "workshop").length ?? 0;

    const keyId = getRazorpayKeyId();
    const paymentsReady = isRazorpayConfigured();

    const securityChecks = [
      {
        id: "admin-lock",
        label: "Admin panel lock",
        ok: Boolean(main),
        detail: main
          ? `Only the main administrator (${maskEmailForDisplay(main)}) can open this panel.`
          : "Main administrator is not set. Ask your technical team to secure the panel.",
      },
      {
        id: "payments",
        label: "Online payments",
        ok: paymentsReady,
        detail: paymentsReady
          ? `Online checkout is ready (${keyId?.startsWith("rzp_live_") ? "live" : "test"} mode).`
          : "Online payments are unavailable. Ask your technical team to enable them.",
      },
      {
        id: "pending-payments",
        label: "Waiting payments",
        ok: paymentPending < 25,
        detail:
          paymentPending === 0
            ? "No waiting checkouts."
            : `${paymentPending} checkout(s) still waiting — review under Orders.`,
      },
      {
        id: "certs-pending",
        label: "Certificates in progress",
        ok: certPending < 20,
        detail:
          certPending === 0
            ? "No certificates waiting to finish."
            : `${certPending} certificate(s) still processing.`,
      },
      {
        id: "hidden-certs",
        label: "Hidden certificates",
        ok: true,
        detail:
          certBlocked === 0
            ? "No certificates are hidden from learners."
            : `${certBlocked} certificate(s) are hidden until you allow access.`,
      },
    ];

    const scoreOk = securityChecks.filter((c) => c.ok).length;
    const securityScore = Math.round((scoreOk / securityChecks.length) * 100);

    return NextResponse.json(
      {
        ok: true,
        generatedAt: new Date().toISOString(),
        security: {
          score: securityScore,
          checks: securityChecks,
          mainAdminMasked: main ? maskEmailForDisplay(main) : null,
          paymentsReady,
          paymentMode: paymentsReady
            ? keyId?.startsWith("rzp_live_")
              ? "live"
              : "test"
            : "off",
        },
        totals: {
          users: userCount,
          admins: adminCount,
          organisations: orgCount,
          enrollments: purchaseCount,
          courses,
          tutorLed,
          workshops,
          paidPayments: paymentPaid,
          pendingPayments: paymentPending,
          refundedPayments: paymentRefunded,
          failedPayments: paymentFailed,
          certificatesVisible: certReady,
          certificatesPending: certPending,
          certificatesHidden: certBlocked,
        },
        trends: {
          newUsers7d: recentUsers,
          newPayments7d: recentPayments,
          revenue7dPaise: revenue7._sum.amount ?? 0,
          revenue7dCount: revenue7._count._all,
          revenue30dPaise: revenue30._sum.amount ?? 0,
          revenue30dCount: revenue30._count._all,
        },
      },
      { headers: noStore },
    );
  } catch (err) {
    console.error("[admin/overview]", err);
    return NextResponse.json(
      { ok: false, message: "Could not load control centre data. Please try again." },
      { status: 503 },
    );
  }
}

async function buildReport(kind: string) {
  if (kind === "payments") {
    const rows = await prisma.lmsPayment.findMany({
      orderBy: { createdAt: "desc" },
      take: 500,
      include: { user: { select: { name: true } } },
    });
    return {
      ok: true,
      report: kind,
      columns: ["Date", "Learner", "Name", "Amount", "Status", "Type", "Reference", "Courses"],
      rows: rows.map((r) => {
        const items = Array.isArray(r.items) ? r.items : [];
        const courses = items
          .map((i) => {
            const row = i as { title?: string; slug?: string };
            return row.title || row.slug || "";
          })
          .filter(Boolean)
          .join("; ");
        return [
          (r.paidAt ?? r.createdAt).toISOString(),
          r.learnerEmail,
          r.user?.name ?? "",
          (r.amount / 100).toFixed(2),
          r.status,
          r.method,
          r.razorpayOrderId ?? r.receipt ?? r.id,
          courses,
        ];
      }),
    };
  }

  if (kind === "users") {
    const rows = await prisma.lmsUser.findMany({
      orderBy: { createdAt: "desc" },
      take: 500,
      select: {
        email: true,
        name: true,
        role: true,
        accountType: true,
        phone: true,
        companyName: true,
        createdAt: true,
        lastLoginAt: true,
        identificationNumber: true,
      },
    });
    return {
      ok: true,
      report: kind,
      columns: ["Joined", "Email", "Name", "Role", "Account", "Phone", "Company", "ID", "Last login"],
      rows: rows.map((r) => [
        r.createdAt.toISOString(),
        r.email,
        r.name ?? "",
        r.role,
        r.accountType ?? "",
        r.phone ?? "",
        r.companyName ?? "",
        String(r.identificationNumber ?? ""),
        r.lastLoginAt?.toISOString() ?? "",
      ]),
    };
  }

  if (kind === "certificates") {
    const rows = await prisma.lmsCertificate.findMany({
      orderBy: { issuedAt: "desc" },
      take: 500,
    });
    return {
      ok: true,
      report: kind,
      columns: [
        "Issued",
        "Learner",
        "Email",
        "Course",
        "Certificate #",
        "Status",
        "Visible",
        "Score",
      ],
      rows: rows.map((r) => [
        r.issuedAt.toISOString(),
        r.learnerName ?? "",
        r.learnerEmail,
        r.courseTitle,
        r.certificateNumber,
        r.status,
        r.visibleToLearner ? "yes" : "no",
        r.scorePercent != null ? String(r.scorePercent) : "",
      ]),
    };
  }

  const rows = await prisma.lmsOrganization.findMany({
    orderBy: { identificationNumber: "asc" },
    take: 500,
  });
  return {
    ok: true,
    report: kind,
    columns: ["ID", "Company", "Work email", "Industry", "Size", "Registered"],
    rows: rows.map((r) => [
      String(r.identificationNumber),
      r.companyName,
      r.workEmail,
      r.industryType ?? "",
      r.companySize ?? "",
      r.registrationMonthYear ?? "",
    ]),
  };
}
