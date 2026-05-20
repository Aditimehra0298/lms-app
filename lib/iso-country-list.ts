const FALLBACK_COUNTRY_CODES = [
  "AF", "AL", "DZ", "AR", "AU", "AT", "BD", "BE", "BR", "CA", "CH", "CN", "CO", "DE", "EG", "ES", "FR",
  "GB", "GH", "GR", "HK", "ID", "IN", "IE", "IL", "IT", "JP", "KE", "KR", "KW", "LK", "MY", "MX", "NG",
  "NL", "NO", "NZ", "PK", "PH", "PL", "PT", "QA", "RO", "RU", "SA", "SE", "SG", "TH", "TR", "TW", "AE",
  "US", "VN", "ZA",
] as const;

function supportedCountryCodes(): string[] {
  try {
    const supportedValuesOf = (
      Intl as unknown as { supportedValuesOf?: (key: string) => string[] }
    ).supportedValuesOf;
    if (supportedValuesOf) {
      const values = supportedValuesOf("region");
      const codes = values.filter((v) => /^[A-Z]{2}$/.test(v));
      if (codes.length > 50) return codes;
    }
  } catch {
    /* ignore */
  }
  return [...FALLBACK_COUNTRY_CODES];
}

let displayNames: Intl.DisplayNames | null = null;

function getDisplayNames(): Intl.DisplayNames {
  if (!displayNames) {
    displayNames = new Intl.DisplayNames(["en"], { type: "region" });
  }
  return displayNames;
}

export function isValidCountryCode(code: string): boolean {
  return /^[A-Z]{2}$/.test(code.trim().toUpperCase());
}

/** Regional indicator emoji flag for ISO 3166-1 alpha-2 (e.g. IN → 🇮🇳). */
export function countryFlagEmoji(countryCode: string): string {
  const code = countryCode.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) return "🏳️";
  const base = 0x1f1e6 - "A".charCodeAt(0);
  return String.fromCodePoint(code.charCodeAt(0) + base, code.charCodeAt(1) + base);
}

export function countryDisplayName(countryCode: string): string {
  const code = countryCode.toUpperCase();
  try {
    return getDisplayNames().of(code) ?? code;
  } catch {
    return code;
  }
}

export type CountryOption = { code: string; name: string };

export function listCountryOptions(): CountryOption[] {
  return supportedCountryCodes()
    .map((code) => ({ code, name: countryDisplayName(code) }))
    .sort((a, b) => a.name.localeCompare(b.name, "en"));
}
