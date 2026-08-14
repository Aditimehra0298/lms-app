import { createReadStream } from "node:fs";
import { access, constants } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ fileName: string }> };

function mimeFromName(fileName: string): string {
  const ext = path.extname(fileName).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  if (ext === ".gif") return "image/gif";
  if (ext === ".svg") return "image/svg+xml";
  return "image/jpeg";
}

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

/**
 * Public course covers. Files are written to public/uploads/covers and
 * data/uploads/covers so they survive `rm -rf .next` and still load if nginx
 * does not map /uploads to the app public folder.
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

  const found = await firstExisting([
    path.join(process.cwd(), "data", "uploads", "covers", base),
    path.join(process.cwd(), "public", "uploads", "covers", base),
    path.join(process.cwd(), "public", "uploads", "admin", base),
  ]);
  if (!found) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const stream = createReadStream(found);
  return new Response(Readable.toWeb(stream) as ReadableStream, {
    status: 200,
    headers: {
      "Content-Type": mimeFromName(base),
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
    },
  });
}
