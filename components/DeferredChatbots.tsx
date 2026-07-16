"use client";

import dynamic from "next/dynamic";
import { Suspense, useEffect, useState } from "react";

const LmsChatbot = dynamic(() => import("@/components/LmsChatbot"), { ssr: false });

/** Load chat widget after first paint so pages render faster. */
export default function DeferredChatbots() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(() => setShow(true), { timeout: 2500 });
      return () => window.cancelIdleCallback(id);
    }
    const timer = window.setTimeout(() => setShow(true), 1200);
    return () => window.clearTimeout(timer);
  }, []);

  if (!show) return null;

  return (
    <Suspense fallback={null}>
      <LmsChatbot />
    </Suspense>
  );
}
