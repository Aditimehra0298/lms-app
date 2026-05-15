"use client";

import { useRouter } from "next/navigation";
import { registerTutorLedFromTemplate } from "@/lib/push-checkout-or-login";

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
      onClick={() => registerTutorLedFromTemplate(router, slug)}
      className={className}
    >
      Pay Now
    </button>
  );
}
