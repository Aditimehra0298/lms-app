import { countryFlagEmoji, listCountryOptions } from "@/lib/iso-country-list";

/** ISO 3166-1 alpha-2 → international dial code (without +). */
const DIAL_CODE: Record<string, string> = {
  IN: "91", US: "1", CA: "1", GB: "44", AU: "61", NZ: "64", AE: "971", SA: "966",
  SG: "65", MY: "60", PH: "63", ID: "62", TH: "66", VN: "84", JP: "81", KR: "82",
  CN: "86", HK: "852", TW: "886", DE: "49", FR: "33", IT: "39", ES: "34", NL: "31",
  BE: "32", CH: "41", AT: "43", SE: "46", NO: "47", DK: "45", FI: "358", PL: "48",
  PT: "351", IE: "353", GR: "30", CZ: "420", RO: "40", HU: "36", TR: "90", RU: "7",
  UA: "380", IL: "972", EG: "20", ZA: "27", NG: "234", KE: "254", GH: "233", PK: "92",
  BD: "880", LK: "94", NP: "977", MX: "52", BR: "55", AR: "54", CL: "56", CO: "57",
  PE: "51", QA: "974", KW: "965", BH: "973", OM: "968", JO: "962", LB: "961", IQ: "964",
};

export function dialCodeForCountry(countryCode: string): string {
  return DIAL_CODE[countryCode.toUpperCase()] ?? "1";
}

export function formatDialPrefix(countryCode: string): string {
  return `+${dialCodeForCountry(countryCode)}`;
}

export type PhoneCountryOption = {
  code: string;
  name: string;
  dial: string;
  flag: string;
  /** Dropdown: flag + ISO + dial (no country name). */
  optionLabel: string;
  /** Closed picker: flag + ISO only. */
  compactLabel: string;
};

export function listPhoneCountryOptions(): PhoneCountryOption[] {
  return listCountryOptions().map((c) => {
    const dial = dialCodeForCountry(c.code);
    const flag = countryFlagEmoji(c.code);
    return {
      code: c.code,
      name: c.name,
      dial,
      flag,
      compactLabel: `${flag} ${c.code}`,
      optionLabel: `${flag} ${c.code} +${dial}`,
    };
  });
}

/** Build stored phone value: +{dial} {nationalNumber} */
export function formatStoredPhone(countryCode: string, nationalNumber: string): string {
  const digits = nationalNumber.replace(/\D/g, "");
  if (!digits) return "";
  return `${formatDialPrefix(countryCode)} ${digits}`;
}
