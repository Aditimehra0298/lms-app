import { NextResponse } from "next/server";
import { assertMainAdmin, adminEmailFromRequest } from "@/lib/server/admin-api-auth";
import {
  getPaymentGatewaySnapshot,
  grantCourseAccessWithoutPayment,
  listAdminPayments,
  markPaymentFailed,
  refundAdminPayment,
  syncPaymentFromGateway,
  syncPendingRazorpayPayments,
} from "@/lib/server/payment-record-service";
import { listAdminGrantableOfferings } from "@/lib/server/admin-grantable-offerings";
import { getRazorpayAdminStatus } from "@/lib/server/razorpay-service";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "private, no-store, max-age=0" };

export async function GET(request: Request) {
  const denied = await assertMainAdmin(request);
  if (denied) return denied;

  const url = new URL(request.url);
  const query = url.searchParams.get("q")?.trim() ?? "";
  const status = url.searchParams.get("status")?.trim() ?? "all";
  const method = url.searchParams.get("method")?.trim() ?? "all";
  const limit = Math.min(500, Math.max(1, Number(url.searchParams.get("limit") ?? 200)));
  const paymentId = url.searchParams.get("paymentId")?.trim() ?? "";
  const gateway = url.searchParams.get("gateway") === "1";
  const offerings = url.searchParams.get("offerings") === "1";

  try {
    if (offerings) {
      const list = await listAdminGrantableOfferings();
      return NextResponse.json({ ok: true, offerings: list }, { headers: noStore });
    }

    if (gateway && paymentId) {
      const snapshot = await getPaymentGatewaySnapshot(paymentId);
      if (!snapshot.ok) {
        return NextResponse.json({ ok: false, message: snapshot.message }, { status: 404, headers: noStore });
      }
      return NextResponse.json(
        { ok: true, ...snapshot, razorpay: getRazorpayAdminStatus() },
        { headers: noStore },
      );
    }

    const [payments, statusCounts, methodCounts, totalRevenue, pendingCount] = await Promise.all([
      listAdminPayments({ query, status, method, limit }),
      prisma.lmsPayment.groupBy({ by: ["status"], _count: { _all: true } }),
      prisma.lmsPayment.groupBy({ by: ["method"], _count: { _all: true } }),
      prisma.lmsPayment.aggregate({
        where: { status: "paid", method: "razorpay" },
        _sum: { amount: true },
        _count: { _all: true },
      }),
      prisma.lmsPayment.count({ where: { method: "razorpay", status: "pending" } }),
    ]);

    return NextResponse.json(
      {
        ok: true,
        payments,
        razorpay: getRazorpayAdminStatus(),
        stats: {
          total: payments.length,
          byStatus: Object.fromEntries(statusCounts.map((r) => [r.status, r._count._all])),
          byMethod: Object.fromEntries(methodCounts.map((r) => [r.method, r._count._all])),
          razorpayPaidCount: totalRevenue._count._all,
          razorpayPaidAmount: totalRevenue._sum.amount ?? 0,
          pendingRazorpay: pendingCount,
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
  const denied = await assertMainAdmin(request);
  if (denied) return denied;

  const adminEmail = await adminEmailFromRequest(request);
  if (!adminEmail) {
    return NextResponse.json({ ok: false, message: "Admin session required." }, { status: 403 });
  }

  let body: {
    action?: string;
    learnerEmail?: string;
    courseSlug?: string;
    courseTitle?: string;
    adminNote?: string;
    paymentId?: string;
    refundNote?: string;
    revokeAccess?: boolean;
    viaGateway?: boolean;
    refundAmountPaise?: number;
    note?: string;
    limit?: number;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON" }, { status: 400 });
  }

  if (body.action === "grant-access") {
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

  if (body.action === "refund") {
    const result = await refundAdminPayment({
      paymentId: body.paymentId ?? "",
      refundedByEmail: adminEmail,
      refundNote: body.refundNote,
      revokeAccess: body.revokeAccess !== false,
      viaGateway: body.viaGateway === true,
      refundAmountPaise: body.refundAmountPaise,
    });

    if (!result.ok) {
      return NextResponse.json({ ok: false, message: result.message }, { status: 400 });
    }

    return NextResponse.json(
      {
        ok: true,
        message: result.message,
        revokedCourses: result.revokedCourses,
        razorpayRefundId: result.razorpayRefundId,
      },
      { headers: noStore },
    );
  }

  if (body.action === "sync") {
    const result = await syncPaymentFromGateway({
      paymentId: body.paymentId ?? "",
      adminEmail,
    });
    if (!result.ok) {
      return NextResponse.json({ ok: false, message: result.message }, { status: 400 });
    }
    return NextResponse.json(
      { ok: true, message: result.message, status: result.status },
      { headers: noStore },
    );
  }

  if (body.action === "sync-pending") {
    const result = await syncPendingRazorpayPayments({
      adminEmail,
      limit: body.limit,
    });
    return NextResponse.json({ ok: true, ...result }, { headers: noStore });
  }

  if (body.action === "mark-failed") {
    const result = await markPaymentFailed({
      paymentId: body.paymentId ?? "",
      adminEmail,
      note: body.note,
    });
    if (!result.ok) {
      return NextResponse.json({ ok: false, message: result.message }, { status: 400 });
    }
    return NextResponse.json({ ok: true, message: result.message }, { headers: noStore });
  }

  return NextResponse.json({ ok: false, message: "Unknown action." }, { status: 400 });
}
