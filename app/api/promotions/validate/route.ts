import { NextResponse } from "next/server";
import { parseStoredPriceString } from "@/lib/country-pricing";
import { computePromotionDiscount, defaultPromotions, sanitizePromotions } from "@/lib/promotions";
import { readAdminContentFromDisk } from "@/lib/server/content-store";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      code?: string;
      slugs?: string[];
      subtotal?: number;
      currency?: string;
    };
    const content = await readAdminContentFromDisk();
    const promotions = content.promotions
      ? sanitizePromotions(content.promotions)
      : defaultPromotions;
    const slugs = Array.isArray(body.slugs) ? body.slugs.map((s) => String(s).trim()).filter(Boolean) : [];
    const subtotal = Number(body.subtotal);
    if (!Number.isFinite(subtotal) || subtotal < 0) {
      return NextResponse.json({ ok: false, error: "Invalid subtotal" }, { status: 400 });
    }

    let baseFloor = 0;
    for (const slug of slugs) {
      const course = (content.managedCourses ?? []).find((c) => c.slug === slug);
      if (!course) continue;
      const regional = course.regionalPrices?.find(
        (r) => r.countryCode.toUpperCase() === (body.currency === "INR" ? "IN" : ""),
      );
      const raw = regional?.basePrice || course.basePrice || "";
      const n = parseStoredPriceString(raw);
      if (n != null) baseFloor += n;
    }

    const result = computePromotionDiscount({
      promotions,
      code: body.code ?? "",
      slugs,
      subtotal,
      checkoutCurrency: (body.currency ?? "INR").toUpperCase(),
      baseFloor: baseFloor > 0 ? baseFloor : undefined,
    });
    return NextResponse.json(result);
  } catch (err) {
    console.error("[promotions/validate]", err);
    return NextResponse.json({ ok: false, error: "Validate failed" }, { status: 500 });
  }
}
