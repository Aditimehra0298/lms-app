export type GoogleTokenResponse = {
  access_token?: string;
  error?: string;
  error_description?: string;
};

export type GoogleAccountsId = {
  initialize: (config: {
    client_id: string;
    callback: (response: { credential: string }) => void;
    auto_select?: boolean;
    cancel_on_tap_outside?: boolean;
  }) => void;
  prompt: (listener?: (notification: { isNotDisplayed: () => boolean }) => void) => void;
};

export type GoogleAccountsOAuth2 = {
  initTokenClient: (config: {
    client_id: string;
    scope: string;
    /** Pre-select this Google account (admin must use MAIN_ADMIN_EMAIL). */
    hint?: string;
    callback: (response: GoogleTokenResponse) => void;
    error_callback?: (err: { type?: string; message?: string }) => void;
  }) => { requestAccessToken: (overrides?: { prompt?: string }) => void };
};

export type GoogleAccounts = {
  id: GoogleAccountsId;
  oauth2: GoogleAccountsOAuth2;
};

declare global {
  interface Window {
    google?: { accounts: GoogleAccounts };
  }
}

export const GOOGLE_GSI_SCRIPT = "https://accounts.google.com/gsi/client";

export const GOOGLE_SIGNIN_SCOPES = "openid email profile";

export const GOOGLE_YOUTUBE_SCOPES = "https://www.googleapis.com/auth/youtube.readonly";

export function getGoogleClientId(): string | null {
  const id = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim();
  return id || null;
}

export function isGoogleOAuthReady(): boolean {
  return Boolean(typeof window !== "undefined" && window.google?.accounts?.oauth2);
}

/** Wait for GSI script after Next.js <Script onLoad> (oauth2 can appear slightly later). */
export function waitForGoogleOAuth2(maxMs = 15_000): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (isGoogleOAuthReady()) return Promise.resolve(true);

  return new Promise((resolve) => {
    const started = Date.now();
    const tick = () => {
      if (isGoogleOAuthReady()) {
        resolve(true);
        return;
      }
      if (Date.now() - started >= maxMs) {
        resolve(false);
        return;
      }
      window.setTimeout(tick, 200);
    };
    tick();
  });
}

export function requestGoogleAccessToken(
  onToken: (accessToken: string) => void,
  onError: (message: string) => void,
  options?: {
    prompt?: "" | "none" | "consent" | "select_account";
    /** Optional Google account email hint (login_hint) — never hardcode a real admin address here. */
    loginHint?: string;
  },
): void {
  const clientId = getGoogleClientId();
  if (!clientId) {
    onError(
      "Google sign-in is not configured. Add NEXT_PUBLIC_GOOGLE_CLIENT_ID to .env.local and restart the dev server.",
    );
    return;
  }
  if (!window.google?.accounts?.oauth2) {
    onError("Google sign-in is still loading. Try again in a moment.");
    return;
  }

  const loginHint = options?.loginHint?.trim().toLowerCase();

  const tokenClient = window.google.accounts.oauth2.initTokenClient({
    client_id: clientId,
    scope: GOOGLE_SIGNIN_SCOPES,
    ...(loginHint ? { hint: loginHint } : {}),
    callback: (response) => {
      if (response.error) {
        if (response.error === "popup_closed_by_user") return;
        onError(response.error_description ?? response.error);
        return;
      }
      const token = response.access_token?.trim();
      if (!token) {
        onError("Google did not return an access token.");
        return;
      }
      onToken(token);
    },
    error_callback: (err) => {
      if (err.type === "popup_closed" || err.type === "popup_failed_to_open") {
        onError(
          "Google sign-in popup was blocked. Allow popups for this site, then try again.",
        );
        return;
      }
      onError(err.message ?? "Google sign-in failed.");
    },
  });

  tokenClient.requestAccessToken({
    prompt: options?.prompt ?? (loginHint ? "" : "select_account"),
  });
}

/** Request OAuth token with custom scopes (e.g. YouTube readonly for recommendations). */
export function requestGoogleScopedAccessToken(
  scope: string,
  onToken: (accessToken: string) => void,
  onError: (message: string) => void,
  options?: {
    prompt?: "" | "none" | "consent" | "select_account";
    loginHint?: string;
  },
): void {
  const clientId = getGoogleClientId();
  if (!clientId) {
    onError(
      "Google is not configured. Add NEXT_PUBLIC_GOOGLE_CLIENT_ID to .env.local and restart the dev server.",
    );
    return;
  }
  if (!window.google?.accounts?.oauth2) {
    onError("Google sign-in is still loading. Try again in a moment.");
    return;
  }

  const loginHint = options?.loginHint?.trim().toLowerCase();

  const tokenClient = window.google.accounts.oauth2.initTokenClient({
    client_id: clientId,
    scope,
    ...(loginHint ? { hint: loginHint } : {}),
    callback: (response) => {
      if (response.error) {
        if (response.error === "popup_closed_by_user") return;
        onError(response.error_description ?? response.error);
        return;
      }
      const token = response.access_token?.trim();
      if (!token) {
        onError("Google did not return an access token.");
        return;
      }
      onToken(token);
    },
    error_callback: (err) => {
      if (err.type === "popup_closed" || err.type === "popup_failed_to_open") {
        onError("Google popup was blocked. Allow popups for this site, then try again.");
        return;
      }
      onError(err.message ?? "Google authorization failed.");
    },
  });

  tokenClient.requestAccessToken({
    prompt: options?.prompt ?? "consent",
  });
}
