import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { promises as fs } from "node:fs";
import https from "node:https";
import path from "node:path";
import { isVideoFileName, listAdminVideoFiles } from "@/lib/server/admin-video-library";
import { resolveMediaFilePath } from "@/lib/server/private-media-storage";

/**
 * Bunny Stream: course videos are copied to Bunny (adaptive HLS, CDN in India) while the original
 * stays on our disk as a fallback. Lessons keep their `/api/media/serve/<file>` URL; the media
 * token route swaps in a signed Bunny embed once the copy has finished encoding.
 */

const API_BASE = "https://video.bunnycdn.com";
const EMBED_BASE = "https://iframe.mediadelivery.net/embed";
const storePath = path.join(process.cwd(), "data", "bunny-videos.json");

/** Bunny video status codes. */
const STATUS_FINISHED = 4;
const STATUS_ERROR = 5;
const STATUS_UPLOAD_FAILED = 6;
const MAX_ATTEMPTS = 3;
const STATUS_CHECK_INTERVAL_MS = 30_000;

export type BunnyVideoState = "queued" | "uploading" | "processing" | "ready" | "error";

export type BunnyVideoEntry = {
  videoId?: string;
  state: BunnyVideoState;
  attempts: number;
  encodeProgress?: number;
  error?: string;
  updatedAt: string;
};

type StoreFile = { videos: Record<string, BunnyVideoEntry> };

type BunnyConfig = { libraryId: string; apiKey: string; tokenKey: string; embedTtlSeconds: number };

export function bunnyConfig(): BunnyConfig | null {
  const libraryId = process.env.BUNNY_STREAM_LIBRARY_ID?.trim();
  const apiKey = process.env.BUNNY_STREAM_API_KEY?.trim();
  if (!libraryId || !apiKey || process.env.BUNNY_STREAM_ENABLED === "false") return null;
  const ttl = Number(process.env.BUNNY_STREAM_EMBED_TTL_SECONDS || "");
  return {
    libraryId,
    apiKey,
    tokenKey: process.env.BUNNY_STREAM_TOKEN_KEY?.trim() || "",
    embedTtlSeconds: Number.isFinite(ttl) && ttl > 0 ? ttl : 60 * 60,
  };
}

// ---------- store ----------

let writeChain: Promise<unknown> = Promise.resolve();

async function readStore(): Promise<StoreFile> {
  try {
    const parsed = JSON.parse(await fs.readFile(storePath, "utf8")) as StoreFile;
    return parsed && typeof parsed.videos === "object" && parsed.videos ? parsed : { videos: {} };
  } catch {
    return { videos: {} };
  }
}

function updateStore<T>(fn: (store: StoreFile) => T): Promise<T> {
  const run = writeChain.then(async () => {
    const store = await readStore();
    const result = fn(store);
    await fs.mkdir(path.dirname(storePath), { recursive: true });
    await fs.writeFile(storePath, JSON.stringify(store, null, 2), "utf8");
    return result;
  });
  writeChain = run.catch(() => undefined);
  return run;
}

function patchEntry(fileName: string, patch: Partial<BunnyVideoEntry>): Promise<BunnyVideoEntry> {
  return updateStore((store) => {
    const prev = store.videos[fileName] ?? { state: "queued" as const, attempts: 0, updatedAt: "" };
    const next = { ...prev, ...patch, updatedAt: new Date().toISOString() };
    store.videos[fileName] = next;
    return next;
  });
}

export async function listBunnyVideos(): Promise<Record<string, BunnyVideoEntry>> {
  return (await readStore()).videos;
}

// ---------- Bunny API ----------

async function bunnyApi<T>(cfg: BunnyConfig, method: string, apiPath: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}/library/${cfg.libraryId}${apiPath}`, {
    method,
    headers: {
      AccessKey: cfg.apiKey,
      Accept: "application/json",
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Bunny ${method} ${apiPath} → ${res.status} ${text.slice(0, 200)}`);
  }
  return (await res.json()) as T;
}

function putFile(cfg: BunnyConfig, videoId: string, filePath: string, size: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const req = https.request(
      `${API_BASE}/library/${cfg.libraryId}/videos/${videoId}`,
      {
        method: "PUT",
        headers: { AccessKey: cfg.apiKey, "Content-Type": "application/octet-stream", "Content-Length": size },
        timeout: 60 * 60 * 1000,
      },
      (res) => {
        let text = "";
        res.on("data", (chunk) => (text += chunk));
        res.on("end", () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) resolve();
          else reject(new Error(`Bunny upload → ${res.statusCode} ${text.slice(0, 200)}`));
        });
      },
    );
    req.on("timeout", () => req.destroy(new Error("Bunny upload timed out")));
    req.on("error", reject);
    const stream = createReadStream(filePath);
    stream.on("error", (err) => req.destroy(err));
    stream.pipe(req);
  });
}

/** Signed iframe URL (Bunny "embed view token authentication"). */
export function bunnyEmbedUrl(videoId: string): string | null {
  const cfg = bunnyConfig();
  if (!cfg) return null;
  const params = new URLSearchParams({ autoplay: "false", preload: "true", responsive: "true" });
  if (cfg.tokenKey) {
    const expires = Math.floor(Date.now() / 1000) + cfg.embedTtlSeconds;
    const token = createHash("sha256").update(cfg.tokenKey + videoId + expires).digest("hex");
    params.set("token", token);
    params.set("expires", String(expires));
  }
  return `${EMBED_BASE}/${cfg.libraryId}/${videoId}?${params.toString()}`;
}

