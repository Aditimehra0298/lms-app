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
          { id: "catalog", label: "Catalog landings" },
          { id: "programs", label: "Live Zoom programs" },
        ]}
      />
      {view === "catalog" ? (
        <div className="space-y-2">
          <p className="text-xs text-gray-400">
            Open a catalog → use <strong className="text-gray-200">Upcoming batches</strong> for the table
            and <strong className="text-gray-200">Batch landing</strong> for each level&apos;s Description page.
          </p>
          <AdminTutorLedCatalogLandingsWorkspace />
        </div>
      ) : (
        <AdminTutorLedWorkspace />
      )}
    </div>
  );
}
