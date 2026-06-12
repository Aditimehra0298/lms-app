# Production deployment plan — Google Cloud + Cloudflare

**Audience:** Senior engineering / stakeholder review  
**Application:** SF Trainings LMS (`sft-app`)  
**Target URL:** `https://lms.yourdomain.com` (Cloudflare-managed domain)  
**Compute:** Google Cloud Compute Engine (Ubuntu 22.04 LTS)  
**Related docs:** `SERVER_DEPLOYMENT.md` · `SENIOR_PROJECT_DOCUMENTATION.md` · `DATA_STORAGE_AND_CONNECTIONS.md` · `GOOGLE_SIGNIN.md`

---

## 1. Executive summary

This document describes the **approved production deployment architecture** for the LMS:

| Layer | Technology | Role |
|-------|------------|------|
| **DNS & edge** | Cloudflare | Domain, HTTPS to users, DDoS protection |
| **Application server** | Google Compute Engine (GCE) | Runs Next.js 16 + Node.js 22 |
| **Reverse proxy** | Nginx | HTTPS termination (origin), routes to port 3000 |
| **Process manager** | PM2 | Keeps Node app running after reboot |
| **Database** | MySQL 8 on same VM (Phase 1) | Users, enrollments, certificates, course sync |
| **File storage** | Local disk `storage/private/admin/` | Course videos, PDFs, certificate assets (signed URLs) |
| **Admin content** | `data/admin-content.json` on disk | Courses, tutor-led programs, marketing CMS |

**Why not FTP-only / shared hosting?**  
This LMS is a **long-running Node.js application** with MySQL and private video streaming. Classic cPanel FTP hosting cannot run `next start`, Prisma, or multi-GB signed media. Files may be uploaded via **SFTP**, but the app must be **built and started over SSH**.

**Why Cloudflare + GCP?**  
- Cloudflare: safe public domain, SSL, protection  
- GCE: full control, compatible with existing `ecosystem.config.cjs` and `SERVER_DEPLOYMENT.md`  
- Same region (`asia-south1` Mumbai) keeps latency low for India-based learners  

---

## 2. Architecture diagram

