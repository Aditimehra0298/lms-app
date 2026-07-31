"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Search,
  RefreshCw,
  TicketCheck,
  Loader2,
  AlertCircle,
  ChevronDown,
  X,
  Clock,
  CheckCircle2,
  CircleDot,
} from "lucide-react";

interface Issue {
  id: string;
  issueToken: string;
  userId: string | null;
  userName: string | null;
  userEmail: string | null;
  studentId?: string | null;
  issueText: string;
  subject?: string | null;
  issueStatus: string;
  category: string | null;
  priority?: string | null;
  sentiment?: string | null;
  transactionId?: string | null;
  paymentDate?: string | null;
  screenshotUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

type StatusFilter = "all" | "open" | "in_progress" | "resolved" | "closed";

const STATUS_LABELS: Record<string, string> = {
  open: "Open",
  in_progress: "In Progress",
  resolved: "Resolved",
  closed: "Closed",
};

const STATUS_COLORS: Record<string, string> = {
  open: "bg-amber-500/20 text-amber-300 border border-amber-500/30",
  in_progress: "bg-blue-500/20 text-blue-300 border border-blue-500/30",
  resolved: "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30",
  closed: "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30",
};

const STATUS_ICON: Record<string, React.FC<{ className?: string }>> = {
  open: ({ className }) => <CircleDot className={className} />,
  in_progress: ({ className }) => <Clock className={className} />,
  resolved: ({ className }) => <CheckCircle2 className={className} />,
  closed: ({ className }) => <CheckCircle2 className={className} />,
};

const PRIORITY_COLORS: Record<string, string> = {
  high: "bg-rose-500/20 text-rose-300 border border-rose-500/30",
  medium: "bg-amber-500/20 text-amber-300 border border-amber-500/30",
  low: "bg-slate-500/20 text-slate-300 border border-slate-500/30",
};

const CATEGORY_COLORS: Record<string, string> = {
  TECH: "bg-purple-500/20 text-purple-300",
  QUIZ: "bg-cyan-500/20 text-cyan-300",
  VIDEO: "bg-pink-500/20 text-pink-300",
  AUTH: "bg-orange-500/20 text-orange-300",
  PAY: "bg-green-500/20 text-green-300",
  CERT: "bg-yellow-500/20 text-yellow-300",
  LMS: "bg-slate-500/20 text-slate-300",
  ASSIGN: "bg-indigo-500/20 text-indigo-300",
  FAQ: "bg-teal-500/20 text-teal-300",
  COURSE: "bg-sky-500/20 text-sky-300",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isClosedLike(status: string) {
  return status === "closed" || status === "resolved";
}

export default function AdminSupportTickets() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [updatingToken, setUpdatingToken] = useState<string | null>(null);

  const fetchIssues = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (searchQuery.trim()) {
        if (searchQuery.trim().toUpperCase().startsWith("SFT-")) {
          params.set("token", searchQuery.trim().toUpperCase());
        } else {
          params.set("q", searchQuery.trim());
        }
      }
      const res = await fetch(`/api/tickets?${params.toString()}`, { cache: "no-store" });
      if (!res.ok) {
        const fallback = await fetch(`/api/issues?${params.toString()}`, { cache: "no-store" });
        if (!fallback.ok) throw new Error(`HTTP ${fallback.status}`);
        const data = await fallback.json();
        setIssues(data.issues ?? []);
        return;
      }
      const data = await res.json();
      const rows = (data.tickets ?? data.issues ?? []).map((t: Record<string, unknown>) => ({
        id: String(t.id),
        issueToken: String(t.issueToken),
        userId: (t.userId as string) ?? null,
        userName: (t.userName as string) ?? null,
        userEmail: (t.userEmail as string) ?? null,
        studentId: (t.studentId as string) ?? null,
        issueText: String(t.description ?? t.issueText ?? ""),
        subject: (t.subject as string) ?? null,
        issueStatus: String(t.status ?? t.issueStatus ?? "open"),
        category: (t.category as string) ?? null,
        priority: (t.priority as string) ?? "medium",
        sentiment: (t.sentiment as string) ?? null,
        transactionId: (t.transactionId as string) ?? null,
        paymentDate: (t.paymentDate as string) ?? null,
        screenshotUrl: (t.screenshotUrl as string) ?? null,
        createdAt: String(t.createdAt),
        updatedAt: String(t.updatedAt ?? t.createdAt),
      }));
      setIssues(rows);
    } catch {
      setError("Failed to load support tickets. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchQuery]);

  useEffect(() => {
    fetchIssues();
  }, [fetchIssues]);

  const updateStatus = async (token: string, newStatus: string) => {
    setUpdatingToken(token);
    try {
      let res = await fetch(`/api/tickets/${encodeURIComponent(token)}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        res = await fetch(`/api/issues/${encodeURIComponent(token)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        });
      }
      if (!res.ok) throw new Error();
      setIssues((prev) =>
        prev.map((i) => (i.issueToken === token ? { ...i, issueStatus: newStatus } : i)),
      );
    } catch {
      alert("Failed to update ticket status.");
    } finally {
      setUpdatingToken(null);
    }
  };

  const counts = {
    total: issues.length,
    open: issues.filter((i) => i.issueStatus === "open").length,
    in_progress: issues.filter((i) => i.issueStatus === "in_progress").length,
    closed: issues.filter((i) => isClosedLike(i.issueStatus)).length,
    high: issues.filter((i) => i.priority === "high" && !isClosedLike(i.issueStatus)).length,
  };

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-white/10 bg-[#0b1224] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold flex items-center gap-2">
              <TicketCheck size={20} className="text-[#FFB800]" />
              Support Tickets
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">
              AI chatbot tickets with priority from sentiment analysis. Manage payment and tech issues here.
            </p>
          </div>
          <button
            onClick={fetchIssues}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-[#0a1120] px-3 py-2 text-xs text-gray-300 hover:border-[#FFB800]/40 hover:text-[#FFB800] transition disabled:opacity-50"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          { label: "Total", value: counts.total, color: "text-white", bg: "bg-white/5" },
          { label: "Open", value: counts.open, color: "text-amber-300", bg: "bg-amber-500/10" },
          { label: "In Progress", value: counts.in_progress, color: "text-blue-300", bg: "bg-blue-500/10" },
          { label: "Resolved", value: counts.closed, color: "text-emerald-300", bg: "bg-emerald-500/10" },
          { label: "High Priority", value: counts.high, color: "text-rose-300", bg: "bg-rose-500/10" },
        ].map(({ label, value, color, bg }) => (
          <article key={label} className="rounded-xl border border-white/10 bg-[#0d1528] p-3">
            <div className={`mb-1.5 inline-flex rounded-md ${bg} px-2 py-1`}>
              <span className={`text-[10px] font-semibold uppercase tracking-wide ${color}`}>{label}</span>
            </div>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
          </article>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-[#0a1120] px-3 py-2 text-xs flex-1 min-w-[200px]">
          <Search size={13} className="text-gray-500 shrink-0" />
          <input
            className="bg-transparent text-sm text-white outline-none placeholder:text-gray-500 w-full"
            placeholder="Search by token (SFT-...) or issue text…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchIssues()}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="text-gray-500 hover:text-white">
              <X size={12} />
            </button>
          )}
        </div>

        <div className="flex gap-1.5 flex-wrap">
          {(["all", "open", "in_progress", "resolved"] as StatusFilter[]).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium border transition ${
                statusFilter === s
                  ? "border-[#FFB800]/50 bg-[#FFB800]/15 text-[#FFB800]"
                  : "border-white/10 bg-[#0a1120] text-gray-400 hover:text-white"
              }`}
            >
              {s === "all" ? "All" : STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      <section className="rounded-xl border border-white/10 bg-[#0d1528] p-3">
        {loading ? (
          <div className="flex items-center justify-center gap-3 py-16 text-gray-400 text-sm">
            <Loader2 size={18} className="animate-spin text-[#FFB800]" />
            Loading tickets…
          </div>
        ) : error ? (
          <div className="flex items-center gap-3 rounded-lg border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-xs text-rose-200">
            <AlertCircle size={15} className="shrink-0 text-rose-400" />
            {error}
          </div>
        ) : issues.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-500 gap-3">
            <TicketCheck size={36} className="text-gray-700" />
            <p className="text-sm">No support tickets found.</p>
            {(searchQuery || statusFilter !== "all") && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setStatusFilter("all");
                }}
                className="text-xs text-[#FFB800] hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-xs">
              <thead className="text-gray-400">
                <tr>
                  {[
                    "Token",
                    "Priority",
                    "Category",
                    "Subject / Issue",
                    "Payment details",
                    "Status",
                    "User",
                    "Created",
                    "Action",
                  ].map((h) => (
                    <th key={h} className="border-b border-white/10 py-2.5 pr-4 font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {issues.map((issue) => {
                  const StatusIcon = STATUS_ICON[issue.issueStatus] ?? CircleDot;
                  const catColor = CATEGORY_COLORS[issue.category ?? ""] ?? "bg-gray-500/20 text-gray-300";
                  const priority = issue.priority || "medium";
                  return (
                    <tr key={issue.id} className="border-b border-white/5 hover:bg-white/[0.02] transition">
                      <td className="py-3 pr-4">
                        <span className="font-mono text-[11px] font-bold text-white tracking-wider bg-zinc-800/60 px-2 py-1 rounded-md border border-white/10">
                          {issue.issueToken}
                        </span>
                      </td>
                      <td className="py-3 pr-4">
                        <span
                          className={`rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${PRIORITY_COLORS[priority] ?? PRIORITY_COLORS.medium}`}
                        >
                          {priority}
                          {issue.sentiment ? ` · ${issue.sentiment}` : ""}
                        </span>
                      </td>
                      <td className="py-3 pr-4">
                        <span
                          className={`rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${catColor}`}
                        >
                          {issue.category ?? "—"}
                        </span>
                      </td>
                      <td className="py-3 pr-4 max-w-[280px]">
                        {issue.subject ? (
                          <p className="text-white font-medium mb-0.5 line-clamp-1">{issue.subject}</p>
                        ) : null}
                        <p className="text-gray-300 leading-relaxed line-clamp-2" title={issue.issueText}>
                          {issue.issueText}
                        </p>
                      </td>
                      <td className="py-3 pr-4 text-gray-400 whitespace-nowrap">
                        {issue.transactionId || issue.paymentDate || issue.studentId ? (
                          <div className="space-y-0.5 text-[10px]">
                            {issue.studentId ? <p>Student: {issue.studentId}</p> : null}
                            {issue.transactionId ? <p>Txn: {issue.transactionId}</p> : null}
                            {issue.paymentDate ? <p>Date: {issue.paymentDate}</p> : null}
                            {issue.screenshotUrl ? (
                              <a
                                href={issue.screenshotUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[#FFB800] hover:underline"
                              >
                                Screenshot
                              </a>
                            ) : null}
                          </div>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="py-3 pr-4">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold ${STATUS_COLORS[issue.issueStatus] ?? ""}`}
                        >
                          <StatusIcon className="h-3 w-3" />
                          {STATUS_LABELS[issue.issueStatus] ?? issue.issueStatus}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-gray-400">
                        <div>
                          <p className="text-white font-medium">{issue.userName ?? "Guest"}</p>
                          <p className="text-[10px] text-gray-500">{issue.userEmail ?? "—"}</p>
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-gray-500 whitespace-nowrap">{formatDate(issue.createdAt)}</td>
                      <td className="py-3">
                        {updatingToken === issue.issueToken ? (
                          <Loader2 size={14} className="animate-spin text-[#FFB800]" />
                        ) : (
                          <div className="relative inline-block">
                            <select
                              value={
                                issue.issueStatus === "closed" ? "resolved" : issue.issueStatus
                              }
                              onChange={(e) => updateStatus(issue.issueToken, e.target.value)}
                              className="appearance-none rounded-lg border border-white/10 bg-[#0a1120] px-3 py-1.5 text-xs text-white pr-7 focus:outline-none focus:border-[#FFB800]/50 cursor-pointer hover:border-white/20 transition"
                            >
                              <option value="open">Open</option>
                              <option value="in_progress">In Progress</option>
                              <option value="resolved">Resolved</option>
                            </select>
                            <ChevronDown
                              size={11}
                              className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-400"
                            />
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
