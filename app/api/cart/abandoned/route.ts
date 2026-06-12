import { NextResponse } from "next/server";
import { normalizeLearnerEmail } from "@/lib/learner-email";
import {
  isAbandonedCartViaN8n,
  sendAbandonedCartViaN8n,
  type AbandonedCartLine,
} from "@/lib/server/n8n-abandoned-cart-service";
import { lookupRegistrationByEmail } from "@/lib/server/registration-lookup";

export const dynamic = "force-dynamic";

type Body = {
  email?: string;
  learnerName?: string;
  accountType?: string;
  items?: AbandonedCartLine[];
  trigger?: "timer" | "leave" | "manual";
};

export async function POST(request: Request) {
  if (!isAbandonedCartViaN8n()) {
    return NextResponse.json(
      { ok: false, message: "N8N_ABANDONED_CART_WEBHOOK_URL is not configured." },
      { status: 503 },
    );
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON" }, { status: 400 });
  }

  const email = normalizeLearnerEmail(body.email ?? "");
  if (!email) {
    return NextResponse.json({ ok: false, message: "Learner email is required." }, { status: 400 });
  }

  const items = Array.isArray(body.items) ? body.items : [];
  if (items.length === 0) {
    return NextResponse.json({ ok: false, message: "Cart is empty." }, { status: 400 });
  }

  const registration = await lookupRegistrationByEmail(email).catch(() => null);
  const learnerName =
    body.learnerName?.trim() ||
    registration?.name?.trim() ||
    null;

  const accountType = body.accountType?.trim() || registration?.accountType || "individual";

  const result = await sendAbandonedCartViaN8n({
    email,
    learnerName,
    items,
    trigger: body.trigger,
    accountType,
  });

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, message: result.message ?? "Webhook failed" },
      { status: 502 },
    );
  }

  return NextResponse.json({
    ok: true,
    message: "Abandoned cart sent to n8n (GET).",
    method: "GET",
    accountType,
  });
}
