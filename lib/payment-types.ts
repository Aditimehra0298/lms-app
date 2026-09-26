export const OFFLINE_PAYMENT_METHODS = [
  "cash",
  "bank_transfer",
  "grant",
  "cheque",
  "other",
] as const;

export type OfflinePaymentMethod = (typeof OFFLINE_PAYMENT_METHODS)[number];

export function isOfflinePaymentMethod(method: string | undefined | null): boolean {
  return OFFLINE_PAYMENT_METHODS.includes(String(method ?? "") as OfflinePaymentMethod);
}

export type PaymentLineItem = {
  slug: string;
  title: string;
  qty: number;
  price: string;
};

export type AdminPaymentRow = {
  id: string;
  learnerEmail: string;
  learnerName: string | null;
  razorpayOrderId: string | null;
  razorpayPaymentId: string | null;
  receipt: string | null;
  amount: number;
  currency: string;
  amountLabel: string;
  status: string;
  method: string;
  items: PaymentLineItem[];
  courseSummary: string;
  countryCode: string | null;
  adminNote: string | null;
  grantedByEmail: string | null;
  paidAt: string | null;
  createdAt: string;
};
