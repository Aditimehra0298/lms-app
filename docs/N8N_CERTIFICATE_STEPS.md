# n8n certificate generator — step-by-step

Use your LMS for **registration IDs in MySQL**. Use **n8n** for **PDF + email**.

---

## Before you start

1. LMS running: `http://localhost:3000` (or your production URL).
2. MySQL has users with `identificationNumber` (register at least one test user).
3. n8n installed:
   - **Cloud:** https://n8n.io
   - **Self-hosted:** `docker run -it --rm -p 5678:5678 n8nio/n8n` → open http://localhost:5678

4. **Local LMS + n8n:** n8n cannot call `localhost` on your PC from n8n Cloud. Use one of:
   - n8n **self-hosted on the same PC** as the LMS, or
   - **ngrok:** `ngrok http 3000` → use the `https://xxxx.ngrok.io` URL in HTTP nodes.

---

## Workflow overview

```
Webhook (exam passed) → HTTP Lookup user → Set fields → HTML/PDF → Email → (optional) Google Sheet log
```

---

## Step 1 — Create workflow

1. Open n8n → **Workflows** → **Add workflow**.
2. Name: `LMS Certificate Issue`.

---

## Your n8n URL (configured in `.env.local`)

```
N8N_CERTIFICATE_WEBHOOK_URL=https://damnart-ai-guladab.n8n-wsk.com/webhook-test/certificate
```

**Test URL:** use `webhook-test/...` only while **Listen for test event** is active in n8n.  
**Production:** activate workflow and use `https://damnart-ai-guladab.n8n-wsk.com/webhook/certificate` (no `-test`).

## Step 2 — Trigger (Webhook)

1. Add node: **Webhook**.
2. Settings:
   - **HTTP Method:** `POST`
   - **Path:** `certificate` (matches your URL above)
3. **Test payload** (use in Postman or “Listen for test event”):

```json
{
  "event": "course_completed",
  "certificateId": "clx-example",
  "callbackUrl": "http://localhost:3000/api/certificates/n8n-callback",
  "email": "learner@example.com",
  "learnerName": "Jane Doe",
  "learner": {
    "identificationNumber": 101,
    "registrationCode": "101",
    "registrationMonthYear": "05-2026"
  },
  "course": {
    "courseIdentificationNumber": 110,
    "courseCode": "110",
    "slug": "food-safety-masterclass",
    "title": "HACCP Food Safety Standards (Level 2)"
  },
  "courseSlug": "food-safety-masterclass",
  "scorePercent": 85
}
```

4. Save. Copy the **Production Webhook URL** for later (LMS or manual tests).

---

## Step 3 — Get registration ID from LMS

1. Add node: **HTTP Request** (connect after Webhook).
2. Settings:
   - **Method:** `GET`
   - **URL:**  
     `http://localhost:3000/api/registration/lookup`  
     (or `https://YOUR-NGROK.ngrok.io/api/registration/lookup`)
   - **Query Parameters:**
     - Name: `email`
     - Value: `{{ $json.body.email }}`  
       (if webhook puts data in `body`; use `{{ $json.email }}` if flat — check Webhook output in n8n)

3. Execute node once with a real registered email.

**Expected response:**

```json
{
  "ok": true,
  "registration": {
    "email": "learner@example.com",
    "accountType": "individual",
    "identificationNumber": 101,
    "registrationCode": "101",
    "registrationMonth": 5,
    "registrationYear": 2026,
    "registrationMonthYear": "05-2026",
    "companyName": null
  }
}
```

Organisation: `registrationCode` = `101-org`, `companyName` filled.

---

## Step 4 — Map fields (Set node)

1. Add node: **Set** (or **Edit Fields**).
2. Add fields:

| Field name | Expression |
|------------|------------|
| `learnerName` | `{{ $('Webhook').item.json.body.learnerName }}` |
| `email` | `{{ $('Webhook').item.json.body.email }}` |
| `courseTitle` | `{{ $('Webhook').item.json.body.courseTitle }}` |
| `scorePercent` | `{{ $('Webhook').item.json.body.scorePercent }}` |
| `registrationCode` | `{{ $json.registration.registrationCode }}` |
| `registrationMonthYear` | `{{ $json.registration.registrationMonthYear }}` |
| `displayName` | `{{ $json.registration.companyName \|\| $('Webhook').item.json.body.learnerName }}` |
| `certificateNumber` | `{{ $json.registration.registrationCode }}/{{ $json.registration.registrationMonthYear }}/001` |

Adjust node names if yours differ. `certificateNumber` is **your** format in n8n (example only).

---

## Step 5 — Build PDF

Pick **one** option.

### Option A — HTML → PDF (common)

1. Add **HTML** node (template):

```html
<div style="font-family: Arial; text-align: center; padding: 40px;">
  <h1>Certificate of Completion</h1>
  <p>This certifies that</p>
  <h2>{{ $json.displayName }}</h2>
  <p>has completed <strong>{{ $json.courseTitle }}</strong></p>
  <p>Score: {{ $json.scorePercent }}%</p>
  <p>ID: {{ $json.registrationCode }}</p>
  <p>Certificate No: {{ $json.certificateNumber }}</p>
  <p>Date: {{ $now.format('dd MMMM yyyy') }}</p>
</div>
```

