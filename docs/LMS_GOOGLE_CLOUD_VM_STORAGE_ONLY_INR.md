# Google Cloud Only — VM + Storage (Domain Already Owned)

**For:** Sustainable Futures Trainings LMS  
**Your domain:** Already owned — **sftrainings.org** → **lms.sftrainings.org**  
**You need from Google:** **Compute VM** + **Cloud Storage** only  
**Currency:** Indian Rupees (₹)

---

## 1. What you already have vs what you buy

| Item | Status | Cost from Google |
|------|--------|------------------|
| **Domain** (`sftrainings.org`) | ✅ Already owned by you | **₹0** — no new domain purchase |
| **Subdomain** (`lms.sftrainings.org`) | ✅ Free — DNS setting on your domain | **₹0** |
| **Compute VM** (server) | ❌ Need to create | **Paid monthly** |
| **Cloud Storage** (videos & files) | ❌ Need to create | **Paid monthly** |
| **Static IP** (for VM) | ❌ Need to reserve | **~₹255/month** |

You **do not** need to buy a new domain or move DNS to another company unless you choose to. You only point **one DNS record** from your existing domain to the Google server IP.

---

## 2. Simple picture

```text
  YOUR DOMAIN (already owned)
  lms.sftrainings.org
           │
           │  (one DNS A-record → Google IP)
           ▼
  ┌─────────────────────────────────────┐
  │  GOOGLE COMPUTE VM (Mumbai)         │
  │  • LMS website runs here            │
  │  • MySQL database (on same VM)      │
  │  • Certificates, admin, payments    │
  └──────────────┬──────────────────────┘
                 │
                 │  uploads / videos
                 ▼
  ┌─────────────────────────────────────┐
  │  GOOGLE CLOUD STORAGE (bucket)      │
  │  • Course videos                    │
  │  • PDFs, certificate templates      │
  │  • Backups                          │
  └─────────────────────────────────────┘
```

---

## 3. Monthly budget — Google Cloud only (₹)

### Recommended launch setup

| Google service | What it does | Monthly (₹) |
|----------------|--------------|-------------|
| **Compute Engine VM** (`e2-medium`, Mumbai) | Runs LMS 24/7 (2 CPU, 4 GB RAM) | 2,100 – 2,550 |
| **VM boot disk** (50 GB SSD) | App + database (on server) | 425 – 680 |
| **Static external IP** | So your domain always finds the server | ~255 |
| **Cloud Storage** (~50–100 GB videos) | Video & file warehouse | 150 – 400 |
| **Cloud Storage** (network / downloads) | When learners watch videos* | 200 – 1,000* |
| | | |
| **Total (typical launch)** | | **₹2,930 – ₹3,885 / month** |
| **Total (light usage)** | Few learners, small video library | **~₹2,900 – ₹3,200 / month** |

\* *Download/bandwidth cost grows with more students watching videos. Start low; monitor in Google Billing.*

#

> Figures use ~**₹85 per $1** for planning. Check **Google Cloud Console → Billing** for exact amounts.

---

## 4. What you do NOT pay Google for

| Item | Cost |
|------|------|
| New domain name | ₹0 (you have it) |
| Subdomain `lms` | ₹0 |
| SSL certificate (HTTPS) | ₹0 (free with Let’s Encrypt on VM) |
| Google Sign-In | ₹0 |
| Razorpay account | ₹0 monthly (fees only per sale) |

---

## 5. One DNS change on your existing domain

Your domain admin adds **one record** (no new domain purchase):

| Type | Name | Value | Purpose |
|------|------|-------|---------|
| **A** | `lms` | *Google VM static IP* | Sends `lms.sftrainings.org` to your server |

**Example:** If Google gives IP `34.93.xxx.xxx`, then `lms.sftrainings.org` → that IP.

After DNS updates (usually 1–24 hours), the LMS opens at:

**https://lms.sftrainings.org**

---

## 6. Google Cloud — what to create (checklist)

### A. Compute VM

| Setting | Value |
|---------|--------|
| Service | **Compute Engine** → VM instance |
| Name | `lms-server` |
| Region | **asia-south1** (Mumbai) |
| Machine type | **e2-medium** (2 vCPU, 4 GB RAM) |
| OS | Ubuntu 22.04 LTS |
| Disk | 50 GB SSD |
| Firewall | Allow HTTP (80) and HTTPS (443) |
| Static IP | Reserve and attach to this VM |

### B. Cloud Storage

| Setting | Value |
|---------|--------|
| Service | **Cloud Storage** → Create bucket |
| Name | e.g. `sft-lms-media-prod` (globally unique) |
| Location | **asia-south1** (same region as VM — lower cost & faster) |
| Storage class | **Standard** (for active videos) |
| Access | **Private** (not public — LMS uses signed links) |

**Typical use:**

- Course videos uploaded by admin  
- Certificate template images  
- Weekly backup copies of database  

---

## 7. How VM and Storage work together

| Task | Where it runs |
|------|----------------|
| Student opens website | **VM** |
| Login, payments, exams | **VM** + database on **VM** |
| Admin uploads a video | **VM** receives file → saves to **Cloud Storage** |
| Student watches video | **VM** checks permission → serves from **Storage** |
| Certificate PDF | Generated on **VM**, file can be stored in **Storage** |

---

## 8. Budget comparison — with vs without Cloud Storage

| Setup | Monthly (₹) | Best for |
|-------|-------------|----------|
| **VM only** (videos on server disk) | 2,800 – 3,500 | Testing, very few courses |
| **VM + Cloud Storage** (recommended) | 2,900 – 3,900 | Production, growing video library |

**Your choice:** VM + Cloud Storage ✅ (as requested)

---

## 9. Optional upgrades later (not required now)

| Add later | Extra monthly (₹) | When |
|-----------|-------------------|------|
| Bigger VM | +850 – 2,500 | Many users at same time |
| Cloud SQL (managed database) | +1,300 – 2,100 | Need automatic DB backups |
| CDN in front of Storage | +500 – 2,000 | Students across many cities |

---

## 10. Monthly report — what to track

Each month in Google Cloud Billing, check only these two products:

| Product | What to look for |
|---------|------------------|
| **Compute Engine** | VM + disk + IP |
| **Cloud Storage** | Storage GB + download bandwidth |

Fill your monthly report: `docs/LMS_MONTHLY_REPORT_TEMPLATE.md`

---

## 11. Sign-off (simplified)

- [ ] Domain **sftrainings.org** — already owned ✅  
- [ ] Budget **~₹2,900 – ₹3,900/month** for VM + Storage approved  
- [ ] Google Cloud project + billing account created  
- [ ] VM created in **Mumbai**  
- [ ] Storage bucket created in **Mumbai**  
- [ ] DNS A-record: `lms` → VM IP  
- [ ] LMS deployed and tested on **https://lms.sftrainings.org**

---

## 12. Technical steps (for your developer)

| Document | Purpose |
|----------|---------|
| `docs/SERVER_DEPLOYMENT.md` | Install LMS on the VM |
| `docs/GCP_CLOUDFLARE_DEPLOYMENT.md` | Full GCP setup (skip Cloudflare sections if not used) |
| `.env.example` | Production settings including `NEXT_PUBLIC_APP_URL=https://lms.sftrainings.org` |

---

*Version 1.0 — June 2026*  
*Scope: Existing domain + Google Compute VM + Google Cloud Storage only*
