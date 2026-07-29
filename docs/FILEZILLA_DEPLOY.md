# FileZilla deployment guide — LMS

Use **FileZilla (SFTP)** to upload code, then **SSH** once to install and restart.  
Do **not** upload `node_modules`, `.next`, or `.env.local` from your PC.

---

## 1. FileZilla connection

| Field | Value |
|--------|--------|
| Protocol | **SFTP** (SSH File Transfer Protocol) |
| Host | Your GCP VM IP (not Cloudflare `sftlms.com` if that is proxied) |
| Port | `22` |
| User | e.g. `damnart_ai_guladab` |
| Password / key | Your SSH password or private key |

Remote folder (usual):

```text
/var/www/lms
```

---

## 2. What to upload

### Upload (from your PC project folder)

- `app/`
- `components/`
- `lib/`
- `public/`
- `prisma/`
- `scripts/` (optional)
- `docs/` (optional)
- `package.json`
- `package-lock.json`
- `next.config.ts` (or `.js` / `.mjs`)
- `tsconfig.json`
- `ecosystem.config.cjs`
- `middleware.ts` (if present)
- `postcss.config.*`, `tailwind.config.*` (if present)
- Root brand assets used by the app (e.g. `SF-WHITE-LOGO.png`) if referenced from root
- `data/` — **only if** you intend to overwrite server content (see caution below)

### Do NOT upload

| Path | Why |
|------|-----|
| `node_modules/` | Too large; install on server with `npm ci` |
| `.next/` | Built on server with `npm run build` |
| `.env.local` / `.env` | Secrets stay on server only |
| `.git/` | Optional; not required for FileZilla deploys |
| `*.log`, `.DS_Store` | Noise |
| Local dumps / backups (`*.sql`, `*.bak`) | Unless you mean to restore them |

---

## 3. Safer way: use the ready zip

On your Windows PC (project root):

```powershell
powershell -ExecutionPolicy Bypass -File scripts\make-filezilla-package.ps1
```

This creates:

```text
deploy-filezilla-ready\lms-upload.zip
```

Or the folder:

```text
deploy-filezilla-ready\lms\
```

Upload/extract into `/var/www/lms` (merge over existing files).  
It excludes `node_modules`, `.next`, env secrets, and large uploaded videos.

---

## 4. After FileZilla upload — SSH once

```bash
ssh YOUR_USER@YOUR_SERVER_IP

cd /var/www/lms

# Keep live course content if you did not mean to replace it
cp -a data/admin-content.json data/admin-content.json.bak-$(date +%F) 2>/dev/null || true

# Ensure server env still exists (do not overwrite with empty)
test -f .env.local && echo ".env.local OK" || echo "MISSING .env.local — restore from backup"

pm2 stop lms
rm -rf .next
npm ci
npm run build
pm2 start ecosystem.config.cjs
# or: pm2 restart lms --update-env
pm2 save
pm2 status

curl -I http://127.0.0.1:3000/
```

Expect **HTTP 200**. Then hard-refresh https://sftlms.com/

---

## 5. Server files that must stay on the VM

Never delete these on the server when syncing with FileZilla:

- `/var/www/lms/.env.local` — Razorpay, DB, n8n, secrets
- `/var/www/lms/data/admin-content.json` — live courses (unless you intend to replace)
- `/var/www/lms/data/course-reviews.json` — learner reviews
- `/var/www/lms/storage/private/admin/` — uploaded PPT/PDF/podcasts/videos

In FileZilla: prefer **overwrite only uploaded source folders**, not a full wipe of `/var/www/lms`.

---

## 6. Quick checklist

- [ ] Connected with **SFTP** to the VM
- [ ] Uploaded source (or unzipped `lms-upload.zip`) into `/var/www/lms`
- [ ] Did **not** upload `.env.local` / `node_modules` / `.next`
- [ ] SSH: `npm ci` → `npm run build` → `pm2 restart lms`
- [ ] Site loads; Learning tools / branding / checkout still work

---

## 7. Prefer Git when possible

If the server already has `git`:

```bash
cd /var/www/lms
git pull origin main
npm ci && npm run build && pm2 restart lms
```

That is usually safer than FileZilla. Use FileZilla when Git auth is unavailable or you only need to push specific folders.

---

*See also: `docs/DEPLOYMENT_READING_JULY_2026.md` and `docs/GCP_CLOUDFLARE_DEPLOYMENT.md`.*
