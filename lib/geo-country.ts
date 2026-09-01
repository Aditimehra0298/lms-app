import { isPrivateIp } from "@/lib/request-ip";

export type GeoCountry = {
  countryCode: string;
  countryName: string;
  /** Public IP reported by the geo provider (useful when proxy headers were empty). */
  detectedIp?: string | null;
};

const DEFAULT_GEO: GeoCountry = { countryCode: "IN", countryName: "India" };

/** Resolve country from IP using ipwho.is (no API key). */
export async function lookupCountryFromIp(ip: string | null): Promise<GeoCountry> {
  const useAutoDetect = !ip || isPrivateIp(ip);
  const url = useAutoDetect
    ? "https://ipwho.is/"
    : `https://ipwho.is/${encodeURIComponent(ip)}`;

  try {
    const res = await fetch(url, {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return DEFAULT_GEO;
    const data = (await res.json()) as {
      success?: boolean;
      ip?: string;
      country_code?: string;
      country?: string;
    };
    if (data.success === false || !data.country_code) return DEFAULT_GEO;
    return {
      countryCode: data.country_code.toUpperCase(),
      countryName: data.country?.trim() || data.country_code,
      detectedIp: data.ip?.trim() || (useAutoDetect ? null : ip),
    };
  } catch {
    return DEFAULT_GEO;
  }
}

/** Vercel / Cloudflare may send country without a geo API call. */
export function countryFromRequestHeaders(request: Request): GeoCountry | null {
  const code = request.headers.get("x-vercel-ip-country") ?? request.headers.get("cf-ipcountry");
  if (!code || code === "XX") return null;
  return { countryCode: code.toUpperCase(), countryName: code.toUpperCase() };
}
