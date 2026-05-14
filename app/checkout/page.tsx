"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, CreditCard, Landmark, ShieldCheck, Smartphone } from "lucide-react";
import { appendEnrollmentsFromCheckout } from "@/lib/enrollment-storage";
import {
  applyTutorLedShopMeta,
  fetchTutorLedProgramsClient,
  type ShopCartItem,
  tutorLedProgramBySlug,
} from "@/lib/shop-cart";

export const dynamic = "force-dynamic";

type PurchasedLearningCourse = {
  slug: string;
  title: string;
  modules: number;
  duration: string;
  completed: number;
  status: string;
  action: string;
  tone: string;
  deliveryKind?: "managed" | "tutor-led";
};

const fallbackCourseBySlug: Record<string, Omit<ShopCartItem, "qty">> = {
  "food-safety-masterclass": {
    slug: "food-safety-masterclass",
    title: "Diploma in HACCP Food Safety Standards (Level 2)",
    price: "$49.00",
    image: "/course-food-safety.png",
  },
  "cyber-security-essentials": {
    slug: "cyber-security-essentials",
    title: "Cyber Security Essentials",
    price: "$59.00",
    image: "/3.png",
  },
  "esg-fundamentals": {
    slug: "esg-fundamentals",
    title: "ESG Fundamentals",
    price: "$39.00",
    image: "/2.png",
  },
};

const parsePrice = (value: string) => Number(value.replace(/[^0-9.]/g, "")) || 0;

