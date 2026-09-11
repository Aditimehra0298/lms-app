"use client";

import { useState } from "react";
import AdminTutorLedWorkspace from "@/components/admin/AdminTutorLedWorkspace";
import AdminTutorLedCatalogLandingsWorkspace from "@/components/admin/AdminTutorLedCatalogLandingsWorkspace";
import { AdminModeToggle } from "@/components/admin/AdminModeToggle";

/**
 * Tutor Led admin:
 * - Live programs = Zoom courses (/tutor-led/[slug])
 * - Catalog landings = designed multi-level pages (one thumbnail each on category pages)
 */
export default function AdminTutorLedHub() {
  const [view, setView] = useState<"programs" | "catalog">("catalog");

  return (
    <div className="space-y-4">
      <AdminModeToggle
        label="Tutor-led admin"
        value={view}
        onChange={(id) => setView(id as "programs" | "catalog")}
        options={[
          { id: "programs", label: "Live programs" },
          { id: "catalog", label: "Catalog landings" },
        ]}
      />
      {view === "catalog" ? <AdminTutorLedCatalogLandingsWorkspace /> : <AdminTutorLedWorkspace />}
    </div>
  );
}
