import { NextResponse } from "next/server";
import {
  mediaKindFromMime,
  recordMediaAssetInMysql,
} from "@/lib/server/media-asset-mysql";
import {
  protectedMediaServePath,
  savePrivateMediaBlob,
} from "@/lib/server/private-media-storage";
import { requireLearnerWriter } from "@/lib/server/learner-request-identity";

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const DOC_TYPES = new Set(["application/pdf"]);
const MAX_BYTES = 10 * 1024 * 1024;

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
    default:
      return ".jpg";
  }
}

export async function POST(request: Request) {
  const learnerAuth = requireLearnerWriter(request);
  if ("response" in learnerAuth) return learnerAuth.response;
  const learner = learnerAuth;

  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof Blob)) {
      return NextResponse.json({ ok: false, error: "Missing file" }, { status: 400 });
    }

    const originalName =
      typeof (file as File).name === "string"
        ? (file as File).name.replace(/[^\w.-]+/g, "_")
        : "upload";
    const type = file.type || "";
    const isImage = IMAGE_TYPES.has(type) || /\.(jpe?g|png|webp|gif)$/i.test(originalName);
    const isPdf = DOC_TYPES.has(type) || /\.pdf$/i.test(originalName);
    if (!isImage && !isPdf) {
      return NextResponse.json(
        { ok: false, error: "Only PNG, JPG, or PDF files are allowed." },
        { status: 400 },
      );
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ ok: false, error: "File too large (max 10MB)." }, { status: 400 });
    }

    const ext = /\.pdf$/i.test(originalName) ? ".pdf" : extForType(type);
    const safeBase = originalName.includes(".")
      ? originalName.slice(0, originalName.lastIndexOf("."))
      : originalName;
    const name = `learner-${Date.now()}-${Math.random().toString(36).slice(2, 10)}-${safeBase.slice(0, 40)}${ext}`;
    await savePrivateMediaBlob(name, file);
    const url = protectedMediaServePath(name);

    const courseSlug =
      typeof form.get("courseSlug") === "string" ? (form.get("courseSlug") as string) : undefined;

    try {
      await recordMediaAssetInMysql({
        url,
        originalName,
        mimeType: type || undefined,
        sizeBytes: file.size,
        kind: mediaKindFromMime(type, originalName),
        courseSlug,
        uploadedBy: learner.email,
        storage: "local",
      });
    } catch (err) {
      console.error("[learner/upload] media asset DB record", err);
    }

    return NextResponse.json({ ok: true, url });
  } catch {
    return NextResponse.json({ ok: false, error: "Upload failed" }, { status: 500 });
  }
}