```text
┌─────────────────────────────────────────────────────────────────────────┐
│  Learner / Admin browser                                                 │
│  https://lms.yourdomain.com                                              │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │ HTTPS
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Cloudflare (DNS + proxy + SSL)                                          │
│  • A record: lms → GCE static IP                                         │
│  • SSL mode: Full (strict)                                                 │
│  • Optional: bot protection, Always HTTPS                                  │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │ HTTPS (origin)
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Google Compute Engine — Ubuntu 22.04 LTS                                │
│  Machine: e2-medium (2 vCPU, 4 GB RAM) recommended                       │
│  Region: asia-south1 (Mumbai)                                            │
│                                                                          │
│  ┌─────────────┐    ┌──────────────────┐    ┌─────────────────────────┐ │
│  │ Nginx :443  │───▶│ Next.js :3000    │───▶│ MySQL 8 (localhost)    │ │
│  │ (Certbot)   │    │ PM2 + production │    │ Database: sft_lms       │ │
│  └─────────────┘    └────────┬─────────┘    └─────────────────────────┘ │
│                              │                                           │
│                              ▼                                           │
│                    storage/private/admin/  (videos, uploads)             │
│                    data/admin-content.json (CMS)                          │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │
              Optional Phase 2  │
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Google Cloud SQL (MySQL) — managed DB, backups                          │
│  Google Cloud Storage — CDN video delivery (when disk/bandwidth grows)   │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Application requirements (compatibility matrix)

| Requirement | Version / detail | Source in repo |
|-------------|------------------|----------------|
| OS | Ubuntu 22.04 or 24.04 LTS | `docs/SERVER_DEPLOYMENT.md` |
| Node.js | 20.x or 22.x | `package.json`, `@types/node` 20.x |
| npm | 10+ | Bundled with Node 22 |
| MySQL | 8.x | Prisma `DATABASE_URL` |
| Production start | `next start -H 0.0.0.0 -p 3000` | `ecosystem.config.cjs` |
| Build | `npm run build` (Prisma generate + Next webpack) | `package.json` |
| Env file | `.env.local` (not committed) | `.env.example` |
| Public URL | `NEXT_PUBLIC_APP_URL` must match live HTTPS domain | Certificates, OAuth, webhooks |

**Not supported for production:** `npm run dev`, shared hosting without Node, Vercel-only deploy (private video disk + signed `/api/media/serve`).

---

## 4. Infrastructure sizing

### Phase 1 — Launch (recommended)

| Resource | Spec | Approx. monthly cost (USD) |
|----------|------|----------------------------|
| GCE VM | `e2-medium`, 2 vCPU, 4 GB RAM | ~$25–30 |
| Boot disk | 50–80 GB SSD | ~$5–8 |
| Static external IP | Attached to VM | ~$3 |
| Cloudflare | Free plan | $0 |
| Domain | Already on Cloudflare | — |
| **Total** | | **~$33–41/month** |

### Phase 1 — Budget test only

| Resource | Spec | Note |
|----------|------|------|
| GCE VM | `e2-small`, 2 GB RAM | OK for demos; tight with video on same disk |

### Phase 2 — Scale (future)

| Resource | When | Benefit |
|----------|------|---------|
| Cloud SQL MySQL | DB growth / backups | Managed backups, less VM risk |
| Cloud Storage + CDN | Many concurrent video viewers | Faster streaming, less VM load |
| Larger disk or object storage | Video library > 40 GB | Avoid filling boot disk |

---

## 5. Pre-deployment checklist

| # | Item | Owner |
|---|------|-------|
| 1 | Google Cloud project created, billing enabled | DevOps |
| 2 | Cloudflare domain active, nameservers on Cloudflare | Domain admin |
| 3 | OAuth client in Google Cloud Console (same or linked project) | Dev |
| 4 | Gmail App Password or SMTP for OTP emails | Dev |
| 5 | n8n certificate webhook URL (if using n8n PDFs) | Dev |
| 6 | Git access to `lms-app` repository | Dev |
| 7 | Strong passwords for MySQL, admin, `MEDIA_SIGNING_SECRET` | Security |

---

## 6. Deployment procedure

### 6.1 Google Cloud — Create VM

1. Console → **Compute Engine** → **VM instances** → **Create instance**
2. Settings:

| Field | Value |
|-------|--------|
| Name | `lms-server` |
| Region | `asia-south1` |
| Zone | `asia-south1-a` |
| Machine type | `e2-medium` |
| Boot disk | Ubuntu 22.04 LTS, 50 GB SSD |
| Firewall | Allow HTTP, Allow HTTPS |

3. **VPC network** → **IP addresses** → **Reserve static external IP** → attach to `lms-server`
4. Note static IP: `___.___.___.___ `

### 6.2 Cloudflare — DNS

1. Cloudflare dashboard → **DNS** → **Add record**

| Type | Name | Content | Proxy |
|------|------|---------|--------|
| A | `lms` | GCE static IP | Proxied (orange cloud) |

2. **SSL/TLS** → Encryption mode: **Full (strict)**
3. **SSL/TLS** → Edge Certificates → **Always Use HTTPS**: On

Production URL: `https://lms.yourdomain.com`

### 6.3 VM — Install dependencies (SSH)

```bash
sudo apt update && sudo apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs build-essential git nginx mysql-server
node -v   # expect v22.x
```

### 6.4 VM — MySQL database

```bash
sudo mysql
```

```sql
CREATE DATABASE sft_lms CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'lms_user'@'localhost' IDENTIFIED BY 'STRONG_PASSWORD_HERE';
GRANT ALL PRIVILEGES ON sft_lms.* TO 'lms_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 6.5 VM — Deploy application code

**Option A — Git (recommended)**

```bash
sudo mkdir -p /var/www && sudo chown $USER:$USER /var/www
cd /var/www
git clone https://github.com/Aditimehra0298/lms-app.git lms
cd lms
npm ci
```

**Option B — SFTP upload**

- Use FileZilla / WinSCP → SFTP to VM IP, port 22, user `your_gce_username`
- Upload project to `/var/www/lms`
- Then SSH and run `npm ci` (do not upload `node_modules` from Windows)

### 6.6 VM — Environment configuration

```bash
cd /var/www/lms
cp .env.example .env.local
nano .env.local
```

**Minimum production variables:**

```env
NEXT_PUBLIC_APP_URL=https://lms.yourdomain.com

DATABASE_URL="mysql://lms_user:STRONG_PASSWORD_HERE@127.0.0.1:3306/sft_lms"

