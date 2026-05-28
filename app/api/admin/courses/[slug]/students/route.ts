import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Row = {
  registrationId: number | null;
  learnerName: string | null;
  learnerEmail: string;
  phone: string | null;
  occupation: string | null;
  userRole: string | null;
  userType: string | null;
  enrollmentModel: "individual" | "organization";
  companyName: string | null;
  paymentPath: "company-pass" | "direct-payment";
  enrolledAt: string;
  completed: boolean;
  certificateStatus: "none" | "pending" | "ready" | "failed";
  certificateMode: "auto" | "manual-needed";
  certificateVisible: boolean;
  amountPaidLabel: string;
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const courseSlug = slug.trim().toLowerCase();
  if (!courseSlug) {
    return NextResponse.json({ ok: false, message: "course slug required" }, { status: 400 });
  }

  try {
    const purchases = await prisma.lmsPurchase.findMany({
      where: { courseSlug },
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            identificationNumber: true,
            name: true,
            email: true,
            phone: true,
            role: true,
            accountType: true,
            industryType: true,
            companyName: true,
          },
        },
      },
    });

    if (purchases.length === 0) {
      return NextResponse.json({ ok: true, students: [] as Row[] });
    }

    const emails = Array.from(new Set(purchases.map((p) => p.learnerEmail.toLowerCase())));
    const certs = await prisma.lmsCertificate.findMany({
      where: { courseSlug, learnerEmail: { in: emails } },
      orderBy: [{ issuedAt: "desc" }],
      select: {
        learnerEmail: true,
        status: true,
        visibleToLearner: true,
      },
    });
    const certByEmail = new Map<string, { status: string; visibleToLearner: boolean }>();
    for (const cert of certs) {
      const key = cert.learnerEmail.toLowerCase();
      if (!certByEmail.has(key)) {
        certByEmail.set(key, { status: cert.status, visibleToLearner: cert.visibleToLearner });
      }
    }

    const rows: Row[] = purchases.map((p) => {
      const email = p.learnerEmail.toLowerCase();
      const cert = certByEmail.get(email);
      const userName = p.user?.name?.trim() || null;
      const fallbackName = p.learnerEmail.split("@")[0] || null;
      const userType = p.user?.accountType?.trim() || null;
      const companyName = p.user?.companyName?.trim() || null;
      const enrollmentModel = userType?.toLowerCase() === "organization" || companyName ? "organization" : "individual";
      return {
        registrationId: p.user?.identificationNumber ?? null,
        learnerName: userName || fallbackName,
        learnerEmail: p.learnerEmail,
        phone: p.user?.phone ?? null,
        occupation: p.user?.industryType?.trim() || null,
        userRole: p.user?.role?.trim() || "learner",
        userType,
        enrollmentModel,
        companyName,
        paymentPath: enrollmentModel === "organization" ? "company-pass" : "direct-payment",
        enrolledAt: p.createdAt.toISOString(),
        completed: cert?.status === "ready",
        certificateStatus: cert ? (cert.status as "pending" | "ready" | "failed") : "none",
        certificateMode: cert?.status === "failed" ? "manual-needed" : "auto",
        certificateVisible: cert?.visibleToLearner === true,
        amountPaidLabel:
          enrollmentModel === "organization" ? "Company sponsored / pass" : "Tracked in payment gateway",
      };
    });

    return NextResponse.json({ ok: true, students: rows });
  } catch (err) {
    console.error("[admin/courses/[slug]/students]", err);
    return NextResponse.json(
      { ok: false, message: "Could not load students from MySQL." },
      { status: 503 },
    );
  }
}

