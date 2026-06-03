import { stat } from "node:fs/promises";
import { createReadStream } from "node:fs";
import { NextResponse } from "next/server";
import { Readable } from "node:stream";
import { mediaAccessAllowed } from "@/lib/server/media-access-policy";
import { verifyMediaAccessToken } from "@/lib/server/media-access-token";
import { learnerMediaStreamAllowed, parseByteRange } from "@/lib/server/media-request-guard";
import {
  mimeFromFileName,
  resolveMediaFilePath,
} from "@/lib/server/private-media-storage";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ fileName: string }> };

function secureVideoHeaders(mime: string, extra: Record<string, string> = {}): Record<string, string> {
  const isVideo = mime.startsWith("video/");
  return {
    "Cache-Control": "private, no-store, max-age=0, must-revalidate",
    "Pragma": "no-cache",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    "X-Robots-Tag": "noindex, noarchive, nosnippet, noimageindex",
    "Cross-Origin-Resource-Policy": "same-site",
    "X-Frame-Options": "DENY",
    ...(isVideo
      ? {
          "Content-Disposition": "inline",
          "Accept-Ranges": "bytes",
        }
      : {
          "Content-Disposition": "inline",
        }),
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

  const token = new URL(request.url).searchParams.get("t")?.trim();
  if (!token) {
    return NextResponse.json({ error: "Missing access token" }, { status: 401 });
  }

  const payload = verifyMediaAccessToken(token);
  if (!payload || payload.f !== fileName) {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
  }

  const fetchDest = request.headers.get("sec-fetch-dest")?.trim().toLowerCase();
  if (payload.scope === "learner" && fetchDest === "document") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (payload.scope === "learner" && !learnerMediaStreamAllowed(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const requestEmail =
    new URL(request.url).searchParams.get("email")?.trim().toLowerCase() ||
    request.headers.get("x-learner-email")?.trim().toLowerCase();
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

  const filePath = await resolveMediaFilePath(fileName);
  if (!filePath) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const info = await stat(filePath);
  const mime = mimeFromFileName(fileName);
  const range = parseByteRange(request.headers.get("range"), info.size);

  if (range) {
    const { start, end } = range;
    const stream = createReadStream(filePath, { start, end });
    return new Response(Readable.toWeb(stream) as ReadableStream, {
      status: 206,
      headers: secureVideoHeaders(mime, {
        "Content-Type": mime,
        "Content-Length": String(end - start + 1),
        "Content-Range": `bytes ${start}-${end}/${info.size}`,
      }),
    });
  }

  const stream = createReadStream(filePath);
  return new Response(Readable.toWeb(stream) as ReadableStream, {
    status: 200,
    headers: secureVideoHeaders(mime, {
      "Content-Type": mime,
      "Content-Length": String(info.size),
    }),
  });
}
