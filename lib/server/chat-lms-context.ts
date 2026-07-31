import { emailAppUrl } from "@/lib/email-brand-config";
import { normalizeLearnerEmail } from "@/lib/learner-email";
import {
  buildCategoryList,
  coursesInCategory,
  formatCourseForAi,
  isCourseDetailQuestion,
  loadChatCourseCatalog,
  matchCategoryInMessage,
  matchCoursesInMessage,
  pickFocusedCourse,
  type ChatCategoryRef,
  type ChatCourseDetail,
} from "@/lib/server/chat-course-catalog";
import { getPurchasesForLearner } from "@/lib/server/get-learner-purchases";
import { lookupRegistrationByEmail } from "@/lib/server/registration-lookup";
import { prisma } from "@/lib/prisma";

const MAX_PAYMENTS = 6;
const MAX_ISSUES = 5;

export type LmsChatCourseRef = ChatCourseDetail;

export type LmsChatContext = {
  generatedAt: string;
  pagePath?: string;
  appUrl: string;
  isLoggedIn: boolean;
  learner?: {
    email: string;
    name: string | null;
    accountType: string | null;
    registrationCode: string | null;
    companyName: string | null;
    countryName: string | null;
  };
  enrollments: Array<{ slug: string; title: string; enrolledAt: string }>;
  certificates: Array<{
    courseTitle: string;
    courseSlug: string;
    status: string;
    visibleToLearner: boolean;
    certificateNumber: string;
    issuedAt: string;
    scorePercent: number | null;
  }>;
  payments: Array<{
    status: string;
    amount: number;
    currency: string;
    paidAt: string | null;
    courseTitles: string[];
  }>;
  supportIssues: Array<{
    issueToken: string;
    status: string;
    category: string | null;
    createdAt: string;
  }>;
  publishedCourses: ChatCourseDetail[];
  categories: ChatCategoryRef[];
  messageMatchedCourses: ChatCourseDetail[];
  categoryMatchedCourses: ChatCourseDetail[];
  matchedCategory: string | null;
  focusedCourse: ChatCourseDetail | null;
  guidance: {
    coursesUrl: string;
    myLearningUrl: string;
    certificatesUrl: string;
    subscriptionsUrl: string;
    loginUrl: string;
    contactUrl: string;
  };
  summary: string;
};

function formatMoney(amount: number, currency: string): string {
  const major = currency.toUpperCase() === "INR" ? amount / 100 : amount / 100;
  return `${currency.toUpperCase()} ${major.toFixed(2)}`;
}

function parsePaymentItems(items: unknown): string[] {
  if (!Array.isArray(items)) return [];
  const titles: string[] = [];
  for (const item of items) {
    if (!item || typeof item !== "object") continue;
    const title = "title" in item ? String((item as { title?: unknown }).title ?? "").trim() : "";
    if (title) titles.push(title);
  }
  return titles;
}

