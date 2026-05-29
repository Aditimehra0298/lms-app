# Deploy LMS on a server (VPS / cloud)

Use this when the app must run on a **public server** (not `localhost` or LAN only).

## What you need

| Item | Example |
|------|---------|
| Linux VPS | Ubuntu 22.04+ |
| Domain | `https://lms.yourdomain.com` |
| MySQL | On same server or managed DB (RDS, etc.) |
| Node.js | 20.x or 22.x |
| Reverse proxy | Nginx (HTTPS) |

## 1. Upload project

```bash
cd /var/www
git clone https://github.com/Aditimehra0298/lms-app.git lms
cd lms
npm ci
```

## 2. Environment (`.env.local`)

Copy `.env.example` → `.env.local` and set:

```env
# Your real public URL (HTTPS) — required for certificates & Google
NEXT_PUBLIC_APP_URL=https://lms.yourdomain.com

DATABASE_URL="mysql://lms_user:STRONG_PASSWORD@127.0.0.1:3306/sft_lms"

MAIN_ADMIN_EMAIL=your@gmail.com
ADMIN_EMAILS=your@gmail.com
ADMIN_PASSWORD="your-secure-password"

GOOGLE_CLIENT_ID=...
NEXT_PUBLIC_GOOGLE_CLIENT_ID=...

# Production OTP (real email)
OTP_USE_SMTP=true
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=...
SMTP_PASS=...

# Certificates (pick one)
# Builtin (simple test): courses use certificateConfig.provider = "builtin" in admin JSON
N8N_CERTIFICATE_WEBHOOK_URL=https://your-n8n.com/webhook/certificate

MEDIA_SIGNING_SECRET=long-random-string-at-least-32-chars
```

**Google Cloud Console** → OAuth client → Authorized JavaScript origins:

- `https://lms.yourdomain.com`

## 3. Database

```bash
npm run db:push
# or for production migrations:
npm run db:deploy
```

## 4. Build & run (production)

```bash
npm run build
npm run start:server
```

Or with PM2 (keeps app running after logout):

```bash
npm install -g pm2
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

App listens on **port 3000** (`0.0.0.0`).

## 5. Nginx (HTTPS)

Example site config:

```nginx
server {
    listen 80;
    server_name lms.yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name lms.yourdomain.com;

    ssl_certificate     /etc/letsencrypt/live/lms.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/lms.yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
sudo certbot --nginx -d lms.yourdomain.com
```

## 6. Prisma Studio on server (testing only)

**Do not expose Studio to the public internet.**

On the server (binds to localhost only):

```bash
npm run studio:server
```

From your PC, SSH tunnel:

```bash
ssh -L 5555:127.0.0.1:5555 user@YOUR_SERVER_IP
```

Then open on your PC: **http://localhost:5555**

## 7. Test certificate flow on server

1. Open `https://lms.yourdomain.com/account` → register (OTP) → login  
2. Enroll / complete course or use Admin → manual certificate pass  
3. Check `lms_certificate` in Prisma Studio (via SSH tunnel)  
4. Verify: `https://lms.yourdomain.com/certificates/verify?delegate=...`

## 8. n8n callback (if using n8n certificates)

n8n must reach:

`https://lms.yourdomain.com/api/certificates/n8n-callback`

Use the **production** webhook URL (not `webhook-test`) when the workflow is active.

## Firewall

```bash
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

Do **not** open port 5555 (Prisma Studio) publicly.

## Quick checklist

- [ ] `NEXT_PUBLIC_APP_URL` = your HTTPS domain  
- [ ] MySQL reachable from app  
- [ ] `npm run build` succeeds  
- [ ] Google OAuth origins include your domain  
- [ ] Certificate templates uploaded (Admin → Certificates) if using n8n  
- [ ] n8n workflow active + callback URL reachable  
