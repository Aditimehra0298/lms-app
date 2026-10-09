"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Download, FileSpreadsheet, FolderDown, Loader2, RefreshCw, Square } from "lucide-react";

type VideoRow = {
  fileName: string;
  downloadName: string;
  originalName: string | null;
  courseSlug: string | null;
  sizeBytes: number;
  uploadedAt: string;
};

type DirHandle = {
  getDirectoryHandle: (name: string, opts?: { create?: boolean }) => Promise<DirHandle>;
  getFileHandle: (
    name: string,
    opts?: { create?: boolean },
  ) => Promise<{ getFile: () => Promise<File>; createWritable: () => Promise<WritableStream<Uint8Array>> }>;
};

type Progress = {
  done: number;
  skipped: number;
  failed: number;
  total: number;
  current: string;
  bytesDone: number;
  bytesTotal: number;
};

const NO_COURSE = "no-course";

function formatBytes(n: number): string {
  if (n >= 1024 ** 3) return `${(n / 1024 ** 3).toFixed(2)} GB`;
  if (n >= 1024 ** 2) return `${(n / 1024 ** 2).toFixed(1)} MB`;
  if (n >= 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${n} B`;
}

function downloadHref(v: VideoRow): string {
  return `/api/admin/videos/${encodeURIComponent(v.fileName)}?name=${encodeURIComponent(v.downloadName)}`;
}

function folderName(courseSlug: string | null): string {
  return (courseSlug || NO_COURSE).replace(/[\\/:*?"<>|]+/g, "_");
}

export default function AdminVideoLibrary() {
  const [videos, setVideos] = useState<VideoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [course, setCourse] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [progress, setProgress] = useState<Progress | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/videos", { cache: "no-store", credentials: "include" });
      const data = (await res.json()) as { ok?: boolean; videos?: VideoRow[]; message?: string };
      if (!data.ok) throw new Error(data.message || `Could not load videos (${res.status})`);
      setVideos(data.videos ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load videos");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const courses = useMemo(
    () => Array.from(new Set(videos.map((v) => v.courseSlug || NO_COURSE))).sort(),
    [videos],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return videos.filter((v) => {
      if (course && (v.courseSlug || NO_COURSE) !== course) return false;
      if (!q) return true;
      return (
        v.downloadName.toLowerCase().includes(q) ||
        v.fileName.toLowerCase().includes(q) ||
        (v.courseSlug ?? "").toLowerCase().includes(q)
      );
    });
  }, [videos, search, course]);

  const totalBytes = useMemo(() => videos.reduce((s, v) => s + v.sizeBytes, 0), [videos]);
  const selectedRows = useMemo(() => videos.filter((v) => selected.has(v.fileName)), [videos, selected]);
  const selectedBytes = selectedRows.reduce((s, v) => s + v.sizeBytes, 0);
  const allFilteredSelected = filtered.length > 0 && filtered.every((v) => selected.has(v.fileName));
  const busy = progress !== null;

  const toggle = (fileName: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(fileName)) next.delete(fileName);
      else next.add(fileName);
      return next;
    });

  const toggleAllFiltered = () =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) filtered.forEach((v) => next.delete(v.fileName));
      else filtered.forEach((v) => next.add(v.fileName));
      return next;
    });

  const downloadToFolder = async (rows: VideoRow[]) => {
    if (rows.length === 0) return;
    setMessage(null);
    const picker = (window as unknown as { showDirectoryPicker?: (o?: object) => Promise<DirHandle> })
      .showDirectoryPicker;

    if (!picker) {
      // Browsers without folder access (Firefox/Safari): trigger one download at a time.
      if (rows.length > 20 && !window.confirm(`This browser will start ${rows.length} separate downloads. Continue?`)) {
        return;
      }
      const controller = new AbortController();
      abortRef.current = controller;
      const bytesTotal = rows.reduce((s, v) => s + v.sizeBytes, 0);
      let bytesDone = 0;
      for (let i = 0; i < rows.length; i++) {
        if (controller.signal.aborted) break;
        const v = rows[i];
        setProgress({ done: i, skipped: 0, failed: 0, total: rows.length, current: v.downloadName, bytesDone, bytesTotal });
        const a = document.createElement("a");
        a.href = downloadHref(v);
        a.download = v.downloadName;
        document.body.appendChild(a);
        a.click();
        a.remove();
        bytesDone += v.sizeBytes;
        await new Promise((r) => setTimeout(r, 1500));
      }
      setProgress(null);
      abortRef.current = null;
      setMessage("Downloads started. Check your browser's downloads list. Use Chrome or Edge to save into a folder.");
      return;
    }

    let root: DirHandle;
    try {
      root = await picker({ mode: "readwrite" });
    } catch {
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    const p: Progress = {
      done: 0,
      skipped: 0,
      failed: 0,
      total: rows.length,
      current: "",
      bytesDone: 0,
      bytesTotal: rows.reduce((s, v) => s + v.sizeBytes, 0),
    };
    setProgress({ ...p });
    const failedNames: string[] = [];

    for (const v of rows) {
      if (controller.signal.aborted) break;
      p.current = v.downloadName;
      setProgress({ ...p });
      try {
        const dir = await root.getDirectoryHandle(folderName(v.courseSlug), { create: true });
        try {
          const existing = await (await dir.getFileHandle(v.downloadName)).getFile();
          if (existing.size === v.sizeBytes) {
            p.skipped += 1;
            p.done += 1;
            p.bytesDone += v.sizeBytes;
            setProgress({ ...p });
            continue;
          }
        } catch {
          // not saved yet
        }

        const res = await fetch(downloadHref(v), { credentials: "include", signal: controller.signal });
        if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
        const handle = await dir.getFileHandle(v.downloadName, { create: true });
        const writable = await handle.createWritable();
        const startBytes = p.bytesDone;
        let fileBytes = 0;
        let lastUpdate = 0;
        const counter = new TransformStream<Uint8Array, Uint8Array>({
          transform(chunk, ctrl) {
            fileBytes += chunk.byteLength;
            const now = Date.now();
            if (now - lastUpdate > 500) {
              lastUpdate = now;
              setProgress({ ...p, bytesDone: startBytes + fileBytes });
            }
            ctrl.enqueue(chunk);
          },
        });
        await res.body.pipeThrough(counter).pipeTo(writable, { signal: controller.signal });
        p.done += 1;
        p.bytesDone = startBytes + v.sizeBytes;
      } catch {
        if (controller.signal.aborted) break;
        p.failed += 1;
        p.done += 1;
        p.bytesDone += v.sizeBytes;
        failedNames.push(v.downloadName);
      }
      setProgress({ ...p });
    }

    const stopped = controller.signal.aborted;
    abortRef.current = null;
    setProgress(null);
    const saved = p.done - p.skipped - p.failed;
    setMessage(
      `${stopped ? "Stopped. " : ""}Saved ${saved}, already on computer ${p.skipped}` +
        (p.failed ? `, failed ${p.failed} (${failedNames.slice(0, 5).join(", ")}${failedNames.length > 5 ? "…" : ""}). Run again to retry.` : ".") +
        (stopped ? " Run again with the same folder to continue." : ""),
    );
  };

  const field =
    "w-full rounded-xl border border-white/[0.07] bg-[#060b14]/90 px-3 py-2.5 text-sm text-white outline-none placeholder:text-gray-600 focus:border-violet-500/50";

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-white/[0.07] bg-[#0b1224] px-4 py-4 sm:px-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-white">Video Library</h2>
            <p className="mt-1 max-w-2xl text-xs text-gray-400">
              Every video uploaded to the LMS. Download one with its button, or tick several (or all) and save them
              into a folder on your computer — each course goes into its own sub-folder. If it stops, run it again
              with the same folder: finished videos are skipped.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full border border-white/10 bg-black/40 px-3 py-1 text-[11px] text-gray-300">
              {videos.length} videos · {formatBytes(totalBytes)}
            </span>
            <button
              type="button"
              onClick={() => void load()}
              disabled={loading || busy}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-1.5 text-xs font-semibold text-gray-200 hover:bg-white/5 disabled:opacity-50"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </button>
            <a
              href="/api/admin/videos?format=csv"
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-1.5 text-xs font-semibold text-gray-200 hover:bg-white/5"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" /> Video list (CSV)
            </a>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_16rem]">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search video name or course…"
            className={field}
          />
          <select value={course} onChange={(e) => setCourse(e.target.value)} className={`${field} cursor-pointer`}>
            <option value="">All courses</option>
            {courses.map((c) => (
              <option key={c} value={c}>
                {c === NO_COURSE ? "No course linked" : c}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={busy || selectedRows.length === 0}
            onClick={() => void downloadToFolder(selectedRows)}
            className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-violet-500 disabled:opacity-50"
          >
            <FolderDown className="h-4 w-4" />
            Download selected ({selectedRows.length} · {formatBytes(selectedBytes)})
          </button>
          <button
            type="button"
            disabled={busy || filtered.length === 0}
            onClick={() => void downloadToFolder(filtered)}
            className="inline-flex items-center gap-2 rounded-xl border border-violet-400/40 px-4 py-2.5 text-xs font-bold text-violet-100 hover:bg-violet-500/10 disabled:opacity-50"
          >
            <FolderDown className="h-4 w-4" />
            Download all {course || search ? "shown" : ""} ({filtered.length} ·{" "}
            {formatBytes(filtered.reduce((s, v) => s + v.sizeBytes, 0))})
          </button>
          {busy ? (
            <button
              type="button"
              onClick={() => abortRef.current?.abort()}
              className="inline-flex items-center gap-2 rounded-xl border border-rose-400/40 px-4 py-2.5 text-xs font-bold text-rose-100 hover:bg-rose-500/10"
            >
              <Square className="h-3.5 w-3.5" /> Stop
            </button>
          ) : null}
        </div>

        {progress ? (
          <div className="mt-4 rounded-xl border border-violet-400/30 bg-violet-500/10 px-4 py-3 text-xs text-violet-50">
            <div className="flex flex-wrap justify-between gap-2">
              <span className="inline-flex min-w-0 items-center gap-2">
                <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
                <span className="truncate">
                  {progress.done + 1 > progress.total ? progress.total : progress.done + 1} / {progress.total} —{" "}
                  {progress.current}
                </span>
              </span>
              <span className="tabular-nums">
                {formatBytes(progress.bytesDone)} / {formatBytes(progress.bytesTotal)}
              </span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-black/40">
              <div
                className="h-full bg-violet-400 transition-all"
                style={{
                  width: `${progress.bytesTotal ? Math.min(100, (progress.bytesDone / progress.bytesTotal) * 100) : 0}%`,
                }}
              />
            </div>
            <p className="mt-2 text-[11px] text-violet-100/70">Keep this tab open until it finishes.</p>
          </div>
        ) : null}

        {message ? (
          <p className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-100">
            {message}
          </p>
        ) : null}
        {error ? (
          <p className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs text-rose-100">
            {error}
          </p>
        ) : null}
      </section>

      <section className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0d1528]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-xs">
            <thead>
              <tr className="border-b border-white/[0.08] bg-white/[0.03] text-[10px] font-bold uppercase tracking-wider text-gray-500">
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={allFilteredSelected}
                    onChange={toggleAllFiltered}
                    aria-label="Select all shown videos"
                  />
                </th>
                <th className="px-4 py-3">Video</th>
                <th className="px-4 py-3">Course</th>
                <th className="px-4 py-3">Size</th>
                <th className="px-4 py-3">Uploaded</th>
                <th className="px-4 py-3">Download</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                    <Loader2 className="mr-2 inline h-4 w-4 animate-spin" /> Loading videos…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                    No videos found.
                  </td>
                </tr>
              ) : (
                filtered.map((v) => (
                  <tr key={v.fileName} className="hover:bg-violet-500/[0.06]">
                    <td className="px-4 py-2.5">
                      <input
                        type="checkbox"
                        checked={selected.has(v.fileName)}
                        onChange={() => toggle(v.fileName)}
                        aria-label={`Select ${v.downloadName}`}
                      />
                    </td>
                    <td className="max-w-[22rem] px-4 py-2.5">
                      <p className="truncate font-semibold text-white" title={v.downloadName}>
                        {v.downloadName}
                      </p>
                      {v.originalName ? (
                        <p className="truncate font-mono text-[10px] text-gray-600">{v.fileName}</p>
                      ) : null}
                    </td>
                    <td className="px-4 py-2.5 text-gray-300">{v.courseSlug || "—"}</td>
                    <td className="px-4 py-2.5 tabular-nums text-gray-300">{formatBytes(v.sizeBytes)}</td>
                    <td className="px-4 py-2.5 text-gray-400">{new Date(v.uploadedAt).toLocaleDateString()}</td>
                    <td className="px-4 py-2.5">
                      <a
                        href={downloadHref(v)}
                        download={v.downloadName}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 font-semibold text-white hover:bg-emerald-500"
                      >
                        <Download className="h-3.5 w-3.5" /> Download
                      </a>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
