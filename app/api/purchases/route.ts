import { NextResponse } from "next/server";
import { recordPurchasesForLearner } from "@/lib/server/record-purchase";

export const dynamic = "force-dynamic";

type Body = {
  learnerEmail?: string;
  courses?: { slug?: string; title?: string }[];
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Body;
    const learnerEmail = body.learnerEmail?.trim() ?? "";
    const courses = Array.isArray(body.courses)
      ? body.courses
          .map((c) => ({
            slug: String(c.slug ?? "").trim(),
            title: String(c.title ?? "").trim(),
          }))
          .filter((c) => c.slug)
      : [];

    const result = await recordPurchasesForLearner({ learnerEmail, courses });
    if (!result.ok) {
      return NextResponse.json({ ok: false, message: result.message }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      recorded: result.recorded,
      skipped: result.skipped,
    });
  } catch (err) {
    console.error("[api/purchases]", err);
    return NextResponse.json(
      { ok: false, message: "Could not save enrollment to the database." },
      { status: 503 },
    );
  }
}
