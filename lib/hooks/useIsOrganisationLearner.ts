"use client";

import { useSyncExternalStore } from "react";
import { isOrganisationLearner, readLearnerProfileFromStorage } from "@/lib/auth-profile";

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener("focus", onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener("focus", onChange);
  };
}

/** True when the signed-in learner is an organisation account (false during SSR). */
export function useIsOrganisationLearner(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => isOrganisationLearner(readLearnerProfileFromStorage()),
    () => false,
  );
}
