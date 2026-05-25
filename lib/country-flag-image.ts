import { countryFlagEmoji } from "@/lib/iso-country-list";

export type FlagDisplay =
  | { kind: "image"; url: string }
  | { kind: "emoji"; text: string };

/** Ordered fallbacks — tries each until one loads in the UI. */
export function countryFlagDisplays(countryCode: string, width = 40): FlagDisplay[] {
  const code = countryCode.trim().toUpperCase();
  const lower = code.toLowerCase();
  if (!/^[A-Z]{2}$/.test(code)) return [];

  return [
    { kind: "image", url: `https://flagcdn.com/w${width}/${lower}.png` },
    { kind: "image", url: `https://flagsapi.com/${code}/flat/32.png` },
    { kind: "image", url: `https://purecatamphetamine.github.io/country-flag-icons/3x2/${code}.svg` },
    { kind: "emoji", text: countryFlagEmoji(code) },
  ];
}

/** @deprecated Use countryFlagDisplays */
export function countryFlagImageUrl(countryCode: string, width = 40): string {
  const first = countryFlagDisplays(countryCode, width).find((d) => d.kind === "image");
  return first?.kind === "image" ? first.url : "";
}
