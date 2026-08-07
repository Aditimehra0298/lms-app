"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, CreditCard, ShieldCheck } from "lucide-react";
import {
  applyTutorLedShopMeta,
  fetchTutorLedProgramsClient,
  type ShopCartItem,
  tutorLedProgramBySlug,
} from "@/lib/shop-cart";
import { useLearnerPricing } from "@/lib/hooks/useLearnerPricing";
import { hasViewedCourseLanding, prePaymentLandingHref } from "@/lib/course-landing";
import { SignInToViewPrices } from "@/components/SignInToViewPrices";
import { CourseListThumbnail } from "@/components/CourseListThumbnail";
import { resolveCourseImageSrc } from "@/lib/course-thumbnail";
import type { ManagedCourse } from "@/lib/content-schema";
import { completeCheckoutPurchase } from "@/lib/checkout-complete-client";
import { openRazorpayCheckout, verifyRazorpayPaymentOnServer } from "@/lib/razorpay-client";
import { getLearnerEmail } from "@/lib/learner-session-client";
import { readLearnerProfileFromStorage } from "@/lib/auth-profile";
import { computeCheckoutTotals, toSmallestCurrencyUnit } from "@/lib/checkout-totals";
import {
  computeRegionalCheckoutTotals,
  formatCheckoutMoney,
} from "@/lib/checkout-regional-pricing";
import { resolveCoursePrices } from "@/lib/course-regional-pricing";

export const dynamic = "force-dynamic";

type RazorpayPublicConfig = {
  configured: boolean;
  keyId: string | null;
  multiCurrency?: boolean;
};

type PaymentReceipt = {
  orderId: string;
  paymentId: string;
  method: string;
  currency: string;
};

