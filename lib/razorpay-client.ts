"use client";

const RAZORPAY_SCRIPT = "https://checkout.razorpay.com/v1/checkout.js";

type RazorpayHandlerResponse = {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
};

type RazorpayInstance = {
  open: () => void;
  on: (event: "payment.failed", handler: (response: { error?: { description?: string } }) => void) => void;
};

type RazorpayConstructor = new (options: Record<string, unknown>) => RazorpayInstance;

declare global {
  interface Window {
    Razorpay?: RazorpayConstructor;
  }
}

let scriptPromise: Promise<void> | null = null;

export function loadRazorpayScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("Razorpay runs in the browser only."));
  if (window.Razorpay) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-razorpay="true"]');
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Could not load Razorpay checkout.")), {
        once: true,
      });
      if (window.Razorpay) resolve();
      return;
    }

    const script = document.createElement("script");
    script.src = RAZORPAY_SCRIPT;
    script.async = true;
    script.dataset.razorpay = "true";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Could not load Razorpay checkout."));
    document.body.appendChild(script);
  });

  return scriptPromise;
}

export type OpenRazorpayCheckoutInput = {
  keyId: string;
  orderId: string;
  amount: number;
  currency: string;
  name?: string;
  description?: string;
  image?: string;
  prefill?: { name?: string; email?: string; contact?: string };
  notes?: Record<string, string>;
};

export async function openRazorpayCheckout(
  input: OpenRazorpayCheckoutInput,
): Promise<RazorpayHandlerResponse> {
  await loadRazorpayScript();
  if (!window.Razorpay) {
    throw new Error("Razorpay checkout is unavailable.");
  }

  return new Promise((resolve, reject) => {
    const rzp = new window.Razorpay!({
      key: input.keyId,
      amount: input.amount,
      currency: input.currency,
      name: input.name ?? "SF Trainings",
      description: input.description ?? "Course enrollment",
      image: input.image ?? "/logo.png",
      order_id: input.orderId,
      prefill: input.prefill,
      notes: input.notes,
      theme: { color: "#FFC107" },
      handler: (response: RazorpayHandlerResponse) => resolve(response),
      modal: {
        ondismiss: () => reject(new Error("Payment cancelled.")),
      },
    });

    rzp.on("payment.failed", (response) => {
      reject(new Error(response.error?.description ?? "Payment failed."));
    });

    rzp.open();
  });
}

export async function verifyRazorpayPaymentOnServer(input: {
  learnerEmail: string;
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}): Promise<{ ok: boolean; message?: string }> {
  const res = await fetch("/api/payments/razorpay/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = (await res.json()) as { ok?: boolean; message?: string };
  if (!res.ok || !data.ok) {
    return { ok: false, message: data.message ?? "Payment verification failed." };
  }
  return { ok: true };
}
