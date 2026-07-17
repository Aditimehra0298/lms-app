import { promises as fs } from "node:fs";
import path from "node:path";
import { hashPassword, verifyPassword } from "@/lib/server/password-hash";
import { validateLearnerPassword } from "@/lib/password-policy";

const settingsPath = path.join(process.cwd(), "data", "admin-panel-settings.json");

export type AdminPanelSettings = {
  /** scrypt hash of the admin panel password (overrides ADMIN_PASSWORD when set). */
  panelPasswordHash: string | null;
  /** Require password step before Google (or alone if Google off). */
  requirePanelPassword: boolean;
  /** Require Google sign-in after password for main admin. */
  requireGoogleVerification: boolean;
  /** Require email OTP before changing password / security toggles. */
  requireEmailVerificationForSensitive: boolean;
  platformName: string;
  supportEmail: string;
  supportPhone: string;
  updatedAt: string | null;
  updatedByEmail: string | null;
};

const defaults: AdminPanelSettings = {
  panelPasswordHash: null,
  requirePanelPassword: true,
  requireGoogleVerification: true,
  requireEmailVerificationForSensitive: true,
  platformName: "SecureFutureTech LMS",
  supportEmail: "",
  supportPhone: "",
  updatedAt: null,
  updatedByEmail: null,
};

async function ensureFile(): Promise<void> {
  const dir = path.dirname(settingsPath);
  await fs.mkdir(dir, { recursive: true });
  try {
    await fs.access(settingsPath);
  } catch {
    await fs.writeFile(settingsPath, JSON.stringify(defaults, null, 2), "utf8");
  }
}

export async function readAdminPanelSettings(): Promise<AdminPanelSettings> {
  await ensureFile();
  try {
    const raw = await fs.readFile(settingsPath, "utf8");
    const parsed = JSON.parse(raw) as Partial<AdminPanelSettings>;
    return {
      ...defaults,
      ...parsed,
      panelPasswordHash:
        typeof parsed.panelPasswordHash === "string" && parsed.panelPasswordHash.startsWith("scrypt:")
          ? parsed.panelPasswordHash
          : parsed.panelPasswordHash === null
            ? null
            : defaults.panelPasswordHash,
    };
  } catch {
    return { ...defaults };
  }
}

async function writeAdminPanelSettings(next: AdminPanelSettings): Promise<AdminPanelSettings> {
  await ensureFile();
  await fs.writeFile(settingsPath, JSON.stringify(next, null, 2), "utf8");
  return next;
}

export function publicAdminPanelSettings(settings: AdminPanelSettings) {
  return {
    requirePanelPassword: settings.requirePanelPassword,
    requireGoogleVerification: settings.requireGoogleVerification,
    requireEmailVerificationForSensitive: settings.requireEmailVerificationForSensitive,
    platformName: settings.platformName,
    supportEmail: settings.supportEmail,
    supportPhone: settings.supportPhone,
    hasCustomPanelPassword: Boolean(settings.panelPasswordHash),
    updatedAt: settings.updatedAt,
    updatedByEmail: settings.updatedByEmail,
  };
}

export async function setAdminPanelPassword(input: {
  currentPassword: string;
  newPassword: string;
  updatedByEmail: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const settings = await readAdminPanelSettings();
  const { verifyAdminPanelPassword } = await import("@/lib/server/admin-password");
  const currentOk = await verifyAdminPanelPassword(input.currentPassword);
  if (!currentOk) {
    return { ok: false, message: "Current admin password is incorrect." };
  }

  const policy = validateLearnerPassword(input.newPassword);
  if (!policy.ok) return { ok: false, message: policy.message };

  if (input.newPassword === input.currentPassword) {
    return { ok: false, message: "New password must be different from the current password." };
  }

  const hash = await hashPassword(input.newPassword);
  await writeAdminPanelSettings({
    ...settings,
    panelPasswordHash: hash,
    updatedAt: new Date().toISOString(),
    updatedByEmail: input.updatedByEmail.trim().toLowerCase(),
  });
  return { ok: true };
}

export async function updateAdminPanelSecurity(input: {
  requirePanelPassword?: boolean;
  requireGoogleVerification?: boolean;
  requireEmailVerificationForSensitive?: boolean;
  updatedByEmail: string;
}): Promise<AdminPanelSettings> {
  const settings = await readAdminPanelSettings();
  return writeAdminPanelSettings({
    ...settings,
    requirePanelPassword:
      typeof input.requirePanelPassword === "boolean"
        ? input.requirePanelPassword
        : settings.requirePanelPassword,
    requireGoogleVerification:
      typeof input.requireGoogleVerification === "boolean"
        ? input.requireGoogleVerification
        : settings.requireGoogleVerification,
    requireEmailVerificationForSensitive:
      typeof input.requireEmailVerificationForSensitive === "boolean"
        ? input.requireEmailVerificationForSensitive
        : settings.requireEmailVerificationForSensitive,
    updatedAt: new Date().toISOString(),
    updatedByEmail: input.updatedByEmail.trim().toLowerCase(),
  });
}

export async function updateAdminPanelPlatform(input: {
  platformName?: string;
  supportEmail?: string;
  supportPhone?: string;
  updatedByEmail: string;
}): Promise<AdminPanelSettings> {
  const settings = await readAdminPanelSettings();
  return writeAdminPanelSettings({
    ...settings,
    platformName: input.platformName?.trim() || settings.platformName,
    supportEmail: input.supportEmail?.trim() ?? settings.supportEmail,
    supportPhone: input.supportPhone?.trim() ?? settings.supportPhone,
    updatedAt: new Date().toISOString(),
    updatedByEmail: input.updatedByEmail.trim().toLowerCase(),
  });
}

/** Used by password module — verify against custom hash when present. */
export async function verifyStoredPanelPassword(
  candidate: string,
  hash: string | null,
): Promise<boolean> {
  if (!hash) return false;
  return verifyPassword(candidate, hash);
}
