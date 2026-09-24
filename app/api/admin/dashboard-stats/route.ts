import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { canonicalCategorySlug } from "@/lib/category-page-resolve";
import { assertMainAdmin } from "@/lib/server/admin-api-auth";

export const dynamic = "force-dynamic";

async function safeCount(fn: () => Promise<number>): Promise<number> {
  try {
    return await fn();
  } catch {
    return 0;
  }
}

async function readJsonFile<T>(filePath: string, fallback: T): Promise<T> {
  try {
    const raw = await readFile(filePath, "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

type ContentCourse = {
  slug: string;
  title: string;
  category?: string;
  published?: boolean;
};

type ContentCategory = {
  slug: string;
  title: string;
  isActive?: boolean;
};

type ContentProgram = {
  slug?: string;
  published?: boolean;
  programKind?: string;
};

function startOfDay(offsetDays: number): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + offsetDays);
  return d;
}

function dayKey(value: Date): string {
  const y = value.getFullYear();
  const m = String(value.getMonth() + 1).padStart(2, "0");
  const d = String(value.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export async function GET(request: Request) {
  const denied = await assertMainAdmin(request);
  if (denied) return denied;

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
      purchaseCountBySlug,
      pendingPayments,
      pendingCertificates,
      openIssues,
      newUsers7d,
      newEnrollments7d,
      revenue7dPaise,
      recentPurchases7d,
      paidPayments7d,
      recentEnrollments,
    ] = await Promise.all([
      safeCount(() => prisma.lmsUser.count()),
      safeCount(() => prisma.lmsUser.count({ where: { role: "learner" } })),
      safeCount(() => prisma.lmsUser.count({ where: { role: "admin" } })),
      safeCount(() => prisma.lmsOrganization.count()),
      safeCount(() => prisma.lmsPurchase.count()),
      safeCount(() => prisma.lmsPayment.count()),
      prisma.lmsPayment
        .aggregate({
          _sum: { amount: true },
          where: { status: { in: ["paid", "captured"] } },
        })
        .then((r) => r._sum.amount ?? 0)
        .catch(() => 0),
      safeCount(() => prisma.lmsCertificate.count()),
      safeCount(() => prisma.lmsFormSubmission.count()),
      safeCount(() => prisma.lmsFormSubmission.count({ where: { formType: "newsletter" } })),
      prisma.lmsUser
        .findMany({
          orderBy: { createdAt: "desc" },
          take: 6,
          select: { name: true, email: true, createdAt: true, role: true },
        })
        .catch(() => []),
      prisma.lmsPayment
        .findMany({
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
        })
        .catch(() => []),
      prisma.lmsPurchase
        .groupBy({
          by: ["courseSlug"],
          _count: { id: true },
          orderBy: { _count: { id: "desc" } },
        })
        .catch(() => []),
      safeCount(() => prisma.lmsPayment.count({ where: { status: "pending" } })),
      safeCount(() => prisma.lmsCertificate.count({ where: { status: "pending" } })),
      safeCount(() =>
        prisma.lmsIssue.count({ where: { issueStatus: { in: ["open", "in_progress"] } } }),
      ),
      safeCount(() => prisma.lmsUser.count({ where: { createdAt: { gte: startOfDay(-6) } } })),
      safeCount(() => prisma.lmsPurchase.count({ where: { createdAt: { gte: startOfDay(-6) } } })),
      prisma.lmsPayment
        .aggregate({
          _sum: { amount: true },
          where: { status: { in: ["paid", "captured"] }, createdAt: { gte: startOfDay(-6) } },
        })
        .then((r) => r._sum.amount ?? 0)
        .catch(() => 0),
      prisma.lmsPurchase
        .findMany({
          where: { createdAt: { gte: startOfDay(-6) } },
          select: { createdAt: true },
        })
        .catch(() => []),
      prisma.lmsPayment
        .findMany({
          where: { status: { in: ["paid", "captured"] }, createdAt: { gte: startOfDay(-6) } },
          select: { createdAt: true, amount: true },
        })
        .catch(() => []),
      prisma.lmsPurchase
        .findMany({
          orderBy: { createdAt: "desc" },
          take: 6,
          select: { id: true, learnerEmail: true, title: true, courseSlug: true, createdAt: true },
        })
        .catch(() => []),
    ]);

    const adminContentPath = path.join(process.cwd(), "data", "admin-content.json");
    const adminContent = await readJsonFile<{
      managedCourses?: ContentCourse[];
      courses?: ContentCourse[];
      categories?: ContentCategory[];
      tutorLedPrograms?: ContentProgram[];
    }>(adminContentPath, {});

    const courses: ContentCourse[] =
      Array.isArray(adminContent.managedCourses) && adminContent.managedCourses.length > 0
        ? adminContent.managedCourses
        : Array.isArray(adminContent.courses)
          ? adminContent.courses
          : [];
    const categories = Array.isArray(adminContent.categories) ? adminContent.categories : [];
    const publishedCourses = courses.filter((c) => c.published !== false);
    const draftCourses = courses.filter((c) => c.published === false);
    const programs = Array.isArray(adminContent.tutorLedPrograms) ? adminContent.tutorLedPrograms : [];
    const tutorLedLive = programs.filter((p) => p.programKind !== "workshop");
    const workshops = programs.filter((p) => p.programKind === "workshop");
    const tutorLedPublished = tutorLedLive.filter((p) => p.published !== false).length;
    const workshopPublished = workshops.filter((p) => p.published !== false).length;

    const enrollmentsBySlug = new Map<string, number>();
    for (const row of purchaseCountBySlug) {
      enrollmentsBySlug.set(row.courseSlug, row._count.id);
    }

    const categoryStats = categories.map((cat) => {
      const key = canonicalCategorySlug(cat.slug);
      const inCategory = courses.filter(
        (c) => canonicalCategorySlug(String(c.category ?? "")) === key,
      );
      const studentCount = inCategory.reduce(
        (sum, c) => sum + (enrollmentsBySlug.get(c.slug) ?? 0),
        0,
      );
      return {
        slug: cat.slug,
        title: cat.title,
        courseCount: inCategory.length,
        publishedCourseCount: inCategory.filter((c) => c.published !== false).length,
        studentCount,
      };
    });

    const reviewsPath = path.join(process.cwd(), "data", "course-reviews.json");
    const reviewsData = await readJsonFile<Record<string, unknown[]>>(reviewsPath, {});
    const totalReviews = Object.values(reviewsData).reduce(
      (sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0),
      0,
    );

    const topCourses = purchaseCountBySlug.slice(0, 5).map((row) => {
      const course = courses.find((c) => c.slug === row.courseSlug);
      return {
        slug: row.courseSlug,
        title: course?.title ?? row.courseSlug,
        enrollments: row._count.id,
      };
    });

    const revenueRupees = Math.round(Number(paidRevenue) / 100);
    const revenue7d = Math.round(Number(revenue7dPaise) / 100);

    const weekActivity = Array.from({ length: 7 }, (_, i) => {
      const day = startOfDay(i - 6);
      const key = dayKey(day);
      const enrollments = recentPurchases7d.filter((row) => dayKey(row.createdAt) === key).length;
      const revenue = Math.round(
        paidPayments7d
          .filter((row) => dayKey(row.createdAt) === key)
          .reduce((sum, row) => sum + Number(row.amount || 0), 0) / 100,
      );
      return {
        date: key,
        label: day.toLocaleDateString("en-IN", { weekday: "short" }),
        enrollments,
        revenue,
      };
    });

    return NextResponse.json({
      ok: true,
      stats: {
        totalUsers,
        totalStudents,
        totalAdmins,
        totalOrganizations,
        totalCourses: courses.length,
        publishedCourses: publishedCourses.length,
        draftCourses: draftCourses.length,
        selfPacedPublished: publishedCourses.length,
        tutorLedPublished,
        workshopPublished,
        totalCategories: categories.length,
        totalPurchases,
        totalPayments,
        pendingPayments,
        pendingCertificates,
        openIssues,
        newUsers7d,
        newEnrollments7d,
        revenue7d,
        totalRevenue: revenueRupees,
        totalCertificates,
        totalReviews,
        totalFormSubmissions,
        newsletterSubs,
      },
      weekActivity,
      recentEnrollments,
      categoryStats,
      recentUsers,
      recentPayments,
      topCourses,
    });
  } catch (err) {
    console.error("[admin/dashboard-stats]", err);
    return NextResponse.json({ ok: false, error: "Failed to load stats" }, { status: 500 });
  }
}
