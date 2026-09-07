"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Bell,
  CheckCheck,
  Info,
  Loader2,
  RefreshCw,
  ShieldAlert,
  Trash2,
  X,
} from "lucide-react";
import { getLearnerEmail } from "@/lib/learner-session-client";

type Severity = "critical" | "warning" | "info";

type NotificationItem = {
  id: string;
  title: string;
  detail: string;
  severity: Severity;
  source: string;
  createdAt: string;
  readAt: string | null;
  panelHint?: string | null;
};

type Props = {
  onNavigate?: (menu: string) => void;
};

function adminHeaders(): Record<string, string> {
  const email = getLearnerEmail();
  return {
    "Content-Type": "application/json",
  };
}

function severityIcon(severity: Severity) {
  if (severity === "critical") return ShieldAlert;
  if (severity === "warning") return AlertTriangle;
  return Info;
}

function severityTone(severity: Severity) {
  if (severity === "critical") return "border-rose-500/30 bg-rose-500/10 text-rose-100";
  if (severity === "warning") return "border-amber-400/30 bg-amber-500/10 text-amber-100";
  return "border-sky-400/30 bg-sky-500/10 text-sky-100";
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return "just now";
  const mins = Math.floor(ms / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function AdminNotificationsBell({ onNavigate }: Props) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const scannedOnce = useRef(false);

  const load = useCallback(async (withScan: boolean) => {
    setLoading(true);
    setError(null);
    try {
      const qs = withScan ? "?scan=1" : "";
      const res = await fetch(`/api/admin/notifications${qs}`, {
        cache: "no-store",
        headers: adminHeaders(),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        message?: string;
        unread?: number;
        items?: NotificationItem[];
      };
      if (!res.ok || !json.ok) {
        throw new Error(json.message ?? "Could not load notifications");
      }
      setItems(json.items ?? []);
      setUnread(json.unread ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load notifications");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(!scannedOnce.current);
    scannedOnce.current = true;
    const id = window.setInterval(() => {
      void load(true);
    }, 90_000);
    return () => window.clearInterval(id);
  }, [load]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const markAllRead = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/notifications", {
        method: "POST",
        headers: adminHeaders(),
        body: JSON.stringify({ action: "mark-read" }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        unread?: number;
        items?: NotificationItem[];
      };
      if (res.ok && json.ok) {
        setItems(json.items ?? []);
        setUnread(json.unread ?? 0);
      }
    } finally {
      setLoading(false);
    }
  };

  const clearRead = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/notifications", {
        method: "POST",
        headers: adminHeaders(),
        body: JSON.stringify({ action: "clear-read" }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        unread?: number;
        items?: NotificationItem[];
      };
      if (res.ok && json.ok) {
        setItems(json.items ?? []);
        setUnread(json.unread ?? 0);
      }
    } finally {
      setLoading(false);
    }
  };

  const openItem = async (item: NotificationItem) => {
    if (!item.readAt) {
      try {
        const res = await fetch("/api/admin/notifications", {
          method: "POST",
          headers: adminHeaders(),
          body: JSON.stringify({ action: "mark-read", ids: [item.id] }),
        });
        const json = (await res.json()) as {
          ok?: boolean;
          unread?: number;
          items?: NotificationItem[];
        };
        if (res.ok && json.ok) {
          setItems(json.items ?? []);
          setUnread(json.unread ?? 0);
        }
      } catch {
        /* ignore */
      }
    }
    if (item.panelHint && onNavigate) {
      onNavigate(item.panelHint);
      setOpen(false);
    }
  };

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        aria-label={unread > 0 ? `${unread} server notifications` : "Server notifications"}
        onClick={() => {
          setOpen((v) => !v);
          if (!open) void load(false);
        }}
        className="relative rounded-lg border border-white/10 bg-[#0a1120] p-2 text-gray-200 hover:bg-white/5"
      >
        <Bell size={14} />
        {unread > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 z-50 mt-2 w-[min(100vw-2rem,22rem)] overflow-hidden rounded-xl border border-cyan-400/20 bg-[#0b1224] shadow-2xl shadow-black/50">
          <div className="flex items-center justify-between gap-2 border-b border-white/10 px-3 py-2.5">
            <div>
              <p className="text-sm font-semibold text-white">Server alerts</p>
              <p className="text-[11px] text-gray-400">
                {unread > 0 ? `${unread} unread issue${unread === 1 ? "" : "s"}` : "No new issues"}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                title="Check again"
                onClick={() => void load(true)}
                className="rounded-md p-1.5 text-gray-400 hover:bg-white/5 hover:text-white"
              >
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              </button>
              <button
                type="button"
                title="Close"
                onClick={() => setOpen(false)}
                className="rounded-md p-1.5 text-gray-400 hover:bg-white/5 hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 border-b border-white/5 px-3 py-2">
            <button
              type="button"
              onClick={() => void markAllRead()}
              disabled={unread === 0 || loading}
              className="inline-flex items-center gap-1 rounded-md border border-white/10 px-2 py-1 text-[10px] text-gray-300 hover:bg-white/5 disabled:opacity-40"
            >
              <CheckCheck className="h-3 w-3" /> Mark all read
            </button>
            <button
              type="button"
              onClick={() => void clearRead()}
              disabled={loading || items.every((i) => !i.readAt)}
              className="inline-flex items-center gap-1 rounded-md border border-white/10 px-2 py-1 text-[10px] text-gray-300 hover:bg-white/5 disabled:opacity-40"
            >
              <Trash2 className="h-3 w-3" /> Clear read
            </button>
          </div>

          <div className="max-h-[min(70vh,24rem)] overflow-y-auto">
            {error ? (
              <p className="px-3 py-4 text-xs text-rose-300">{error}</p>
            ) : null}
            {!error && items.length === 0 ? (
              <div className="px-3 py-8 text-center">
                <Bell className="mx-auto mb-2 h-5 w-5 text-emerald-300/80" />
                <p className="text-sm text-gray-300">All clear</p>
                <p className="mt-1 text-[11px] text-gray-500">
                  When a server or payment issue appears, it will show up here.
                </p>
              </div>
            ) : null}
            {items.map((item) => {
              const Icon = severityIcon(item.severity);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => void openItem(item)}
                  className={`block w-full border-b border-white/5 px-3 py-3 text-left transition hover:bg-white/[0.03] ${
                    item.readAt ? "opacity-70" : ""
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <span
                      className={`mt-0.5 inline-flex rounded-md border p-1 ${severityTone(item.severity)}`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-start justify-between gap-2">
                        <span className="text-xs font-semibold text-white">{item.title}</span>
                        {!item.readAt ? (
                          <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-400" />
                        ) : null}
                      </span>
                      <span className="mt-1 block text-[11px] leading-relaxed text-gray-400">
                        {item.detail}
                      </span>
                      <span className="mt-1.5 flex flex-wrap items-center gap-2 text-[10px] text-gray-500">
                        <span>{timeAgo(item.createdAt)}</span>
                        {item.panelHint ? (
                          <span className="rounded border border-white/10 px-1.5 py-0.5 text-cyan-200/80">
                            Open {item.panelHint}
                          </span>
                        ) : null}
                      </span>
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
