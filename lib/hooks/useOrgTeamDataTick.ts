"use client";

import { useEffect, useState } from "react";
import { ORG_TEAM_DATA_EVENT } from "@/lib/organization-team-sync-client";

/** Changes whenever the organisation roster / assignments reload, for use in memo deps. */
export function useOrgTeamDataTick(): number {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const bump = () => setTick((n) => n + 1);
    window.addEventListener(ORG_TEAM_DATA_EVENT, bump);
    return () => window.removeEventListener(ORG_TEAM_DATA_EVENT, bump);
  }, []);
  return tick;
}
