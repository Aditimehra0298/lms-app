"use client";

import { ShoppingCart } from "lucide-react";
import { useState } from "react";

type CartItem = {
  slug: string;
  title: string;
  price: string;
  image?: string;
  qty: number;
};

const CART_STORAGE_KEY = "sft_cart";

function readCart(): CartItem[] {
  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CartItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeCart(items: CartItem[]) {
  window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event("sft_cart_updated"));
}

export function addItemToCart(item: Omit<CartItem, "qty">) {
  const current = readCart();
  const existing = current.find((entry) => entry.slug === item.slug);
  if (existing) {
    existing.qty += 1;
  } else {
    current.push({ ...item, qty: 1 });
  }
  writeCart(current);
}

export default function AddToCartButton({
  slug,
  title,
  price,
  image,
  className,
  label = "Add to Cart",
  iconOnly = false,
}: {
  slug: string;
  title: string;
  price: string;
  image?: string;
  className?: string;
  label?: string;
  iconOnly?: boolean;
}) {
  const [added, setAdded] = useState(false);

  return (
    <button
      type="button"
      title={iconOnly ? "Add to cart" : undefined}
      aria-label={iconOnly ? "Add to cart" : undefined}
      onClick={() => {
        addItemToCart({ slug, title, price, image });
        setAdded(true);
        window.setTimeout(() => setAdded(false), 1400);
      }}
      className={className}
    >
      {iconOnly ? (
        added ? (
          <span className="text-xs font-bold">✓</span>
        ) : (
          <ShoppingCart className="h-4 w-4" strokeWidth={2.25} />
        )
      ) : added ? (
        "Added"
      ) : (
        label
      )}
    </button>
  );
}
