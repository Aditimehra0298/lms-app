# Deployment reading — LMS updates (July 2026)

**Repo:** `https://github.com/Aditimehra0298/lms-app`  
**Branch:** `main`  
**Latest commit to deploy:** `3b6b6c0`  
**App path on server:** `/var/www/lms`  
**Live site:** https://sftlms.com/

---

## 1. What this release includes

### Branding
- Display name: **Sustainable Futuristic Trainings**
- Site metadata title uses company display name
- Favicon / icons: SF brand logo (`favicon.ico`, `icon.png`, `apple-icon.png`)
- Google Search may take days to update the favicon after a successful crawl

### Learning tools (course player)
- Section title: **Course Learning tools** (not “LEARNING TOOLS”)
- Tools: **E-Workbook**, **Transcript**, **PPT**, **Podcast**, **Additional Resources** (renamed from Webhook)
- Click a tool with a green dot → file/link opens directly (no Open/Download choice bar)
- Protected files (PDF, PPT, podcast) use signed media URLs (fixes blank `about:blank` tabs)
- Additional Resources: paste URL **or** upload a file in admin
- Admin tab still named **Learning Tools** (workspace); learner label is **Course Learning tools**

### Reviews
- Course landing **Reviews** tab loads **real** learner reviews from the API
- No longer only sample/hardcoded reviews
- Reviews saved to `data/course-reviews.json` on the server

### Pricing (course grid)
- Admin **Pricing** tab prices drive the buying grid when the learner is signed in
- Country currency symbol shown (regional row or FX from default INR)
- Guests still see “Sign in to see price”

### Media / files
- Correct MIME types for PPT, PPTX, MP3, M4A, WAV, OGG, EPUB
- Documents/audio can open in the browser for enrolled learners
- Optional `?download=1` for download when used

---

## 2. Pre-deploy checklist (server)

- [ ] SSH into the GCP VM (`lms-server`)
- [ ] Confirm disk space: `df -h`
- [ ] Backup admin content and DB (recommended)

```bash
cp -a /var/www/lms/data/admin-content.json /var/backups/admin-content-$(date +%F).json
mysqldump -u lms_user -p --single-transaction sft_lms > /var/backups/sft_lms_$(date +%F).sql
```

---

## 3. Deploy commands (copy/paste)

```bash
cd /var/www/lms

# Keep live course catalog if git complains about local edits
cp -a data/admin-content.json data/admin-content.json.server-backup 2>/dev/null || true
git stash push -m "server admin-content" -- data/admin-content.json 2>/dev/null || true

git pull origin main
git log -1 --oneline
# Must show: 3b6b6c0 Show Course Learning tools title without forced uppercase.

# Restore live content after pull
cp -a data/admin-content.json.server-backup data/admin-content.json 2>/dev/null || true

pm2 stop lms
rm -rf .next
npm ci
npm run build

pm2 start ecosystem.config.cjs
# If already defined: pm2 restart lms --update-env
pm2 save
pm2 status

# Health checks (expect HTTP 200)
curl -I http://127.0.0.1:3000/
curl -I http://127.0.0.1:3000/favicon.ico
curl -I http://127.0.0.1:3000/icon.png
```

If `git pull` asks for GitHub credentials: username = GitHub username; password = **Personal Access Token** (not account password).

---

## 4. Post-deploy verification

| Check | How |
|-------|-----|
| Site loads | https://sftlms.com/ (hard refresh: Ctrl+Shift+R) |
| No 502 | Page and favicon load; not Bad Gateway |
| Brand name | Header/footer: Sustainable Futuristic Trainings |
| Course Learning tools | Player shows title; tools open on click |
| Additional Resources | Admin Learning Tools tab; learner button label |
| Reviews | Submit review → appears on `/courses/[slug]#reviews` |
| Prices | Signed-in learner sees currency on course grid |
| PM2 | `pm2 status` → `lms` **online** |

### Logs if something fails

```bash
pm2 logs lms --lines 100 --nostream
sudo tail -n 50 /var/log/nginx/error.log
```

---

## 5. Important server notes

1. **`data/admin-content.json`** — live course content. Always backup before pull; restore after if git overwrote it.
2. **`data/course-reviews.json`** — must be writable by the app user so reviews persist.
3. **`storage/private/admin/`** — uploaded PPT/PDF/podcast files; do not delete.
4. **`.env.local`** — never commit; keep `DATABASE_URL`, media secrets, n8n URLs on the server.
5. **502 Bad Gateway** usually means PM2/Next is down — run the deploy steps above (rebuild + `pm2 start`/`restart`).
6. **Google favicon** — only updates after Google recrawls; request indexing in Search Console after favicon returns 200.

---

## 6. Commit list in this release (oldest → newest)

| Commit | Summary |
|--------|---------|
| `e8fd9b8` | SF brand favicon assets |
| `386da2e` | Learning tools open/download, live reviews, media serving |
| `56eb6df` | (superseded) Open/Download choice UI |
| `fcfffe7` | Webhook → Additional Resources |
| `7779022` | Fix blank `about:blank` when opening PDFs |
| `982acee` | Remove Open/Download choice bar |
| `11c5dd1` | Cleanup unused code |
| `7fc436d` | Title → Course Learning tools |
| `3b6b6c0` | Title without forced ALL CAPS |

---

## 7. Rollback (if needed)

```bash
cd /var/www/lms
git log -5 --oneline
git checkout <previous-good-commit>
npm ci
npm run build
pm2 restart lms
```

Restore `admin-content.json` from `/var/backups/` if content was lost.

---

*Generated for production deploy of LMS `main` through `3b6b6c0`.*
