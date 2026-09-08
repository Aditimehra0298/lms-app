"use client";

import AdminTutorLedWorkspace from "@/components/admin/AdminTutorLedWorkspace";

/**
 * Tutor Led admin = per-program landings (same idea as Self-paced courses).
 * The old shared ISO catalog landing editor was removed — each live course
 * has its own /tutor-led/[slug] page edited here.
 */
export default function AdminTutorLedHub() {
  return <AdminTutorLedWorkspace />;
}
