import { NextResponse } from "next/server";
import { normalizeLearnerEmail } from "@/lib/learner-email";
import { getPurchasesForLearner } from "@/lib/server/get-learner-purchases";
import { recordPurchasesForLearner } from "@/lib/server/record-purchase";

export const dynamic = "force-dynamic";

type Body = {
  learnerEmail?: string;
  courses?: { slug?: string; title?: string }[];
};

export async function GET(request: Request) {
  const email = normalizeLearnerEmail(
    new URL(request.url).searchParams.get("email")?.trim() ?? "",
  );
  if (!email) {
    return NextResponse.json({ ok: false, message: "email query required" }, { status: 400 });
  }

  try {
    const courses = await getPurchasesForLearner(email);
    return NextResponse.json({ ok: true, courses });
  } catch (err) {
    console.error("[api/purchases GET]", err);
    return NextResponse.json(
      { ok: false, message: "Could not load enrollments from the database." },
      { status: 503 },
    );
  }
}

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
