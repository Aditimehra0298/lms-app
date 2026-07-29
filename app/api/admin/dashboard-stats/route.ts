import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { readFile } from "node:fs/promises";
import path from "node:path";

export const dynamic = "force-dynamic";

async function safeCount(fn: () => Promise<number>): Promise<number> {
  try { return await fn(); } catch { return 0; }
}

async function readJsonFile<T>(filePath: string, fallback: T): Promise<T> {
  try {
    const raw = await readFile(filePath, "utf-8");
    return JSON.parse(raw) as T;
  } catch { return fallback; }
}

export async function GET() {
  try {
    const [
      totalUsers,
      totalStudents,
      totalAdmins,
      totalOrganizations,
      totalPurchases,
      totalPayments,
      paidRevenue,
      totalCertificates,
      totalFormSubmissions,
      newsletterSubs,
      recentUsers,
      recentPayments,
    ] = await Promise.all([
      safeCount(() => prisma.lmsUser.count()),
      safeCount(() => prisma.lmsUser.count({ where: { role: "learner" } })),
      safeCount(() => prisma.lmsUser.count({ where: { role: "admin" } })),
      safeCount(() => prisma.lmsOrganization.count()),
      safeCount(() => prisma.lmsPurchase.count()),
      safeCount(() => prisma.lmsPayment.count()),
      prisma.lmsPayment.aggregate({
        _sum: { amount: true },
        where: { status: { in: ["paid", "captured"] } },
      }).then(r => r._sum.amount ?? 0).catch(() => 0),
      safeCount(() => prisma.lmsCertificate.count()),
      safeCount(() => prisma.lmsFormSubmission.count()),
      safeCount(() => prisma.lmsFormSubmission.count({ where: { formType: "newsletter" } })),
      prisma.lmsUser.findMany({
        orderBy: { createdAt: "desc" },
        take: 6,
        select: { name: true, email: true, createdAt: true, role: true },
      }).catch(() => []),
      prisma.lmsPayment.findMany({
        orderBy: { createdAt: "desc" },
        take: 6,
        select: {
          id: true,
          learnerEmail: true,
          amount: true,
          currency: true,
          status: true,
          method: true,
          items: true,
          createdAt: true,
        },
      }).catch(() => []),
    ]);

    const adminContentPath = path.join(process.cwd(), "data", "admin-content.json");
    const adminContent = await readJsonFile<{
      courses?: { slug: string; title: string; published?: boolean }[];
      categories?: { slug: string; title: string }[];
    }>(adminContentPath, {});
    const courses = Array.isArray(adminContent.courses) ? adminContent.courses : [];
    const categories = Array.isArray(adminContent.categories) ? adminContent.categories : [];
    const publishedCourses = courses.filter(c => c.published !== false);

    const reviewsPath = path.join(process.cwd(), "data", "course-reviews.json");
    const reviewsData = await readJsonFile<Record<string, unknown[]>>(reviewsPath, {});
    const totalReviews = Object.values(reviewsData).reduce((sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0), 0);

    const totalCourses = courses.length;

    const purchaseCountBySlug = await prisma.lmsPurchase.groupBy({
      by: ["courseSlug"],
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 5,
    }).catch(() => []);

    const topCourses = purchaseCountBySlug.map(row => {
      const course = courses.find(c => c.slug === row.courseSlug);
      return {
        slug: row.courseSlug,
        title: course?.title ?? row.courseSlug,
        enrollments: row._count.id,
      };
    });

    // Revenue is stored in paise (smallest unit), convert to rupees
    const revenueRupees = Math.round(paidRevenue / 100);

    return NextResponse.json({
      ok: true,
      stats: {
        totalUsers,
        totalStudents,
        totalAdmins,
        totalOrganizations,
        totalCourses,
        publishedCourses: publishedCourses.length,
        totalCategories: categories.length,
        totalPurchases,
        totalPayments,
        totalRevenue: revenueRupees,
        totalCertificates,
        totalReviews,
        totalFormSubmissions,
        newsletterSubs,
      },
      recentUsers,
      recentPayments,
      topCourses,
    });
  } catch (err) {
    console.error("[admin/dashboard-stats]", err);
    return NextResponse.json({ ok: false, error: "Failed to load stats" }, { status: 500 });
  }
}
