/** Comma-separated admin emails in .env.local (optional delegates; panel access uses main only). */
export function getAdminEmails(): string[] {
  const raw =
    process.env.ADMIN_EMAILS?.trim() ||
    process.env.ADMIN_EMAIL?.trim() ||
    "";
  if (!raw) return [];
  return raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/** Primary owner — only this Google account may open /admin. */
export function getMainAdminEmail(): string {
  const main = process.env.MAIN_ADMIN_EMAIL?.trim().toLowerCase();
  if (main) return main;
  return getAdminEmails()[0] ?? "";
}

export function maskEmailForDisplay(email: string): string {
  const [user, domain] = email.split("@");
  if (!user || !domain) return email;
  const visible = user.length <= 2 ? user[0] ?? "*" : `${user.slice(0, 2)}***`;
  return `${visible}@${domain}`;
}

export function isMainAdminEmail(email: string | null | undefined): boolean {
  const normalized = email?.trim().toLowerCase();
  const main = getMainAdminEmail();
  if (!normalized || !main) return false;
  return normalized === main;
}

/** @deprecated Use isMainAdminEmail — admin panel is main-account only. */
export function isAdminEmail(email: string | null | undefined): boolean {
  return isMainAdminEmail(email);
}

export function roleForEmail(email: string): "admin" | "learner" {
  return isMainAdminEmail(email) ? "admin" : "learner";
}
