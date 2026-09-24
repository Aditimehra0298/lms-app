"use client";

import { useEffect } from "react";
import { installAdminCsrfFetch } from "@/lib/admin-csrf-client";

/** Installs fetch + XHR CSRF headers for every Admin page. */
export default function AdminCsrfBootstrap() {
  useEffect(() => installAdminCsrfFetch(), []);
  return null;
}
