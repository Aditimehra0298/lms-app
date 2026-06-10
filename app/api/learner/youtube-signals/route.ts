import { NextResponse } from "next/server";
import { fetchYoutubeRecommendationSignals } from "@/lib/server/youtube-recommendation-signals";
import { mergeYoutubeIntoGoogleSignals } from "@/lib/google-account-recommendation-signals";

export const dynamic = "force-dynamic";

type Body = {
  accessToken?: string;
  email?: string;
  existingSignals?: Record<string, unknown>;
};

export async function POST(request: Request) {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  if (!clientId) {
    return NextResponse.json(
      { ok: false, message: "Google is not configured on this server." },
      { status: 503 },
    );
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON" }, { status: 400 });
  }

  const accessToken = body.accessToken?.trim();
  if (!accessToken) {
    return NextResponse.json({ ok: false, message: "Missing YouTube access token" }, { status: 400 });
  }

  try {
    const youtube = await fetchYoutubeRecommendationSignals(accessToken);
    const email = body.email?.trim().toLowerCase() ?? "";
    const merged = mergeYoutubeIntoGoogleSignals({
      email,
      existing: body.existingSignals ?? null,
      youtube,
    });

    return NextResponse.json({
      ok: true,
      youtube,
      googleRecommendationSignals: merged,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not read YouTube activity";
    return NextResponse.json({ ok: false, message }, { status: 502 });
  }
}
