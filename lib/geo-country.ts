export type GeoCountry = {
  countryCode: string;
  countryName: string;
};

const DEFAULT_GEO: GeoCountry = { countryCode: "IN", countryName: "India" };

/** Resolve country from IP using ipwho.is (no API key). */
export async function lookupCountryFromIp(ip: string | null): Promise<GeoCountry> {
  if (!ip) return DEFAULT_GEO;

  try {
    const res = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return DEFAULT_GEO;
    const data = (await res.json()) as {
      success?: boolean;
      country_code?: string;
      country?: string;
    };
    if (data.success === false || !data.country_code) return DEFAULT_GEO;
    return {
      countryCode: data.country_code.toUpperCase(),
      countryName: data.country?.trim() || data.country_code,
    };
  } catch {
    return DEFAULT_GEO;
  }
}

/** Vercel / edge may send country without a geo API call. */
export function countryFromRequestHeaders(request: Request): GeoCountry | null {
  const code = request.headers.get("x-vercel-ip-country") ?? request.headers.get("cf-ipcountry");
  if (!code || code === "XX") return null;
  return { countryCode: code.toUpperCase(), countryName: code.toUpperCase() };
}