export default function CheckoutPage() {
  const { showPrices, ready, region } = useLearnerPricing();
  const [isSuccess, setIsSuccess] = useState(false);
  const [items, setItems] = useState<ShopCartItem[]>([]);
  const [catalog, setCatalog] = useState<ManagedCourse[]>([]);
  const [buyNowSlug, setBuyNowSlug] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [razorpayConfig, setRazorpayConfig] = useState<RazorpayPublicConfig | null>(null);
  const [payLoading, setPayLoading] = useState(false);
  const [payError, setPayError] = useState("");
  const [paymentReceipt, setPaymentReceipt] = useState<PaymentReceipt | null>(null);
  const [learnerInfo, setLearnerInfo] = useState({ name: "Learner", email: "", phone: "" });

  const displayItemPrice = (item: ShopCartItem): string => {
    const course = catalog.find((c) => c.slug === item.slug);
    if (course) {
      const resolved = resolveCoursePrices(course, region);
      if (resolved.price?.trim()) return resolved.price;
    }
    return item.price;
  };
  useEffect(() => {
    setIsHydrated(true);
    const search = new URLSearchParams(window.location.search);
    const buyNow = search.get("buyNow");
    setBuyNowSlug(buyNow);
    if (window.localStorage.getItem("sft_logged_in") !== "true") {
      const redirect = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.href = `/account?mode=login&redirect=${redirect}`;
      return;
    }
    if (buyNow && !hasViewedCourseLanding(buyNow)) {
      window.location.replace(prePaymentLandingHref(buyNow, null, true));
    }

    const profile = readLearnerProfileFromStorage();
    setLearnerInfo({
      name: profile.name?.trim() || "Learner",
      email: getLearnerEmail()?.trim() || profile.email?.trim() || "",
      phone: profile.phone?.trim() || "",
    });

    void fetch("/api/payments/razorpay/config", { cache: "no-store" })
      .then((res) => res.json())
      .then((data: RazorpayPublicConfig & { ok?: boolean }) => {
        if (data.ok) {
          setRazorpayConfig({
            configured: Boolean(data.configured),
            keyId: data.keyId ?? null,
            multiCurrency: Boolean(data.multiCurrency),
          });
        }
      })
      .catch(() => {
        setRazorpayConfig({ configured: false, keyId: null });
      });
  }, []);

  useEffect(() => {
    void fetch("/api/courses", { cache: "no-store" })
      .then((res) => res.json())
      .then((data: { courses?: ManagedCourse[] }) => {
        setCatalog(Array.isArray(data.courses) ? data.courses : []);
      })
      .catch(() => setCatalog([]));
  }, []);

  useEffect(() => {
    const loadItems = async () => {
      const hydrateFromCart = () => {
        try {
          const raw = window.localStorage.getItem("sft_cart");
          if (!raw) {
            setItems([]);
            return;
          }
          const parsed = JSON.parse(raw) as ShopCartItem[];
          setItems(Array.isArray(parsed) ? parsed : []);
        } catch {
          setItems([]);
        }
      };

      if (buyNowSlug) {
        hydrateFromCart();
      } else {
        hydrateFromCart();
      }

      const tutorPrograms = await fetchTutorLedProgramsClient();

      if (buyNowSlug) {
        const tutorHit = tutorLedProgramBySlug(tutorPrograms, buyNowSlug);
        if (tutorHit) {
          setItems([
            applyTutorLedShopMeta(
              {
                slug: tutorHit.slug,
                title: tutorHit.title,
                price: `₹${tutorHit.price.toLocaleString("en-IN")}`,
                image: tutorHit.heroSrc,
                qty: 1,
              },
              tutorPrograms,
            ),
          ]);
          return;
        }
        try {
          const res = await fetch("/api/courses", { cache: "no-store" });
          if (res.ok) {
            const data = (await res.json()) as {
              courses?: ManagedCourse[];
            };
            const match = data.courses?.find((course) => course.slug === buyNowSlug);
            if (match) {
              if (Array.isArray(data.courses)) setCatalog(data.courses);
              setItems([
                applyTutorLedShopMeta(
                  {
                    slug: match.slug,
                    title: match.title,
                    price: match.price,
                    image: match.image,
                    qty: 1,
                  },
                  tutorPrograms,
                ),
              ]);
              return;
            }
          }
        } catch {
          // Fallback to cart below.
        }
      }

      setItems((prev) => prev.map((row) => applyTutorLedShopMeta(row, tutorPrograms)));
    };

    void loadItems();
  }, [buyNowSlug]);

  const successHasTutorLed = useMemo(
    () => items.some((i) => i.deliveryKind === "tutor-led" || i.deliveryKind === "workshop"),
    [items],
  );
  const tutorLedSlug = useMemo(
    () => items.find((i) => i.deliveryKind === "tutor-led" || i.deliveryKind === "workshop")?.slug,
    [items],
  );
  const successMyLearningHref = successHasTutorLed && tutorLedSlug
    ? `/my-learning/course/${encodeURIComponent(tutorLedSlug)}`
    : successHasTutorLed
      ? "/my-learning?tab=live"
      : "/my-learning?tab=learning";

  const totals = useMemo(() => {
    if (region) return computeRegionalCheckoutTotals(items, catalog, region);
    return computeCheckoutTotals(items);
  }, [items, catalog, region]);
  const { subtotal, discount, gst, total } = totals;
  const paymentCurrency = region?.currency ?? "INR";
  const formatMoney = (value: number) =>
    region ? formatCheckoutMoney(value, region) : `₹${value.toFixed(2)}`;
  const razorpayReady = Boolean(razorpayConfig?.configured && razorpayConfig.keyId);
  if (!isHydrated) {
    return (
      <div className="checkout-page min-h-screen bg-[#0a0a0a] text-white">
        <main className="mx-auto max-w-[1760px] px-4 py-6 md:px-6 xl:px-8">
          <div className="rounded-xl border border-white/10 bg-white/3 p-6 text-sm text-gray-300">
            Loading checkout...
          </div>
        </main>
      </div>
    );
  }

  const finalizePurchase = async (receipt?: PaymentReceipt) => {
    const result = await completeCheckoutPurchase(items);
    if (receipt) setPaymentReceipt(receipt);
    if (result.redirectHref) {
      window.location.replace(result.redirectHref);
      return;
    }
    setIsSuccess(true);
  };

  const completePurchase = async () => {
    const learnerEmail = learnerInfo.email.trim().toLowerCase();
    if (learnerEmail) {
      try {
        await fetch("/api/payments/demo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            learnerEmail,
            countryCode: region?.countryCode,
            currency: paymentCurrency,
            amount: toSmallestCurrencyUnit(total, paymentCurrency),
            items: items.map((item) => ({
              slug: item.slug,
              title: item.title,
              price: item.price,
              qty: item.qty,
            })),
          }),
        });
      } catch {
        /* checkout still completes locally */
      }
    }

    await finalizePurchase({
      orderId: "DEMO",
      paymentId: "—",
      method: "demo",
      currency: paymentCurrency,
    });
  };

  const payWithRazorpay = async () => {
    if (!razorpayReady || !razorpayConfig?.keyId) {
      setPayError("Razorpay is not configured. Add API keys to .env.local and restart the server.");
      return;
    }

    if (!region) {
      setPayError("Pricing for your country is still loading. Please refresh and try again.");
      return;
    }

    const learnerEmail = learnerInfo.email.trim().toLowerCase();
    if (!learnerEmail) {
      setPayError("Sign in with an email address before paying.");
      return;
    }

    setPayLoading(true);
    setPayError("");
    try {
      const orderRes = await fetch("/api/payments/razorpay/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          learnerEmail,
          countryCode: region.countryCode,
          currency: region.currency,
          items: items.map((item) => ({
            slug: item.slug,
            title: item.title,
            price: item.price,
            qty: item.qty,
          })),
        }),
      });
      const orderData = (await orderRes.json()) as {
        ok?: boolean;
        message?: string;
        orderId?: string;
        amount?: number;
        currency?: string;
        keyId?: string;
      };
      if (!orderRes.ok || !orderData.ok || !orderData.orderId || orderData.amount == null) {
        throw new Error(orderData.message ?? "Could not start Razorpay checkout.");
      }

      const payment = await openRazorpayCheckout({
        keyId: orderData.keyId ?? razorpayConfig.keyId,
        orderId: orderData.orderId,
        amount: orderData.amount,
        currency: orderData.currency ?? region.currency,
        name: "SF Trainings",
        description: items.length === 1 ? items[0].title : `${items.length} courses`,
        prefill: {
          name: learnerInfo.name,
          email: learnerEmail,
          contact: learnerInfo.phone.replace(/\D/g, "").slice(-10) || undefined,
        },
        notes: { learnerEmail },
      });

      const verified = await verifyRazorpayPaymentOnServer({
        learnerEmail,
        razorpay_order_id: payment.razorpay_order_id,
        razorpay_payment_id: payment.razorpay_payment_id,
        razorpay_signature: payment.razorpay_signature,
      });
      if (!verified.ok) {
        throw new Error(verified.message ?? "Payment verification failed.");
      }

      await finalizePurchase({
        orderId: payment.razorpay_order_id,
        paymentId: payment.razorpay_payment_id,
        method: "razorpay",
        currency: orderData.currency ?? region.currency,
      });
    } catch (err) {
      setPayError(err instanceof Error ? err.message : "Payment could not be completed.");
    } finally {
      setPayLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="checkout-page min-h-screen bg-[#0a0a0a] text-white">
        <main className="mx-auto max-w-[1760px] px-4 py-6 md:px-6 xl:px-8">
          <section className="mx-auto max-w-4xl rounded-2xl border border-white/10 bg-white/3 p-6 text-center">
            <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-300" />
            <h1 className="mt-3 text-4xl font-bold">Payment Successful!</h1>
            <p className="mt-2 text-gray-300">
              {successHasTutorLed ? (
                <>
                  Your tutor-led enrollment is saved. Open your <strong className="text-gray-200">live course hub</strong> to
                  join sessions, watch recordings, and track weekly progress.
                </>
              ) : (
                <>
                  Your enrollment is saved. Open <strong className="text-gray-200">My Learning</strong> →{" "}
                  <strong className="text-gray-200">My Courses</strong> to continue.
                </>
              )}
            </p>
            <div className="mx-auto mt-6 grid max-w-3xl gap-3 text-sm md:grid-cols-3">
              <div className="rounded-lg border border-white/10 bg-black/30 p-3">
                <p className="text-gray-400">Order ID</p>
                <p className="truncate font-semibold">{paymentReceipt?.orderId ?? "—"}</p>
              </div>
              <div className="rounded-lg border border-white/10 bg-black/30 p-3">
                <p className="text-gray-400">Payment Method</p>
                <p className="font-semibold uppercase">
                  {paymentReceipt?.method === "razorpay" ? "Razorpay" : paymentReceipt?.method ?? "Demo"}
                </p>
              </div>
              <div className="rounded-lg border border-white/10 bg-black/30 p-3">
                <p className="text-gray-400">Amount Paid</p>
                <p className="font-semibold text-amber-300">{formatMoney(total)}</p>
              </div>
            </div>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Link
                href={successMyLearningHref}
                className="rounded-lg bg-amber-400 px-5 py-2.5 text-sm font-bold text-black"
              >
                {successHasTutorLed ? "Open live course hub" : "Go to My Learning"}
              </Link>
              {successHasTutorLed ? (
                <Link
                  href="/my-learning/calendar"
                  className="rounded-lg border border-violet-400/50 bg-violet-500/15 px-5 py-2.5 text-sm font-semibold text-violet-100 hover:bg-violet-500/25"
                >
                  View calendar
                </Link>
              ) : null}
              <button className="rounded-lg border border-white/15 bg-black/30 px-5 py-2.5 text-sm font-semibold">
                Download Invoice
              </button>
            </div>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="checkout-page min-h-screen bg-[#0a0a0a] text-white">
      <main className="mx-auto max-w-[1760px] px-4 py-6 md:px-6 xl:px-8">
        <div className="mb-3 flex flex-wrap items-center gap-3 text-xs text-gray-300">
          {["Cart", "Checkout", "Payment", "Success"].map((step, idx) => (
            <div key={step} className="inline-flex items-center gap-2">
              <span
                className={`inline-flex h-5 w-5 items-center justify-center rounded-full border ${
                  idx <= 1 ? "border-amber-300/50 bg-amber-500/20 text-amber-100" : "border-white/15 bg-white/5"
                }`}
              >
                {idx + 1}
              </span>
              <span>{step}</span>
              {idx < 3 && <span className="text-gray-500">—</span>}
            </div>
          ))}
        </div>

        <h1 className="text-4xl font-bold">Checkout</h1>
        <p className="mt-1 text-sm text-gray-300">Complete your purchase and start your learning journey.</p>

        <section className="mt-4 grid gap-4 lg:grid-cols-[1.1fr_1.9fr]">
          <article className="rounded-2xl border border-white/10 bg-white/3 p-4">
            <h2 className="text-lg font-bold">Order Summary</h2>
            <div className="mt-3 space-y-2">
              {items.map((item) => (
                <div key={item.slug} className="flex gap-2 rounded-lg border border-white/10 bg-black/25 p-2">
                    <CourseListThumbnail
                      image={resolveCourseImageSrc(item.image)}
                      title={item.title}
                      courseSlug={item.slug}
                      className="relative h-14 w-20 shrink-0 overflow-hidden rounded-md border border-white/10 bg-black/30"
                    />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{item.title}</p>
                    <p className="text-xs text-gray-400">Qty {item.qty}</p>
                  </div>
                  <p className="text-sm font-semibold text-amber-200">
                    {ready && showPrices ? displayItemPrice(item) : "—"}
                  </p>
                </div>
              ))}
              {items.length === 0 && (
                <div className="rounded-lg border border-dashed border-white/20 bg-black/25 p-6 text-center text-sm text-gray-400">
                  No items found. Add course to cart first.
                </div>
              )}
            </div>
            {ready && showPrices ? (
            <div className="mt-4 space-y-1.5 text-sm">
              <div className="flex items-center justify-between text-gray-300"><span>Subtotal</span><span>{formatMoney(subtotal)}</span></div>
              <div className="flex items-center justify-between text-emerald-300"><span>Discount</span><span>- {formatMoney(discount)}</span></div>
              <div className="flex items-center justify-between text-gray-300"><span>GST (18%)</span><span>{formatMoney(gst)}</span></div>
              <div className="mt-2 border-t border-white/10 pt-2 text-lg font-bold flex items-center justify-between">
                <span>Total Amount</span>
                <span className="text-amber-300">{formatMoney(total)}</span>
              </div>
            </div>
            ) : ready ? (
              <div className="mt-4">
                <SignInToViewPrices compact />
              </div>
            ) : null}
          </article>

          <div className="space-y-3">
            <article className="rounded-2xl border border-white/10 bg-white/3 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-lg font-bold">User Information</h3>
                <button className="rounded border border-white/15 bg-black/25 px-2.5 py-1 text-xs">Edit</button>
              </div>
              <div className="grid gap-2 text-sm md:grid-cols-2">
                <div className="rounded-md border border-white/10 bg-black/25 p-2.5">
                  <p className="text-gray-400">Full Name</p>
                  <p className="font-semibold">{learnerInfo.name}</p>
                </div>
                <div className="rounded-md border border-white/10 bg-black/25 p-2.5">
                  <p className="text-gray-400">Email</p>
                  <p className="truncate font-semibold">{learnerInfo.email || "—"}</p>
                </div>
                <div className="rounded-md border border-white/10 bg-black/25 p-2.5 md:col-span-2">
                  <p className="text-gray-400">Phone Number</p>
                  <p className="font-semibold">{learnerInfo.phone || "—"}</p>
                </div>
              </div>
            </article>

            <article className="rounded-2xl border border-white/10 bg-white/3 p-4">
              <h3 className="text-lg font-bold">Payment</h3>
              {razorpayReady ? (
                <div className="mt-3 rounded-lg border border-emerald-400/25 bg-emerald-500/10 p-4">
                  <div className="flex items-start gap-3">
                    <CreditCard className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" />
                    <div>
                      <p className="font-semibold text-emerald-100">Pay securely with Razorpay</p>
                      <p className="mt-1 text-sm text-gray-300">
                        {region
                          ? `Charged in ${region.currency} for ${region.countryName}. UPI, cards, net banking, and wallets are supported where available.`
                          : "UPI, cards, net banking, and wallets are supported in the Razorpay checkout window."}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-3 rounded-lg border border-amber-400/25 bg-amber-500/10 p-4">
                  <div className="flex items-start gap-3">
                    <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
                    <div>
                      <p className="font-semibold text-amber-100">Demo checkout mode</p>
                      <p className="mt-1 text-sm text-gray-300">
                        Add <code className="text-amber-200">RAZORPAY_KEY_ID</code> and{" "}
                        <code className="text-amber-200">RAZORPAY_KEY_SECRET</code> to{" "}
                        <code className="text-amber-200">.env.local</code> to enable live Razorpay payments.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {payError ? (
                <p className="mt-3 rounded-md border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                  {payError}
                </p>
              ) : null}

              <button
                disabled={items.length === 0 || payLoading}
                onClick={() => {
                  if (ready && !showPrices) {
                    window.location.href = `/account?mode=login&redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`;
                    return;
                  }
                  if (razorpayReady) {
                    void payWithRazorpay();
                    return;
                  }
                  void completePurchase();
                }}
                className="mt-4 w-full rounded-lg bg-amber-400 py-2.5 text-sm font-bold text-black disabled:cursor-not-allowed disabled:opacity-50"
              >
                {payLoading
                  ? "Opening Razorpay…"
                  : ready && showPrices
                    ? razorpayReady
                      ? `Pay ${formatMoney(total)} with Razorpay`
                      : `Complete demo purchase (${formatMoney(total)})`
                    : "Price"}
              </button>
              <p className="mt-2 text-xs text-gray-400">
                {razorpayReady
                  ? "You will be redirected to Razorpay to complete payment. Enrollment unlocks after verification."
                  : "Demo mode completes enrollment without charging a card."}
              </p>
            </article>
          </div>
        </section>
      </main>
    </div>
  );
}
