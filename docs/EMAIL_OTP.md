# Email OTP for registration

Registration on `/account` requires email verification before submit.

## Flow (Individual & Organisation)

1. Choose avatar → **Continue**
2. **Register** tab
3. Enter email (or work email for Organisation)
4. **Send OTP** — 6-digit code is created (valid 10 minutes)
5. Enter code → **Verify OTP** — must show “Email verified”
6. Fill remaining fields → **Submit**

Login does **not** require OTP.

## Welcome email (after registration)

When a **new** learner completes registration (email + OTP **or** Google on the Register tab), the app sends a branded **welcome email** to their inbox using the same SMTP settings as OTP.

- Template: `lib/email-templates/welcome.ts`
- Trigger: `POST /api/auth/record` (`action: register`) and `POST /api/auth/google` (`action: register`, new user only)
- Google **login** for an existing account does **not** send welcome again.
- Disable: `WELCOME_EMAIL_ENABLED=false` in `.env.local`
- Brand name in subject/body: `MAIL_APP_NAME=SF Trainings` (optional)

**Via n8n (recommended for production):** set `N8N_WELCOME_WEBHOOK_URL` in `.env.local`. The LMS POSTs the full HTML template to n8n; your workflow sends Gmail/Outlook. See **`docs/N8N_WELCOME_EMAIL.md`**.

If n8n is not set, welcome uses **SMTP** (same settings as OTP). If n8n fails, SMTP is used when `WELCOME_EMAIL_SMTP_FALLBACK=true` (default).

## Send real email (Gmail)

In `.env.local`:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your@gmail.com
SMTP_PASS=your-16-char-app-password
SMTP_FROM="LMS <your@gmail.com>"
OTP_USE_SMTP=true
```

Use a [Google App Password](https://myaccount.google.com/apppasswords) (not your normal Gmail password).  
For **reliable delivery on the server**, install nodemailer: `npm install nodemailer`. If it is missing, a small built-in SMTP client is used instead.

When `OTP_USE_SMTP=true`, if sending fails the API returns an error — the code is **not** shown in the browser (only a clear failure message).

## Development without email

For instant codes on the form only:

```env
OTP_USE_SMTP=false
```

The 6-digit code appears **on the page** after **Send OTP**, and in the `npm run dev` terminal:

```
[OTP] you@example.com → code: 123456
```

Copy that code into the form.

## Production email (Gmail example)

Add to `.env.local`:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your@gmail.com
SMTP_PASS=your-16-char-app-password
SMTP_FROM="LMS <your@gmail.com>"
```

Gmail steps:

1. Google Account → Security → 2-Step Verification (on)
2. App passwords → Mail → generate password
3. Use that password as `SMTP_PASS`

Then install `nodemailer` (recommended — stops Node first so native DLLs unlock):

```powershell
Set-Location "D:\path\to\lms-app-main\lms-app-main"
npm.cmd run install:nodemailer
```

If the registry is blocked, use `npm.cmd run install:nodemailer:offline` instead.

Restart the dev server.

## Setup script

From the project folder (the one that contains `package.json`):

```powershell
Set-Location "D:\Download\lms-app-main\lms-app-main"
.\setup-otp.cmd
```

Or: `npm.cmd run setup:otp`

## Troubleshooting (Windows)

### Pasted log text into PowerShell

If you see errors like `The term '===' is not recognized` or `Get-Process : A positional parameter cannot be found that accepts argument 'npm.cmd'`, you pasted **old terminal output** into the shell. PowerShell tried to run each line as a command.

**Fix:** open a **new** terminal tab. Type only the commands below — do not paste blocks that start with `PS D:\...` or `npm error`.

### Use `npm.cmd`, not `npm`

In PowerShell, `npm` may run `npm.ps1` and fail with *running scripts is disabled*. Always use:

```powershell
npm.cmd install ...
npm.cmd run dev
```

### Wrong folder

Run commands in `lms-app-main\lms-app-main`, not the parent `lms-app-main` folder (no `package.json` there).

### Send OTP is very slow

Usually Gmail SMTP is configured in `.env.local` but email cannot be sent (firewall, missing `nodemailer`, or wrong network). The app used to wait on SMTP/timeouts.

**Fix:** add `OTP_USE_SMTP=false` to `.env.local`, restart `npm run dev`, then **Send OTP** again — the code should appear on the page within a second.

### Prisma: `unable to verify the first certificate` (binaries.prisma.sh)

Corporate SSL inspection breaks Node’s default CA bundle. Postinstall already runs `prisma generate` with **`--use-system-ca`**. If you run Prisma yourself, use:

```powershell
$env:NODE_OPTIONS = "--use-system-ca"
npm.cmd run db:generate
```

### Cannot delete `node_modules` (Access denied on `.node` files)

Something still has those DLLs open (editor, antivirus, stray `node.exe`).

```powershell
npm.cmd run clean:node_modules
```

If removal fails, the script **renames** `node_modules` so you can run a fresh `npm.cmd install`. Delete the `node_modules.__deleted__.*` folder later (after reboot if needed).

### `ENOENT` … `oxide-wasm32-wasi` or `EBUSY` on `.node` files

- **`ENOENT` … `@tailwindcss/oxide-wasm32-wasi`:** `node_modules` is out of sync with `package-lock.json` (optional Tailwind binary missing). Stop Node, then reinstall with optional deps omitted or do a clean install (see below).
- **`EBUSY` … `next-swc.win32-x64-msvc.node`:** `npm run dev` (or another Node process) has the file open. **Stop the dev server** (Ctrl+C) or run `taskkill /F /IM node.exe`, wait a few seconds, then install again.

**Recommended (one command):**

```powershell
Set-Location "D:\Download\lms-app-main\lms-app-main"
npm.cmd run install:nodemailer
```

**Clean reinstall** (if the error persists — Node must be stopped first):

```powershell
taskkill /F /IM node.exe
Set-Location "D:\Download\lms-app-main\lms-app-main"
Remove-Item -Recurse -Force node_modules
npm.cmd install --omit=optional
```

### `EACCES` or `UNABLE_TO_VERIFY_LEAF_SIGNATURE` on `npm install`

Node cannot reach `registry.npmjs.org` (firewall, antivirus, VPN, or SSL inspection). Try:

1. **Dev without email** — leave SMTP unset; OTP codes print in the `npm run dev` terminal (no nodemailer required).
2. **Offline install** (downloads tarball via PowerShell, then installs from disk):

```powershell
npm.cmd run install:nodemailer:offline
```

3. **Allow Node.js** through Windows Firewall; pause antivirus scan on the project folder.
4. **Manual tarball** — download  
   https://registry.npmjs.org/nodemailer/-/nodemailer-6.10.1.tgz  
   then: `npm.cmd install C:\path\to\nodemailer-6.10.1.tgz --omit=dev`

Use `--omit=dev` to skip `@types/nodemailer` (runtime only needs `nodemailer`).

## Database

Tables: `lms_email_otp`, `lms_user.emailVerifiedAt`

```powershell
npm.cmd run db:push
```

## API

| Endpoint | Body |
|----------|------|
| `POST /api/auth/otp/send` | `{ "email": "user@example.com" }` |
| `POST /api/auth/otp/verify` | `{ "email": "user@example.com", "code": "123456" }` |

Limits: 5 sends per 15 minutes per email; verified OTP valid 30 minutes for registration.