function buildSummary(ctx: Omit<LmsChatContext, "summary">): string {
  const lines: string[] = [
    `LMS data snapshot at ${ctx.generatedAt} (source: MySQL).`,
    `Site: ${ctx.appUrl}`,
  ];

  if (ctx.pagePath) lines.push(`User is on page: ${ctx.pagePath}`);

  if (ctx.learner) {
    lines.push(
      `Logged-in learner: ${ctx.learner.name ?? "Unknown name"} (${ctx.learner.email})${
        ctx.learner.registrationCode ? `, ID ${ctx.learner.registrationCode}` : ""
      }${ctx.learner.accountType ? `, account type ${ctx.learner.accountType}` : ""}${
        ctx.learner.companyName ? `, company ${ctx.learner.companyName}` : ""
      }.`,
    );
  } else {
    lines.push("Guest user (not logged in). Only public catalog and general LMS guidance are available.");
  }

  if (ctx.enrollments.length) {
    lines.push("Enrolled courses:");
    for (const e of ctx.enrollments) {
      lines.push(`- ${e.title} (slug: ${e.slug}, enrolled ${e.enrolledAt.slice(0, 10)})`);
    }
  } else if (ctx.isLoggedIn) {
    lines.push("Enrolled courses: none in database.");
  }

  if (ctx.certificates.length) {
    lines.push("Certificates:");
    for (const c of ctx.certificates) {
      const ready =
        c.status === "ready" && c.visibleToLearner
          ? "ready to download"
          : c.status === "pending"
            ? "pending generation"
            : `${c.status}${c.visibleToLearner ? "" : ", hidden from dashboard"}`;
      lines.push(
        `- ${c.courseTitle}: ${ready}, number ${c.certificateNumber}${
          c.scorePercent != null ? `, score ${c.scorePercent}%` : ""
        }`,
      );
    }
  } else if (ctx.isLoggedIn) {
    lines.push("Certificates: none issued yet.");
  }

  if (ctx.payments.length) {
    lines.push("Recent payments:");
    for (const p of ctx.payments) {
      const courses = p.courseTitles.length ? p.courseTitles.join(", ") : "unknown items";
      lines.push(
        `- ${p.status} ${formatMoney(p.amount, p.currency)} for ${courses}${
          p.paidAt ? ` (paid ${p.paidAt.slice(0, 10)})` : ""
        }`,
      );
    }
  }

  if (ctx.supportIssues.length) {
    lines.push("Open support tickets:");
    for (const i of ctx.supportIssues) {
      lines.push(`- ${i.issueToken} (${i.category ?? "TECH"}) — ${i.status}, opened ${i.createdAt.slice(0, 10)}`);
    }
  }

  if (ctx.matchedCategory && ctx.categoryMatchedCourses.length) {
    lines.push(`Courses in category ${ctx.matchedCategory}:`);
    for (const c of ctx.categoryMatchedCourses.slice(0, 12)) {
      lines.push(`- ${formatCourseForAi(c)}`);
    }
  }

  if (ctx.messageMatchedCourses.length) {
    lines.push("Courses matching this question:");
    for (const c of ctx.messageMatchedCourses.slice(0, 8)) {
      lines.push(formatCourseForAi(c));
    }
  }

  if (ctx.focusedCourse) {
    lines.push("Focused course (user likely asking about this one):");
    lines.push(formatCourseForAi(ctx.focusedCourse));
  }

  lines.push(`Course categories (${ctx.categories.length}):`);
  for (const cat of ctx.categories) {
    lines.push(`- ${cat.label} [${cat.slug}] — ${cat.count} course(s) — ${cat.categoryPath}`);
  }

  lines.push(`Full published catalog (${ctx.publishedCourses.length} courses):`);
  for (const c of ctx.publishedCourses.slice(0, 24)) {
    lines.push(formatCourseForAi(c));
  }
  if (ctx.publishedCourses.length > 24) {
    lines.push(`…and ${ctx.publishedCourses.length - 24} more at ${ctx.guidance.coursesUrl}`);
  }

  lines.push("LMS navigation:");
  lines.push(`- Browse courses: ${ctx.guidance.coursesUrl}`);
  lines.push(`- My Learning dashboard: ${ctx.guidance.myLearningUrl}`);
  lines.push(`- Certificates tab: ${ctx.guidance.certificatesUrl}`);
  lines.push(`- Subscriptions: ${ctx.guidance.subscriptionsUrl}`);
  lines.push(`- Login: ${ctx.guidance.loginUrl}`);
  lines.push(`- Contact support: ${ctx.guidance.contactUrl}`);

  return lines.join("\n");
}

export function buildOpenAiContextInstructions(ctx: LmsChatContext): string {
  return [
    "You are a friendly course advisor for Sustainable Futures Trainings (SFT).",
    "Help users browse by category, compare courses, and understand price, duration, level, and learning outcomes.",
    "Also help with assignments, certificates, payments, technical issues, and general FAQs using the LMS context.",
    "Write like a helpful colleague — warm, clear, conversational. Short paragraphs.",
    "When the user asks generally for course information / your courses / LMS catalog (without naming cyber, ESG, etc.), do NOT pick one random course. Greet them warmly, then present the course CATEGORIES and ask which area they want.",
    "When the user asks about courses, categories, prices, duration, or learning outcomes, read their message carefully (including typos like cyber/cybersecurity) and answer ONLY from the live catalog context below — same data as GET /api/courses.",
    "For a specific topic (e.g. Cyber Security), list matching courses with price and duration. For a single named course, give details.",
    "Talk like a helpful human colleague — short, clear, warm. Do not dump unrelated course details.",
    "Refer to the learner by their full name only when it is present in the context. Do not invent a name.",
    "Use ONLY the live LMS database context below — courses include real prices and content from our catalog.",
    "If the user asks about THEIR enrollments, certificates, payments, progress, assignments, or tickets and they are not logged in, tell them to sign in first at /account?mode=login, then ask again — never invent personal account data.",
    "When the learner IS logged in, answer only from the live MySQL context (real course titles, payment amounts/dates, certificate numbers). Be specific and realistic.",
    "If the user has a payment problem and is logged in, ask for Student ID, then Transaction ID, then Payment date — one at a time.",
    "If you cannot resolve an issue, tell them to reply with \"create a ticket\" plus a short description so the system can open a support ticket.",
    "Do not invent ticket numbers — the platform creates them automatically when details are complete.",
    "When a user asks about a category (e.g. Cyber Security), list matching courses with price and duration from the context.",
    "Link to courses using paths like /courses/slug and categories at /courses/category/slug.",
    "Never invent courses, prices, or enrollments.",
    "",
    "[LMS DATABASE CONTEXT]",
    ctx.summary,
    "[/LMS DATABASE CONTEXT]",
  ].join("\n");
}

