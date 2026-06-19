import {
  cartFingerprint,
  readCartItems,
  type CartLineItem,
} from "@/lib/cart-client";
import { getLearnerEmail, isLearnerLoggedIn } from "@/lib/learner-session-client";
import { readJsonResponse } from "@/lib/safe-json";

const SENT_KEY = "sft_abandoned_cart_sent";
const COOLDOWN_MS = 24 * 60 * 60 * 1000;

type SentRecord = {
  fingerprint: string;
  sentAt: number;
};

function readSent(): SentRecord | null {
  try {
    const raw = window.localStorage.getItem(SENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SentRecord;
    if (!parsed?.fingerprint || typeof parsed.sentAt !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeSent(fingerprint: string) {
  const record: SentRecord = { fingerprint, sentAt: Date.now() };
  window.localStorage.setItem(SENT_KEY, JSON.stringify(record));
}

function shouldSkipSend(fingerprint: string): boolean {
  const prev = readSent();
  if (!prev) return false;
  if (prev.fingerprint !== fingerprint) return false;
  return Date.now() - prev.sentAt < COOLDOWN_MS;
}

function learnerDisplayName(email: string): string {
  try {
    const name = window.localStorage.getItem("sft_learner_name")?.trim();
    if (name) return name;
  } catch {
    /* ignore */
  }
  const local = email.split("@")[0] ?? "Learner";
  return local.replace(/[._-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function clearAbandonedCartSentFlag() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(SENT_KEY);
}

/** Notify n8n that learner left items in cart (deduped per cart + 24h). */
export async function notifyAbandonedCart(
  trigger: "timer" | "leave" | "manual" = "timer",
): Promise<{ ok: boolean; skipped?: boolean; message?: string }> {
  if (typeof window === "undefined") return { ok: false, message: "Not in browser" };

  const items = readCartItems();
  if (items.length === 0) {
    clearAbandonedCartSentFlag();
    return { ok: false, skipped: true, message: "Cart empty" };
  }

  if (!isLearnerLoggedIn()) {
    return { ok: false, skipped: true, message: "Not signed in" };
  }

  const email = getLearnerEmail()?.trim().toLowerCase() ?? "";
  if (!email) {
    return { ok: false, skipped: true, message: "No email" };
  }

  const fingerprint = cartFingerprint(items);
  if (shouldSkipSend(fingerprint)) {
    return { ok: true, skipped: true, message: "Already sent for this cart" };
  }

  let accountType: string | undefined;
  try {
    accountType = window.localStorage.getItem("sft_account_type")?.trim() || undefined;
  } catch {
    accountType = undefined;
  }

  const body = {
    email,
    learnerName: learnerDisplayName(email),
    accountType,
    items: items.map((row: CartLineItem) => ({
      slug: row.slug,
      title: row.title,
      price: row.price,
      qty: row.qty,
      image: row.image,
      deliveryKind: row.deliveryKind,
    })),
    trigger,
  };

  try {
    const res = await fetch("/api/cart/abandoned", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      keepalive: trigger === "leave",
    });
    const data = await readJsonResponse(res, {} as { ok?: boolean; message?: string });
    if (!res.ok || !data.ok) {
      return { ok: false, message: data.message ?? "Request failed" };
    }
    writeSent(fingerprint);
    return { ok: true };
  } catch {
    return { ok: false, message: "Network error" };
  }
}

export function abandonedCartDelayMs(): number {
  const minutes = Number(process.env.NEXT_PUBLIC_ABANDONED_CART_DELAY_MINUTES ?? "");
  if (Number.isFinite(minutes) && minutes > 0) return minutes * 60 * 1000;
  return 30 * 60 * 1000;
}
