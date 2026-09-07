# Admin sign-in (password, then Google)

## Admin account

| Setting | Value |
|--------|--------|
| Email | Set only in `.env.local` as `MAIN_ADMIN_EMAIL` (never commit the real address) |
| Password | Set in `.env.local` as `ADMIN_PASSWORD` (server only — not in code) |

## `.env.local`

```env
MAIN_ADMIN_EMAIL=your-admin@example.com
ADMIN_PASSWORD=your-password-here
ADMIN_SESSION_SECRET=long-random-string

GOOGLE_CLIENT_ID=...
NEXT_PUBLIC_GOOGLE_CLIENT_ID=...
```

Restart: `npm run dev` (or `pm2 restart lms --update-env` on the server)

## Sign-in flow (both steps required)

1. Open [http://localhost:3000/account?admin=1](http://localhost:3000/account?admin=1)
2. Choose **Admin**
3. **Step 1 — LMS:** enter admin email and `ADMIN_PASSWORD`, then **Sign in to Admin**
4. **Step 2 — Google:** click **Verify with Google** (or use the popup if it opens). Sign in with the **same** Google account as `MAIN_ADMIN_EMAIL`.
5. Google may ask for a code or prompt — that uses the **phone or 2-Step Verification on your Google account**, not an OTP from this LMS.

To enable Google’s extra check on new devices:

1. Open [Google Account → Security](https://myaccount.google.com/security)
2. Enable **2-Step Verification**
3. Add your phone number

## Security

- Password is checked only on the server (`/api/auth/admin-login`). It does **not** open the admin panel by itself.
- A short-lived token links step 1 to step 2; Google must match the same email (`/api/auth/google` with `adminVerifyToken`).
- **Google-only** or **password-only** admin sign-in is blocked.
- Only `MAIN_ADMIN_EMAIL` can be admin.
- Do **not** put the real admin email, password, or social account names in source code, docs, or comments.
- Do not commit `.env.local`.
