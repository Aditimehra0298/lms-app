import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_BYTES = 6 * 1024 * 1024;
const COVERS_DIR = path.join(process.cwd(), "public", "uploads", "covers");

function extForType(type: string): string {
  switch (type) {
    case "image/png":
      return ".png";
    case "image/webp":
      return ".webp";
    case "image/gif":
      return ".gif";
    default:
      return ".jpg";
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

    const type = (file.type || "").toLowerCase();
    const originalName =
      typeof (file as File).name === "string"
        ? (file as File).name.replace(/[^\w.-]+/g, "_")
        : "cover";

    // Some browsers send empty MIME — infer from extension
    const looksLikeImage =
      IMAGE_TYPES.has(type) ||
      /\.(jpe?g|png|webp|gif)$/i.test(originalName);

    if (!looksLikeImage) {
      return NextResponse.json(
        { ok: false, error: "Only JPEG, PNG, WebP, GIF allowed" },
        { status: 400 },
      );
    }
    if (file.size <= 0) {
      return NextResponse.json({ ok: false, error: "Empty file" }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { ok: false, error: "File too large (max 6 MB)" },
        { status: 400 },
      );
    }

    const safeBase = originalName.includes(".")
      ? originalName.slice(0, originalName.lastIndexOf("."))
      : originalName;
    const mime = IMAGE_TYPES.has(type)
      ? type
      : /\.png$/i.test(originalName)
        ? "image/png"
        : /\.webp$/i.test(originalName)
          ? "image/webp"
          : /\.gif$/i.test(originalName)
            ? "image/gif"
            : "image/jpeg";
    const ext = extForType(mime);
    const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeBase.slice(0, 40)}${ext}`;

    await mkdir(COVERS_DIR, { recursive: true });
    const buf = Buffer.from(await file.arrayBuffer());
    const dest = path.join(COVERS_DIR, name);
    await writeFile(dest, buf);

    return NextResponse.json({
      ok: true,
      url: `/uploads/covers/${name}`,
      bytes: buf.length,
    });
  } catch (err) {
    console.error("[admin/upload-cover]", err);
    const raw = err instanceof Error ? err.message : "Upload failed";
    const code =
      err && typeof err === "object" && "code" in err
        ? String((err as { code?: unknown }).code ?? "")
        : "";
    const diskFull = code === "ENOSPC" || /ENOSPC|no space left on device/i.test(raw);
    return NextResponse.json(
      {
        ok: false,
        error: diskFull
          ? "Server disk is full (no space left). Free disk on the VPS, then try again."
          : raw,
      },
      { status: diskFull ? 507 : 500 },
    );
  }
}
