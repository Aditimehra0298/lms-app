import { NextResponse } from "next/server";
import { isAdminEmail } from "@/lib/server/admin-emails";
import { mediaAccessAllowed } from "@/lib/server/media-access-policy";
import { createMediaAccessToken, verifyMediaAccessToken } from "@/lib/server/media-access-token";
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

    if (!isManagedLocalMediaUrl(url) && !url.startsWith("/api/media/serve/")) {
      return NextResponse.json({ ok: true, playUrl: url });
    }

    const fileName = storageFileNameFromUrl(url) ?? fileNameFromServe(url);
    if (!fileName) {
      return NextResponse.json({ ok: false, error: "Invalid media url" }, { status: 400 });
    }

    const email = body.email?.trim().toLowerCase() ?? "";
    let scope = body.scope;
    if (!scope) {
      if (email && isAdminEmail(email)) scope = "admin";
      else if (body.courseSlug?.trim()) scope = "learner";
      else scope = "catalog";
    }

    const token = createMediaAccessToken({
      f: fileName,
      scope,
      course: body.courseSlug?.trim(),
      email: email || undefined,
      ttlSeconds: scope === "admin" ? 60 * 60 * 24 * 7 : 60 * 60 * 4,
    });

    const payload = verifyMediaAccessToken(token);
    if (!payload) {
      return NextResponse.json({ ok: false, error: "Token error" }, { status: 500 });
    }

    const allowed = await mediaAccessAllowed(payload, email);
    if (!allowed) {
      return NextResponse.json({ ok: false, error: "Access denied" }, { status: 403 });
    }

    const playUrl = `${protectedMediaServePath(fileName)}?t=${encodeURIComponent(token)}${
      email ? `&email=${encodeURIComponent(email)}` : ""
    }`;

    return NextResponse.json({ ok: true, playUrl });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Token failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

function fileNameFromServe(url: string): string | null {
  const m = url.match(/^\/api\/media\/serve\/([^?]+)/);
  if (!m) return null;
  try {
    const name = decodeURIComponent(m[1]);
    return name.includes("..") ? null : name;
  } catch {
    return null;
  }
}
