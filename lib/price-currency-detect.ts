import { currencyForCountry } from "@/lib/currency-by-country";
import { pricingRegionForCountry } from "@/lib/country-pricing";

export type CurrencyDisplay = {
  code: string;
  symbol: string;
  name: string;
};

const CURRENCY_META: Record<string, { symbol: string; name: string }> = {
  INR: { symbol: "₹", name: "Indian Rupee" },
  USD: { symbol: "$", name: "US Dollar" },
  EUR: { symbol: "€", name: "Euro" },
  GBP: { symbol: "£", name: "British Pound" },
  AED: { symbol: "AED", name: "UAE Dirham" },
  SAR: { symbol: "SAR", name: "Saudi Riyal" },
  AUD: { symbol: "A$", name: "Australian Dollar" },
  CAD: { symbol: "C$", name: "Canadian Dollar" },
  SGD: { symbol: "S$", name: "Singapore Dollar" },
  JPY: { symbol: "¥", name: "Japanese Yen" },
  CNY: { symbol: "¥", name: "Chinese Yuan" },
  PKR: { symbol: "₨", name: "Pakistani Rupee" },
  BDT: { symbol: "৳", name: "Bangladeshi Taka" },
  NGN: { symbol: "₦", name: "Nigerian Naira" },
  ZAR: { symbol: "R", name: "South African Rand" },
  CHF: { symbol: "CHF", name: "Swiss Franc" },
  NZD: { symbol: "NZ$", name: "New Zealand Dollar" },
  MXN: { symbol: "MX$", name: "Mexican Peso" },
  BRL: { symbol: "R$", name: "Brazilian Real" },
  KRW: { symbol: "₩", name: "South Korean Won" },
  THB: { symbol: "฿", name: "Thai Baht" },
  MYR: { symbol: "RM", name: "Malaysian Ringgit" },
  IDR: { symbol: "Rp", name: "Indonesian Rupiah" },
  PHP: { symbol: "₱", name: "Philippine Peso" },
  VND: { symbol: "₫", name: "Vietnamese Dong" },
  TRY: { symbol: "₺", name: "Turkish Lira" },
  PLN: { symbol: "zł", name: "Polish Zloty" },
  SEK: { symbol: "kr", name: "Swedish Krona" },
  NOK: { symbol: "kr", name: "Norwegian Krone" },
  DKK: { symbol: "kr", name: "Danish Krone" },
  HKD: { symbol: "HK$", name: "Hong Kong Dollar" },
  TWD: { symbol: "NT$", name: "Taiwan Dollar" },
  QAR: { symbol: "QAR", name: "Qatari Riyal" },
  KWD: { symbol: "KWD", name: "Kuwaiti Dinar" },
  BHD: { symbol: "BHD", name: "Bahraini Dinar" },
  OMR: { symbol: "OMR", name: "Omani Rial" },
  ILS: { symbol: "₪", name: "Israeli Shekel" },
  RUB: { symbol: "₽", name: "Russian Ruble" },
  EGP: { symbol: "E£", name: "Egyptian Pound" },
  LKR: { symbol: "Rs", name: "Sri Lankan Rupee" },
  NPR: { symbol: "Rs", name: "Nepalese Rupee" },
};

/** Detect currency from a price string (symbols / codes). */
export function detectCurrencyFromPrice(priceStr: string): CurrencyDisplay | null {
  const s = priceStr.trim();
  if (!s) return null;

  const upper = s.toUpperCase();

  const codeMatch = upper.match(/\b(INR|USD|EUR|GBP|AED|SAR|AUD|CAD|SGD|JPY|CNY|PKR|BDT|NGN|ZAR|CHF|NZD|MXN|BRL|KRW|THB|MYR|IDR|PHP|VND|TRY|PLN|SEK|NOK|DKK|HKD|TWD|QAR|KWD|BHD|OMR|ILS|RUB|EGP|LKR|NPR)\b/);
  if (codeMatch) return currencyDisplay(codeMatch[1]);

  if (/^A\$|AUD/i.test(s)) return currencyDisplay("AUD");
  if (/^C\$|CAD/i.test(s)) return currencyDisplay("CAD");
  if (/^S\$|SGD/i.test(s)) return currencyDisplay("SGD");
  if (/^NZ\$|NZD/i.test(s)) return currencyDisplay("NZD");
  if (/^HK\$|HKD/i.test(s)) return currencyDisplay("HKD");
  if (/^NT\$|TWD/i.test(s)) return currencyDisplay("TWD");
  if (/^MX\$|MXN/i.test(s)) return currencyDisplay("MXN");
  if (/^R\$|BRL/i.test(s)) return currencyDisplay("BRL");
  if (/₹|INR/i.test(s)) return currencyDisplay("INR");
  if (/^€|EUR/i.test(s)) return currencyDisplay("EUR");
  if (/^£|GBP/i.test(s)) return currencyDisplay("GBP");
  if (/^AED\s?/i.test(s)) return currencyDisplay("AED");
  if (/^SAR\s?/i.test(s)) return currencyDisplay("SAR");
  if (/^CHF\s?/i.test(s)) return currencyDisplay("CHF");
  if (/₨|PKR/i.test(s)) return currencyDisplay("PKR");
  if (/৳|BDT/i.test(s)) return currencyDisplay("BDT");
  if (/₦|NGN/i.test(s)) return currencyDisplay("NGN");
  if (/₩|KRW/i.test(s)) return currencyDisplay("KRW");
  if (/฿|THB/i.test(s)) return currencyDisplay("THB");
  if (/₱|PHP/i.test(s)) return currencyDisplay("PHP");
  if (/₫|VND/i.test(s)) return currencyDisplay("VND");
  if (/₺|TRY/i.test(s)) return currencyDisplay("TRY");
  if (/₪|ILS/i.test(s)) return currencyDisplay("ILS");
  if (/₽|RUB/i.test(s)) return currencyDisplay("RUB");
  if (/\$|USD/i.test(s)) return currencyDisplay("USD");

  return null;
}

export function currencyDisplay(code: string): CurrencyDisplay {
  const c = code.toUpperCase();
  const meta = CURRENCY_META[c];
  if (meta) return { code: c, symbol: meta.symbol, name: meta.name };
  const region = pricingRegionForCountry("US");
  if (c === region.currency) {
    return { code: c, symbol: region.currencySymbol.trim(), name: c };
  }
  return { code: c, symbol: c, name: c };
}

/** Currency for a country row in regional pricing. */
export function currencyDisplayForCountry(countryCode: string): CurrencyDisplay {
  const code = currencyForCountry(countryCode);
  const region = pricingRegionForCountry(countryCode);
  const meta = CURRENCY_META[code];
  return {
    code,
    symbol: (meta?.symbol ?? region.currencySymbol.trim()) || code,
    name: meta?.name ?? code,
  };
}

/** Prefer country currency for regional rows; otherwise parse the price string; fallback INR. */
export function resolvePriceCurrency(priceStr: string, countryCode?: string): CurrencyDisplay {
  if (countryCode?.trim()) {
    return currencyDisplayForCountry(countryCode);
  }
  return detectCurrencyFromPrice(priceStr) ?? currencyDisplay("INR");
}
