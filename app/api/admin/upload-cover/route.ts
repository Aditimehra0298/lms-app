import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import { NextResponse } from "next/server";

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_BYTES = 6 * 1024 * 1024;
const COVERS_DIR = path.join(process.cwd(), "public", "uploads", "covers");

function extForType(type: string): string {
  switch (type) {
    case "image/png": return ".png";
    case "image/webp": return ".webp";
    case "image/gif": return ".gif";
    default: return ".jpg";
  }
}

/**
 * Public cover-image upload — files land in public/uploads/covers/
 * so they can be served directly by Next.js without signed tokens.
 * Only for course card / hero images that are meant to be publicly visible.
 */
export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof Blob)) {
      return NextResponse.json({ ok: false, error: "Missing file" }, { status: 400 });
    }

    const type = file.type || "";
    if (!IMAGE_TYPES.has(type)) {
      return NextResponse.json({ ok: false, error: "Only JPEG, PNG, WebP, GIF allowed" }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ ok: false, error: "File too large (max 6 MB)" }, { status: 400 });
    }

    const originalName =
      typeof (file as File).name === "string"
        ? (file as File).name.replace(/[^\w.-]+/g, "_")
        : "cover";
    const safeBase = originalName.includes(".")
      ? originalName.slice(0, originalName.lastIndexOf("."))
      : originalName;
    const ext = extForType(type);
    const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeBase.slice(0, 40)}${ext}`;

    await mkdir(COVERS_DIR, { recursive: true });
    const buf = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(COVERS_DIR, name), buf);

    return NextResponse.json({ ok: true, url: `/uploads/covers/${name}` });
  } catch {
    return NextResponse.json({ ok: false, error: "Upload failed" }, { status: 500 });
  }
}
