"use client";

import { useRouter } from "next/navigation";

export default function BuyNowButton({
  slug,
  className,
}: {
  slug: string;
  className?: string;
}) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => {
        const isLoggedIn = window.localStorage.getItem("sft_logged_in") === "true";
        const buyNowRedirect = `/checkout?buyNow=${encodeURIComponent(slug)}`;
        if (!isLoggedIn) {
          router.push(`/account?mode=login&redirect=${encodeURIComponent(buyNowRedirect)}`);
          return;
        }
        router.push(buyNowRedirect);
      }}
      className={className}
    >
      Pay Now
    </button>
  );
}
