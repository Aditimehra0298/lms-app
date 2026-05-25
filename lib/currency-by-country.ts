/** ISO 3166-1 alpha-2 → ISO 4217 (fallback USD for unlisted). */
const COUNTRY_CURRENCY: Record<string, string> = {
  IN: "INR", US: "USD", GB: "GBP", AE: "AED", SA: "SAR", AU: "AUD", CA: "CAD", SG: "SGD",
  JP: "JPY", CN: "CNY", HK: "HKD", TW: "TWD", KR: "KRW", CH: "CHF", NZ: "NZD", MX: "MXN",
  BR: "BRL", ZA: "ZAR", NG: "NGN", KE: "KES", EG: "EGP", PK: "PKR", BD: "BDT", LK: "LKR",
  NP: "NPR", TH: "THB", MY: "MYR", ID: "IDR", PH: "PHP", VN: "VND", TR: "TRY", PL: "PLN",
  SE: "SEK", NO: "NOK", DK: "DKK", CZ: "CZK", HU: "HUF", RO: "RON", IL: "ILS", QA: "QAR",
  KW: "KWD", BH: "BHD", OM: "OMR", JO: "JOD", LB: "LBP", IQ: "IQD", MA: "MAD", TN: "TND",
  GH: "GHS", UG: "UGX", TZ: "TZS", ET: "ETB", RU: "RUB", UA: "UAH", KZ: "KZT", UZ: "UZS",
  AR: "ARS", CL: "CLP", CO: "COP", PE: "PEN", VE: "VES", CR: "CRC", PA: "PAB", UY: "UYU",
  IS: "ISK", BG: "BGN", HR: "HRK", RS: "RSD", BA: "BAM", MK: "MKD", AL: "ALL", GE: "GEL",
  AM: "AMD", AZ: "AZN", BY: "BYN", MD: "MDL", BO: "BOB", PY: "PYG", GT: "GTQ", HN: "HNL",
  NI: "NIO", SV: "USD", DO: "DOP", JM: "JMD", TT: "TTD", BB: "BBD", BS: "BSD", BZ: "BZD",
  KH: "KHR", LA: "LAK", MM: "MMK", MN: "MNT", AF: "AFN", IR: "IRR",
  LY: "LYD", SD: "SDG", SN: "XOF", CI: "XOF", CM: "XAF", AO: "AOA", MZ: "MZN", ZM: "ZMW",
  ZW: "ZWL", BW: "BWP", NA: "NAD", MU: "MUR", SC: "SCR", MV: "MVR", BT: "BTN", FJ: "FJD",
  PG: "PGK",
};

const EURO_ZONE = new Set([
  "AT", "BE", "CY", "DE", "EE", "ES", "FI", "FR", "GR", "HR", "IE", "IT", "LT", "LU", "LV", "MT",
  "NL", "PT", "SI", "SK", "AD", "MC", "SM", "VA", "XK",
]);

export function currencyForCountry(countryCode: string): string {
  const code = countryCode.toUpperCase();
  if (EURO_ZONE.has(code)) return "EUR";
  return COUNTRY_CURRENCY[code] ?? "USD";
}