2. Add **HTML to PDF** node (community node or **PDF Generator** / **APITemplate** if installed).

### Option B — APITemplate.io / pdf.co

1. Create template on their site with placeholders: `learner_name`, `course`, `cert_number`.
2. **HTTP Request** POST to their API with JSON from Step 4.

### Option C — Google Docs

1. Google Doc template with `{{learnerName}}`, etc.
2. **Google Docs** + **Google Drive** nodes to copy and export PDF.

---

## Step 6 — Send email

1. Add **Gmail** or **SMTP** node.
2. **To:** `{{ $('Set').item.json.email }}`
3. **Subject:** `Your certificate — {{ $('Set').item.json.courseTitle }}`
4. **Attachments:** binary PDF from previous node.
5. Connect your Gmail OAuth or SMTP credentials in n8n **Credentials**.

---

## Step 7 — Avoid duplicate certificates (recommended)

1. Add **Google Sheets** (or **MySQL** node) at the start after Webhook:
   - Sheet columns: `email`, `courseSlug`, `certificateNumber`, `issuedAt`
2. **IF** node: row exists for same email + course → **Stop** branch.
3. Else → continue PDF → after email **Append row** to sheet.

---

## Step 8 — Test end-to-end

1. Register a user on the LMS (Individual or Organisation).
2. In Workbench confirm ID:
   ```sql
   SELECT email, identificationNumber, registrationMonthYear FROM lms_user;
   ```
3. In n8n: **Execute workflow** with Webhook test JSON (real email).
4. Check email inbox for PDF.

---

## Step 9 — LMS already calls n8n on exam pass

When a learner **passes** an exam, the LMS sends **POST** to your webhook automatically (if Admin → Certificates → n8n is enabled).

Payload includes:

- `certificateId` — MySQL row id  
- `callbackUrl` — `https://YOUR-LMS/api/certificates/n8n-callback`  
- `course` — from MySQL `lms_course` (`courseIdentificationNumber` 101, 102…, `slug`, `title`)  
- `registration` — learner/org from MySQL (`registrationCode`, `registrationMonthYear`, …)  
- `requireAdminApproval` / `autoVisibleWhenReady` — from admin settings  

Lookup course: `GET /api/courses/db?slug=your-course-slug`

**.env.local:**

```
N8N_CERTIFICATE_WEBHOOK_URL=https://your-n8n.com/webhook/lms-certificate
N8N_WEBHOOK_SECRET=your-secret
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Step 10 — n8n calls back when PDF is ready

Add **HTTP Request** node at the end:

- **POST** `{{ $json.callbackUrl }}` (from webhook payload)  
- Header: `X-Webhook-Secret` = same as `N8N_WEBHOOK_SECRET`  
- Body:

```json
{
  "certificateId": "{{ $('Webhook').item.json.body.certificateId }}",
  "certificateNumber": "101/05-2026/001",
  "pdfUrl": "https://drive.google.com/...",
  "status": "ready"
}
```

Learner sees the certificate on **My Learning → Certificates** when:

- Admin enabled **Show on learner dashboard**, and  
- **Auto-show when ready** is on, OR admin clicked **Allow download** in Admin → Certificates approvals list.

---

## Admin panel workflow (review → approve download)

**Location:** Admin → Self-paced course → **Certificates** tab → bottom list.

| Step | Who | Action |
|------|-----|--------|
| 1 | n8n | Creates PDF, calls callback with `pdfUrl` + `certificateNumber` |
| 2 | Admin | Open **Preview PDF**, check name/ID/design |
| 3 | Admin | If wrong: fix in n8n and re-run, or **paste PDF URL** manually |
| 4 | Admin | Click **Allow download** → learner can open PDF on dashboard |
| 5 | Learner | My Learning → Certificates → **Open PDF** |

### Manual issue (good idea when)

- n8n failed or learner needs a replacement certificate  
- VIP / offline course completed outside the LMS  
- You uploaded PDF to Google Drive and only need to paste the link  

**How:**

1. Enter learner email → **Send to n8n** (automatic), OR  
2. After a row appears: paste **PDF URL** + **certificate number** → blur fields to save  
3. **Mark ready (no n8n)** if you have no PDF URL yet but want to approve later  
4. **Allow download** when you are happy with the certificate  

**Recommendation:** Keep **Require admin approval** ON for production so every PDF is checked before learners download.

---

## Field cheat sheet (from LMS)

| n8n field | Source |
|-----------|--------|
| Learner email | Webhook `email` |
| Permanent ID | `registration.identificationNumber` |
| Display code | `registration.registrationCode` (`101` or `101-org`) |
| Signup month-year | `registration.registrationMonthYear` (`05-2026`) |
| Company name (org) | `registration.companyName` |

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| HTTP lookup 404 | User not registered in MySQL yet |
| HTTP lookup 503 | Run `npm.cmd run db:generate`, restart LMS |
| Cannot reach localhost | Use ngrok or self-host n8n locally |
| Empty `registrationCode` | Org user missing `companyName` at signup |
| EPERM on Prisma | Stop `npm run dev`, run `scripts/fix-prisma-and-run.cmd` |

---

## Security (production)

1. Add header check on Webhook: `X-Webhook-Secret` = your secret.
2. Do not expose lookup API publicly without API key (add when going live).
3. Use HTTPS for n8n and LMS.
