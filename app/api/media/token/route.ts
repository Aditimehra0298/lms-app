import { NextResponse } from "next/server";
import { mediaAccessAllowed } from "@/lib/server/media-access-policy";
import { createMediaAccessToken, verifyMediaAccessToken } from "@/lib/server/media-access-token";
import { readAdminSessionEmail } from "@/lib/server/admin-session";
import { readLearnerSessionEmail } from "@/lib/server/learner-session";
import {
  isManagedLocalMediaUrl,
  protectedMediaServePath,
  storageFileNameFromUrl,
} from "@/lib/server/private-media-storage";

export const dynamic = "force-dynamic";

type Body = {
  url?: string;
  courseSlug?: string;
  email?: string;
  scope?: "admin" | "learner" | "catalog";
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Body;
    const url = body.url?.trim();
    if (!url) {
      return NextResponse.json({ ok: false, error: "Missing url" }, { status: 400 });
    }

    const sessionAdmin = readAdminSessionEmail(request);
    const sessionLearner = readLearnerSessionEmail(request);

    if (!isManagedLocalMediaUrl(url) && !url.startsWith("/api/media/serve/")) {
      let scope =
        body.scope ??
        (body.courseSlug?.trim() ? "learner" : sessionAdmin ? "admin" : "catalog");
      if (scope === "admin" && !sessionAdmin) {
        return NextResponse.json({ ok: false, error: "Admin session required" }, { status: 403 });
      }
      if (scope === "learner") {
        const looksVideo =
          /\.(mp4|webm|mov|m4v|mkv)(\?|#|$)/i.test(url) ||
          /youtube\.com|youtu\.be|vimeo\.com|wistia\.|loom\.com/i.test(url);
        if (looksVideo) {
          return NextResponse.json(
            { ok: false, error: "External video URLs are blocked for learners. Upload to protected storage." },
            { status: 403 },
          );
        }
      }
      return NextResponse.json({ ok: true, playUrl: url });
    }

    const fileName = storageFileNameFromUrl(url) ?? fileNameFromServe(url);
    if (!fileName) {
      return NextResponse.json({ ok: false, error: "Invalid media url" }, { status: 400 });
    }

    void body.email; // never trust client email for media access
    let scope = body.scope;
    if (!scope) {
      if (sessionAdmin) scope = "admin";
      else if (body.courseSlug?.trim()) scope = "learner";
      else scope = "catalog";
    }

    if (scope === "admin") {
      if (!sessionAdmin) {
        return NextResponse.json({ ok: false, error: "Admin session required" }, { status: 403 });
      }
    }

    if (scope === "learner" && !sessionLearner && !sessionAdmin) {
      return NextResponse.json({ ok: false, error: "Sign in required" }, { status: 401 });
    }

    const email =
      scope === "admin"
        ? sessionAdmin!
        : scope === "learner"
          ? sessionLearner || sessionAdmin || ""
          : sessionLearner || "";

    const adminTtl = Number(process.env.MEDIA_TOKEN_TTL_ADMIN_SECONDS || "");
    const learnerTtl = Number(process.env.MEDIA_TOKEN_TTL_LEARNER_SECONDS || "");
    const catalogTtl = Number(process.env.MEDIA_TOKEN_TTL_CATALOG_SECONDS || "");
    const ttlSeconds =
      scope === "admin"
        ? Number.isFinite(adminTtl) && adminTtl > 0
          ? adminTtl
          : 60 * 60
        : scope === "catalog"
          ? Number.isFinite(catalogTtl) && catalogTtl > 0
            ? catalogTtl
            : 10 * 60
          : Number.isFinite(learnerTtl) && learnerTtl > 0
            ? learnerTtl
            : 3 * 60;

    const token = createMediaAccessToken({
      f: fileName,
      scope,
      course: body.courseSlug?.trim(),
      email: email || undefined,
      ttlSeconds,
    });

    const payload = verifyMediaAccessToken(token);
    if (!payload) {
      return NextResponse.json({ ok: false, error: "Token error" }, { status: 500 });
    }

    const allowed = await mediaAccessAllowed(payload, email || undefined);
    if (!allowed) {
      return NextResponse.json({ ok: false, error: "Access denied" }, { status: 403 });
    }

    // Identity is baked into the signed token — do not append spoofable ?email=.
    const playUrl = `${protectedMediaServePath(fileName)}?t=${encodeURIComponent(token)}`;

    return NextResponse.json({ ok: true, playUrl });
  } catch (e) {
    console.error("[media/token]", e);
    return NextResponse.json({ ok: false, error: "Could not issue media token." }, { status: 500 });
  }
}

function fileNameFromServe(url: string): string | null {
  const m = url.match(/^\/api\/media\/serve\/([^?]+)/);
  if (!m) return null;
  try {
    const name = decodeURIComponent(m[1]!);
    return name.includes("..") ? null : name;
  } catch {
    return null;
  }
}
