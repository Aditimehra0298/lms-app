# LMS API Reference

All Next.js App Router API routes under `app/api/`.  
Base URL (local): `http://localhost:3000`

Path params are shown in `{braces}` (e.g. `{slug}`, `{id}`, `{fileName}`, `{token}`).

---

## Auth

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Learner email/password login |
| POST | `/api/auth/google` | Google OAuth / access-token sign-in |
| GET | `/api/auth/me` | Current authenticated learner/session |
| POST | `/api/auth/record` | Record / persist auth session |
| POST | `/api/auth/otp/send` | Send email OTP |
| POST | `/api/auth/otp/verify` | Verify email OTP |
| POST | `/api/auth/forgot-password/send` | Send password-reset email |
| POST | `/api/auth/forgot-password/reset` | Reset password with token |
| GET | `/api/auth/admin-access` | Check admin access permission |
| POST | `/api/auth/admin-login` | Admin sign-in |
| GET | `/api/auth/admin-setup` | Admin setup status / bootstrap |

---

## Courses & catalog

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/courses` | List published / managed courses |
| GET | `/api/courses/db` | Courses from MySQL DB |
| GET | `/api/courses/{slug}` | Single course by slug |
| GET | `/api/courses/{slug}/exam-questions` | Exam questions for a course |
| GET | `/api/courses/{slug}/reviews` | Course reviews |
| POST | `/api/courses/{slug}/reviews` | Submit a course review |
| GET | `/api/courses/{slug}/qa` | Course Q&A list |
| POST | `/api/courses/{slug}/qa` | Ask a question |
| POST | `/api/courses/{slug}/qa/{questionId}/answers` | Answer a Q&A question |
| GET | `/api/categories` | Course categories |
| GET | `/api/tutor-led/programs` | Published tutor-led / workshop programs |
| GET | `/api/site/home-page` | Public home-page CMS config |

---

## Learner

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/learner/site` | Learner site bundle (courses, tutor-led, dashboard) |
| POST | `/api/learner/profile` | Save / update learner profile |
| GET | `/api/learner/course-progress` | Get course progress |
| PUT | `/api/learner/course-progress` | Update course progress |
| POST | `/api/learner/course-completed` | Mark course completed |
| POST | `/api/learner/progress-report` | Progress report payload |
| POST | `/api/learner/upload` | Learner file upload |
| POST | `/api/learner/youtube-signals` | YouTube recommendation signals |

---

## Organization

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/organization/team` | Org team members / config |
| POST | `/api/organization/team` | Create / invite team data |
| PUT | `/api/organization/team` | Update team data |

---

## Pricing, cart & purchases

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/pricing/region` | Resolve learner pricing region |
| POST | `/api/pricing/region` | Set / refresh pricing region |
| GET | `/api/geo/country` | Detect country + IP (`ipv4` / `ipv6`) from headers or public IP lookup |
| POST | `/api/promotions/validate` | Validate promo / discount code |
| POST | `/api/cart/abandoned` | Abandoned-cart capture (n8n) |
| GET | `/api/purchases` | List learner purchases |
| POST | `/api/purchases` | Record a purchase / enrollment |

---

## Payments (Razorpay & demo)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/payments/razorpay/config` | Public Razorpay key / config |
| POST | `/api/payments/razorpay/create-order` | Create Razorpay order |
| POST | `/api/payments/razorpay/verify` | Verify Razorpay payment signature |
| POST | `/api/payments/demo` | Demo checkout (no live charge) |

---

## Certificates

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/certificates` | List learner certificates |
| GET | `/api/certificates/{id}` | Certificate detail |
| POST | `/api/certificates/request` | Request a certificate |
| POST | `/api/certificates/issue` | Issue a certificate |
| GET | `/api/certificates/verify` | Verify certificate (query) |
| POST | `/api/certificates/verify` | Verify certificate (body) |
| GET | `/api/certificates/public-pdf` | Public certificate PDF |
| POST | `/api/certificates/recover-pending` | Recover pending certificates |
| POST | `/api/certificates/n8n-callback` | n8n certificate webhook callback |
| POST | `/api/certificates/{id}/prepare` | Prepare certificate generation |
| POST | `/api/certificates/{id}/generate` | Generate certificate |
| POST | `/api/certificates/{id}/generate-from-template` | Generate from template |
| GET | `/api/certificates/{id}/pdf` | Download / stream PDF |
| POST | `/api/certificates/{id}/download` | Download action |
| POST | `/api/certificates/{id}/trigger-n8n` | Trigger n8n certificate flow |

---

## Media & covers

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/media/token` | Issue media access token |
| GET | `/api/media/serve/{fileName}` | Serve protected media file |
| GET | `/api/covers/{fileName}` | Serve course cover image |

---

