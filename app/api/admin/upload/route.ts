import path from "node:path";
import { NextResponse } from "next/server";
import {
  mediaKindFromMime,
  recordMediaAssetInMysql,
} from "@/lib/server/media-asset-mysql";
import {
  protectedMediaServePath,
  savePrivateMediaBlob,
} from "@/lib/server/private-media-storage";

export const runtime = "nodejs";
/** Large learning-tool / video uploads (up to 1 GB). */
export const maxDuration = 600;

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

const DOC_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/epub+zip",
  "application/zip",
  "application/x-zip-compressed",
  "text/plain",
  "text/csv",
  "application/csv",
  "text/vtt",
  "application/x-subrip",
]);

const AUDIO_TYPES = new Set([
  "audio/mpeg",
  "audio/mp3",
  "audio/mp4",
  "audio/x-m4a",
  "audio/m4a",
  "audio/wav",
  "audio/x-wav",
  "audio/wave",
  "audio/ogg",
  "audio/webm",
  "audio/aac",
]);

const VIDEO_TYPES = new Set(["video/mp4", "video/webm", "video/quicktime", "video/x-m4v"]);

/** Images stay smaller; everything else (docs, audio, video, learning tools) up to 1 GB. */
const MAX_IMAGE_BYTES = 6 * 1024 * 1024;
const DEFAULT_MAX_FILE_MB = 1024; // 1 GB

function fileLimitBytes(): number {
  const raw = process.env.ADMIN_UPLOAD_MAX_MB?.trim() || process.env.ADMIN_UPLOAD_MAX_VIDEO_MB?.trim();
  const parsed = raw ? Number.parseInt(raw, 10) : NaN;
  const mb = Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_MAX_FILE_MB;
  return mb * 1024 * 1024;
}

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
    case "application/epub+zip":
      return ".epub";
    case "application/zip":
    case "application/x-zip-compressed":
      return ".zip";
    case "text/plain":
      return ".txt";
    case "text/csv":
    case "application/csv":
      return ".csv";
    case "text/vtt":
      return ".vtt";
    case "application/x-subrip":
      return ".srt";
    case "audio/mpeg":
    case "audio/mp3":
      return ".mp3";
    case "audio/mp4":
    case "audio/x-m4a":
    case "audio/m4a":
      return ".m4a";
    case "audio/wav":
    case "audio/x-wav":
    case "audio/wave":
      return ".wav";
    case "audio/ogg":
      return ".ogg";
    case "audio/aac":
      return ".aac";
    case "video/mp4":
      return ".mp4";
    case "video/webm":
      return ".webm";
    case "video/quicktime":
      return ".mov";
    case "video/x-m4v":
      return ".m4v";
    default:
      return ".bin";
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

function looksLikeAudioFile(fileName: string, mimeType: string): boolean {
  if (/\.(mp3|m4a|wav|ogg|aac|webm)$/i.test(fileName) && !/\.(mp4|webm|mov|m4v)$/i.test(fileName)) {
    // .webm can be audio or video — prefer MIME when present
    if (/\.webm$/i.test(fileName) && mimeType.startsWith("video/")) return false;
    if (/\.webm$/i.test(fileName) && !mimeType) return false;
    return true;
  }
  return AUDIO_TYPES.has(mimeType) || mimeType.startsWith("audio/");
}

function looksLikeDocFile(fileName: string, mimeType: string): boolean {
  if (/\.(pdf|doc|docx|ppt|pptx|txt|csv|epub|zip|vtt|srt)$/i.test(fileName)) return true;
  return DOC_TYPES.has(mimeType);
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
      ".epub",
      ".zip",
      ".vtt",
      ".srt",
      ".mp3",
      ".m4a",
      ".wav",
      ".ogg",
      ".aac",
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

function inferMimeFromName(fileName: string): string {
  const ext = path.extname(fileName).toLowerCase();
  const map: Record<string, string> = {
    ".pdf": "application/pdf",
    ".doc": "application/msword",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".ppt": "application/vnd.ms-powerpoint",
    ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ".txt": "text/plain",
    ".csv": "text/csv",
    ".epub": "application/epub+zip",
    ".zip": "application/zip",
    ".vtt": "text/vtt",
    ".srt": "application/x-subrip",
    ".mp3": "audio/mpeg",
    ".m4a": "audio/mp4",
    ".wav": "audio/wav",
    ".ogg": "audio/ogg",
    ".aac": "audio/aac",
    ".mp4": "video/mp4",
    ".webm": "video/webm",
    ".mov": "video/quicktime",
    ".m4v": "video/x-m4v",
  };
  return map[ext] ?? "";
}

function uploadErrorMessage(err: unknown): string {
  const message = err instanceof Error ? err.message : "Upload failed";
  const code =
    err && typeof err === "object" && "code" in err
      ? String((err as { code?: unknown }).code ?? "")
      : "";
  if (
    code === "ENOSPC" ||
    /ENOSPC|no space left on device/i.test(message)
  ) {
    return "Server disk is full (no space left). Free disk on the VPS, then try again.";
  }
  return message;
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
    if (!type) {
      type = inferMimeFromName(originalName);
    }
    if (!type && looksLikeCsvFile(originalName, "")) {
      type = "text/csv";
    }

    const isImage = IMAGE_TYPES.has(type) || /\.(jpe?g|png|webp|gif)$/i.test(originalName);
    const isAudio = looksLikeAudioFile(originalName, type);
    const isVideo = !isAudio && (VIDEO_TYPES.has(type) || looksLikeVideoFile(originalName, type));
    const isDoc = DOC_TYPES.has(type) || looksLikeDocFile(originalName, type) || looksLikeCsvFile(originalName, type);

    if (!isImage && !isDoc && !isVideo && !isAudio) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Unsupported file type. Use PDF, Word, PPT, EPUB, ZIP, TXT, MP3/M4A/WAV, or video (MP4/WebM).",
        },
        { status: 400 },
      );
    }

    const maxBytes = isImage ? MAX_IMAGE_BYTES : fileLimitBytes();
    if (file.size > maxBytes) {
      const mb = Math.round(maxBytes / (1024 * 1024));
      return NextResponse.json({ ok: false, error: `File too large (max ${mb}MB)` }, { status: 400 });
    }

    const ext =
      extFromOriginalName(originalName) ??
      (looksLikeCsvFile(originalName, type)
        ? ".csv"
        : isAudio
          ? extForType(type || "audio/mpeg")
          : isVideo
            ? extForType(type || "video/mp4")
            : extForType(type || "application/pdf"));

    const safeBase = originalName.includes(".")
      ? originalName.slice(0, originalName.lastIndexOf("."))
      : originalName;
    const name = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}-${safeBase.slice(0, 40)}${ext}`;
    await savePrivateMediaBlob(name, file);
    const url = protectedMediaServePath(name);

    const courseSlug =
      typeof form.get("courseSlug") === "string" ? (form.get("courseSlug") as string) : undefined;
    const uploadedBy =
      typeof form.get("uploadedBy") === "string" ? (form.get("uploadedBy") as string) : undefined;

    try {
      await recordMediaAssetInMysql({
        url,
        originalName,
        mimeType: type || undefined,
        sizeBytes: file.size,
        kind: mediaKindFromMime(type, originalName),
        courseSlug,
        uploadedBy,
        storage: "local",
      });
    } catch (err) {
      console.error("[admin/upload] media asset DB record", err);
    }

    return NextResponse.json({ ok: true, url });
  } catch (err) {
    console.error("[admin/upload]", err);
    const message = uploadErrorMessage(err);
    const status = /disk is full|no space/i.test(message) ? 507 : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
