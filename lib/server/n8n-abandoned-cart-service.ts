import { emailAppName, emailAppUrl, emailLogoUrl, emailShortBrand } from "@/lib/email-brand-config";
import { buildN8nWebhookAuthHeaders, n8nWebhookAuthHint } from "@/lib/server/n8n-webhook-auth";

export type AbandonedCartLine = {
  slug: string;
  title: string;
  price: string;
  qty: number;
  image?: string;
  deliveryKind?: string;
};

export type AbandonedCartN8nInput = {
  email: string;
  learnerName?: string | null;
  items: AbandonedCartLine[];
  trigger?: "timer" | "leave" | "manual";
  accountType?: string | null;
};

function abandonedCartGetUrl(baseUrl: string, payload: Record<string, unknown>): string {
  const params = new URLSearchParams();
  params.set("event", String(payload.event ?? "abandoned_cart"));
  params.set("source", String(payload.source ?? "lms"));
  params.set("accountType", String(payload.accountType ?? "individual"));
  params.set("email", String(payload.email ?? ""));
  params.set("learnerName", String(payload.learnerName ?? ""));
  params.set("trigger", String(payload.trigger ?? "timer"));
  params.set("abandonedAt", String(payload.abandonedAt ?? ""));
  params.set("items", JSON.stringify(payload.items ?? []));
  params.set("cartSummary", JSON.stringify(payload.cartSummary ?? {}));
  params.set("brand", JSON.stringify(payload.brand ?? {}));
  params.set("links", JSON.stringify(payload.links ?? {}));
  params.set("emailContent", JSON.stringify(payload.emailContent ?? {}));
  const joiner = baseUrl.includes("?") ? "&" : "?";
  return `${baseUrl}${joiner}${params.toString()}`;
}

function abandonedCartWebhookUrl(): string | null {
  return process.env.N8N_ABANDONED_CART_WEBHOOK_URL?.trim() || null;
}

export function isAbandonedCartViaN8n(): boolean {
  return Boolean(abandonedCartWebhookUrl());
}

/** GET cart snapshot to n8n (query params) → workflow sends recovery email. */
export async function sendAbandonedCartViaN8n(
  input: AbandonedCartN8nInput,
): Promise<{ ok: boolean; message?: string }> {
  const url = abandonedCartWebhookUrl();
  if (!url) {
    return { ok: false, message: "N8N_ABANDONED_CART_WEBHOOK_URL is not configured." };
  }

  const email = input.email.trim().toLowerCase();
  if (!email) {
    return { ok: false, message: "Learner email is required." };
  }

  const items = input.items.filter((i) => i.slug?.trim());
  if (items.length === 0) {
    return { ok: false, message: "Cart is empty." };
  }

  const appName = emailAppName();
  const shortBrand = emailShortBrand();
  const appUrl = emailAppUrl().replace(/\/$/, "");
  const logoUrl = emailLogoUrl();

  const subtotal = items.reduce((sum, row) => {
    const n = Number(String(row.price).replace(/[^0-9.]/g, ""));
    return sum + (Number.isFinite(n) ? n : 0) * Math.max(1, row.qty);
  }, 0);
  const discount = items.length >= 2 ? subtotal * 0.1 : 0;
  const total = subtotal - discount;

  const learnerName =
    input.learnerName?.trim() || email.split("@")[0].replace(/[._-]+/g, " ").trim() || "Learner";

  const accountType = input.accountType?.trim().toLowerCase() || "individual";

  const payload = {
    event: "abandoned_cart",
    source: "lms",
    accountType,
    email,
    learnerName,
    trigger: input.trigger ?? "timer",
    abandonedAt: new Date().toISOString(),
    items: items.map((row) => ({
      slug: row.slug,
      title: row.title,
      price: row.price,
      qty: row.qty,
      image: row.image ?? null,
      deliveryKind: row.deliveryKind ?? null,
    })),
    cartSummary: {
      itemCount: items.length,
      subtotal: subtotal.toFixed(2),
      discount: discount.toFixed(2),
      total: total.toFixed(2),
      currency: "USD",
    },
    brand: {
      appName,
      shortBrand,
      appUrl,
      logoUrl: logoUrl ?? null,
    },
    links: {
      cart: `${appUrl}/cart`,
      cartUrl: `${appUrl}/cart`,
      checkout: `${appUrl}/checkout`,
      checkoutUrl: `${appUrl}/checkout`,
      courses: `${appUrl}/courses`,
      exploreCourses: `${appUrl}/courses`,
      account: `${appUrl}/account`,
    },
    emailContent: {
      subject: `Complete your ${appName} order — items still in your cart`,
      previewText: `${learnerName}, you left ${items.length} course(s) in your cart.`,
    },
  };

  try {
    const res = await fetch(abandonedCartGetUrl(url, payload), {
      method: "GET",
      headers: buildN8nWebhookAuthHeaders(),
    });

    if (!res.ok) {
      const hint = (await res.text()).slice(0, 300);
      const authHint =
        res.status === 401 || res.status === 403
          ? n8nWebhookAuthHint()
          : "Check workflow is active.";
      return {
        ok: false,
        message: `n8n abandoned-cart webhook returned ${res.status}. ${hint || authHint}`,
      };
    }

    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "n8n abandoned-cart request failed";
    return { ok: false, message };
  }
}
