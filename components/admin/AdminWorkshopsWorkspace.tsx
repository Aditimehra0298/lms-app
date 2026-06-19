"use client";

import AdminTutorLedWorkspace from "@/components/admin/AdminTutorLedWorkspace";

/** One-day live workshops — same editor as tutor-led, filtered to `programKind: workshop`. */
export default function AdminWorkshopsWorkspace() {
  return <AdminTutorLedWorkspace workspaceKind="workshop" />;
}
