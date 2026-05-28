/**
 * Public tracker ID on certificate PDF (Unique Delegate No.)
 * Format: {YYYY}-{verifyNumber}-{userId}
 * Example: 2026-0042-123  (verify #42 in 2026, learner user ID 123)
 */
export type DelegateNumberParts = {
  year: number;
  verifyNumber: number;
  userIdentificationNumber: number;
  holderType: "individual" | "organisation";
};

export function formatDelegateNumber(parts: DelegateNumberParts): string {
  const verify = String(parts.verifyNumber).padStart(4, "0");
  const userId =
    parts.holderType === "organisation"
      ? `${parts.userIdentificationNumber}-org`
      : String(parts.userIdentificationNumber);
  return `${parts.year}-${verify}-${userId}`;
}

export function parseDelegateNumber(value: string): DelegateNumberParts | null {
  const m = value.trim().match(/^(\d{4})-(\d+)-(\d+)(-org)?$/i);
  if (!m) return null;
  return {
    year: parseInt(m[1], 10),
    verifyNumber: parseInt(m[2], 10),
    userIdentificationNumber: parseInt(m[3], 10),
    holderType: m[4] ? "organisation" : "individual",
  };
}

export function describeDelegateNumberFormat(): string {
  return "Delegate / tracker ID: {YYYY}-{verifyNumber}-{userId} (e.g. 2026-0042-123). QR on certificate links here.";
}
