import { prisma } from "@/lib/prisma";

export type MediaAssetKind = "image" | "video" | "document";

export type RecordMediaAssetInput = {
  url: string;
  originalName?: string;
  mimeType?: string;
  sizeBytes?: number;
  kind: MediaAssetKind;
  courseSlug?: string;
  uploadedBy?: string;
  storage?: "local" | "r2" | "s3" | "cloudinary";
};

/** Register an upload in MySQL (file bytes stay on disk/cloud; DB stores URL + metadata). */
export async function recordMediaAssetInMysql(input: RecordMediaAssetInput): Promise<void> {
  const url = input.url.trim();
  if (!url) return;

  await prisma.lmsMediaAsset.create({
    data: {
      url,
      originalName: input.originalName?.trim().slice(0, 255) || null,
      mimeType: input.mimeType?.trim().slice(0, 128) || null,
      sizeBytes: input.sizeBytes ?? null,
      kind: input.kind,
      courseSlug: input.courseSlug?.trim().slice(0, 191) || null,
      uploadedBy: input.uploadedBy?.trim().slice(0, 255) || null,
      storage: input.storage ?? "local",
    },
  });
}

export function mediaKindFromMime(
  mimeType: string,
  fileName: string,
): MediaAssetKind {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/") || /\.(mp4|webm|mov|m4v)$/i.test(fileName)) return "video";
  return "document";
}
