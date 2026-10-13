import { promises as fs } from "node:fs";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { canonicalCourseSlug } from "@/lib/course-slug-aliases";
import { normalizeIndividualPlans, type ManagedCourse } from "@/lib/content-schema";
import { normalizeLearnerEmail } from "@/lib/learner-email";
import { getManagedCourses } from "@/lib/server/course-catalog";
import { readAdminContent } from "@/lib/server/content-store";
import { recordPurchasesForLearner } from "@/lib/server/record-purchase";
import { queueAdminActivityEmail } from "@/lib/server/admin-activity-email";
import { resolveHomePageConfig } from "@/lib/server/resolve-home-page";

export const IND_PLAN_NOTE_PREFIX = "ind_plan:";

export type IndividualCheckoutPlan = {
  key: string;
  title: string;
  amountInr: number;
  scope: "category" | "all";
  durationMonths: number;
};

export type LearnerSubscription = {
  id: string;
  email: string;
  planKey: string;
  title: string;
  scope: "category" | "all";
  categorySlug?: string;
  categoryTitle?: string;
  startsAt: string;
  expiresAt: string;
  /** Courses this subscription enrolled — only these are removed on expiry/refund. */
  grantedSlugs: string[];
  orderIds: string[];
  endedAt?: string;
};

type StoreFile = { subscriptions: LearnerSubscription[] };

const storePath = path.join(process.cwd(), "data", "learner-subscriptions.json");
let writeChain: Promise<unknown> = Promise.resolve();

async function readStore(): Promise<StoreFile> {
  try {
    const parsed = JSON.parse(await fs.readFile(storePath, "utf8")) as StoreFile;
    return Array.isArray(parsed?.subscriptions) ? parsed : { subscriptions: [] };
  } catch {
    return { subscriptions: [] };
  }
}

/** Serialises read-modify-write so concurrent payments don't overwrite each other. */
function updateStore<T>(fn: (store: StoreFile) => Promise<T> | T): Promise<T> {
  const run = writeChain.then(async () => {
    const store = await readStore();
    const result = await fn(store);
    await fs.mkdir(path.dirname(storePath), { recursive: true });
    await fs.writeFile(storePath, JSON.stringify(store, null, 2), "utf8");
    return result;
  });
  writeChain = run.catch(() => undefined);
  return run;
}

export function isSubscriptionActive(sub: LearnerSubscription, now = Date.now()): boolean {
  return !sub.endedAt && Date.parse(sub.expiresAt) > now;
}

