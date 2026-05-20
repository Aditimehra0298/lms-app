export type GoogleUserInfo = {
  sub: string;
  email: string;
  email_verified: boolean;
  name?: string;
  picture?: string;
  /** e.g. en-US, en_IN — used to infer country when IP is unavailable */
  locale?: string;
};

export async function fetchGoogleUserInfo(accessToken: string): Promise<GoogleUserInfo> {
  const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  const data = (await res.json()) as GoogleUserInfo & { error?: string };
  if (!res.ok || data.error) {
    throw new Error(data.error ?? "Could not load Google profile");
  }
  if (!data.email) {
    throw new Error("Google account has no email");
  }
  if (!data.email_verified) {
    throw new Error("Google email is not verified");
  }
  return data;
}