## Chat & support

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/chat` | Chat health / config |
| POST | `/api/chat` | Chat message |
| POST | `/api/chat-assistant` | LMS chatbot / OpenAI assistant |
| GET | `/api/tickets` | List support tickets |
| POST | `/api/tickets` | Create support ticket |
| GET | `/api/tickets/{id}` | Ticket detail |
| PUT | `/api/tickets/{id}/status` | Update ticket status |
| GET | `/api/issues` | List issues |
| GET | `/api/issues/{token}` | Issue by public token |
| PATCH | `/api/issues/{token}` | Update issue by token |

---

## Forms & marketing

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/contact` | Contact form submit |
| GET | `/api/contact/captcha` | Contact captcha challenge |
| POST | `/api/book-a-call` | Book-a-call form |
| POST | `/api/enrollment-inquiry` | Enrollment inquiry form |
| POST | `/api/forms/newsletter` | Newsletter subscribe |
| POST | `/api/video-access-requests` | Request video access |
| POST | `/api/verify/unlock-form` | Unlock / verify form gate |
| GET | `/api/registration/lookup` | Registration ID lookup |
| GET | `/api/community/success-submissions` | List success stories |
| POST | `/api/community/success-submissions` | Submit success story |

---

## Health & cron

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health/mysql` | MySQL connectivity check |
| GET | `/api/cron/n8n-emails` | Cron: n8n email jobs |
| POST | `/api/cron/n8n-emails` | Trigger n8n email jobs |
| POST | `/api/institute/sync` | Institute sync webhook / job |

---

## Admin — content & settings

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/content` | Read admin CMS content JSON |
| PUT | `/api/admin/content` | Write admin CMS content |
| GET | `/api/admin/settings` | Admin settings |
| POST | `/api/admin/settings` | Save admin settings |
| GET | `/api/admin/access-config` | Admin access configuration |
| GET | `/api/admin/overview` | Admin overview metrics |
| GET | `/api/admin/dashboard-stats` | Dashboard statistics |
| GET | `/api/admin/notifications` | Admin notifications |
| POST | `/api/admin/notifications` | Create / mark notifications |
| POST | `/api/admin/upload` | Admin media upload |
| POST | `/api/admin/upload-cover` | Upload course cover |

---

## Admin — courses & curriculum

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/admin/courses/sync` | Sync courses to storage / DB |
| GET | `/api/admin/courses/ai-landing` | AI landing generation status |
| POST | `/api/admin/courses/ai-landing` | Generate course landing with AI |
| GET | `/api/admin/courses/bulk-generate` | Bulk generate status |
| POST | `/api/admin/courses/bulk-generate` | Bulk-generate course landings |
| GET | `/api/admin/courses/{slug}/students` | Course student enrollments |
| POST | `/api/admin/courses/{slug}/students/actions` | Student actions (add / grant / etc.) |
| POST | `/api/admin/courses/{slug}/students/cleanup` | Cleanup student enrollments |
| PUT | `/api/admin/course-curriculum` | Save course curriculum |
| GET | `/api/admin/course-curriculum/restore-from-media` | Preview restore from media |
| POST | `/api/admin/course-curriculum/restore-from-media` | Restore curriculum from media |
| POST | `/api/admin/course-curriculum/restore-from-mysql` | Restore curriculum from MySQL |
| GET | `/api/admin/exam-questions` | Admin exam questions |
| GET | `/api/admin/course-qa` | Moderate course Q&A |
| PATCH | `/api/admin/course-qa` | Update Q&A moderation |
| GET | `/api/admin/skills-assessments` | Skills assessments list |
| POST | `/api/admin/enrollments/sync` | Sync enrollments |

---

## Admin — users, orgs & payments

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/users` | List / search users |
| PATCH | `/api/admin/users` | Update user |
| POST | `/api/admin/users/password-reset` | Admin-triggered password reset |
| GET | `/api/admin/organizations` | List organizations |
| POST | `/api/admin/organizations` | Create organization |
| GET | `/api/admin/organization-teams` | Org team admin view |
| PUT | `/api/admin/organization-teams` | Update org teams |
| GET | `/api/admin/payments` | List payments |
| POST | `/api/admin/payments` | Record / adjust payment |
| GET | `/api/admin/form-submissions` | Form submission inbox |
| PATCH | `/api/admin/form-submissions` | Update form submission status |

---

## Admin — certificates & Zoom

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/certificates` | Admin certificate list |
| PATCH | `/api/admin/certificates/{id}` | Update certificate record |
| POST | `/api/admin/certificates/trigger` | Trigger certificate issuance |
| GET | `/api/admin/zoom/status` | Zoom API connection status |
| POST | `/api/admin/zoom/create-meeting` | Create Zoom meeting for tutor-led |
| POST | `/api/admin/zoom/sync-recordings` | Sync Zoom cloud recordings |

---

## Notes

- Most learner/admin mutating routes expect JSON bodies and session cookies / email headers as used by the client.
- Admin routes typically require an authenticated admin session (see `docs/ADMIN_GOOGLE.md`).
- Payment setup: `docs/RAZORPAY_SETUP.md`
- Certificates: `docs/CERTIFICATES.md`
- Google sign-in: `docs/GOOGLE_SIGNIN.md`

_Generated from `app/api/**/route.ts` route handlers._
