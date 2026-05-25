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

export function getGoogleClientId(): string | null {
  const id = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim();
  return id || null;
}

export function requestGoogleAccessToken(
  onToken: (accessToken: string) => void,
  onError: (message: string) => void,
  options?: { prompt?: "" | "none" | "consent" | "select_account" },
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

  const tokenClient = window.google.accounts.oauth2.initTokenClient({
    client_id: clientId,
    scope: "openid email profile",
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
      if (err.type === "popup_closed") return;
      onError(err.message ?? "Google sign-in failed.");
    },
  });

  tokenClient.requestAccessToken({ prompt: options?.prompt ?? "" });
}
