import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
/** Documents & data files for exams (PDF/Word/CSV). */
const DOC_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "text/csv",
  "application/csv",
]);
const VIDEO_TYPES = new Set(["video/mp4", "video/webm", "video/quicktime", "video/x-m4v"]);

const MAX_IMAGE_BYTES = 6 * 1024 * 1024;
const MAX_DOC_BYTES = 15 * 1024 * 1024;
const MAX_VIDEO_BYTES = 300 * 1024 * 1024;

function extForType(type: string): string {
  switch (type) {
    case "image/png":
      return ".png";
    case "image/webp":
      return ".webp";
    case "image/gif":
      return ".gif";
    case "application/pdf":
      return ".pdf";
    case "application/msword":
      return ".doc";
    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      return ".docx";
    case "application/vnd.ms-powerpoint":
      return ".ppt";
    case "application/vnd.openxmlformats-officedocument.presentationml.presentation":
      return ".pptx";
    case "text/plain":
      return ".txt";
    case "text/csv":
    case "application/csv":
      return ".csv";
    case "video/mp4":
      return ".mp4";
    case "video/webm":
      return ".webm";
    case "video/quicktime":
      return ".mov";
    case "video/x-m4v":
      return ".m4v";
    default:
      return ".jpg";
  }
}

function looksLikeCsvFile(fileName: string, mimeType: string): boolean {
  if (/\.csv$/i.test(fileName)) return true;
  return mimeType === "text/csv" || mimeType === "application/csv";
}

function looksLikeVideoFile(fileName: string, mimeType: string): boolean {
  if (/\.(mp4|webm|mov|m4v)$/i.test(fileName)) return true;
  return VIDEO_TYPES.has(mimeType);
}

function extFromOriginalName(fileName: string): string | null {
  const m = fileName.match(/\.(\w+)$/);
  if (!m) return null;
  const ext = `.${m[1].toLowerCase()}`;
  if (
    [
      ".jpg",
      ".jpeg",
      ".png",
      ".webp",
      ".gif",
      ".pdf",
      ".doc",
      ".docx",
      ".ppt",
      ".pptx",
      ".txt",
      ".csv",
      ".mp4",
      ".webm",
      ".mov",
      ".m4v",
    ].includes(ext)
  ) {
    return ext;
  }
  return null;
}

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof Blob)) {
      return NextResponse.json({ ok: false, error: "Missing file" }, { status: 400 });
    }
    const originalName =
      typeof (file as File).name === "string" ? (file as File).name.replace(/[^\w.-]+/g, "_") : "upload";
    let type = file.type || "";
    if (!type && looksLikeCsvFile(originalName, "")) {
      type = "text/csv";
    }
    const isImage = IMAGE_TYPES.has(type);
    const isDoc = DOC_TYPES.has(type) || looksLikeCsvFile(originalName, type);
    const isVideo = VIDEO_TYPES.has(type) || looksLikeVideoFile(originalName, type);
    if (!isImage && !isDoc && !isVideo) {
      return NextResponse.json({ ok: false, error: "Unsupported file type" }, { status: 400 });
    }
    const maxBytes = isImage ? MAX_IMAGE_BYTES : isVideo ? MAX_VIDEO_BYTES : MAX_DOC_BYTES;
    const buf = Buffer.from(await file.arrayBuffer());
    if (buf.length > maxBytes) {
      const mb = Math.round(maxBytes / (1024 * 1024));
      return NextResponse.json({ ok: false, error: `File too large (max ${mb}MB)` }, { status: 400 });
    }
    const ext = looksLikeCsvFile(originalName, type)
      ? ".csv"
      : looksLikeVideoFile(originalName, type)
        ? extFromOriginalName(originalName) ?? extForType(type || "video/mp4")
        : extFromOriginalName(originalName) ?? extForType(type);
    const safeBase = originalName.includes(".") ? originalName.slice(0, originalName.lastIndexOf(".")) : originalName;
    const name = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}-${safeBase.slice(0, 40)}${ext}`;
    const dir = path.join(process.cwd(), "public", "uploads", "admin");
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, name), buf);
    return NextResponse.json({ ok: true, url: `/uploads/admin/${name}` });
  } catch {
    return NextResponse.json({ ok: false, error: "Upload failed" }, { status: 500 });
  }
}
