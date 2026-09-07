import { stat } from "node:fs/promises";
import { createReadStream } from "node:fs";
import { NextResponse } from "next/server";
import { Readable } from "node:stream";
import { mediaAccessAllowed } from "@/lib/server/media-access-policy";
import { verifyMediaAccessToken } from "@/lib/server/media-access-token";
import { learnerMediaStreamAllowed, parseByteRange } from "@/lib/server/media-request-guard";
import { readAdminSessionEmail } from "@/lib/server/admin-session";
import {
  mimeFromFileName,
  resolveMediaFilePath,
} from "@/lib/server/private-media-storage";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ fileName: string }> };

function contentDisposition(fileName: string, forceDownload: boolean): string {
  const safe = fileName.replace(/["\r\n]/g, "_");
  const encoded = encodeURIComponent(safe);
  const type = forceDownload ? "attachment" : "inline";
  return `${type}; filename="${safe}"; filename*=UTF-8''${encoded}`;
}

function mediaHeaders(
  mime: string,
  fileName: string,
  forceDownload: boolean,
  extra: Record<string, string> = {},
): Record<string, string> {
  const isVideo = mime.startsWith("video/");
  const isAudio = mime.startsWith("audio/");
  return {
    "Cache-Control": "private, no-store, max-age=0, must-revalidate",
    Pragma: "no-cache",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    "X-Robots-Tag": "noindex, noarchive, nosnippet, noimageindex",
    "Cross-Origin-Resource-Policy": "same-site",
    // Allow PDF/audio to open in the browser tab; keep videos non-embeddable.
    ...(isVideo ? { "X-Frame-Options": "DENY" } : {}),
    "Content-Disposition": contentDisposition(fileName, forceDownload),
    ...(isVideo || isAudio ? { "Accept-Ranges": "bytes" } : { "Accept-Ranges": "bytes" }),
    ...extra,
  };
}

export async function GET(request: Request, { params }: Params) {
  const { fileName: raw } = await params;
  let fileName: string;
  try {
    fileName = decodeURIComponent(raw);
  } catch {
    return NextResponse.json({ error: "Invalid file" }, { status: 400 });
  }

  if (!fileName || fileName.includes("..") || fileName.includes("/")) {
    return NextResponse.json({ error: "Invalid file" }, { status: 400 });
  }

  const requestUrl = new URL(request.url);
  const token = requestUrl.searchParams.get("t")?.trim();
  const wantsDownload =
    requestUrl.searchParams.get("download") === "1" ||
    requestUrl.searchParams.get("dl") === "1";

  if (!token) {
    return NextResponse.json({ error: "Missing access token" }, { status: 401 });
  }

  const payload = verifyMediaAccessToken(token);
  if (!payload || payload.f !== fileName) {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
  }

  const filePathEarly = await resolveMediaFilePath(fileName);
  const mimeEarly = filePathEarly ? mimeFromFileName(fileName) : "application/octet-stream";
  const isVideo = mimeEarly.startsWith("video/");
  const isAudio = mimeEarly.startsWith("audio/");
  // Podcast / audio: stream inline only — never force a file download.
  const forceDownload = wantsDownload && !isAudio && !isVideo;

  const fetchDest = request.headers.get("sec-fetch-dest")?.trim().toLowerCase();
  if (payload.scope === "learner" && fetchDest === "document" && (isVideo || isAudio)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (
    payload.scope === "learner" &&
    !learnerMediaStreamAllowed(request, { allowDocument: !isVideo && !isAudio })
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Admin-scoped media: identity from signed httpOnly admin session only (never ?email= / x-learner-email).
  let requestEmail: string | undefined;
  if (payload.scope === "admin") {
    const sessionEmail = readAdminSessionEmail(request);
    if (!sessionEmail) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    requestEmail = sessionEmail;
  } else {
    requestEmail =
      requestUrl.searchParams.get("email")?.trim().toLowerCase() ||
      request.headers.get("x-learner-email")?.trim().toLowerCase() ||
      undefined;
  }
  if (payload.email && !requestEmail) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (payload.email && requestEmail && payload.email !== requestEmail) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const allowed = await mediaAccessAllowed(payload, requestEmail);
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const filePath = filePathEarly;
  if (!filePath) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const info = await stat(filePath);
  const mime = mimeEarly;
  const range = parseByteRange(request.headers.get("range"), info.size);

  if (range) {
    const { start, end } = range;
    const stream = createReadStream(filePath, { start, end });
    return new Response(Readable.toWeb(stream) as ReadableStream, {
      status: 206,
      headers: mediaHeaders(mime, fileName, forceDownload, {
        "Content-Type": mime,
        "Content-Length": String(end - start + 1),
        "Content-Range": `bytes ${start}-${end}/${info.size}`,
      }),
    });
  }

  const stream = createReadStream(filePath);
  return new Response(Readable.toWeb(stream) as ReadableStream, {
    status: 200,
    headers: mediaHeaders(mime, fileName, forceDownload, {
      "Content-Type": mime,
      "Content-Length": String(info.size),
    }),
  });
}
