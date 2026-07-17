import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { isRazorpayConfigured } from "@/lib/server/razorpay-config";
import { getMainAdminEmail } from "@/lib/server/admin-emails";
import { isAdminPasswordConfigured } from "@/lib/server/admin-password";
import { readAdminPanelSettings } from "@/lib/server/admin-panel-settings";

const storePath = path.join(process.cwd(), "data", "admin-system-notifications.json");
const MAX_ITEMS = 80;

export type AdminNotificationSeverity = "critical" | "warning" | "info";

export type AdminSystemNotification = {
  id: string;
  /** Stable key so the same issue is not duplicated every poll. */
  dedupeKey: string;
  title: string;
  detail: string;
  severity: AdminNotificationSeverity;
  source: string;
  createdAt: string;
  readAt: string | null;
  /** Optional admin panel deep-link hint (menu name). */
  panelHint?: string | null;
};

type Store = {
  items: AdminSystemNotification[];
};

async function ensureFile(): Promise<void> {
  const dir = path.dirname(storePath);
  await fs.mkdir(dir, { recursive: true });
  try {
    await fs.access(storePath);
  } catch {
    await fs.writeFile(storePath, JSON.stringify({ items: [] } satisfies Store, null, 2), "utf8");
  }
}

async function readStore(): Promise<Store> {
  await ensureFile();
  try {
    const raw = await fs.readFile(storePath, "utf8");
    const parsed = JSON.parse(raw) as Partial<Store>;
    return { items: Array.isArray(parsed.items) ? parsed.items : [] };
  } catch {
    return { items: [] };
  }
}

async function writeStore(store: Store): Promise<void> {
  await ensureFile();
  await fs.writeFile(storePath, JSON.stringify(store, null, 2), "utf8");
}

