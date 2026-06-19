# n8n certificate workflow — simple steps

One workflow for **all courses**. LMS sends data → n8n builds certificate + transcript PDFs → n8n calls LMS back.

---

## Before n8n

| # | Task | Where |
|---|------|--------|
| 1 | Upload certificate, badge, transcript | Admin → **Certificates** (or course → Certificates tab) |
| 2 | Turn on certificates per course | Self-paced course → **Certificates** → Save |
| 3 | Set env | `.env.local` |

```env
NEXT_PUBLIC_APP_URL=https://your-lms-domain.com
N8N_CERTIFICATE_WEBHOOK_URL=https://YOUR-N8N.app.n8n.cloud/webhook/certificate
```

4. Restart LMS: `npm run dev`

**Local test:** run `ngrok http 3000` and use ngrok URL as `NEXT_PUBLIC_APP_URL`.

---

## n8n workflow (node order)

```
[1 Webhook] → [2 Set fields] → [3 Download templates] → [4 Build certificate PDF]
     → [5 Build transcript PDF] → [6 Upload PDFs] → [7 HTTP callback to LMS]
```

---

## Step 1 — Webhook (trigger)

1. n8n → **New workflow** → name: `SFT Certificate Issue`
2. Add **Webhook** node:
   - Method: **POST**
   - Path: `certificate`
3. **Activate** workflow → copy **Production URL**  
   Example: `https://xxx.app.n8n.cloud/webhook/certificate`
4. Paste that URL into LMS `.env` as `N8N_CERTIFICATE_WEBHOOK_URL`

**Test only:** use `webhook-test/certificate` + **Listen for test event** (not for live LMS).

---

## Step 2 — Set fields (map LMS JSON)

Add **Set** node after Webhook. Use expressions (adjust if your Webhook output is `body` or flat):

| Your PDF label | n8n expression |
|----------------|----------------|
| Candidate name | `{{ $json.body.certificateFields.candidateName }}` |
| Course name | `{{ $json.body.certificateFields.courseName }}` |
| Duration | `{{ $json.body.certificateFields.duration }}` |
| Mode | `{{ $json.body.certificateFields.mode }}` |
| Issue date | `{{ $json.body.certificateFields.issueDate }}` |
| Certificate number | `{{ $json.body.certificateFields.certificateNumber }}` |
| Delegate number | `{{ $json.body.certificateFields.delegateNumber }}` |
| QR / verify link | `{{ $json.body.tracker.qrCodeData }}` |
| Transcript grade | `{{ $json.body.transcriptFields.grade }}` |
| Training program | `{{ $json.body.transcriptFields.trainingProgram }}` |
| Certificate template URL | `{{ $json.body.assets.certificateTemplate }}` |
| Badge URL | `{{ $json.body.assets.badge }}` |
| Transcript template URL | `{{ $json.body.assets.transcriptTemplate }}` |
| LMS callback URL | `{{ $json.body.callbackUrl }}` |
| Certificate row ID | `{{ $json.body.certificateId }}` |

**Important:** Use the `certificateNumber` and `delegateNumber` from LMS — do not invent new numbers.

---

## Step 3 — Download template images (HTTP Request)

LMS template URLs are like `/api/media/serve/...` — need full URL + token.

For each asset, **HTTP Request** GET:

- URL: `https://YOUR-LMS.com` + `{{ $json.body.assets.certificateTemplate }}`  
  (or use n8n **HTTP Request** with auth if you add a public template URL later)

**Easier option:** use **APITemplate.io**, **CraftMyPDF**, or **Google Slides** with your fixed design and pass field text from Step 2.

---

## Step 4 — Build certificate PDF

Pick one tool:

| Tool | What you do |
|------|-------------|
| **APITemplate / CraftMyPDF** | Upload your certificate JPG; map placeholders to `certificateFields.*` |
| **HTML → PDF** | Quick test only — not your final design |
| **Canva + API** | If you have enterprise API |

Place on PDF:

