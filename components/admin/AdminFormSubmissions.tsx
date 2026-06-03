"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import {
  Archive,
  CheckCircle2,
  Inbox,
  Loader2,
  Mail,
  MessageSquare,
  Newspaper,
  RefreshCw,
  RotateCcw,
  Search,
} from "lucide-react";
import { getLearnerEmail } from "@/lib/learner-session-client";

type Submission = {
  id: string;
  formType: string;
  status: string;
  name: string | null;
  email: string;
  phone: string | null;
  subject: string | null;
  category: string | null;
  message: string | null;
  pagePath: string | null;
  createdAt: string;
  updatedAt: string;
};

type TabFilter = "all" | "contact" | "newsletter";
type ViewFilter = "active" | "done" | "archived" | "all";

const FORM_TABS: { id: TabFilter; label: string }[] = [
  { id: "all", label: "All forms" },
  { id: "contact", label: "Contact form" },
  { id: "newsletter", label: "Newsletter" },
];

const INBOX_VIEWS: { id: ViewFilter; label: string; hint: string }[] = [
  { id: "active", label: "Inbox", hint: "New & read — needs attention" },
  { id: "done", label: "Resolved", hint: "Solution done" },
  { id: "archived", label: "Archived", hint: "Hidden from inbox — restore here" },
  { id: "all", label: "All records", hint: "Every submission" },
];

const FORM_TYPE_META: Record<string, { label: string; className: string }> = {
  contact: {
    label: "Contact form",
    className: "bg-violet-500/15 text-violet-200 border-violet-500/30",
  },
  newsletter: {
    label: "Newsletter",
    className: "bg-sky-500/15 text-sky-200 border-sky-500/30",
  },
};

const STATUS_STYLES: Record<string, string> = {
  new: "bg-amber-500/20 text-amber-200 border-amber-500/30",
  read: "bg-blue-500/20 text-blue-200 border-blue-500/30",
  done: "bg-emerald-500/20 text-emerald-200 border-emerald-500/30",
  archived: "bg-slate-500/20 text-slate-300 border-slate-500/30",
};

const STATUS_LABELS: Record<string, string> = {
  new: "New",
  read: "Read",
  done: "Resolved",
  archived: "Archived",
};

