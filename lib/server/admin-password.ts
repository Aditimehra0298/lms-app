import { timingSafeEqual } from "node:crypto";
import {
  readAdminPanelSettings,
  verifyStoredPanelPassword,
} from "@/lib/server/admin-panel-settings";

function verifyEnvAdminPassword(candidate: string): boolean {
  const expected = process.env.ADMIN_PASSWORD?.trim();
  if (!expected || !candidate) return false;

  const a = Buffer.from(candidate, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length) return false;

  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/** True when env password or a custom panel password hash is available. */
export async function isAdminPasswordConfigured(): Promise<boolean> {
  if (process.env.ADMIN_PASSWORD?.trim()) return true;
  const settings = await readAdminPanelSettings();
  return Boolean(settings.panelPasswordHash);
}

/** Sync helper for older call sites — prefer async `isAdminPasswordConfigured`. */
export function isAdminPasswordConfiguredSync(): boolean {
  return Boolean(process.env.ADMIN_PASSWORD?.trim());
}

/**
 * Verify admin panel password.
 * Custom Settings password (hashed) wins when set; otherwise ADMIN_PASSWORD from env.
 */
export async function verifyAdminPanelPassword(candidate: string): Promise<boolean> {
  if (!candidate) return false;
  const settings = await readAdminPanelSettings();
  if (settings.panelPasswordHash) {
    return verifyStoredPanelPassword(candidate, settings.panelPasswordHash);
  }
  return verifyEnvAdminPassword(candidate);
}

/** @deprecated Prefer verifyAdminPanelPassword (async). Kept for sync env-only checks. */
export function verifyAdminPassword(candidate: string): boolean {
  return verifyEnvAdminPassword(candidate);
}
