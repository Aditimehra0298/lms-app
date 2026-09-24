import { promises as fs, readFileSync, unlinkSync } from "node:fs";
import path from "node:path";
import { prisma } from "@/lib/prisma";

/**
 * Exclusive admin panel session: only one computer at a time.
 * MySQL is the source of truth so every PC hitting this app shares the same lock.
 * Local file is a cache only — it must never overwrite a different MySQL session.
 *
 * Other PCs: lock stays until Logout (or the 12-hour session expires). They cannot take over.
 * Owner PC (the machine running this app) is exempt and can always sign in.
 */

const storePath = path.join(process.cwd(), "data", "admin-active-session.json");
const ROW_ID = "main";

/** Match admin JWT lifetime — do not free the lock while that login is still valid. */
export const ADMIN_SESSION_STALE_AFTER_SEC = 12 * 60 * 60;

export type ActiveAdminSession = {
  email: string;
  sid: string;
  createdAt: number;
  exp: number;
  /** Unix seconds — refreshed by /api/auth/admin-access while /admin is open. */
  lastSeenAt?: number;
};

async function ensureDir(): Promise<void> {
  await fs.mkdir(path.dirname(storePath), { recursive: true });
}

function nowSec(): number {
  return Math.floor(Date.now() / 1000);
}

function isExpiredOrStale(session: ActiveAdminSession): boolean {
  const now = nowSec();
  if (now > session.exp) return true;
  // Legacy rows without lastSeenAt: only expire by JWT exp until a heartbeat writes lastSeenAt.
  if (!Number.isFinite(session.lastSeenAt)) return false;
  return now - (session.lastSeenAt as number) > ADMIN_SESSION_STALE_AFTER_SEC;
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
    const session: ActiveAdminSession = {
      email: String(parsed.email).trim().toLowerCase(),
      sid: String(parsed.sid),
      createdAt: parsed.createdAt as number,
      exp: parsed.exp as number,
      lastSeenAt: Number.isFinite(parsed.lastSeenAt)
        ? (parsed.lastSeenAt as number)
        : undefined,
    };
    if (isExpiredOrStale(session)) return null;
    return session;
  } catch {
    return null;
  }
}

function fromDbRow(row: {
  email: string;
  sid: string;
  createdAt: number;
  exp: number;
  updatedAt?: Date;
}): ActiveAdminSession | null {
  // Prefer updatedAt as heartbeat only when it clearly moved after create
  // (otherwise legacy rows would look "stale" immediately after deploy).
  let lastSeenAt: number | undefined;
  if (row.updatedAt) {
    lastSeenAt = Math.floor(row.updatedAt.getTime() / 1000);
  }
  const session: ActiveAdminSession = {
    email: row.email.trim().toLowerCase(),
    sid: row.sid,
    createdAt: row.createdAt,
    exp: row.exp,
    lastSeenAt,
  };
  if (isExpiredOrStale(session)) return null;
  return session;
}

function isMissingAdminSessionTable(err: unknown): boolean {
  const e = err as { code?: string; message?: string };
  return e.code === "P2021" || /lms_admin_active_session[\s\S]*does not exist/i.test(e.message ?? "");
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

async function readFromDb(): Promise<ActiveAdminSession | null> {
  try {
    if (!("adminActiveSession" in prisma) || !prisma.adminActiveSession) return null;
    const row = await prisma.adminActiveSession.findUnique({ where: { id: ROW_ID } });
    if (!row) return null;
    const session = fromDbRow(row);
    if (!session) {
      await prisma.adminActiveSession.delete({ where: { id: ROW_ID } }).catch(() => undefined);
      return null;
    }
    return session;
  } catch (err) {
    if (!isMissingAdminSessionTable(err)) {
      console.error("[admin-active-session] db read failed", err);
    }
    return null;
  }
}

async function writeToDb(session: ActiveAdminSession): Promise<boolean> {
  try {
    if (!("adminActiveSession" in prisma) || !prisma.adminActiveSession) return false;
    await prisma.adminActiveSession.upsert({
      where: { id: ROW_ID },
      create: {
        id: ROW_ID,
        email: session.email,
        sid: session.sid,
        createdAt: session.createdAt,
        exp: session.exp,
      },
      update: {
        email: session.email,
        sid: session.sid,
        createdAt: session.createdAt,
        exp: session.exp,
      },
    });
    return true;
  } catch (err) {
    if (!isMissingAdminSessionTable(err)) {
      console.error("[admin-active-session] db write failed", err);
    }
    return false;
  }
}

async function clearDb(sid?: string): Promise<void> {
  try {
    if (!("adminActiveSession" in prisma) || !prisma.adminActiveSession) return;
    if (sid) {
      const row = await prisma.adminActiveSession.findUnique({ where: { id: ROW_ID } });
      if (row && row.sid !== sid) return;
    }
    await prisma.adminActiveSession.delete({ where: { id: ROW_ID } }).catch(() => undefined);
  } catch {
    /* ignore */
  }
}

export async function readActiveAdminSession(): Promise<ActiveAdminSession | null> {
  const fromDb = await readFromDb();
  if (fromDb) {
    try {
      await ensureDir();
      await fs.writeFile(storePath, JSON.stringify(fromDb, null, 2), "utf8");
    } catch {
      /* cache only */
    }
    return fromDb;
  }

  // File is fallback only when MySQL has no live row (missing table / empty).
  let fromFile: ActiveAdminSession | null = null;
  try {
    const raw = await fs.readFile(storePath, "utf8");
    fromFile = parseSession(raw);
  } catch {
    fromFile = null;
  }
  return fromFile;
}

export async function writeActiveAdminSession(session: ActiveAdminSession): Promise<void> {
  const withSeen: ActiveAdminSession = {
    ...session,
    lastSeenAt: session.lastSeenAt ?? nowSec(),
  };
  const dbOk = await writeToDb(withSeen);
  await ensureDir();
  await fs.writeFile(storePath, JSON.stringify(withSeen, null, 2), "utf8");
  if (!dbOk) {
    console.warn(
      "[admin-active-session] DB write failed — using file only. Check prisma generate / lms_admin_active_session table.",
    );
  }
  // Confirm readable
  const check = await readActiveAdminSession();
  if (!check || check.sid !== withSeen.sid) {
    throw new Error("Failed to register exclusive admin session.");
  }
}

/** Heartbeat while /admin is open — keeps exclusive lock from going stale. */
export async function touchActiveAdminSession(sid: string): Promise<void> {
  const active = await readActiveAdminSession();
  if (!active || active.sid !== sid.trim()) return;
  const next: ActiveAdminSession = { ...active, lastSeenAt: nowSec() };
  await writeToDb(next);
  try {
    await ensureDir();
    await fs.writeFile(storePath, JSON.stringify(next, null, 2), "utf8");
  } catch {
    /* ignore */
  }
}

export async function clearActiveAdminSession(sid?: string): Promise<void> {
  await clearDb(sid);
  try {
    if (sid) {
      const current = readActiveAdminSessionSync();
      if (current && current.sid !== sid) return;
    }
    await fs.unlink(storePath);
  } catch {
    /* missing file is fine */
  }
}

export async function isAdminSessionHeldElsewhere(currentSid?: string | null): Promise<{
  held: boolean;
  session: ActiveAdminSession | null;
}> {
  const session = await readActiveAdminSession();
  if (!session) return { held: false, session: null };
  if (currentSid && session.sid === currentSid) return { held: false, session };
  return { held: true, session };
}

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
  "Admin is already signed in on another computer. Sign out from that computer first. This computer cannot log in until then.";
