import type { AdminPaymentRow } from "@/lib/payment-types";

export function formatCommerceWhen(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function commerceStatusTone(status: string): string {
  if (status === "paid") return "text-emerald-300 bg-emerald-500/15 ring-emerald-400/25";
  if (status === "waived") return "text-violet-300 bg-violet-500/15 ring-violet-400/25";
  if (status === "demo") return "text-amber-300 bg-amber-500/15 ring-amber-400/25";
  if (status === "pending") return "text-sky-300 bg-sky-500/15 ring-sky-400/25";
  if (status === "failed") return "text-rose-300 bg-rose-500/15 ring-rose-400/25";
  if (status === "refunded") return "text-orange-300 bg-orange-500/15 ring-orange-400/25";
  return "text-gray-300 bg-white/10 ring-white/10";
}

export function commerceMethodLabel(method: string): string {
  if (method === "razorpay") return "Online payment";
  if (method === "demo") return "Practice checkout";
  if (method === "admin_grant") return "Free access";
  return method;
}

export function commerceStatusLabel(status: string): string {
  if (status === "paid") return "Paid";
  if (status === "pending") return "Waiting";
  if (status === "failed") return "Failed";
  if (status === "waived") return "Free access";
  if (status === "demo") return "Practice";
  if (status === "refunded") return "Refunded";
  return status;
}

export function orderIdForPayment(row: AdminPaymentRow): string {
  return row.razorpayOrderId ?? row.receipt ?? `ORD-${row.id.slice(0, 8).toUpperCase()}`;
}

export function invoiceNumberForPayment(row: AdminPaymentRow): string {
  return row.receipt ?? `INV-${row.id.slice(0, 10).toUpperCase()}`;
}

export function isRefundablePayment(row: AdminPaymentRow): boolean {
  return row.status === "paid" || row.status === "demo" || row.status === "waived";
}
