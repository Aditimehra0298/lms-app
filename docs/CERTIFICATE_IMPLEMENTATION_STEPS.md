# Certificate generator — step-by-step (LMS + n8n)

This is the implementation order for a **production-style** certificate system: automatic generation when the learner qualifies, visible status in admin, and manual fallback if automation fails.

Your codebase already includes:

- Admin **Certificates** tab (template, badge, n8n URL, approvals)
- Learner trigger via `POST /api/certificates/request` and exam completion
- n8n callback: `POST /api/certificates/n8n-callback`
- Detailed n8n wiring: `docs/N8N_CERTIFICATE_STEPS.md`

---

## Phase 0 — Decide what you upload once (samples)

In **Admin → Self-paced course → Certificates**, prepare:

| Asset | Purpose |
|--------|---------|
| Certificate background image | PDF/design export (e.g. JPG in `public/certificates/`) |
| Badge image | Small logo for certificate + social share |
| Transcript file (optional) | PDF linked as supplementary download |
| Text positions | Where name, certificate number, and date appear on the template |

Save the course after setting these fields.

---

## Phase 1 — Environment (LMS)

1. Copy `.env.example` → `.env.local` if needed.
2. Set:

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
N8N_CERTIFICATE_WEBHOOK_URL=https://YOUR-N8N-HOST/webhook/certificate
# optional shared secret between LMS and n8n:
# N8N_WEBHOOK_SECRET=your-long-random-string
```

3. For **n8n Cloud** calling your local LMS, use **ngrok** (or deploy LMS):

```bash
ngrok http 3000
```

Use the `https://....ngrok.io` URL in n8n HTTP nodes and in `NEXT_PUBLIC_APP_URL` when testing callbacks.

4. Ensure MySQL is running and schema is applied:

```bash
npx prisma db push
```

5. Restart dev server after env changes:

```bash
npm run dev
```

---

## Phase 2 — Admin: enable certificates per course

1. Open `/admin` → **Self-paced courses** → pick a course.
2. Go to **Certificates** tab.
3. Turn on **Issue certificates for this course**.
4. Set **Provider: n8n workflow** (not built-in only, unless testing).
5. Paste your n8n webhook URL (or rely on `N8N_CERTIFICATE_WEBHOOK_URL` in `.env.local`).
6. Upload **template image**, optional **badge**, optional **transcript/docs**.
7. Adjust **text position %** (name, number, date) on the sample.
8. Click **Save certificate settings**.

---

## Phase 3 — n8n workflow (minimum viable)

Follow **`docs/N8N_CERTIFICATE_STEPS.md`** in detail. Short version:

1. Create workflow **LMS Certificate Issue**.
2. Add **Webhook** node: `POST`, path `certificate`.
3. Add **HTTP Request** → LMS lookup (optional if payload already has IDs):

   `GET {{LMS_URL}}/api/registration/lookup?email={{email}}`

4. Build certificate number (individual: `101/05-2026/001`, org: `101-org/05-2026/001`).
5. Generate PDF (HTML → PDF node, or Google Drive, or your preferred service).
6. Upload PDF to storage (Drive/S3) and get public `pdfUrl`.
7. Add **HTTP Request** → LMS callback:

   - **POST** `{{ $json.body.callbackUrl }}`
   - Body:

```json
{
  "certificateId": "{{ $json.body.certificateId }}",
  "certificateNumber": "{{ $json.certificateNumber }}",
  "pdfUrl": "{{ $json.pdfUrl }}",
  "status": "ready"
}
```

8. **Activate** workflow (production webhook URL, not `webhook-test`).

---

## Phase 4 — Test end-to-end (one learner)

### 4a. Register a test user

- Sign up at `/account` so MySQL has `lms_user` with `identificationNumber`.

### 4b. Enroll and complete course rules

- Purchase/enroll course (or use company bypass from **Students** tab if testing).
- Complete modules + pass exams so completion logic runs.

### 4c. Trigger certificate request

Happens automatically from learning player when:

- All modules complete
- Exam average ≥ 60%
- Certificates enabled for course

Or call manually:

```bash
curl -X POST http://localhost:3000/api/certificates/request \
  -H "Content-Type: application/json" \
  -d '{"learnerEmail":"test@example.com","courseSlug":"YOUR-COURSE-SLUG","scorePercent":85}'
```

### 4d. Check statuses

| Where | What to see |
|--------|-------------|
| MySQL `lms_certificate` | `status`: pending → ready (or failed) |
| Admin → Certificates | Approval list with PDF link |
| Learner → My Learning → Certificates | Download when `visibleToLearner` is true |

---

## Phase 5 — When automation fails (manual path)

Your admin already supports:

- **Students** tab: **Bypass** (access without payment), **Manual pass** (force certificate visible)
- **Certificates** tab: approve PDF, edit number, **Allow download**

**4-hour SLA process:**

1. Failed rows appear as `status = failed` or stuck `pending`.
2. Admin opens Certificates → review queue.
3. Retry n8n OR upload manual PDF URL.
4. Toggle **visible to learner** = download enabled.

---

## Phase 6 — Learner download + share (next enhancements)

Already partially supported:

- `pdfUrl` on certificate row
- Public verify: `/certificates/verify`
- Supplementary docs (transcript) in schema

To add for “Coursera-like” UX:

1. **LinkedIn Share** button on learner certificate card (share verify URL + course title).
2. **Open Graph** image using badge URL for social previews.
3. Email notification from n8n when `status = ready`.

---

## Status reference (recommended)

| Status | Meaning | Learner sees |
|--------|---------|-------------|
| `pending` | LMS created row; waiting for n8n | Processing… |
| `processing` | (optional) n8n acknowledged | Processing… |
| `ready` | PDF ready | Download |
| `failed` | n8n error | Processing… (don’t show error text) |
| `manually_issued` | Admin fixed | Download |

---

## What is already wired in code (don’t rebuild)

- `lib/server/n8n-certificate-service.ts` — sends webhook payload + callback handling
- `app/api/certificates/n8n-callback/route.ts` — receives n8n result
- `app/api/certificates/request/route.ts` — starts generation
- `components/admin/AdminCourseCertificatesPanel.tsx` — template + n8n URL + approvals
- `components/admin/AdminCourseCertificateApprovals.tsx` — manual review UI
- Exam pass → auto request in `app/my-learning/course/[slug]/page.tsx`

---

## Recommended order for *you* today

1. **Today:** Phase 0 + 1 + 2 (samples + env + admin save).
2. **Tomorrow:** Phase 3 (n8n workflow) using `N8N_CERTIFICATE_STEPS.md`.
3. **Then:** Phase 4 test with one real user.
4. **Then:** Phase 5 manual playbook + Phase 6 share buttons.

---

## Quick checklist

- [ ] Sample certificate JPG uploaded in admin
- [ ] Badge uploaded
- [ ] `N8N_CERTIFICATE_WEBHOOK_URL` in `.env.local`
- [ ] n8n workflow active (production URL)
- [ ] Test user registered in MySQL
- [ ] Course certificates enabled + n8n provider selected
- [ ] One successful test: pending → ready
- [ ] One failure test: manual pass works within admin
- [ ] Learner can download PDF when approved
