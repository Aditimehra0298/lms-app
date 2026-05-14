"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, ShieldCheck, Trash2 } from "lucide-react";

type CartItem = {
  slug: string;
  title: string;
  price: string;
  image?: string;
  qty: number;
};

const CART_STORAGE_KEY = "sft_cart";

function parsePrice(value: string) {
  const amount = Number(value.replace(/[^0-9.]/g, ""));
  return Number.isFinite(amount) ? amount : 0;
}

export default function CartPage() {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as CartItem[];
      if (Array.isArray(parsed)) setItems(parsed);
    } catch {
      setItems([]);
    }
  }, []);

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + parsePrice(item.price) * item.qty, 0),
    [items],
  );
  const discount = items.length >= 2 ? subtotal * 0.1 : 0;
  const total = subtotal - discount;

  const persistItems = (next: CartItem[]) => {
    setItems(next);
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event("sft_cart_updated"));
  };

  const removeItem = (slug: string) => {
    persistItems(items.filter((item) => item.slug !== slug));
  };

  const handleCheckout = () => {
    const isLoggedIn = window.localStorage.getItem("sft_logged_in") === "true";
    if (!isLoggedIn) {
      window.location.href = "/account?mode=login&redirect=/checkout";
      return;
    }
    window.location.href = "/checkout";
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <main className="mx-auto max-w-[1760px] px-4 py-6 md:px-6 xl:px-8">
        <p className="text-xs text-gray-400">
          Home <span className="mx-2">›</span> Cart
        </p>
        <h1 className="mt-2 text-4xl font-bold">
          Your Learning <span className="text-amber-300">Cart</span>
        </h1>
        <p className="mt-1 text-sm text-gray-300">Review selected courses and proceed to checkout.</p>

        <section className="mt-4 grid gap-4 lg:grid-cols-[1.8fr_1fr]">
          <article className="rounded-2xl border border-white/10 bg-white/3 p-4">
            <div className="mb-3 flex items-center justify-between rounded-lg border border-amber-300/25 bg-amber-500/10 px-3 py-2 text-sm">
              <span>Great Choice! Add 1 more course to unlock extra offer.</span>
              <Link href="/courses" className="rounded-md border border-amber-300/35 px-3 py-1 text-xs text-amber-200">
                Explore Courses
              </Link>
            </div>

            <h2 className="text-lg font-bold">Courses in Your Cart ({items.length})</h2>
            <div className="mt-3 space-y-3">
              {items.length === 0 && (
                <div className="rounded-xl border border-dashed border-white/20 bg-black/30 p-10 text-center text-sm text-gray-400">
                  No courses in cart yet.
                </div>
              )}

              {items.map((item) => (
                <article key={item.slug} className="rounded-xl border border-white/10 bg-black/25 p-3">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-3">
                      <div className="relative h-20 w-36 overflow-hidden rounded-lg border border-white/10">
                        <Image
                          src={item.image || "/course-food-safety.png"}
                          alt={item.title}
                          fill
                          unoptimized
                          className="object-cover"
                        />
                      </div>
                      <div>
                        <p className="text-base font-semibold">{item.title}</p>
                        <p className="mt-1 text-xs text-gray-400">Qty: {item.qty}</p>
                        <p className="mt-1 text-sm text-amber-200">{item.price}</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeItem(item.slug)}
                      className="inline-flex items-center gap-1 rounded-md border border-red-300/25 bg-red-500/10 px-3 py-1.5 text-xs text-red-200"
                    >
                      <Trash2 size={12} /> Remove
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </article>

          <aside className="space-y-3">
            <article className="rounded-2xl border border-white/10 bg-white/3 p-4">
              <h3 className="text-lg font-bold">Order Summary</h3>
              <div className="mt-3 space-y-2 text-sm">
                <div className="flex items-center justify-between text-gray-300">
                  <span>Total Courses</span>
                  <span>{items.length}</span>
                </div>
                <div className="flex items-center justify-between text-gray-300">
                  <span>Subtotal</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-emerald-300">
                  <span>Discount</span>
                  <span>- ${discount.toFixed(2)}</span>
                </div>
                <div className="my-2 border-t border-white/10" />
                <div className="flex items-center justify-between text-lg font-bold">
                  <span>Total</span>
                  <span className="text-amber-300">${total.toFixed(2)}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCheckout}
                disabled={items.length === 0}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-amber-400 py-2.5 text-sm font-bold text-black disabled:cursor-not-allowed disabled:opacity-50"
              >
                Proceed to Checkout <ArrowRight size={15} />
              </button>
              <p className="mt-2 inline-flex items-center gap-1 text-xs text-gray-300">
                <ShieldCheck size={13} className="text-emerald-300" /> Secure checkout
              </p>
            </article>
          </aside>
        </section>
      </main>
    </div>
  );
}
