import { NextResponse } from "next/server";
import { assertMainAdmin, adminEmailFromRequest } from "@/lib/server/admin-api-auth";
import { grantCourseAccessWithoutPayment, listAdminPayments } from "@/lib/server/payment-record-service";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "private, no-store, max-age=0" };

export async function GET(request: Request) {
  const denied = assertMainAdmin(request);
  if (denied) return denied;

  const url = new URL(request.url);
  const query = url.searchParams.get("q")?.trim() ?? "";
  const status = url.searchParams.get("status")?.trim() ?? "all";
  const method = url.searchParams.get("method")?.trim() ?? "all";
  const limit = Math.min(500, Math.max(1, Number(url.searchParams.get("limit") ?? 200)));

  try {
    const [payments, statusCounts, methodCounts, totalRevenue] = await Promise.all([
      listAdminPayments({ query, status, method, limit }),
      prisma.lmsPayment.groupBy({ by: ["status"], _count: { _all: true } }),
      prisma.lmsPayment.groupBy({ by: ["method"], _count: { _all: true } }),
      prisma.lmsPayment.aggregate({
        where: { status: "paid", method: "razorpay" },
        _sum: { amount: true },
        _count: { _all: true },
      }),
    ]);

    return NextResponse.json(
      {
        ok: true,
        payments,
        stats: {
          total: payments.length,
          byStatus: Object.fromEntries(statusCounts.map((r) => [r.status, r._count._all])),
          byMethod: Object.fromEntries(methodCounts.map((r) => [r.method, r._count._all])),
          razorpayPaidCount: totalRevenue._count._all,
          razorpayPaidAmount: totalRevenue._sum.amount ?? 0,
        },
      },
      { headers: noStore },
    );
  } catch (err) {
    console.error("[admin/payments GET]", err);
    return NextResponse.json(
      {
        ok: false,
        message:
          "Could not load payments. Ensure MySQL is running and run npm run db:push, then restart the dev server.",
      },
      { status: 503 },
    );
  }
}

export async function POST(request: Request) {
  const denied = assertMainAdmin(request);
  if (denied) return denied;

  const adminEmail = adminEmailFromRequest(request);
  if (!adminEmail) {
    return NextResponse.json({ ok: false, message: "Admin email header required." }, { status: 400 });
  }

  let body: {
    action?: string;
    learnerEmail?: string;
    courseSlug?: string;
    courseTitle?: string;
    adminNote?: string;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON" }, { status: 400 });
  }

  if (body.action !== "grant-access") {
    return NextResponse.json({ ok: false, message: "Unknown action." }, { status: 400 });
  }

  const result = await grantCourseAccessWithoutPayment({
    learnerEmail: body.learnerEmail ?? "",
    courseSlug: body.courseSlug ?? "",
    courseTitle: body.courseTitle ?? "",
    grantedByEmail: adminEmail,
    adminNote: body.adminNote,
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, message: result.message }, { status: 400 });
  }

  return NextResponse.json(
    { ok: true, paymentId: result.paymentId, message: result.message },
    { headers: noStore },
  );
}