export default function CheckoutPage() {
  const [paymentMethod, setPaymentMethod] = useState<"upi" | "card" | "netbanking" | "wallet">("upi");
  const [isSuccess, setIsSuccess] = useState(false);
  const [items, setItems] = useState<ShopCartItem[]>([]);
  const [buyNowSlug, setBuyNowSlug] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
    const search = new URLSearchParams(window.location.search);
    setBuyNowSlug(search.get("buyNow"));
  }, []);

  useEffect(() => {
    const loadItems = async () => {
      const tutorPrograms = await fetchTutorLedProgramsClient();

      if (buyNowSlug) {
        if (fallbackCourseBySlug[buyNowSlug]) {
          setItems([applyTutorLedShopMeta({ ...fallbackCourseBySlug[buyNowSlug], qty: 1 }, tutorPrograms)]);
          return;
        }
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
              courses?: Array<{ slug: string; title: string; price: string; image?: string }>;
            };
            const match = data.courses?.find((course) => course.slug === buyNowSlug);
            if (match) {
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
      try {
        const raw = window.localStorage.getItem("sft_cart");
        if (!raw) {
          setItems([]);
          return;
        }
        const parsed = JSON.parse(raw) as ShopCartItem[];
        const base = Array.isArray(parsed) ? parsed : [];
        setItems(base.map((row) => applyTutorLedShopMeta(row, tutorPrograms)));
      } catch {
        setItems([]);
      }
    };

    void loadItems();
  }, [buyNowSlug]);

  const subtotal = items.reduce((sum, item) => sum + parsePrice(item.price) * item.qty, 0);
  if (!isHydrated) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white">
        <main className="mx-auto max-w-[1760px] px-4 py-6 md:px-6 xl:px-8">
          <div className="rounded-xl border border-white/10 bg-white/3 p-6 text-sm text-gray-300">
            Loading checkout...
          </div>
        </main>
      </div>
    );
  }

  const discount = items.length >= 2 ? subtotal * 0.1 : 0;
  const gst = (subtotal - discount) * 0.18;
  const total = subtotal - discount + gst;

  const completePurchase = () => {
    const purchasedCourses: PurchasedLearningCourse[] = items.map((item) => ({
      slug: item.slug,
      title: item.title,
      modules: item.learningModules ?? 11,
      duration: item.learningDuration ?? "4h 30m",
      completed: 0,
      status: item.deliveryKind === "tutor-led" ? "In Progress" : "Not Started",
      action: item.learningAction ?? "Start Course",
      tone: item.learningTone ?? "violet",
      deliveryKind: item.deliveryKind,
    }));

    try {
      const raw = window.localStorage.getItem("sft_purchased_courses");
      const existing = raw ? (JSON.parse(raw) as PurchasedLearningCourse[]) : [];
      const merged = [...purchasedCourses, ...existing].filter(
        (course, index, all) => all.findIndex((item) => item.slug === course.slug) === index,
      );
      window.localStorage.setItem("sft_purchased_courses", JSON.stringify(merged));
      window.localStorage.setItem("sft_cart", JSON.stringify([]));
      window.dispatchEvent(new Event("sft_cart_updated"));
    } catch {
      // Keep UI flow even if local storage is unavailable.
    }

    try {
      appendEnrollmentsFromCheckout(items.map((item) => ({ slug: item.slug, title: item.title })));
    } catch {
      // Enrollment log is best-effort only.
    }

    setIsSuccess(true);
  };

  const successHasTutorLed = useMemo(() => items.some((i) => i.deliveryKind === "tutor-led"), [items]);
  const successMyLearningHref = successHasTutorLed ? "/my-learning?tab=live" : "/my-learning?tab=learning";

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white">
        <main className="mx-auto max-w-[1760px] px-4 py-6 md:px-6 xl:px-8">
          <section className="mx-auto max-w-4xl rounded-2xl border border-white/10 bg-white/3 p-6 text-center">
            <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-300" />
            <h1 className="mt-3 text-4xl font-bold">Payment Successful!</h1>
            <p className="mt-2 text-gray-300">
              {successHasTutorLed ? (
                <>
                  Your tutor-led enrollment is saved. Go to <strong className="text-gray-200">My Learning → Tutor Led</strong>{" "}
                  for live sessions, and use <strong className="text-gray-200">My Calendar</strong> to see it on your schedule.
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
                <p className="font-semibold">ORD-2026-4127</p>
              </div>
              <div className="rounded-lg border border-white/10 bg-black/30 p-3">
                <p className="text-gray-400">Payment Method</p>
                <p className="font-semibold uppercase">{paymentMethod}</p>
              </div>
              <div className="rounded-lg border border-white/10 bg-black/30 p-3">
                <p className="text-gray-400">Amount Paid</p>
                <p className="font-semibold text-amber-300">${total.toFixed(2)}</p>
              </div>
            </div>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Link
                href={successMyLearningHref}
                className="rounded-lg bg-amber-400 px-5 py-2.5 text-sm font-bold text-black"
              >
                {successHasTutorLed ? "Go to Tutor Led" : "Go to My Learning"}
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
    <div className="min-h-screen bg-[#0a0a0a] text-white">
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
                  <div className="relative h-14 w-20 overflow-hidden rounded-md border border-white/10">
                    <Image src={item.image || "/course-food-safety.png"} alt={item.title} fill unoptimized className="object-cover" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{item.title}</p>
                    <p className="text-xs text-gray-400">Qty {item.qty}</p>
                  </div>
                  <p className="text-sm font-semibold text-amber-200">{item.price}</p>
                </div>
              ))}
              {items.length === 0 && (
                <div className="rounded-lg border border-dashed border-white/20 bg-black/25 p-6 text-center text-sm text-gray-400">
                  No items found. Add course to cart first.
                </div>
              )}
            </div>
            <div className="mt-4 space-y-1.5 text-sm">
              <div className="flex items-center justify-between text-gray-300"><span>Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
              <div className="flex items-center justify-between text-emerald-300"><span>Discount</span><span>- ${discount.toFixed(2)}</span></div>
              <div className="flex items-center justify-between text-gray-300"><span>GST (18%)</span><span>${gst.toFixed(2)}</span></div>
              <div className="mt-2 border-t border-white/10 pt-2 text-lg font-bold flex items-center justify-between">
                <span>Total Amount</span>
                <span className="text-amber-300">${total.toFixed(2)}</span>
              </div>
            </div>
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
                  <p className="font-semibold">Aditi Sharma</p>
                </div>
                <div className="rounded-md border border-white/10 bg-black/25 p-2.5">
                  <p className="text-gray-400">Email</p>
                  <p className="font-semibold">aditi.sharma@gmail.com</p>
                </div>
                <div className="rounded-md border border-white/10 bg-black/25 p-2.5 md:col-span-2">
                  <p className="text-gray-400">Phone Number</p>
                  <p className="font-semibold">+91 98765 43210</p>
                </div>
              </div>
            </article>

            <article className="rounded-2xl border border-white/10 bg-white/3 p-4">
              <h3 className="text-lg font-bold">Payment Method</h3>
              <div className="mt-3 grid gap-2 sm:grid-cols-4">
                {[
                  ["upi", "UPI", Smartphone],
                  ["card", "Card", CreditCard],
                  ["netbanking", "Net Banking", Landmark],
                  ["wallet", "Wallet", ShieldCheck],
                ].map(([key, label, Icon]) => (
                  <button
                    key={String(key)}
                    onClick={() => setPaymentMethod(key as "upi" | "card" | "netbanking" | "wallet")}
                    className={`inline-flex items-center justify-center gap-1 rounded-md border px-3 py-2 text-sm ${
                      paymentMethod === key
                        ? "border-amber-300/40 bg-amber-500/15 text-amber-100"
                        : "border-white/10 bg-black/25 text-gray-300"
                    }`}
                  >
                    <Icon size={14} /> {String(label)}
                  </button>
                ))}
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-[1.4fr_0.8fr]">
                <div className="rounded-lg border border-white/10 bg-black/25 p-3">
                  <p className="text-xs text-gray-400">
                    {paymentMethod === "upi" ? "Pay using UPI ID" : "Payment details form"}
                  </p>
                  <input
                    placeholder={paymentMethod === "upi" ? "Enter UPI ID (e.g. name@upi)" : "Card / Account details"}
                    className="mt-2 w-full rounded-md border border-white/10 bg-black/35 px-3 py-2 text-sm"
                  />
                </div>
                <div className="rounded-lg border border-white/10 bg-black/25 p-3 text-center">
                  <div className="mx-auto h-24 w-24 rounded bg-white/90 p-1">
                    <Image src="/next.svg" alt="QR placeholder" width={96} height={96} className="h-full w-full object-contain" />
                  </div>
                  <p className="mt-2 text-xs text-gray-400">Scan &amp; Pay</p>
                </div>
              </div>

              <button
                disabled={items.length === 0}
                onClick={completePurchase}
                className="mt-4 w-full rounded-lg bg-amber-400 py-2.5 text-sm font-bold text-black disabled:cursor-not-allowed disabled:opacity-50"
              >
                Pay Now ${total.toFixed(2)}
              </button>
              <p className="mt-2 text-xs text-gray-400">
                Gateway integration will be added later. This button currently completes enrollment directly.
              </p>
            </article>
          </div>
        </section>
      </main>
    </div>
  );
}