async function loadCatalogContext(message: string) {
  const publishedCourses = await loadChatCourseCatalog();
  const categories = buildCategoryList(publishedCourses);
  const matchedCategory = matchCategoryInMessage(message);
  const categoryMatchedCourses = matchedCategory
    ? coursesInCategory(publishedCourses, matchedCategory)
    : [];
  const messageMatchedCourses = matchCoursesInMessage(message, publishedCourses);
  const focusedCourse =
    isCourseDetailQuestion(message) || messageMatchedCourses.length === 1
      ? pickFocusedCourse(message, publishedCourses, matchedCategory)
      : pickFocusedCourse(message, publishedCourses, matchedCategory);

  return {
    publishedCourses,
    categories,
    matchedCategory,
    categoryMatchedCourses,
    messageMatchedCourses,
    focusedCourse,
  };
}

/** Load learner + catalog data from MySQL for smart chat replies. */
export async function buildLmsChatContext(input: {
  learnerEmail?: string;
  message: string;
  pagePath?: string;
}): Promise<LmsChatContext> {
  const appUrl = emailAppUrl().replace(/\/$/, "");
  const email = normalizeLearnerEmail(input.learnerEmail ?? "");
  const pagePath = input.pagePath?.trim() || undefined;

  const guidance = {
    coursesUrl: `${appUrl}/courses`,
    myLearningUrl: `${appUrl}/my-learning`,
    certificatesUrl: `${appUrl}/my-learning?tab=certificates`,
    subscriptionsUrl: `${appUrl}/my-learning?tab=subscriptions`,
    loginUrl: `${appUrl}/account?mode=login`,
    contactUrl: `${appUrl}/contact`,
  };

  const catalog = await loadCatalogContext(input.message);

  if (!email) {
    const base = {
      generatedAt: new Date().toISOString(),
      pagePath,
      appUrl,
      isLoggedIn: false,
      enrollments: [],
      certificates: [],
      payments: [],
      supportIssues: [],
      ...catalog,
      guidance,
    };
    return { ...base, summary: buildSummary(base) };
  }

  const [profile, enrollments, certRows, paymentRows, issueRows] = await Promise.all([
    lookupRegistrationByEmail(email),
    getPurchasesForLearner(email),
    prisma.lmsCertificate.findMany({
      where: { learnerEmail: email },
      select: {
        courseTitle: true,
        courseSlug: true,
        status: true,
        visibleToLearner: true,
        certificateNumber: true,
        issuedAt: true,
        scorePercent: true,
      },
      orderBy: { issuedAt: "desc" },
      take: 20,
    }),
    prisma.lmsPayment.findMany({
      where: { learnerEmail: email },
      select: {
        status: true,
        amount: true,
        currency: true,
        paidAt: true,
        items: true,
      },
      orderBy: { createdAt: "desc" },
      take: MAX_PAYMENTS,
    }),
    prisma.lmsIssue.findMany({
      where: {
        userEmail: email,
        issueStatus: { in: ["open", "in_progress"] },
      },
      select: {
        issueToken: true,
        issueStatus: true,
        category: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: MAX_ISSUES,
    }),
  ]);

  const base = {
    generatedAt: new Date().toISOString(),
    pagePath,
    appUrl,
    isLoggedIn: true,
    learner: profile
      ? {
          email: profile.email,
          name: profile.name,
          accountType: profile.accountType,
          registrationCode: profile.registrationCode,
          companyName: profile.companyName,
          countryName: profile.countryName,
        }
      : { email, name: null, accountType: null, registrationCode: null, companyName: null, countryName: null },
    enrollments,
    certificates: certRows.map((row) => ({
      courseTitle: row.courseTitle,
      courseSlug: row.courseSlug,
      status: row.status,
      visibleToLearner: row.visibleToLearner,
      certificateNumber: row.certificateNumber,
      issuedAt: row.issuedAt.toISOString(),
      scorePercent: row.scorePercent,
    })),
    payments: paymentRows.map((row) => ({
      status: row.status,
      amount: row.amount,
      currency: row.currency,
      paidAt: row.paidAt?.toISOString() ?? null,
      courseTitles: parsePaymentItems(row.items),
    })),
    supportIssues: issueRows.map((row) => ({
      issueToken: row.issueToken,
      status: row.issueStatus,
      category: row.category,
      createdAt: row.createdAt.toISOString(),
    })),
    ...catalog,
    guidance,
  };

  return { ...base, summary: buildSummary(base) };
}