// ---------- upload queue ----------

type QueueState = { chain: Promise<unknown>; pending: Set<string> };
const globalQueue = globalThis as unknown as { __bunnyQueue?: QueueState };
const queue: QueueState = (globalQueue.__bunnyQueue ??= { chain: Promise.resolve(), pending: new Set() });

async function uploadOne(fileName: string, title: string): Promise<void> {
  const cfg = bunnyConfig();
  if (!cfg) return;
  const filePath = await resolveMediaFilePath(fileName);
  if (!filePath) {
    await patchEntry(fileName, { state: "error", error: "File not found on server" });
    return;
  }
  const existing = (await readStore()).videos[fileName];
  if (existing?.state === "ready" || existing?.state === "processing") return;

  const attempts = (existing?.attempts ?? 0) + 1;
  await patchEntry(fileName, { state: "uploading", attempts, error: undefined });
  try {
    let videoId = existing?.videoId;
    if (!videoId) {
      const created = await bunnyApi<{ guid: string }>(cfg, "POST", "/videos", { title: title.slice(0, 200) });
      videoId = created.guid;
      await patchEntry(fileName, { videoId });
    }
    const { size } = await fs.stat(filePath);
    await putFile(cfg, videoId, filePath, size);
    await patchEntry(fileName, { state: "processing", encodeProgress: 0 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed";
    console.error("[bunny] upload", fileName, message);
    await patchEntry(fileName, { state: attempts >= MAX_ATTEMPTS ? "error" : "queued", error: message });
  }
}

/** Queue one local video for copying to Bunny (no-op when Bunny is not configured). */
export function queueBunnyUpload(fileName: string, title?: string): boolean {
  if (!bunnyConfig() || !isVideoFileName(fileName) || queue.pending.has(fileName)) return false;
  queue.pending.add(fileName);
  queue.chain = queue.chain
    .then(() => uploadOne(fileName, title || fileName))
    .catch((err) => console.error("[bunny] queue", err))
    .finally(() => queue.pending.delete(fileName));
  return true;
}

/** Queue every local video that is not yet on Bunny (or failed earlier with retries left). */
export async function syncAllVideosToBunny(opts?: { retryErrors?: boolean }): Promise<number> {
  if (!bunnyConfig()) return 0;
  const [files, store] = await Promise.all([listAdminVideoFiles(), readStore()]);
  let queued = 0;
  for (const file of files) {
    const entry = store.videos[file.fileName];
    const retry =
      !entry ||
      entry.state === "queued" ||
      entry.state === "uploading" ||
      (entry.state === "error" && opts?.retryErrors);
    if (!retry) continue;
    if (entry?.state === "error" && opts?.retryErrors) await patchEntry(file.fileName, { attempts: 0 });
    const title = file.courseSlug ? `${file.courseSlug} — ${file.downloadName}` : file.downloadName;
    if (queueBunnyUpload(file.fileName, title)) queued += 1;
  }
  return queued;
}

export function bunnyQueueSize(): number {
  return queue.pending.size;
}

// ---------- encoding status ----------

const lastStatusCheck = new Map<string, number>();

async function refreshEntry(fileName: string, entry: BunnyVideoEntry): Promise<BunnyVideoEntry> {
  const cfg = bunnyConfig();
  if (!cfg || !entry.videoId || entry.state !== "processing") return entry;
  const last = lastStatusCheck.get(fileName) ?? 0;
  if (Date.now() - last < STATUS_CHECK_INTERVAL_MS) return entry;
  lastStatusCheck.set(fileName, Date.now());
  try {
    const video = await bunnyApi<{ status: number; encodeProgress?: number }>(cfg, "GET", `/videos/${entry.videoId}`);
    if (video.status === STATUS_FINISHED) return patchEntry(fileName, { state: "ready", encodeProgress: 100 });
    if (video.status === STATUS_ERROR || video.status === STATUS_UPLOAD_FAILED) {
      return patchEntry(fileName, { state: "error", error: `Bunny encoding failed (status ${video.status})` });
    }
    if (video.encodeProgress !== entry.encodeProgress) {
      return patchEntry(fileName, { encodeProgress: video.encodeProgress ?? 0 });
    }
  } catch (err) {
    console.error("[bunny] status", fileName, err instanceof Error ? err.message : err);
  }
  return entry;
}

export async function refreshProcessingBunnyVideos(): Promise<void> {
  const store = await readStore();
  await Promise.all(
    Object.entries(store.videos)
      .filter(([, e]) => e.state === "processing")
      .map(([name, e]) => refreshEntry(name, e)),
  );
}

/** Signed Bunny embed for a lesson file, or null when it should still play from our server. */
export async function bunnyPlaybackUrl(fileName: string): Promise<string | null> {
  if (!bunnyConfig()) return null;
  let entry = (await readStore()).videos[fileName];
  if (!entry || entry.state === "queued" || entry.state === "uploading") {
    queueBunnyUpload(fileName);
    return null;
  }
  if (entry.state === "processing") entry = await refreshEntry(fileName, entry);
  return entry.state === "ready" && entry.videoId ? bunnyEmbedUrl(entry.videoId) : null;
}
