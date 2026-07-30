"use client";

import { useEffect } from "react";
import { applyClientPerfMode } from "@/lib/client-perf";

/** Marks <html data-perf="low|high"> early so CSS can disable heavy animations. */
export default function ClientPerfGuard() {
  useEffect(() => {
    applyClientPerfMode();

    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => applyClientPerfMode();
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);

  return null;
}
