import Busboy from "busboy";
import { createWriteStream } from "node:fs";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { Transform } from "node:stream";

export type StreamedMultipartFile = {
  /** Absolute path where the upload was written. */
  filePath: string;
  /** Basename used on disk (same as storage file name). */
  storageName: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  courseSlug?: string;
  uploadedBy?: string;
};

class SizeLimitStream extends Transform {
  bytes = 0;

  constructor(private readonly maxBytes: number) {
    super();
  }

  _transform(chunk: Buffer, _encoding: BufferEncoding, callback: (error?: Error | null) => void) {
    this.bytes += chunk.length;
    if (this.bytes > this.maxBytes) {
      callback(new Error(`FILE_TOO_LARGE:${this.maxBytes}`));
      return;
    }
    callback(null, chunk);
  }
}

/**
 * Stream a multipart POST body to disk without buffering the whole file in RAM.
 * Used for large admin lesson videos (hundreds of MB).
 */
export async function streamMultipartFileUpload(
  request: Request,
  options: {
    fieldName?: string;
    destDir: string;
    buildStorageName: (originalName: string, mimeType: string) => string;
    maxBytes: number;
  },
): Promise<StreamedMultipartFile> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("multipart/form-data")) {
    throw new Error("Expected multipart/form-data upload");
  }
  if (!request.body) {
    throw new Error("Missing request body");
  }

  const fieldName = options.fieldName ?? "file";
  await mkdir(options.destDir, { recursive: true });

  return new Promise((resolve, reject) => {
    const busboy = Busboy({
      headers: { "content-type": contentType },
      limits: { files: 1, fileSize: options.maxBytes },
    });

    let courseSlug: string | undefined;
    let uploadedBy: string | undefined;
    let settled = false;
    let sawFileField = false;

    const fail = (err: unknown) => {
      if (settled) return;
      settled = true;
      reject(err instanceof Error ? err : new Error(String(err)));
    };

    busboy.on("field", (name, value) => {
      if (name === "courseSlug" && typeof value === "string") courseSlug = value;
      if (name === "uploadedBy" && typeof value === "string") uploadedBy = value;
    });

    busboy.on("file", (name, fileStream, info) => {
      if (name !== fieldName) {
        fileStream.resume();
        return;
      }
      sawFileField = true;

      const originalName =
        typeof info.filename === "string"
          ? info.filename.replace(/[^\w.-]+/g, "_")
          : "upload";
      const mimeType = info.mimeType || "";
      const storageName = options.buildStorageName(originalName, mimeType);
      const filePath = path.join(options.destDir, storageName);
      const sizeLimiter = new SizeLimitStream(options.maxBytes);

      pipeline(fileStream, sizeLimiter, createWriteStream(filePath))
        .then(() => {
          if (settled) return;
          settled = true;
          resolve({
            filePath,
            storageName,
            originalName,
            mimeType,
            sizeBytes: sizeLimiter.bytes,
            courseSlug,
            uploadedBy,
          });
        })
        .catch(fail);
    });

    busboy.on("error", fail);
    busboy.on("filesLimit", () => fail(new Error("Only one file may be uploaded at a time")));
    busboy.on("finish", () => {
      setImmediate(() => {
        if (!settled && !sawFileField) fail(new Error("Missing file"));
      });
    });

    Readable.fromWeb(request.body as Parameters<typeof Readable.fromWeb>[0]).pipe(busboy);
  });
}
