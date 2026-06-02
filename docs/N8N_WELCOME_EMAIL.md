# n8n — welcome email after registration

When a **new learner** registers (email + OTP or **Google** on Register), the LMS sends a webhook to n8n. Your workflow sends the branded email (Gmail, Outlook, etc.).

The LMS still builds the **HTML template** (`lib/email-templates/`) and passes it in the payload so n8n can send as-is or customize in the workflow.

---

## 1. LMS configuration (`.env.local`)

```env
NEXT_PUBLIC_APP_URL=https://your-lms-domain.com

# n8n welcome webhook (production URL when workflow is active)
N8N_WELCOME_WEBHOOK_URL=https://your-instance.app.n8n.cloud/webhook/welcome

# Webhook Basic Auth (same as n8n Webhook node → Authentication → Basic Auth)
N8N_WEBHOOK_USER=your_username
N8N_WEBHOOK_PASSWORD=your_password

# Optional header check in n8n (same as certificate/chat webhooks)
N8N_WEBHOOK_SECRET=your-long-random-string

# Optional branding
MAIL_APP_NAME=SF Trainings
MAIL_LOGO_URL=https://your-lms-domain.com/SF-WHITE-LOGO.png

WELCOME_EMAIL_ENABLED=true
# If n8n fails, fall back to SMTP (default true)
WELCOME_EMAIL_SMTP_FALLBACK=true
```

Restart the dev server after changing env.

---

## 2. n8n workflow (minimum)

| Step | Node | What it does |
|------|------|----------------|
| 1 | **Webhook** | Method: POST, path: `welcome` |
| 2 | **Gmail** or **Send Email** | To: `{{ $json.email }}`, Subject: `{{ $json.emailContent.subject }}`, HTML: `{{ $json.emailContent.html }}` |

Activate the workflow and copy the **production** webhook URL into `N8N_WELCOME_WEBHOOK_URL`.

**Test URL:** use `/webhook-test/welcome` only while **Listen for test event** is on in n8n.

---

## 3. Webhook payload (from LMS)

```json
{
  "event": "learner_registered",
  "source": "lms",
  "email": "learner@example.com",
  "learnerName": "Aditi",
  "signUpMethod": "google",
  "accountType": "individual",
  "registration": {
    "email": "learner@example.com",
    "name": "Aditi",
    "registrationCode": "2026-05-101",
    "identificationNumber": 102,
    "countryName": "India"
  },
  "brand": {
    "appName": "SF Trainings",
    "appUrl": "https://your-lms.com",
    "logoUrl": "https://your-lms.com/SF-WHITE-LOGO.png"
  },
  "mysql": {
    "email": "learner@example.com",
    "name": "Aditi",
    "registrationCode": "2026-05-102",
    "identificationNumber": 102,
    "countryName": "India"
  },
  "links": {
    "dashboard": "https://your-lms.com/my-learning?tab=dashboard",
    "dashboardUrl": "https://your-lms.com/my-learning?tab=dashboard",
    "exploreCourses": "https://your-lms.com/courses",
    "exploreCoursesUrl": "https://your-lms.com/courses",
    "myLearning": "https://your-lms.com/my-learning",
    "courses": "https://your-lms.com/courses",
    "account": "https://your-lms.com/account"
  },
  "emailContent": {
    "subject": "Welcome to SF Trainings — your account is ready",
    "text": "Plain-text version…",
    "html": "<!DOCTYPE html>…"
  }
}
```

| Field | Use in n8n |
|-------|----------------|
| `email` | Recipient |
| `learnerName` | Personalization |
| `signUpMethod` | `email` or `google` — branch logic |
| `emailContent.subject` | Email subject |
| `emailContent.html` | Email body (full design from LMS) |
| `links.dashboard` / `links.dashboardUrl` | **Your dashboard** button |
| `links.exploreCourses` / `links.exploreCoursesUrl` | **Explore our courses** button |
| `mysql` or `registration` | Full learner row from MySQL after signup |
| `mysql.registrationCode` | Learner ID in email body |

---

## 4. Gmail node expressions

- **To:** `{{ $json.email }}`
- **Subject:** `{{ $json.emailContent.subject }}`
- **Email type:** HTML
- **Message:** `{{ $json.emailContent.html }}`

Plain text (optional): `{{ $json.emailContent.text }}`

---

## 5. Customize design in n8n (optional)

**Option A — Use LMS HTML (easiest)**  
Send `emailContent.html` directly — matches the dark + gold template in the repo.

**Option B — Build in n8n**  
Ignore `emailContent.html` and use your own HTML node with:

- `{{ $json.learnerName }}`
- `{{ $json.brand.appName }}`
- `{{ $json.links.myLearning }}`

---

## 6. When the webhook fires

| Action | Sends welcome? |
|--------|----------------|
| New register (email + OTP) | Yes |
| New register (Google) | Yes |
| Login / existing user | No |
| Admin accounts | No |

OTP emails still use **SMTP** from the LMS (`/api/auth/otp`). You can add a separate n8n workflow for OTP later if needed.

---

## 7. Test

1. In n8n: Webhook → **Listen for test event**
2. Register a **new** test user on `/account` (or Google Register)
3. Check **Executions** in n8n
4. Check inbox / spam

Manual test JSON (paste in n8n test):

```json
{
  "event": "learner_registered",
  "email": "you@example.com",
  "learnerName": "Test User",
  "signUpMethod": "email",
  "emailContent": {
    "subject": "Welcome to SF Trainings",
    "html": "<p>Hello Test User</p>"
  }
}
```

---

## 8. n8n webhook authentication

If your **Webhook** node uses **Authentication → Basic Auth**:

1. In n8n: set **Username** and **Password** on the Webhook node.
2. In LMS `.env.local`, set the **same** values:

```env
N8N_WEBHOOK_USER=your_username
N8N_WEBHOOK_PASSWORD=your_password
```

3. Restart the dev server (`npm run dev`).

The LMS sends `Authorization: Basic …` on every POST to welcome, certificate, and chat webhooks.

Optional: `N8N_WEBHOOK_SECRET` adds header `X-Webhook-Secret` for an extra check in n8n.

---

## 9. Troubleshooting

| Issue | Fix |
|-------|-----|
| Webhook returns **401** | `N8N_WEBHOOK_USER` / `N8N_WEBHOOK_PASSWORD` must match n8n Basic Auth exactly |
| No execution in n8n | Workflow not active; wrong URL (`-test` vs production) |
| LMS logs `n8n failed` | Check n8n execution error; enable `WELCOME_EMAIL_SMTP_FALLBACK=true` |
| n8n Cloud cannot reach localhost LMS | Deploy LMS or use ngrok for callbacks (welcome is LMS → n8n only, so n8n Cloud is fine) |
| Empty email body | Use `$json.emailContent.html` not `$json.body.emailContent.html` (depends on Webhook output mode) |

---

## Related

- Certificate emails/PDFs: `docs/N8N_CERTIFICATE_STEPS.md`
- Chat: `N8N_CHAT_WEBHOOK_URL` in `.env.example`
- Template source: `lib/email-templates/welcome.ts`, `lib/email-templates/layout.ts`
