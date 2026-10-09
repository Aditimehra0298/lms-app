import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import { NextResponse } from "next/server";
import { assertMainAdmin } from "@/lib/server/admin-api-auth";
import { isVideoFileName } from "@/lib/server/admin-video-library";
import { parseByteRange } from "@/lib/server/media-request-guard";
import { mimeFromFileName, resolveMediaFilePath } from "@/lib/server/private-media-storage";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ fileName: string }> };

function attachment(name: string): string {
  const ascii = name.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_");
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(name)}`;
}

export async function GET(request: Request, { params }: Params) {
  const denied = await assertMainAdmin(request);
  if (denied) return denied;

  const { fileName: raw } = await params;
  let fileName: string;
  try {
    fileName = decodeURIComponent(raw);
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid file" }, { status: 400 });
  }
  if (!fileName || fileName.includes("..") || fileName.includes("/") || !isVideoFileName(fileName)) {
    return NextResponse.json({ ok: false, message: "Invalid file" }, { status: 400 });
  }

  const filePath = await resolveMediaFilePath(fileName);
  if (!filePath) {
    return NextResponse.json({ ok: false, message: "Not found" }, { status: 404 });
  }

  const requested = new URL(request.url).searchParams.get("name")?.trim();
  const downloadName = requested && !/[\\/]/.test(requested) ? requested.slice(0, 255) : fileName;

  const info = await stat(filePath);
  const headers: Record<string, string> = {
    "Content-Type": mimeFromFileName(fileName),
    "Content-Disposition": attachment(downloadName),
    "Cache-Control": "private, no-store",
    "Accept-Ranges": "bytes",
    "X-Content-Type-Options": "nosniff",
  };

  const range = parseByteRange(request.headers.get("range"), info.size);
  if (range) {
    const { start, end } = range;
    return new Response(Readable.toWeb(createReadStream(filePath, { start, end })) as ReadableStream, {
      status: 206,
      headers: {
        ...headers,
        "Content-Length": String(end - start + 1),
        "Content-Range": `bytes ${start}-${end}/${info.size}`,
      },
    });
  }

  return new Response(Readable.toWeb(createReadStream(filePath)) as ReadableStream, {
    status: 200,
    headers: { ...headers, "Content-Length": String(info.size) },
  });
}
