import { stat } from "node:fs/promises";
import { NextResponse } from "next/server";
import { mediaAccessAllowed } from "@/lib/server/media-access-policy";
import { verifyMediaAccessToken } from "@/lib/server/media-access-token";
import {
  mimeFromFileName,
  openMediaReadStream,
  resolveMediaFilePath,
} from "@/lib/server/private-media-storage";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ fileName: string }> };

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

  const requestEmail = new URL(request.url).searchParams.get("email")?.trim().toLowerCase();
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
  const stream = openMediaReadStream(filePath);

  return new Response(stream as unknown as ReadableStream, {
    status: 200,
    headers: {
      "Content-Type": mime,
      "Content-Length": String(info.size),
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
      // Prevents “download as attachment” prompts; user may still capture the stream via devtools.
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(fileName)}`,
    },
  });
}
