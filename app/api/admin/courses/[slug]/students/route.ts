import { NextResponse } from "next/server";
import { normalizeLearnerEmail } from "@/lib/learner-email";
import { prisma } from "@/lib/prisma";
import {
  emailsLikelySamePerson,
  resolveLearnerForPurchaseEmail,
  type ResolvedLearner,
} from "@/lib/server/learner-email-resolve";

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

    const resolvedByPurchaseId = new Map<string, ResolvedLearner | null>();
    const resolvedCache: ResolvedLearner[] = [];

    for (const p of purchases) {
      const fromJoin = p.user
        ? {
            canonicalEmail: p.user.email,
            userId: p.userId,
            identificationNumber: p.user.identificationNumber,
            name: p.user.name,
            phone: p.user.phone,
            role: p.user.role,
            accountType: p.user.accountType,
            industryType: p.user.industryType,
            companyName: p.user.companyName,
          }
        : null;
      const resolved =
        fromJoin ?? (await resolveLearnerForPurchaseEmail(p.learnerEmail, resolvedCache));
      resolvedByPurchaseId.set(p.id, resolved);
      if (resolved && !resolvedCache.some((r) => r.userId === resolved.userId)) {
        resolvedCache.push(resolved);
      }
    }

    const emails = Array.from(
      new Set(
        purchases
          .map((p) => {
            const r = resolvedByPurchaseId.get(p.id);
            return r?.canonicalEmail ?? normalizeLearnerEmail(p.learnerEmail);
          })
          .filter(Boolean),
      ),
    );
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
      const key = normalizeLearnerEmail(cert.learnerEmail);
      if (!certByEmail.has(key)) {
        certByEmail.set(key, { status: cert.status, visibleToLearner: cert.visibleToLearner });
      }
    }

    const dedupedPurchases = (() => {
      const kept: (typeof purchases)[number][] = [];
      for (const p of purchases) {
        const resolved = resolvedByPurchaseId.get(p.id);
        const email = resolved?.canonicalEmail ?? normalizeLearnerEmail(p.learnerEmail);
        const key = resolved?.userId ?? email;
        const dupIdx = kept.findIndex((k) => {
          const kr = resolvedByPurchaseId.get(k.id);
          const kEmail = kr?.canonicalEmail ?? normalizeLearnerEmail(k.learnerEmail);
          const kKey = kr?.userId ?? kEmail;
          if (key && kKey && key === kKey) return true;
          return emailsLikelySamePerson(email, kEmail);
        });
        if (dupIdx < 0) {
          kept.push(p);
          continue;
        }
        const existing = kept[dupIdx]!;
        if (p.createdAt < existing.createdAt) kept[dupIdx] = p;
      }
      return kept.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    })();

    const rows: Row[] = dedupedPurchases.map((p) => {
      const resolved = resolvedByPurchaseId.get(p.id);
      const email = resolved?.canonicalEmail ?? normalizeLearnerEmail(p.learnerEmail);
      const cert = certByEmail.get(email);
      const userName = resolved?.name?.trim() || p.user?.name?.trim() || null;
      const fallbackName = email.split("@")[0] || null;
      const userType = resolved?.accountType?.trim() || p.user?.accountType?.trim() || null;
      const companyName = resolved?.companyName?.trim() || p.user?.companyName?.trim() || null;
      const enrollmentModel =
        userType?.toLowerCase() === "organization" || companyName ? "organization" : "individual";
      return {
        registrationId: resolved?.identificationNumber ?? p.user?.identificationNumber ?? null,
        learnerName: userName || fallbackName,
        learnerEmail: email,
        phone: resolved?.phone ?? p.user?.phone ?? null,
        occupation: resolved?.industryType?.trim() || p.user?.industryType?.trim() || null,
        userRole: resolved?.role?.trim() || p.user?.role?.trim() || "learner",
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
