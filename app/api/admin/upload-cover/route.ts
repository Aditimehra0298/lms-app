import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { assertMainAdmin } from "@/lib/server/admin-api-auth";
import { validateImageUpload } from "@/lib/server/upload-content-validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_BYTES = 6 * 1024 * 1024;
const PUBLIC_COVERS_DIR = path.join(process.cwd(), "public", "uploads", "covers");
const DATA_COVERS_DIR = path.join(process.cwd(), "data", "uploads", "covers");

function extForDetected(mime: string): string {
  switch (mime) {
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
 * Public cover-image upload — admin session required (POC-C-07).
 * Content validated by magic bytes; stored under a random name.
 */
export async function POST(request: Request) {
  const denied = await assertMainAdmin(request);
  if (denied) return denied;

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

    const looksLikeImage =
      IMAGE_TYPES.has(type) || /\.(jpe?g|png|webp|gif)$/i.test(originalName);

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

    const buf = Buffer.from(await file.arrayBuffer());
    const validated = validateImageUpload(buf, originalName);
    if (!validated.ok) {
      return NextResponse.json({ ok: false, error: validated.message }, { status: 400 });
    }

    const ext = extForDetected(validated.mime);
    const name = `${Date.now()}-${nanoid(10)}${ext}`;

    await mkdir(PUBLIC_COVERS_DIR, { recursive: true });
    await mkdir(DATA_COVERS_DIR, { recursive: true });
    await writeFile(path.join(PUBLIC_COVERS_DIR, name), buf);
    await writeFile(path.join(DATA_COVERS_DIR, name), buf);

    return NextResponse.json({
      ok: true,
      url: `/api/covers/${encodeURIComponent(name)}`,
      publicUrl: `/uploads/covers/${name}`,
      bytes: buf.length,
      mime: validated.mime,
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
