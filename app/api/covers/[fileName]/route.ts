import { createReadStream } from "node:fs";
import { access, constants, open } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { NextResponse } from "next/server";
import { detectContentKind } from "@/lib/server/upload-content-validation";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ fileName: string }> };

const IMAGE_MIME: Record<string, string> = {
  "image/jpeg": "image/jpeg",
  "image/png": "image/png",
  "image/webp": "image/webp",
  "image/gif": "image/gif",
};

async function firstExisting(paths: string[]): Promise<string | null> {
  for (const filePath of paths) {
    try {
      await access(filePath, constants.R_OK);
      return filePath;
    } catch {
      /* try next */
    }
  }
  return null;
}

async function sniffImageMime(filePath: string): Promise<string | null> {
  const fh = await open(filePath, "r");
  try {
    const buf = Buffer.alloc(64);
    const { bytesRead } = await fh.read(buf, 0, 64, 0);
    const kind = detectContentKind(buf.subarray(0, bytesRead));
    return IMAGE_MIME[kind] ?? null;
  } finally {
    await fh.close();
  }
}

/**
 * Public course covers. Served with magic-derived Content-Type + nosniff (POC-C-07).
 */
export async function GET(_request: Request, { params }: Params) {
  const { fileName: raw } = await params;
  let fileName: string;
  try {
    fileName = decodeURIComponent(raw);
  } catch {
    return NextResponse.json({ error: "Invalid file" }, { status: 400 });
  }
  const base = path.basename(fileName);
  if (!base || base.includes("..") || base !== fileName.replace(/\\/g, "/")) {
    return NextResponse.json({ error: "Invalid file" }, { status: 400 });
  }
  if (!/\.(jpe?g|png|webp|gif)$/i.test(base)) {
    return NextResponse.json({ error: "Unsupported cover type" }, { status: 400 });
  }

  const found = await firstExisting([
    path.join(process.cwd(), "data", "uploads", "covers", base),
    path.join(process.cwd(), "public", "uploads", "covers", base),
    path.join(process.cwd(), "public", "uploads", "admin", base),
  ]);
  if (!found) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const mime = await sniffImageMime(found);
  if (!mime) {
    return NextResponse.json(
      { error: "Stored file is not a valid image." },
      { status: 415 },
    );
  }

  const stream = createReadStream(found);
  return new Response(Readable.toWeb(stream) as ReadableStream, {
    status: 200,
    headers: {
      "Content-Type": mime,
      "X-Content-Type-Options": "nosniff",
      "Content-Disposition": `inline; filename="${base.replace(/"/g, "")}"`,
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
    },
  });
}
