"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Bell, CalendarDays, ExternalLink, Plus, Save, Trash2 } from "lucide-react";
import { type AdminContent, type DashboardCalendarReminder } from "@/lib/content-schema";
import { toDateKey } from "@/lib/learner-calendar-reminders";

function newReminder(): DashboardCalendarReminder {
  return {
    id: `cr-${Date.now()}`,
    date: toDateKey(new Date()),
    title: "",
    body: "",
    href: "/my-learning?tab=dashboard",
    published: true,
  };
}

const fieldClass =
  "mt-1 w-full rounded-lg border border-white/10 bg-[#0a1120] px-3 py-2 text-xs text-white placeholder:text-gray-500";

export function AdminDashboardCalendarEditor() {
  const [reminders, setReminders] = useState<DashboardCalendarReminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/content", { cache: "no-store" });
      if (!res.ok) throw new Error("load failed");
      const data = (await res.json()) as AdminContent;
      setReminders(data.dashboard?.calendarReminders ?? []);
      setStatus(null);
    } catch {
      setStatus("Could not load calendar reminders.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    setSaving(true);
    setStatus(null);
    try {
      const res = await fetch("/api/admin/content", { cache: "no-store" });
      if (!res.ok) throw new Error("load failed");
      const current = (await res.json()) as AdminContent;
      const cleaned = reminders
        .filter((r) => r.title.trim())
        .map((r) => ({
          ...r,
          title: r.title.trim(),
          body: r.body?.trim() || "",
          href: r.href?.trim() || "/my-learning?tab=dashboard",
          published: r.published !== false,
        }));
      const put = await fetch("/api/admin/content", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...current,
          dashboard: {
            ...current.dashboard,
            calendarReminders: cleaned,
          },
        }),
      });
      if (!put.ok) throw new Error("save failed");
      setReminders(cleaned);
      setStatus("Saved — learners will see these on My Learning calendar.");
    } catch {
      setStatus("Save failed. Try again.");
    } finally {
      setSaving(false);
    }
  };

  const patch = (index: number, patch: Partial<DashboardCalendarReminder>) => {
    setReminders((rows) => rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  };

  return (
    <article className="mt-4 rounded-xl border border-[#FFC107]/25 bg-gradient-to-br from-[#FFC107]/5 to-[#0d1528] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#FFC107]/35 bg-[#FFC107]/15">
            <CalendarDays className="h-5 w-5 text-[#FFC107]" aria-hidden />
          </span>
          <div>
            <h3 className="text-sm font-semibold text-white">Learner calendar notifications</h3>
            <p className="mt-0.5 max-w-xl text-[11px] text-gray-400">
              Broadcast reminders to every learner on{" "}
              <span className="font-mono text-gray-300">/my-learning?tab=dashboard</span> and{" "}
              <span className="font-mono text-gray-300">/my-learning/calendar</span>. Learners can also
              add personal reminders on their own calendar.
            </p>
          </div>
        </div>
        <Link
          href="/my-learning/calendar"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg border border-[#FFC107]/40 bg-[#FFC107]/10 px-3 py-2 text-[11px] font-semibold text-[#FFC107] hover:bg-[#FFC107]/20"
        >
          <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          Preview calendar
        </Link>
      </div>

      {loading ? (
        <p className="mt-4 text-xs text-gray-500">Loading reminders…</p>
      ) : (
        <div className="mt-4 space-y-3">
          {reminders.length === 0 ? (
            <p className="rounded-lg border border-dashed border-white/10 px-4 py-6 text-center text-xs text-gray-500">
              No admin reminders yet. Add one for batch start dates, exam windows, or platform
              announcements.
            </p>
          ) : (
            reminders.map((row, index) => (
              <div
                key={row.id}
                className="grid gap-3 rounded-lg border border-white/10 bg-[#0a1120] p-3 md:grid-cols-[1fr_1.2fr_1fr_auto]"
              >
                <label className="block">
                  <span className="text-[10px] text-gray-500">Date</span>
                  <input
                    type="date"
                    value={row.date}
                    onChange={(e) => patch(index, { date: e.target.value })}
                    className={fieldClass}
                  />
                </label>
                <label className="block">
                  <span className="text-[10px] text-gray-500">Reminder title</span>
                  <input
                    value={row.title}
                    onChange={(e) => patch(index, { title: e.target.value })}
                    placeholder="e.g. HACCP batch starts"
                    className={fieldClass}
                  />
                </label>
                <label className="block">
                  <span className="text-[10px] text-gray-500">Link (optional)</span>
                  <input
                    value={row.href ?? ""}
                    onChange={(e) => patch(index, { href: e.target.value })}
                    placeholder="/my-learning?tab=live"
                    className={fieldClass}
                  />
                </label>
                <div className="flex items-end gap-2">
                  <label className="flex items-center gap-2 text-[10px] text-gray-400">
                    <input
                      type="checkbox"
                      checked={row.published !== false}
                      onChange={(e) => patch(index, { published: e.target.checked })}
                      className="rounded"
                    />
                    Live
                  </label>
                  <button
                    type="button"
                    onClick={() => setReminders((rows) => rows.filter((_, i) => i !== index))}
                    className="rounded-lg border border-red-500/30 p-2 text-red-300 hover:bg-red-500/10"
                    aria-label="Remove reminder"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <label className="block md:col-span-3">
                  <span className="text-[10px] text-gray-500">Notification body (optional)</span>
                  <input
                    value={row.body ?? ""}
                    onChange={(e) => patch(index, { body: e.target.value })}
                    placeholder="Shown in the notifications sidebar"
                    className={fieldClass}
                  />
                </label>
              </div>
            ))
          )}

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setReminders((rows) => [...rows, newReminder()])}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-[#0a1120] px-3 py-2 text-xs font-semibold text-white hover:border-[#FFC107]/40"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden />
              Add reminder
            </button>
            <button
              type="button"
              onClick={() => void save()}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#FFC107] px-4 py-2 text-xs font-bold text-black hover:bg-[#FFD54F] disabled:opacity-60"
            >
              <Save className="h-3.5 w-3.5" aria-hidden />
              {saving ? "Saving…" : "Save calendar"}
            </button>
            {status ? (
              <span className="inline-flex items-center gap-1 text-[11px] text-gray-400">
                <Bell className="h-3.5 w-3.5 text-[#FFC107]" aria-hidden />
                {status}
              </span>
            ) : null}
          </div>
        </div>
      )}
    </article>
  );
}
