# Google Sign-In (Continue with Google)

The **Continue with Google** button on `/account` uses Google Identity Services. Email/password login is unchanged.

## 1. Create OAuth credentials

1. Open [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials).
2. Create or select a project.
3. **APIs & Services → OAuth consent screen** — configure app name and add your Google account as a test user (while in *Testing* mode).
4. **Credentials → Create credentials → OAuth client ID → Web application**.
5. **Authorized JavaScript origins** (required — must match the address bar **exactly**):
   - `http://localhost:3000` (this PC only)
   - `http://192.168.1.77:3000` (other PCs on same Wi‑Fi — use **your** PC’s IP from `ipconfig`)
   - Your production URL, e.g. `https://your-domain.com`
6. Copy the **Client ID** (ends with `.apps.googleusercontent.com`).

Redirect URIs are not required for this app’s token-based flow.

## 2. Add to `.env.local`

In the same folder as `package.json`:

```env
GOOGLE_CLIENT_ID=123456789-xxxx.apps.googleusercontent.com
NEXT_PUBLIC_GOOGLE_CLIENT_ID=123456789-xxxx.apps.googleusercontent.com
```

Use the **same** Client ID for both variables.

## 3. Restart the dev server

```bash
npm run dev
```

## 4. Test

1. Open [http://localhost:3000/account](http://localhost:3000/account).
2. Choose an account type → **Continue**.
3. Click **Continue with Google** and complete the Google popup.
4. You should land on My Learning (or your `redirect` URL) with the session stored like a normal login.

Google sign-in skips email OTP (Google already verified the email) and saves the user in MySQL when the database is available.

## Troubleshooting

| Issue | Fix |
|--------|-----|
| “Google sign-in is not configured” | Add both env vars and restart `npm run dev`. |
| `origin_mismatch` / popup error | Add the **exact** URL from the browser bar (e.g. `http://192.168.1.77:3000`) under **Authorized JavaScript origins**. Wi‑Fi sharing fails if only `localhost` is listed. |
| Login works on host PC but not on another PC on Wi‑Fi | Other PC uses your LAN IP, not `localhost`. Add `http://YOUR_IP:3000` in Google Cloud (see above). |
| `access_denied` in Testing mode | Add your Gmail under OAuth consent screen → Test users. |
| DB not saved | Start MySQL and run `npm run db:push`. |
