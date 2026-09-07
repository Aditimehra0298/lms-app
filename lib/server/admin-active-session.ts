import { promises as fs, readFileSync, unlinkSync } from "node:fs";
import path from "node:path";
import { prisma } from "@/lib/prisma";

/**
 * Exclusive admin panel session: only one active login at a time.
 * Primary store: MySQL. File fallback kept in sync.
 */

const storePath = path.join(process.cwd(), "data", "admin-active-session.json");
const ROW_ID = "main";

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

function fromDbRow(row: {
  email: string;
  sid: string;
  createdAt: number;
  exp: number;
}): ActiveAdminSession | null {
  if (Math.floor(Date.now() / 1000) > row.exp) return null;
  return {
    email: row.email.trim().toLowerCase(),
    sid: row.sid,
    createdAt: row.createdAt,
    exp: row.exp,
  };
}

function pickNewer(
  a: ActiveAdminSession | null,
  b: ActiveAdminSession | null,
): ActiveAdminSession | null {
  if (!a) return b;
  if (!b) return a;
  return a.createdAt >= b.createdAt ? a : b;
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
    console.error("[admin-active-session] db read failed", err);
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
    console.error("[admin-active-session] db write failed", err);
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
  let fromFile: ActiveAdminSession | null = null;
  try {
    const raw = await fs.readFile(storePath, "utf8");
    fromFile = parseSession(raw);
  } catch {
    fromFile = null;
  }

  const session = pickNewer(fromDb, fromFile);
  if (!session) {
    if (fromFile === null && fromDb === null) return null;
    await clearActiveAdminSession();
    return null;
  }

  // Keep both stores aligned on the winning sid.
  if (!fromDb || fromDb.sid !== session.sid) {
    void writeToDb(session);
  }
  if (!fromFile || fromFile.sid !== session.sid) {
    try {
      await ensureDir();
      await fs.writeFile(storePath, JSON.stringify(session, null, 2), "utf8");
    } catch {
      /* ignore */
    }
  }
  return session;
}

export async function writeActiveAdminSession(session: ActiveAdminSession): Promise<void> {
  const dbOk = await writeToDb(session);
  await ensureDir();
  await fs.writeFile(storePath, JSON.stringify(session, null, 2), "utf8");
  if (!dbOk) {
    console.warn(
      "[admin-active-session] DB write failed — using file only. Check prisma generate / lms_admin_active_session table.",
    );
  }
  // Confirm readable
  const check = await readActiveAdminSession();
  if (!check || check.sid !== session.sid) {
    throw new Error("Failed to register exclusive admin session.");
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
  "Admin panel is already signed in on another device. Sign out from that device first.";