function amountFromPriceLabel(price: string): number | null {
  const n = Number(price.replace(/[^\d.]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Plan definitions come from admin home-page pricing — the browser never supplies the price. */
export async function resolveIndividualPlan(key: string): Promise<IndividualCheckoutPlan | null> {
  const wanted = key.trim();
  if (!wanted) return null;
  const home = await resolveHomePageConfig().catch(() => null);
  const plan = normalizeIndividualPlans(home?.individualPlans).find((p) => p.checkoutKey?.trim() === wanted);
  if (!plan) return null;
  const amountInr = amountFromPriceLabel(plan.price ?? "");
  if (!amountInr) return null;
  return {
    key: wanted,
    title: plan.badge.replace(/^Most Popular\s*·\s*/i, "").trim() || wanted,
    amountInr,
    scope: plan.scope === "category" ? "category" : "all",
    durationMonths: Math.max(1, Math.round(plan.durationMonths ?? 12)),
  };
}

function isSelfPacedPublished(c: ManagedCourse): boolean {
  return c.published !== false && (c.learningFormat?.trim() || "self-paced") === "self-paced";
}

export async function resolvePlanCategory(slug: string): Promise<{ slug: string; title: string } | null> {
  const wanted = slug.trim().toLowerCase();
  if (!wanted) return null;
  const content = await readAdminContent();
  const cat = (content.categories ?? []).find((c) => c.slug?.toLowerCase() === wanted && c.isActive !== false);
  if (!cat) return null;
  const courses = await getManagedCourses().catch(() => [] as ManagedCourse[]);
  if (!courses.some((c) => isSelfPacedPublished(c) && c.category?.toLowerCase() === wanted)) return null;
  return { slug: cat.slug, title: cat.title || cat.slug };
}

async function coursesForSubscription(sub: LearnerSubscription): Promise<{ slug: string; title: string }[]> {
  const courses = await getManagedCourses().catch(() => [] as ManagedCourse[]);
  return courses
    .filter(isSelfPacedPublished)
    .filter((c) => sub.scope === "all" || c.category?.toLowerCase() === sub.categorySlug?.toLowerCase())
    .map((c) => ({ slug: canonicalCourseSlug(c.slug), title: c.title || c.slug }))
    .filter((c) => c.slug);
}

export function indPlanNote(key: string, categorySlug: string | undefined, orderId: string): string {
  return `${IND_PLAN_NOTE_PREFIX}${key}|${categorySlug ?? ""}|${orderId}`;
}

export function indPlanFromNote(
  note: string | null | undefined,
): { key: string; categorySlug?: string; orderId: string } | null {
  const line = (note ?? "").split("\n").find((l) => l.startsWith(IND_PLAN_NOTE_PREFIX));
  if (!line) return null;
  const [key, category, orderId] = line.slice(IND_PLAN_NOTE_PREFIX.length).trim().split("|");
  if (!key || !orderId) return null;
  return { key, categorySlug: category || undefined, orderId };
}

/** After a verified payment: start (or extend) the learner's subscription and enrol the courses. */
export async function activateLearnerSubscription(input: {
  email: string;
  planKey: string;
  categorySlug?: string;
  orderId: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const email = normalizeLearnerEmail(input.email);
  if (!email) return { ok: false, message: "Learner email missing on payment." };
  const plan = await resolveIndividualPlan(input.planKey);
  if (!plan) return { ok: false, message: "This plan is no longer available. Contact support." };
  const category = plan.scope === "category" ? await resolvePlanCategory(input.categorySlug ?? "") : null;
  if (plan.scope === "category" && !category) {
    return { ok: false, message: "The chosen category is no longer available. Contact support." };
  }

  await updateStore((store) => {
    if (store.subscriptions.some((s) => s.orderIds.includes(input.orderId))) return;
    const now = new Date();
    const existing = store.subscriptions.find(
      (s) =>
        s.email === email &&
        s.scope === plan.scope &&
        (plan.scope === "all" || s.categorySlug === category?.slug) &&
        isSubscriptionActive(s),
    );
    if (existing) {
      const end = new Date(existing.expiresAt);
      end.setMonth(end.getMonth() + plan.durationMonths);
      existing.expiresAt = end.toISOString();
      existing.orderIds.push(input.orderId);
      return;
    }
    const end = new Date(now);
    end.setMonth(end.getMonth() + plan.durationMonths);
    store.subscriptions.push({
      id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      email,
      planKey: plan.key,
      title: plan.title,
      scope: plan.scope,
      categorySlug: category?.slug,
      categoryTitle: category?.title,
      startsAt: now.toISOString(),
      expiresAt: end.toISOString(),
      grantedSlugs: [],
      orderIds: [input.orderId],
    });
  });

  await syncLearnerSubscriptions(email);
  return { ok: true };
}

/**
 * Enrol missing courses for active subscriptions and remove subscription-granted
 * courses once a subscription has expired. Safe to call often.
 */
export async function syncLearnerSubscriptions(onlyEmail?: string): Promise<void> {
  const target = onlyEmail ? normalizeLearnerEmail(onlyEmail) : null;
  const snapshot = (await readStore()).subscriptions.filter((s) => !target || s.email === target);
  if (snapshot.length === 0) return;

  const now = Date.now();
  const grants = new Map<string, string[]>();
  const expired: LearnerSubscription[] = [];

  for (const sub of snapshot) {
    if (sub.endedAt) continue;
    if (!isSubscriptionActive(sub, now)) {
      expired.push(sub);
      continue;
    }
    const have = new Set(sub.grantedSlugs);
    const added: { slug: string; title: string }[] = [];
    for (const course of await coursesForSubscription(sub)) {
      if (have.has(course.slug)) continue;
      const res = await recordPurchasesForLearner({
        learnerEmail: sub.email,
        courses: [course],
        skipPurchaseEmail: true,
        skipAdminAlert: true,
      });
      if (res.ok && res.recorded > 0) added.push(course);
    }
    if (added.length) {
      grants.set(sub.id, added.map((c) => c.slug));
      queueAdminActivityEmail({
        kind: "purchase",
        subject: `[Plan] ${sub.email} — ${added.length} course(s) unlocked`,
        title: `${sub.title}${sub.categoryTitle ? ` — ${sub.categoryTitle}` : ""}`,
        detail: added.map((c) => c.title).join(", "),
        lines: { Email: sub.email, "Valid till": sub.expiresAt.slice(0, 10) },
      });
    }
  }

  for (const sub of expired) {
    await revokeSubscriptionCourses(sub, snapshot);
  }

  if (grants.size === 0 && expired.length === 0) return;
  const endedIds = new Set(expired.map((s) => s.id));
  await updateStore((store) => {
    for (const sub of store.subscriptions) {
      const added = grants.get(sub.id);
      if (added) sub.grantedSlugs = [...new Set([...sub.grantedSlugs, ...added])];
      if (endedIds.has(sub.id) && !sub.endedAt) sub.endedAt = new Date().toISOString();
    }
  });
}

async function revokeSubscriptionCourses(sub: LearnerSubscription, all: LearnerSubscription[]): Promise<void> {
  // Courses still covered by another active subscription of the same learner stay enrolled.
  const stillCovered = new Set(
    all.filter((s) => s.id !== sub.id && s.email === sub.email && isSubscriptionActive(s)).flatMap((s) => s.grantedSlugs),
  );
  const slugs = sub.grantedSlugs.filter((slug) => !stillCovered.has(slug));
  if (slugs.length === 0) return;
  await prisma.lmsPurchase.deleteMany({ where: { learnerEmail: sub.email, courseSlug: { in: slugs } } });
}

/** Refund of a plan payment: end that subscription and remove the courses it granted. */
export async function cancelLearnerSubscriptionByOrder(email: string, orderId: string): Promise<void> {
  const target = normalizeLearnerEmail(email);
  const all = (await readStore()).subscriptions;
  const sub = all.find((s) => s.email === target && s.orderIds.includes(orderId));
  if (!sub || sub.endedAt) return;
  if (sub.orderIds.length > 1) {
    const months = (await resolveIndividualPlan(sub.planKey))?.durationMonths ?? 12;
    await updateStore((store) => {
      const row = store.subscriptions.find((s) => s.id === sub.id);
      if (!row) return;
      const end = new Date(row.expiresAt);
      end.setMonth(end.getMonth() - months);
      row.expiresAt = end.toISOString();
      row.orderIds = row.orderIds.filter((id) => id !== orderId);
    });
    await syncLearnerSubscriptions(target);
    return;
  }
  await revokeSubscriptionCourses(sub, all);
  await updateStore((store) => {
    const row = store.subscriptions.find((s) => s.id === sub.id);
    if (row) row.endedAt = new Date().toISOString();
  });
}

let lastFullSweepAt = 0;

/** Expire/refresh every learner's subscriptions at most once an hour (no cron on this server). */
export function maybeSweepAllLearnerSubscriptions(): void {
  const now = Date.now();
  if (now - lastFullSweepAt < 60 * 60 * 1000) return;
  lastFullSweepAt = now;
  void syncLearnerSubscriptions().catch((err) => console.error("[learner-subscriptions] sweep failed", err));
}

export async function listLearnerSubscriptions(email: string): Promise<LearnerSubscription[]> {
  const target = normalizeLearnerEmail(email);
  return (await readStore()).subscriptions.filter((s) => s.email === target);
}