/** Column order — header label must match body cells below. */
const TABLE_COLUMNS = [
  { key: "formType", label: "Form Type" },
  { key: "name", label: "Full Name" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Mobile" },
  { key: "message", label: "Message" },
  { key: "pagePath", label: "Page" },
  { key: "status", label: "Status" },
  { key: "createdAt", label: "Submitted On" },
  { key: "actions", label: "Actions" },
] as const;

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function cellText(value: string | null | undefined, maxLen = 40) {
  const v = value?.trim();
  if (!v) return "—";
  return v.length > maxLen ? `${v.slice(0, maxLen)}…` : v;
}

export default function AdminFormSubmissions() {
  const [rows, setRows] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formTab, setFormTab] = useState<TabFilter>("all");
  const [view, setView] = useState<ViewFilter>("active");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    setError(null);
    const email = getLearnerEmail();
    const params = new URLSearchParams();
    if (email) params.set("email", email);
    params.set("view", view);
    if (formTab !== "all") params.set("formType", formTab);
    if (search.trim()) params.set("q", search.trim());

    try {
      const res = await fetch(`/api/admin/form-submissions?${params}`, { cache: "no-store" });
      const data = (await res.json()) as { ok?: boolean; submissions?: Submission[]; message?: string };
      if (!res.ok || !data.ok) throw new Error(data.message ?? `HTTP ${res.status}`);
      setRows(data.submissions ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load submissions.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [formTab, view, search]);

  useEffect(() => {
    void fetchRows();
  }, [fetchRows]);

  const patchRow = (updated: Submission) => {
    setRows((prev) => prev.map((r) => (r.id === updated.id ? { ...r, ...updated } : r)));
  };

  const apiPatch = async (id: string, body: { status?: string; action?: "revert" }) => {
    setUpdatingId(id);
    const email = getLearnerEmail();
    try {
      const res = await fetch(
        `/api/admin/form-submissions${email ? `?email=${encodeURIComponent(email)}` : ""}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...(email ? { "x-admin-email": email } : {}),
          },
          body: JSON.stringify({ id, ...body }),
        },
      );
      const data = (await res.json()) as { ok?: boolean; submission?: Submission; message?: string };
      if (!res.ok || !data.ok || !data.submission) {
        throw new Error(data.message ?? "Update failed");
      }
      patchRow(data.submission);
      if (view === "active" && (body.status === "archived" || body.status === "done")) {
        setRows((prev) => prev.filter((r) => r.id !== id));
      }
      if (view === "archived" && body.action === "revert") {
        setRows((prev) => prev.filter((r) => r.id !== id));
      }
      return true;
    } catch {
      return false;
    } finally {
      setUpdatingId(null);
    }
  };

  const replyMailto = (row: Submission) => {
    const subject =
      row.formType === "newsletter"
        ? "Newsletter — Sustainable Futuristic Training"
        : `Re: Your contact inquiry`;
    const body =
      row.formType === "contact" && row.message
        ? `\n\n---\nYour message:\n${row.message}`
        : "";
    return `mailto:${encodeURIComponent(row.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const counts = {
    shown: rows.length,
    new: rows.filter((r) => r.status === "new").length,
    done: rows.filter((r) => r.status === "done").length,
    contact: rows.filter((r) => r.formType === "contact").length,
    newsletter: rows.filter((r) => r.formType === "newsletter").length,
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Website Form Data</h1>
          <p className="mt-1 max-w-3xl text-sm text-gray-400">
            Table of all contact and newsletter submissions. Archived rows are not deleted — open the{" "}
            <strong className="text-amber-200">Archived</strong> tab or use <strong className="text-amber-200">Restore to inbox</strong> to bring emails back.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void fetchRows()}
          className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-[#0a1120] px-3 py-2 text-sm text-gray-200 hover:bg-white/5"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          Refresh table
        </button>
      </div>

      <div className="flex flex-wrap gap-1 rounded-xl border border-white/10 bg-[#060b14] p-1">
        {INBOX_VIEWS.map((v) => (
          <button
            key={v.id}
            type="button"
            onClick={() => setView(v.id)}
            title={v.hint}
            className={`rounded-lg px-3 py-2 text-left transition ${
              view === v.id ? "bg-amber-500/20 text-amber-100" : "text-gray-400 hover:bg-white/5 hover:text-white"
            }`}
          >
            <span className="block text-xs font-semibold">{v.label}</span>
            <span className="block text-[10px] font-normal text-gray-500">{v.hint}</span>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-1 rounded-xl border border-white/10 bg-[#060b14] p-1">
        {FORM_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setFormTab(t.id)}
            className={`rounded-lg px-4 py-2 text-xs font-semibold ${
              formTab === t.id ? "bg-white/10 text-white" : "text-gray-400 hover:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        {[
          { label: "Rows in table", value: counts.shown, icon: Inbox },
          { label: "New in view", value: counts.new, icon: Mail },
          { label: "Resolved in view", value: counts.done, icon: CheckCircle2 },
          { label: "Newsletter in view", value: counts.newsletter, icon: Newspaper },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-white/10 bg-[#0b1224] px-4 py-3">
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <s.icon size={14} className="text-amber-300" />
              {s.label}
            </div>
            <p className="mt-1 text-2xl font-bold text-white">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, email, phone, message…"
          className="w-full rounded-xl border border-white/10 bg-[#0b1224] py-2.5 pl-9 pr-3 text-sm text-white outline-none focus:border-amber-400/40"
        />
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
          {error}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-white/10 bg-[#0b1224]">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-20 text-gray-400">
            <Loader2 size={22} className="animate-spin" />
            Loading table…
          </div>
        ) : rows.length === 0 ? (
          <p className="py-20 text-center text-sm text-gray-500">
            No rows for this view. Try <button type="button" className="text-amber-300 underline" onClick={() => setView("all")}>All records</button> or{" "}
            <button type="button" className="text-amber-300 underline" onClick={() => setView("archived")}>Archived</button>.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] border-collapse text-left text-xs">
              <caption className="sr-only">Website form submissions</caption>
              <thead>
                <tr className="bg-[#0d1528]">
                  {TABLE_COLUMNS.map((col) => (
                    <th
                      key={col.key}
                      scope="col"
                      className="border border-white/10 px-3 py-3 text-left text-[12px] font-bold text-white"
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const ft = FORM_TYPE_META[row.formType] ?? {
                    label: row.formType,
                    className: "bg-white/10 text-gray-300 border-white/10",
                  };
                  const expanded = expandedId === row.id;
                  const busy = updatingId === row.id;

                  return (
                    <Fragment key={row.id}>
                      <tr
                        className={`hover:bg-white/[0.03] ${expanded ? "bg-amber-500/5" : "even:bg-black/15"}`}
                      >
                        <td className="border border-white/10 px-3 py-2.5 align-top">
                          <span className={`inline-flex rounded border px-2 py-0.5 text-[10px] font-semibold ${ft.className}`}>
                            {ft.label}
                          </span>
                        </td>
                        <td className="border border-white/10 px-3 py-2.5 align-top text-gray-200">
                          {cellText(row.name, 28)}
                        </td>
                        <td className="border border-white/10 px-3 py-2.5 align-top">
                          <a href={`mailto:${row.email}`} className="font-medium text-amber-200 hover:underline">
                            {row.email}
                          </a>
                        </td>
                        <td className="border border-white/10 px-3 py-2.5 align-top text-gray-300">
                          {cellText(row.phone, 14)}
                        </td>
                        <td className="max-w-[200px] border border-white/10 px-3 py-2.5 align-top">
                          <button
                            type="button"
                            onClick={() => setExpandedId(expanded ? null : row.id)}
                            className="text-left text-gray-300 underline decoration-gray-600 hover:text-white"
                            title={row.message ?? ""}
                          >
                            {cellText(row.message, 48)}
                          </button>
                        </td>
                        <td className="border border-white/10 px-3 py-2.5 align-top text-gray-500">
                          {cellText(row.pagePath, 14)}
                        </td>
                        <td className="border border-white/10 px-3 py-2.5 align-top">
                          <span
                            className={`inline-flex rounded border px-2 py-0.5 text-[10px] font-semibold ${STATUS_STYLES[row.status] ?? STATUS_STYLES.new}`}
                          >
                            {STATUS_LABELS[row.status] ?? row.status}
                          </span>
                        </td>
                        <td className="whitespace-nowrap border border-white/10 px-3 py-2.5 align-top text-gray-500">
                          {formatWhen(row.createdAt)}
                        </td>
                        <td className="border border-white/10 px-3 py-2.5 align-top">
                          <div className="flex min-w-[200px] flex-col gap-1">
                            <a
                              href={replyMailto(row)}
                              className="inline-flex items-center justify-center gap-1 rounded border border-amber-500/35 bg-amber-500/10 px-2 py-1 text-[10px] font-semibold text-amber-200 hover:bg-amber-500/20"
                            >
                              <Mail size={11} />
                              Reply by email
                            </a>
                            {row.status !== "done" ? (
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => void apiPatch(row.id, { status: "done" })}
                                className="inline-flex items-center justify-center gap-1 rounded border border-emerald-500/35 bg-emerald-500/10 px-2 py-1 text-[10px] font-semibold text-emerald-200 disabled:opacity-50"
                              >
                                <CheckCircle2 size={11} />
                                Mark resolved
                              </button>
                            ) : null}
                            {row.status !== "archived" ? (
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => void apiPatch(row.id, { status: "archived" })}
                                className="inline-flex items-center justify-center gap-1 rounded border border-white/15 bg-white/5 px-2 py-1 text-[10px] font-semibold text-gray-300 disabled:opacity-50"
                              >
                                <Archive size={11} />
                                Archive
                              </button>
                            ) : null}
                            {row.status === "archived" || row.status === "done" ? (
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => void apiPatch(row.id, { action: "revert" })}
                                className="inline-flex items-center justify-center gap-1 rounded border border-violet-500/35 bg-violet-500/10 px-2 py-1 text-[10px] font-semibold text-violet-200 disabled:opacity-50"
                              >
                                <RotateCcw size={11} />
                                Restore to inbox
                              </button>
                            ) : null}
                            {row.status === "new" ? (
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => void apiPatch(row.id, { status: "read" })}
                                className="text-[10px] text-blue-300 hover:underline disabled:opacity-50"
                              >
                                Mark read only
                              </button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                      {expanded ? (
                        <tr className="bg-black/25">
                          <td colSpan={TABLE_COLUMNS.length} className="border border-white/10 px-4 py-4">
                            <p className="mb-2 text-[11px] font-bold text-amber-200">Full row details</p>
                            <table className="w-full max-w-3xl border-collapse text-xs">
                              <tbody>
                                {[
                                  ["Form Type", ft.label],
                                  ["Full Name", row.name?.trim() || "—"],
                                  ["Email", row.email],
                                  ["Mobile", row.phone?.trim() || "—"],
                                  ["Message", row.message?.trim() || "—"],
                                  ["Page", row.pagePath?.trim() || "—"],
                                  ["Status", STATUS_LABELS[row.status] ?? row.status],
                                  ["Submitted On", formatWhen(row.createdAt)],
                                ].map(([label, value]) => (
                                  <tr key={label} className="border-t border-white/10 first:border-t-0">
                                    <th
                                      scope="row"
                                      className="w-36 border border-white/10 bg-[#0d1528] px-3 py-2 text-left font-bold text-white"
                                    >
                                      {label}
                                    </th>
                                    <td className="border border-white/10 px-3 py-2 text-gray-200 whitespace-pre-wrap">
                                      {value}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-[11px] text-gray-500">
        <MessageSquare size={12} className="mr-1 inline text-violet-400" />
        Contact = name, email, mobile, message.{" "}
        <Newspaper size={12} className="mr-1 inline text-sky-400" />
        Newsletter = email only. Resolved = handled; Archive = hide from inbox (restore anytime).
      </p>
    </div>
  );
}
