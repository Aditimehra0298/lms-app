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
