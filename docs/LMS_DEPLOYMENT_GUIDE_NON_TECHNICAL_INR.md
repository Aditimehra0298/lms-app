# LMS Deployment Guide — Simple Overview & Budget (Indian Rupees)

**For:** Business owners, managers, and non-technical stakeholders  
**Product:** Sustainable Futures Trainings LMS  
**Live website address:** [https://lms.sftrainings.org/](https://lms.sftrainings.org/)  
**Prepared for:** India-based hosting (Google Cloud, Mumbai region)

> **Already have your domain?** You only need **Google Compute VM** + **Google Cloud Storage**.  
> See **`docs/LMS_GOOGLE_CLOUD_VM_STORAGE_ONLY_INR.md`** — simplified plan and budget (no domain cost).

---

## 1. What are we building?

We are putting the **Learning Management System (LMS)** online so learners can:

- Browse and buy courses  
- Watch videos and complete exams  
- Receive certificates  
- Register and sign in with Google  
- Pay through Razorpay  

**Think of it like this:**

| Part | Real-world example |
|------|-------------------|
| **Website (LMS)** | The shop + classroom — what users see in the browser |
| **Server (Google VM)** | The computer that runs the website 24/7 |
| **Database (MySQL)** | The filing cabinet — stores users, enrollments, scores |
| **Storage (Google Cloud)** | The warehouse — stores large video files and uploads |
| **Domain name** | The address people type: `lms.sftrainings.org` |

> **Note:** Today, [lms.sftrainings.org](https://lms.sftrainings.org/) may still show an old placeholder page. After deployment, it will show the real LMS.

---

## 2. Where everything will live

```text
Learner opens browser
        │
        ▼
https://lms.sftrainings.org  (your domain)
        │
        ▼
Google Cloud — Virtual Machine (Mumbai)
   • Runs the LMS application
   • Runs the student database
        │
        ▼
Google Cloud Storage (optional / Phase 2)
   • Stores course videos & large files
```

**Why Google Cloud?**

- Reliable for Indian users (Mumbai data centre)  
- Can grow when more students join  
- Industry-standard security  
- Works with our video courses and certificates  

**Why not normal cheap website hosting?**

Our LMS is **not a simple WordPress site**. It needs:

- Node.js (modern app engine)  
- MySQL database  
- Private video streaming  
- Payment integration  

That requires a **cloud server**, not basic PHP/cPanel hosting.

---

## 3. Monthly running cost — Phase 1 (Launch)

**Phase 1** = Start live with everything on **one Google server**. Good for launch and first hundreds of learners.

| Item | What it does | Monthly cost (₹) |
|------|----------------|------------------|
| **Google Cloud VM** (`e2-medium`) | Runs the LMS 24/7 — 2 CPUs, 4 GB RAM | ₹2,100 – ₹2,550 |
| **Server storage (50–80 GB SSD)** | App, database, and initial course files | ₹425 – ₹680 |
| **Static IP address** | Fixed address so the domain always works | ~₹255 |
| **Cloudflare (DNS & security)** | Protects website, free HTTPS help | **₹0** (Free plan) |
| **SSL certificate** | Padlock / secure `https://` | **₹0** (Let's Encrypt / Cloudflare) |
| **Domain subdomain** | `lms.sftrainings.org` (if main domain already owned) | **₹0** extra |
| | | |
| **Phase 1 total (Google only)** | VM + disk + IP — *domain already owned* | **₹2,780 – ₹3,485 / month** |
| **+ Cloud Storage** (videos & files) | Recommended with VM | **+₹150 – ₹1,400 / month** |
| **Combined VM + Storage** | | **₹2,930 – ₹4,885 / month** |

### Yearly view (Phase 1)

| | Amount (₹) |
|---|------------|
| Low estimate (12 months) | ~₹33,600 |
| High estimate (12 months) | ~₹42,000 |

> **Exchange note:** Google bills in US dollars. Amounts above use ~**₹85 per $1** as a planning rate. Actual bills change slightly with USD/INR and Google pricing.

---

## 4. Monthly running cost — Phase 2 (Growth)

**Phase 2** = When you have **many learners**, **large video library**, or need **stronger backups**.

| Item | When you need it | Extra monthly cost (₹) |
|------|------------------|------------------------|
| **Google Cloud SQL** | Managed database with automatic backups | ₹1,300 – ₹2,100 |
| **Google Cloud Storage** | 100 GB+ videos in cloud warehouse | ₹150 – ₹400 |
| **Larger server or CDN** | Faster video for users across India | ₹850 – ₹2,500 |
| **Bigger server disk** | Video library over ~40 GB | ₹400 – ₹850 |

### Phase 2 total (approx.)

| | Monthly (₹) |
|---|-------------|
| Phase 1 base | ₹2,800 – ₹3,500 |
| Phase 2 add-ons | ₹2,700 – ₹5,850 |
| **Combined range** | **₹5,500 – ₹9,350 / month** |

You **do not** need Phase 2 on day one. Start Phase 1; upgrade when student numbers or video size grow.

---

## 5. One-time costs (setup)

| Item | Who pays | Typical cost (₹) |
|------|----------|------------------|
| Google Cloud account setup | Organisation | ₹0 (pay-as-you-go) |
| Technical deployment (first time) | Developer / agency | ₹15,000 – ₹75,000* |
| Domain (if not already owned) | Organisation | ₹800 – ₹1,500 / year |
| Content upload (videos, courses) | Internal team | Staff time |
| Google OAuth setup (Sign in with Google) | Developer | ₹0 (Google free) |

\* *Internal developer = mostly time cost. External agency = quoted separately.*

---

## 6. Other services (not Google Cloud)

These are **separate** from the server bill:

| Service | Used for | Cost model |
|---------|----------|------------|
| **Razorpay** | Course payments | ~2% + GST per successful transaction (no fixed monthly fee on standard plan) |
| **Gmail / SMTP** | OTP & welcome emails | **Free** (with Gmail App Password) |
| **Cloudinary** | Logo, hero video, email images | Free tier available; paid if heavy use (~₹0 – ₹1,700/month) |
| **Google Sign-In** | Login with Google | **Free** |
| **Certificate generator API** | PDF certificates | Can run on same server (**₹0** extra) or small separate service |
| **n8n** (optional) | Automation workflows | Self-hosted free, or n8n cloud from ~₹1,700/month |

### Example: Razorpay only when you sell

| Course sales per month | Approx. Razorpay fees (2% + GST) |
|------------------------|----------------------------------|
| ₹50,000 | ~₹1,180 |
| ₹2,00,000 | ~₹4,720 |
| ₹10,00,000 | ~₹23,600 |

---

## 7. Budget summary card (print-friendly)

### Minimum to go live (Phase 1)

| | |
|---|---|
| **Monthly infrastructure** | **₹2,800 – ₹3,500** |
| **Yearly infrastructure** | **₹33,600 – ₹42,000** |
| **One-time setup** | **₹15,000 – ₹75,000** (if outsourced) |
| **Payment fees** | Only when courses are sold (Razorpay %) |

### Comfortable growth budget (Phase 2)

| | |
|---|---|
| **Monthly infrastructure** | **₹5,500 – ₹9,350** |
| **Yearly infrastructure** | **₹66,000 – ₹1,12,200** |

---

## 8. What each person / team does

| Role | Responsibility |
|------|----------------|
| **Business owner** | Approves budget, domain, Razorpay live account |
| **Google Cloud admin** | Creates billing account, VM, storage |
| **Developer** | Installs LMS, database, SSL, updates |
| **Domain admin** | Points `lms.sftrainings.org` to Google server |
| **Content team** | Uploads courses, videos, certificates templates |
| **Support / admin** | Manages learners in admin panel |

---

## 9. Step-by-step — what happens at launch (plain English)

1. **Create Google Cloud account** and enable billing.  
2. **Create a virtual machine** in Mumbai (like renting a computer in the cloud).  
3. **Install the LMS** from our GitHub code repository.  
4. **Create the database** for students and courses.  
5. **Connect the domain** `lms.sftrainings.org` to the server.  
6. **Turn on HTTPS** (secure padlock in browser).  
7. **Set production settings** — email, Google login, Razorpay live keys.  
8. **Test everything** — login, buy course, watch video, certificate.  
9. **Go live** for learners.

**Typical timeline:** 3–10 working days (depends on domain access and content readiness).

---

## 10. What is included in the LMS (no extra server cost)

- Home page & marketing content  
- Course catalog & checkout  
- Student dashboard (“My Learning”)  
- Exams & progress tracking  
- Certificates (template-based PDFs)  
- Admin panel for courses & users  
- Email OTP for registration  
- Light / dark theme  

---

## 11. Backups & safety (important for management)

| What | How often | Why |
|------|-----------|-----|
| Database backup | Daily | Never lose student records |
| Course content backup | Weekly | Protect uploaded videos |
| Admin settings backup | Daily | Protect course configuration |

**Estimated backup storage cost:** ₹0 – ₹400/month (if stored in Google Cloud Storage).

---

## 12. Risks if budget is cut too low

| If you choose… | Risk |
|----------------|------|
| Very small server (2 GB RAM only) | Slow videos, crashes with many users |
| No backups | Data loss if server fails |
| Shared PHP hosting instead of cloud | **LMS will not work** — wrong technology |
| HTTP only (no HTTPS) | Google login & payments will fail |
| Skipping Razorpay live setup | Cannot accept real payments |

**Recommended minimum:** Phase 1 budget (**₹2,800 – ₹3,500/month**) + daily database backups.

---

## 13. Approval checklist (for sign-off)

- [ ] Monthly budget of **₹2,800 – ₹3,500** approved for Phase 1  
- [ ] Domain **lms.sftrainings.org** ready to point to Google Cloud  
- [ ] Google Cloud billing account created  
- [ ] Razorpay **live** account approved (for real payments)  
- [ ] Gmail / SMTP ready for student emails  
- [ ] Course content ready to upload  
- [ ] Named person responsible for server & backups  

---

## 14. Technical reference (for your IT team)

Detailed technical steps are in:

| Document | Audience |
|----------|----------|
| `docs/GCP_CLOUDFLARE_DEPLOYMENT.md` | Developers / DevOps |
| `docs/SERVER_DEPLOYMENT.md` | Server administrators |
| `.env.example` | All secret keys and settings |

---

## 15. Contact & next steps

1. Approve **Phase 1 monthly budget: ₹2,800 – ₹3,500**  
2. Provide access to **Google Cloud** and **domain DNS**  
3. Developer deploys to **https://lms.sftrainings.org/**  
4. Run UAT (testing) with 5–10 real users  
5. Announce go-live to learners  

---

*Document version: 1.0 — June 2026*  
*Currency: Indian Rupees (₹), approximate planning figures*  
*Production URL: https://lms.sftrainings.org/*
