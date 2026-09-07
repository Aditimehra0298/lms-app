import { promises as fs, readFileSync, unlinkSync } from "node:fs";
import path from "node:path";

/**
 * Exclusive admin panel session: only one active login at a time.
 * Stored on disk so it survives process restarts (single-server / PM2).
 */

const storePath = path.join(process.cwd(), "data", "admin-active-session.json");

export type ActiveAdminSession = {
  email: string;
  sid: string;
  createdAt: number;
  exp: number;
};

async function ensureDir(): Promise<void> {
  await fs.mkdir(path.dirname(storePath), { recursive: true });
}

function parseSession(raw: string): ActiveAdminSession | null {
  try {
    const parsed = JSON.parse(raw) as Partial<ActiveAdminSession>;
    if (
      !parsed.email ||
      !parsed.sid ||
      !Number.isFinite(parsed.createdAt) ||
      !Number.isFinite(parsed.exp)
    ) {
      return null;
    }
    if (Math.floor(Date.now() / 1000) > (parsed.exp as number)) {
      return null;
    }
    return {
      email: String(parsed.email).trim().toLowerCase(),
      sid: String(parsed.sid),
      createdAt: parsed.createdAt as number,
      exp: parsed.exp as number,
    };
  } catch {
    return null;
  }
}

export function readActiveAdminSessionSync(): ActiveAdminSession | null {
  try {
    const raw = readFileSync(storePath, "utf8");
    const session = parseSession(raw);
    if (!session) {
      try {
        unlinkSync(storePath);
      } catch {
        /* ignore */
      }
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export async function readActiveAdminSession(): Promise<ActiveAdminSession | null> {
  try {
    const raw = await fs.readFile(storePath, "utf8");
    const session = parseSession(raw);
    if (!session) {
      await clearActiveAdminSession();
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export async function writeActiveAdminSession(session: ActiveAdminSession): Promise<void> {
  await ensureDir();
  await fs.writeFile(storePath, JSON.stringify(session, null, 2), "utf8");
}

export async function clearActiveAdminSession(sid?: string): Promise<void> {
  try {
    if (sid) {
      const current = await readActiveAdminSession();
      if (current && current.sid !== sid) return;
    }
    await fs.unlink(storePath);
  } catch {
    /* missing file is fine */
  }
}

/**
 * True when another device already holds the admin panel session.
 * Same-device renewals (matching sid) are allowed.
 */
export async function isAdminSessionHeldElsewhere(currentSid?: string | null): Promise<{
  held: boolean;
  session: ActiveAdminSession | null;
}> {
  const session = await readActiveAdminSession();
  if (!session) return { held: false, session: null };
  if (currentSid && session.sid === currentSid) return { held: false, session };
  return { held: true, session };
}

/** Validate JWT sid against the exclusive registry. */
export async function isAdminSessionSidActive(
  email: string,
  sid: string | undefined | null,
): Promise<boolean> {
  if (!sid?.trim()) return false;
  const active = await readActiveAdminSession();
  if (!active) return false;
  return active.sid === sid.trim() && active.email === email.trim().toLowerCase();
}

export function isAdminSessionSidActiveSync(
  email: string,
  sid: string | undefined | null,
): boolean {
  if (!sid?.trim()) return false;
  const active = readActiveAdminSessionSync();
  if (!active) return false;
  return active.sid === sid.trim() && active.email === email.trim().toLowerCase();
}

export const ADMIN_SESSION_ELSEWHERE_MESSAGE =
  "Admin panel is already signed in on another device. Sign out from that device first.";
