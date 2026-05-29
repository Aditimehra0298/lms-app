/** Brand + URL settings shared by welcome, OTP, and other transactional emails. */

export function emailAppName(): string {
  return process.env.MAIL_APP_NAME?.trim() || "SF Trainings";
}

/** Short brand for subject lines, e.g. "Welcome to SFT". */
export function emailShortBrand(): string {
  return process.env.MAIL_SHORT_BRAND?.trim() || "SFT";
}

export function emailAppUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.APP_URL?.trim() ||
    "http://localhost:3000"
  );
}

/** Absolute logo URL for email clients (optional). Example: https://yoursite.com/SF-WHITE-LOGO.png */
export function emailLogoUrl(): string | undefined {
  const explicit = process.env.MAIL_LOGO_URL?.trim();
  if (explicit) return explicit;
  const base = emailAppUrl().replace(/\/$/, "");
  const path = process.env.MAIL_LOGO_PATH?.trim() || "/SF-WHITE-LOGO.png";
  if (!path.startsWith("/")) return `${base}/${path}`;
  return `${base}${path}`;
}