MAIN_ADMIN_EMAIL=admin@yourcompany.com
ADMIN_EMAILS=admin@yourcompany.com
ADMIN_PASSWORD="secure-admin-password"
ADMIN_SESSION_SECRET=random-string-min-32-chars

GOOGLE_CLIENT_ID=....apps.googleusercontent.com
NEXT_PUBLIC_GOOGLE_CLIENT_ID=....apps.googleusercontent.com

OTP_USE_SMTP=true
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@gmail.com
SMTP_PASS=gmail-app-password
SMTP_FROM="SF Trainings <your@gmail.com>"

MEDIA_SIGNING_SECRET=random-string-min-32-chars
N8N_CERTIFICATE_WEBHOOK_URL=https://your-n8n.example/webhook/certificate

# Payments — see docs/RAZORPAY_SETUP.md
RAZORPAY_KEY_ID=rzp_live_xxxxxxxx
RAZORPAY_KEY_SECRET=your_live_secret
RAZORPAY_CURRENCY=INR
```

See `.env.example` for full list (Zoom, n8n callbacks, chatbot, Razorpay, etc.).

### 6.7 VM — Database schema & build

```bash
cd /var/www/lms
npm run db:push
# Production with migrations:
# npm run db:deploy

npm run build
mkdir -p storage/private/admin data
```

Verify MySQL:

```bash
curl -s http://127.0.0.1:3000/api/health/mysql
# Expected after start: {"ok":true,...}
```

### 6.8 VM — PM2 (production process)

```bash
sudo npm install -g pm2
cd /var/www/lms
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
# Run the sudo command PM2 prints
pm2 status
```

Reference: `ecosystem.config.cjs` — single instance, `max_memory_restart: 1G`, port 3000.

### 6.9 VM — Nginx reverse proxy

```bash
sudo nano /etc/nginx/sites-available/lms
```

```nginx
server {
    listen 80;
    server_name lms.yourdomain.com;

    client_max_body_size 5120M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/lms /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

`client_max_body_size 5120M` aligns with `ADMIN_UPLOAD_MAX_VIDEO_MB` in `.env.example`.

### 6.10 VM — Origin SSL (Certbot)

Required for Cloudflare **Full (strict)**:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d lms.yourdomain.com
```

Certbot auto-renews via systemd timer.

### 6.11 Google OAuth — Authorized origins

Google Cloud Console → **APIs & Services** → **Credentials** → OAuth 2.0 Client:

| Setting | Value |
|---------|--------|
| Authorized JavaScript origins | `https://lms.yourdomain.com` |

Details: `docs/GOOGLE_SIGNIN.md`

Restart app after env changes:

```bash
pm2 restart lms
```

---

## 7. Security controls

| Control | Implementation |
|---------|----------------|
| HTTPS end-to-end | Cloudflare → Nginx (Certbot) → app |
| Admin access | `MAIN_ADMIN_EMAIL` + `/admin` gate |
| Private media | `/api/media/serve` + signed tokens (`MEDIA_SIGNING_SECRET`) |
| DB credentials | `.env.local` only, never in git |
| Firewall | GCE: allow 22, 80, 443 only; do not expose 3000 publicly |
| Prisma Studio | `npm run studio:server` — localhost only, SSH tunnel for access |
| Secrets rotation | Rotate `ADMIN_SESSION_SECRET`, `MEDIA_SIGNING_SECRET`, DB password periodically |

### Cloudflare upload limit note

Free Cloudflare proxy limits upload size (~100 MB). Admin course videos may be up to **5 GB** (`ADMIN_UPLOAD_MAX_VIDEO_MB`). If large uploads fail:

- Temporarily set DNS record to **DNS only** (grey cloud) for admin upload windows, or  
- Plan Phase 2: direct upload to Google Cloud Storage  

---

## 8. Post-deployment verification (senior sign-off)

| # | Test | Expected result |
|---|------|-----------------|
| 1 | `GET https://lms.yourdomain.com/api/health/mysql` | `{"ok":true}` |
| 2 | Home page loads | 200, no mixed content errors |
| 3 | `/account` — email OTP or Google sign-in | Login succeeds |
| 4 | Google OAuth | No `origin_mismatch` error |
| 5 | Admin `/admin` | Main admin email only |
| 6 | Admin → upload small image | Saves under `storage/private/admin/` |
| 7 | Learner course video playback | Signed URL plays |
| 8 | Certificate request (if n8n enabled) | Webhook + callback reachable |
| 9 | `pm2 status` | `lms` online, 0 restarts |
| 10 | Reboot VM | App auto-starts (`pm2 startup`) |

Certificate flow: `docs/N8N_CERTIFICATE_STEPS.md`  
Database demo script: `docs/SENIOR_DEMO_DATABASE_STEPS.md`

---

## 9. Operations runbook

### Deploy new code release

```bash
cd /var/www/lms
git pull
npm ci
npm run build
pm2 restart lms
```

### View logs

```bash
pm2 logs lms --lines 100
sudo tail -f /var/log/nginx/error.log
```

### Backup (minimum)

| Asset | Method | Frequency |
|-------|--------|-----------|
| MySQL `sft_lms` | `mysqldump` | Daily |
| `data/admin-content.json` | Copy to secure storage | Daily |
| `storage/private/admin/` | rsync / GCS sync | Weekly (large) |

Example MySQL backup:

```bash
mysqldump -u lms_user -p sft_lms > /var/backups/sft_lms_$(date +%F).sql
```

### Prisma Studio (support only — not public)

On server:

```bash
cd /var/www/lms && npm run studio:server
```

From laptop:

```bash
gcloud compute ssh lms-server --zone=asia-south1-a -- -L 5555:127.0.0.1:5555
```

Open `http://localhost:5555`

---

## 10. Rollback plan

| Scenario | Action |
|----------|--------|
| Bad deploy | `git checkout <previous-tag>` → `npm ci` → `npm run build` → `pm2 restart lms` |
| DB migration failure | Restore mysqldump; do not run `db:push` on production without review |
| SSL issues | Verify Certbot cert valid; Cloudflare SSL mode = Full (strict) |
| OAuth broken | Confirm `NEXT_PUBLIC_APP_URL` matches browser URL exactly |

---

## 11. Phase 2 roadmap (optional)

| Item | Trigger | Action |
|------|---------|--------|
| **Cloud SQL** | Need automated backups / HA | Move `DATABASE_URL` to Cloud SQL in `asia-south1` |
| **Cloud Storage** | Video library or concurrent viewers grow | Store media in GCS; app changes for signed GCS URLs |
| **CDN** | Slow video outside India | Cloud CDN or Cloudflare in front of GCS |
| **Separate n8n host** | Certificate volume | Keep n8n on dedicated VM; callback URL unchanged |

Data architecture reference: `docs/DATA_STORAGE_AND_CONNECTIONS.md`

---

## 12. What we explicitly did not choose (and why)

| Option | Reason not primary |
|--------|------------------|
| FTP-only shared hosting | No Node.js long-running process |
| Vercel / Netlify only | No persistent private video disk |
| Firebase as main database | App uses Prisma + MySQL, not Firestore |
| IP-only access (no domain) | Google OAuth and certificates need stable HTTPS URL |
| `npm run dev` on server | Dev mode is slow and insecure for production |

---

## 13. Document map for reviewers

| Document | Purpose |
|----------|---------|
| **This file** | Production deploy plan (GCP + Cloudflare) |
| `SERVER_DEPLOYMENT.md` | Generic Linux VPS deploy (same app steps) |
| `SENIOR_PROJECT_DOCUMENTATION.md` | Full technical product overview |
| `DATA_STORAGE_AND_CONNECTIONS.md` | JSON vs localStorage vs MySQL |
| `MYSQL_WORKBENCH.md` | Database setup and troubleshooting |
| `GOOGLE_SIGNIN.md` | OAuth origins and LAN/production URLs |
| `N8N_CERTIFICATE_STEPS.md` | Certificate PDF workflow |
| `.env.example` | All environment variables |

---

## 14. Sign-off checklist (senior approval)

- [ ] Architecture reviewed (Section 2)
- [ ] Sizing and cost accepted (Section 4)
- [ ] Security controls accepted (Section 7)
- [ ] Cloudflare DNS + Full (strict) configured
- [ ] GCE VM provisioned in `asia-south1`
- [ ] Production `.env.local` completed (secrets not in git)
- [ ] `npm run build` succeeds on server
- [ ] PM2 auto-start verified after reboot
- [ ] All Section 8 tests passed
- [ ] Backup runbook assigned (Section 9)

**Prepared for:** SF Trainings LMS production launch  
**Stack version:** Next.js 16.2.3 · Node 22 · Prisma 6.19 · MySQL 8