- Name, course, duration, mode, issue date, certificate no., delegate no.
- Badge image (from `assets.badge`)
- **QR code** encoding `tracker.qrCodeData` (verify page)

---

## Step 5 — Build transcript PDF

Same tool or second template:

- Name, training program, grade (`transcriptFields.grade` = combined exam %)
- Certificate number, issue date, delegate number
- Curriculum table: copy from course content manually in template for now

---

## Step 6 — Store PDF (get public URL)

Upload finished PDF to:

- Google Drive (share link)
- AWS S3
- pdf.co storage

You need a **public or signed URL** for the PDF file.

---

## Step 7 — Tell LMS the PDF is ready (required)

Add **HTTP Request** node:

- **Method:** POST
- **URL:** `{{ $json.body.callbackUrl }}`  
  (from webhook — e.g. `https://your-lms.com/api/certificates/n8n-callback`)
- **Body (JSON):**

```json
{
  "certificateId": "{{ $json.body.certificateId }}",
  "certificateNumber": "{{ $json.body.certificateFields.certificateNumber }}",
  "pdfUrl": "https://YOUR-STORAGE.com/path/to/certificate.pdf",
  "status": "ready"
}
```

LMS marks certificate **ready**. Admin can **Allow download** if approval is on.

---

## Step 8 — Test

1. Register test user on LMS
2. Pass all module exams (70%+ each)
3. Check n8n **Executions** — should show success
4. Admin → course → **Certificates** → see row → **Allow download**
5. Open verify link: `tracker.qrCodeData` from execution log

---

## Optional nodes

| Node | Purpose |
|------|---------|
| **Gmail / SMTP** | Email PDF to learner |
| **IF** | Skip if `status` already ready |
| **Error workflow** | Notify admin if PDF fails |

---

## Full webhook example (from LMS)

```json
{
  "event": "course_completed",
  "certificateId": "clx_abc123",
  "callbackUrl": "https://your-lms.com/api/certificates/n8n-callback",
  "email": "learner@example.com",
  "courseTitle": "Advanced Food Fraud Mitigation",
  "scorePercent": 73,
  "assets": {
    "certificateTemplate": "/api/media/serve/xxx-certificate.png",
    "badge": "/api/media/serve/xxx-badge.png",
    "transcriptTemplate": "/api/media/serve/xxx-transcript.png"
  },
  "certificateFields": {
    "candidateName": "Jane Doe",
    "courseName": "Advanced Food Fraud Mitigation",
    "duration": "3 hours",
    "mode": "Self-Paced",
    "issueDate": "27 May 2026",
    "certificateNumber": "2026-05-101-001/123",
    "delegateNumber": "2026-0042-123",
    "verifyUrl": "https://your-lms.com/certificates/verify?delegate=2026-0042-123"
  },
  "transcriptFields": {
    "candidateName": "Jane Doe",
    "trainingProgram": "Advanced Food Fraud Mitigation",
    "grade": "73%",
    "certificateNumber": "2026-05-101-001/123",
    "issueDate": "27 May 2026",
    "delegateNumber": "2026-0042-123"
  },
  "tracker": {
    "delegateNumber": "2026-0042-123",
    "verifyNumber": 42,
    "verifyUrl": "https://your-lms.com/certificates/verify?delegate=2026-0042-123",
    "qrCodeData": "https://your-lms.com/certificates/verify?delegate=2026-0042-123"
  }
}
```

---

## Checklist

- [ ] Webhook path `certificate` — workflow **Active**
- [ ] `N8N_CERTIFICATE_WEBHOOK_URL` in LMS `.env` (production URL, not `-test`)
- [ ] Callback POST returns `200`
- [ ] QR uses `tracker.qrCodeData`
- [ ] Certificate number matches LMS format `YYYY-MM-courseId-trainingId/userId`
- [ ] Delegate number matches `YYYY-verifyNumber-userId`

More detail: `docs/N8N_CERTIFICATE_STEPS.md` · Field map: `docs/CERTIFICATE_FIELD_MAP.md`
