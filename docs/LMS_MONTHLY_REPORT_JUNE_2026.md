# LMS Monthly Report — Sustainable Futures Trainings

**Report month:** June 2026  
**Website:** [https://lms.sftrainings.org/](https://lms.sftrainings.org/)  
**Prepared for:** Management / stakeholders (non-technical summary)  
**Currency:** Indian Rupees (₹)

---

## Executive summary (one page)

| Item | Status this month |
|------|-------------------|
| **Website** | 🟡 Pre-launch / deployment in progress |
| **Server** | Google Cloud VM — Mumbai (`asia-south1`) |
| **Storage** | Google Cloud (videos & uploads) |
| **Overall health** | On track for production launch |

**Key message:** The LMS is being prepared for live use at **lms.sftrainings.org**. Infrastructure is planned on Google Cloud. Monthly running cost is estimated at **₹2,800 – ₹3,500** for Phase 1 (launch).

---

## 1. Monthly budget vs actual spend

### Infrastructure (Google Cloud)

| Line item | Budget (₹) | Actual (₹) | Difference | Notes |
|-----------|------------|------------|------------|-------|
| Virtual machine (server) | 2,100 – 2,550 | ___ | ___ | e2-medium, 24/7 |
| Server disk (50–80 GB) | 425 – 680 | ___ | ___ | App + database + files |
| Static IP address | ~255 | ___ | ___ | Fixed address for domain |
| Cloud Storage (if used) | 0 – 400 | ___ | ___ | Videos / backups |
| **Subtotal — Google Cloud** | **2,780 – 3,885** | **___** | **___** | |

### Other monthly services

| Line item | Budget (₹) | Actual (₹) | Notes |
|-----------|------------|------------|-------|
| Domain / DNS (Cloudflare) | 0 | 0 | Free plan |
| SSL (HTTPS) | 0 | 0 | Included |
| Email (Gmail SMTP) | 0 | 0 | OTP & welcome emails |
| Cloudinary (images/video CDN) | 0 – 1,700 | ___ | Free tier or paid |
| n8n automation (if cloud) | 0 – 1,700 | ___ | Optional |
| **Subtotal — other services** | **0 – 3,400** | **___** | |

### Total monthly infrastructure

| | Budget (₹) | Actual (₹) |
|---|------------|------------|
| **Phase 1 total** | **2,800 – 3,500** | **___** |
| **With optional add-ons** | **up to ~7,300** | **___** |

> Fill **Actual** from Google Cloud Console → Billing → Reports (export CSV) each month.

---

## 2. Payment gateway (Razorpay) — revenue & fees

*Only applies after live payments are enabled.*

| Metric | This month | Last month | Change |
|--------|------------|------------|--------|
| Successful course payments (count) | ___ | ___ | ___ |
| Gross course revenue (₹) | ___ | ___ | ___ |
| Razorpay fees (~2% + GST) (₹) | ___ | ___ | ___ |
| **Net after payment fees (₹)** | **___** | **___** | **___** |

### Example (for planning — not actual)

| If revenue is… | Approx. Razorpay fee |
|----------------|----------------------|
| ₹50,000 | ~₹1,180 |
| ₹2,00,000 | ~₹4,720 |
| ₹10,00,000 | ~₹23,600 |

---

## 3. Learners & usage

| Metric | This month | Last month | Target |
|--------|------------|------------|--------|
| New registrations | ___ | ___ | ___ |
| Total active learners | ___ | ___ | ___ |
| Course enrollments (new) | ___ | ___ | ___ |
| Courses completed | ___ | ___ | ___ |
| Certificates issued | ___ | ___ | ___ |
| Live workshop sign-ups | ___ | ___ | ___ |

---

## 4. System availability (uptime)

| Item | Target | This month |
|------|--------|------------|
| Website reachable | 99%+ | ___ % |
| Planned maintenance windows | Off-peak only | ___ |
| Unplanned downtime (minutes) | 0 | ___ |
| Critical incidents | 0 | ___ |

**Simple status:**

- 🟢 **Green** — No issues; learners could access courses normally  
- 🟡 **Amber** — Minor issues; fixed within 24 hours  
- 🔴 **Red** — Major outage; learners could not access site  

**This month:** 🟡 / 🟢 / 🔴 *(circle one)*

---

## 5. Content & admin activity

| Activity | Count |
|----------|-------|
| New courses published | ___ |
| Videos uploaded | ___ |
| Admin support tickets handled | ___ |
| Email OTPs sent (registrations) | ___ |
| Welcome emails sent | ___ |

---

## 6. Security & backups

| Check | Due | Done? |
|-------|-----|-------|
| Database backup (daily) | Every day | ☐ Yes ☐ No |
| Course files backup (weekly) | Weekly | ☐ Yes ☐ No |
| Admin password / secrets review | Monthly | ☐ Yes ☐ No |
| SSL certificate valid | Auto | ☐ Yes ☐ No |
| Unusual login attempts reviewed | Monthly | ☐ Yes ☐ No |

**Backup storage cost (if on Google Cloud):** ₹___ / month

---

## 7. Work completed this month

| # | Task | Status |
|---|------|--------|
| 1 | LMS code deployed to Google VM | ☐ Done ☐ In progress ☐ Not started |
| 2 | Domain `lms.sftrainings.org` connected | ☐ Done ☐ In progress ☐ Not started |
| 3 | HTTPS (secure padlock) working | ☐ Done ☐ In progress ☐ Not started |
| 4 | Google Sign-In working on live URL | ☐ Done ☐ In progress ☐ Not started |
| 5 | Razorpay live payments tested | ☐ Done ☐ In progress ☐ Not started |
| 6 | Email OTP working in production | ☐ Done ☐ In progress ☐ Not started |
| 7 | Certificate PDF generation tested | ☐ Done ☐ In progress ☐ Not started |
| 8 | UAT with test learners | ☐ Done ☐ In progress ☐ Not started |

---

## 8. Issues & risks

| Issue | Impact | Action | Owner | Due date |
|-------|--------|--------|-------|----------|
| *Example: Domain still points to old hosting* | Site not live | Update DNS to Google IP | Domain admin | ___ |
| | | | | |
| | | | | |

---

## 9. Plan for next month

| Priority | Task | Owner |
|----------|------|-------|
| 1 | Go-live announcement to learners | Marketing |
| 2 | Monitor first week payments & support | Admin |
| 3 | First full billing review from Google Cloud | Finance |
| 4 | | |
| 5 | | |

---

## 10. Year-to-date summary (Jan – Jun 2026)

| | Amount (₹) |
|---|------------|
| **Total infrastructure spend (YTD)** | ___ |
| **Total Razorpay fees (YTD)** | ___ |
| **Total course revenue (YTD)** | ___ |
| **Net revenue after fees (YTD)** | ___ |

### Monthly infrastructure trend

| Month | Budget (₹) | Actual (₹) | Notes |
|-------|------------|------------|-------|
| January 2026 | 2,800 – 3,500 | ___ | |
| February 2026 | 2,800 – 3,500 | ___ | |
| March 2026 | 2,800 – 3,500 | ___ | |
| April 2026 | 2,800 – 3,500 | ___ | |
| May 2026 | 2,800 – 3,500 | ___ | |
| **June 2026** | **2,800 – 3,500** | **___** | **This report** |
| **YTD total** | **~16,800 – 21,000** | **___** | |

---

## 11. Approval

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Prepared by | | | |
| Reviewed by | | | |
| Approved by | | | |

---

## How to use this report every month

1. **Copy this file** → rename to `LMS_MONTHLY_REPORT_YYYY_MM.md` (e.g. `LMS_MONTHLY_REPORT_2026_07.md`).  
2. **Google Cloud:** Billing → export last month’s invoice → fill **Actual** column.  
3. **Razorpay:** Dashboard → Reports → fill revenue & fees.  
4. **Admin panel / database:** Fill learner counts and certificates.  
5. **Send to management** by the **5th working day** of each month.

---

## Related documents

| Document | Purpose |
|----------|---------|
| `LMS_DEPLOYMENT_GUIDE_NON_TECHNICAL_INR.md` | Full deployment plan & annual budget |
| `GCP_CLOUDFLARE_DEPLOYMENT.md` | Technical deployment steps |

---

*Template version: 1.0 — June 2026*  
*Next report due: July 2026*
