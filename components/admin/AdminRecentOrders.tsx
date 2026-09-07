"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { getLearnerEmail } from "@/lib/learner-session-client";
import type { AdminPaymentRow } from "@/lib/payment-types";
import {
  commerceStatusLabel,
  commerceStatusTone,
  formatCommerceWhen,
  orderIdForPayment,
} from "@/lib/admin-commerce-ui";

type Props = {
  onViewAll: () => void;
};

export default function AdminRecentOrders({ onViewAll }: Props) {
  const [rows, setRows] = useState<AdminPaymentRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const email = getLearnerEmail();
      const res = await fetch("/api/admin/payments?limit=8", {
        headers: {},
        cache: "no-store",
      });
      const data = (await res.json()) as { ok?: boolean; payments?: AdminPaymentRow[] };
      if (res.ok && data.ok) setRows((data.payments ?? []).slice(0, 6));
      else setRows([]);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <article className="rounded-xl border border-white/10 bg-[#0d1528] p-3">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="font-semibold">Recent Orders</h3>
        <button
          type="button"
          onClick={onViewAll}
          className="rounded-md border border-white/10 bg-[#0a1120] px-2 py-1 text-xs hover:border-[#6f55ff]/50"
        >
          View All
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[620px] text-left text-xs">
          <thead className="text-gray-400">
            <tr>
              {["Order ID", "User", "Course", "Amount", "Status", "Date"].map((h) => (
                <th key={h} className="border-b border-white/10 py-2 pr-3">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-gray-500">
                  <Loader2 className="mx-auto h-4 w-4 animate-spin" />
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-gray-500">
                  No orders yet.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-b border-white/5">
                  <td className="py-2 pr-3 text-[11px] text-sky-200">
                    {orderIdForPayment(row)}
                  </td>
                  <td className="py-2 pr-3">{row.learnerEmail}</td>
                  <td className="max-w-[10rem] truncate py-2 pr-3" title={row.courseSummary}>
                    {row.courseSummary}
                  </td>
                  <td className="py-2 pr-3">{row.amountLabel}</td>
                  <td className="py-2 pr-3">
                    <span
                      className={`rounded px-2 py-0.5 text-[10px] font-semibold uppercase ring-1 ${commerceStatusTone(row.status)}`}
                    >
                      {commerceStatusLabel(row.status)}
                    </span>
                  </td>
                  <td className="py-2 pr-3">{formatCommerceWhen(row.paidAt ?? row.createdAt)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </article>
  );
}
