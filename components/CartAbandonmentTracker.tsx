"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { abandonedCartDelayMs, notifyAbandonedCart } from "@/lib/abandoned-cart-client";
import { readCartItems } from "@/lib/cart-client";

/** Schedules abandoned-cart n8n webhook when cart has items and user does not checkout. */
export default function CartAbandonmentTracker() {
  const pathname = usePathname() ?? "";
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleAbandonedCheck = () => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    const items = readCartItems();
    if (items.length === 0) return;

    timerRef.current = window.setTimeout(() => {
      if (readCartItems().length === 0) return;
      if (pathname.startsWith("/checkout")) return;
      void notifyAbandonedCart("timer");
    }, abandonedCartDelayMs());
  };

  useEffect(() => {
    scheduleAbandonedCheck();

    const onCartUpdate = () => scheduleAbandonedCheck();
    window.addEventListener("sft_cart_updated", onCartUpdate);

    const onLeave = () => {
      if (document.visibilityState !== "hidden") return;
      if (readCartItems().length === 0) return;
      if (pathname.startsWith("/checkout")) return;
      void notifyAbandonedCart("leave");
    };
    document.addEventListener("visibilitychange", onLeave);

    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      window.removeEventListener("sft_cart_updated", onCartUpdate);
      document.removeEventListener("visibilitychange", onLeave);
    };
  }, [pathname]);

  return null;
}