export async function listAdminNotifications(): Promise<AdminSystemNotification[]> {
  const store = await readStore();
  return [...store.items].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/**
 * Record a server / platform issue for the admin bell.
 * Reuses an existing unread item with the same dedupeKey (refreshes detail/time).
 */
export async function pushAdminNotification(input: {
  dedupeKey: string;
  title: string;
  detail: string;
  severity?: AdminNotificationSeverity;
  source?: string;
  panelHint?: string | null;
}): Promise<AdminSystemNotification> {
  const store = await readStore();
  const now = new Date().toISOString();
  const key = input.dedupeKey.trim().slice(0, 120);
  const existing = store.items.find((n) => n.dedupeKey === key && !n.readAt);

  if (existing) {
    existing.title = input.title.trim().slice(0, 120);
    existing.detail = input.detail.trim().slice(0, 500);
    existing.severity = input.severity ?? existing.severity;
    existing.source = input.source?.trim() || existing.source;
    existing.panelHint = input.panelHint ?? existing.panelHint;
    existing.createdAt = now;
    await writeStore({ items: store.items.slice(0, MAX_ITEMS) });
    return existing;
  }

  const item: AdminSystemNotification = {
    id: randomUUID(),
    dedupeKey: key,
    title: input.title.trim().slice(0, 120),
    detail: input.detail.trim().slice(0, 500),
    severity: input.severity ?? "warning",
    source: input.source?.trim() || "system",
    createdAt: now,
    readAt: null,
    panelHint: input.panelHint ?? null,
  };

  store.items.unshift(item);
  await writeStore({ items: store.items.slice(0, MAX_ITEMS) });
  return item;
}

export async function markAdminNotificationsRead(ids?: string[]): Promise<number> {
  const store = await readStore();
  const now = new Date().toISOString();
  let count = 0;
  for (const item of store.items) {
    if (item.readAt) continue;
    if (ids && ids.length > 0 && !ids.includes(item.id)) continue;
    item.readAt = now;
    count += 1;
  }
  await writeStore(store);
  return count;
}

export async function clearAdminNotifications(options?: { readOnly?: boolean }): Promise<number> {
  const store = await readStore();
  const before = store.items.length;
  store.items = options?.readOnly ? store.items.filter((n) => !n.readAt) : [];
  await writeStore(store);
  return before - store.items.length;
}

type Probe = {
  dedupeKey: string;
  title: string;
  detail: string;
  severity: AdminNotificationSeverity;
  source: string;
  panelHint?: string;
  ok: boolean;
};

/** Scan platform health and push notifications for problems. */
export async function scanAdminSystemHealth(): Promise<{
  scannedAt: string;
  issuesFound: number;
  probes: { id: string; ok: boolean; label: string }[];
}> {
  const probes: Probe[] = [];

  // Database
  let dbOk = false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbOk = true;
  } catch {
    dbOk = false;
  }
  probes.push({
    dedupeKey: "health:database",
    title: "Database connection problem",
    detail:
      "The learner and payment database did not respond. Sign-ins, enrollments, and orders may fail until this is fixed.",
    severity: "critical",
    source: "database",
    panelHint: "Settings",
    ok: dbOk,
  });

  // Admin lock
  const main = getMainAdminEmail();
  probes.push({
    dedupeKey: "health:main-admin",
    title: "Main administrator not set",
    detail: "No main admin email is configured. The admin panel is not locked to a specific account.",
    severity: "critical",
    source: "security",
    panelHint: "Settings",
    ok: Boolean(main),
  });

  // Admin password
  const panelSettings = await readAdminPanelSettings();
  const passwordOk = !panelSettings.requirePanelPassword || (await isAdminPasswordConfigured());
  probes.push({
    dedupeKey: "health:admin-password",
    title: "Admin panel password not set",
    detail: "Set an admin password in Settings so only you can open the control panel.",
    severity: "warning",
    source: "security",
    panelHint: "Settings",
    ok: passwordOk,
  });

  // Payments
  const paymentsReady = isRazorpayConfigured();
  probes.push({
    dedupeKey: "health:payments",
    title: "Online payments unavailable",
    detail: "Checkout cannot collect money online until payment setup is completed by your technical team.",
    severity: "warning",
    source: "payments",
    panelHint: "Payments",
    ok: paymentsReady,
  });

  if (dbOk) {
    try {
      const since = new Date();
      since.setHours(since.getHours() - 24);
      const [failed24h, pending] = await Promise.all([
        prisma.lmsPayment.count({
          where: { status: "failed", createdAt: { gte: since } },
        }),
        prisma.lmsPayment.count({ where: { status: "pending" } }),
      ]);

      probes.push({
        dedupeKey: "health:failed-payments-24h",
        title: "Failed payments in the last 24 hours",
        detail: `${failed24h} payment(s) failed. Review Refunds / Payments to see who was affected.`,
        severity: failed24h >= 5 ? "critical" : "warning",
        source: "payments",
        panelHint: "Payments",
        ok: failed24h === 0,
      });

      probes.push({
        dedupeKey: "health:pending-payments",
        title: "Checkouts still waiting",
        detail: `${pending} checkout(s) are still waiting. Learners may be stuck between pay and access.`,
        severity: pending >= 25 ? "critical" : "warning",
        source: "payments",
        panelHint: "Orders",
        ok: pending < 10,
      });
    } catch {
      /* already covered by db probe */
    }
  }

  // Email (OTP) — only flag when SMTP is partly configured
  const smtpHost = Boolean(process.env.SMTP_HOST?.trim());
  const smtpUser = Boolean(process.env.SMTP_USER?.trim());
  const smtpPass = Boolean(process.env.SMTP_PASS?.trim());
  const smtpPartial = smtpHost || smtpUser || smtpPass;
  const smtpComplete = smtpHost && smtpUser && smtpPass;
  probes.push({
    dedupeKey: "health:email-smtp",
    title: "Email setup incomplete",
    detail:
      "Verification codes may not reach your inbox because email sending is only partly configured.",
    severity: "warning",
    source: "email",
    panelHint: "Settings",
    ok: !smtpPartial || smtpComplete,
  });

  let issuesFound = 0;
  for (const probe of probes) {
    if (probe.ok) continue;
    issuesFound += 1;
    await pushAdminNotification({
      dedupeKey: probe.dedupeKey,
      title: probe.title,
      detail: probe.detail,
      severity: probe.severity,
      source: probe.source,
      panelHint: probe.panelHint,
    });
  }

  return {
    scannedAt: new Date().toISOString(),
    issuesFound,
    probes: probes.map((p) => ({
      id: p.dedupeKey,
      ok: p.ok,
      label: p.title,
    })),
  };
}
