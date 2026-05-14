# Where data is stored and how the app connects (for review)

This LMS uses **(1) a JSON file on the server**, **(2) browser `localStorage`**, and **(3) optional MySQL** via Prisma when `DATABASE_URL` is set. Use this doc for a quick review of all three.

---

## High-level picture

```text
┌─────────────────────────────────────────────────────────────────┐
│  Browser (each user’s machine)                                   │
│  • localStorage → cart, login flag, purchases, progress, theme   │
│  • Not shared between users or devices                           │
└───────────────────────────────┬─────────────────────────────────┘
                                │ HTTP (fetch)
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  Next.js server (Node)                                           │
│  • API routes read/write JSON on disk                            │
│  • File: data/admin-content.json                                 │
│  • Code: lib/server/content-store.ts                             │
│  • Optional: MySQL via Prisma (lib/prisma.ts, DATABASE_URL)      │
└─────────────────────────────────────────────────────────────────┘
```

**MySQL:** see **`docs/MYSQL_WORKBENCH.md`**, **`prisma/schema.prisma`**, and **`GET /api/health/mysql`**. Connection template: **`.env.example`**.  
**Senior walkthrough (queries + what to show):** **`docs/SENIOR_DEMO_DATABASE_STEPS.md`**.

---

## 1. Server-side “database” (shared content)

| Item | Location |
|------|----------|
| **Physical file** | `data/admin-content.json` (under project root, next to `app/`) |
| **Read / write code** | `lib/server/content-store.ts` — `readAdminContent()`, `writeAdminContent()` |
| **First run** | If the file is missing, it is **created** with defaults from `lib/content-schema.ts` |

**Who uses it**

- Admin UI saves through **`PUT /api/admin/content`** (`app/api/admin/content/route.ts`).
- Public pages and APIs load through **`readAdminContent()`** (e.g. courses catalog, tutor-led programs, categories — see `lib/server/course-catalog.ts`, `lib/server/tutor-led-catalog.ts`, `app/api/categories/route.ts`).

**Connection model:** direct **filesystem** read/write on the machine running `next dev` / `next start` — not a network database.

---

## 2. Client-side storage (per browser)

Stored with `window.localStorage` (keys used in this repo):

| Key | Purpose |
|-----|---------|
| `sft_logged_in` | `"true"` when user signed in (demo) |
| `sft_learner_email` | Email used for demo enrollment log |
| `sft_user_role` | `"admin"` or `"learner"` |
| `sft_cart` | Shopping cart line items (JSON) |
| `sft_purchased_courses` | Purchased courses after checkout (JSON) |
| `sft_course_enrollments` | Append-only enrollment rows (see `lib/enrollment-storage.ts`) |
| `sft_theme` | Light / dark preference |
| `sft_completed_modules_{slug}` | Per-course module completion (exam / learning page) |
| `sft_module_exam_scores_{slug}` | Exam scores map per course |

**Connection model:** no server; data stays **in that browser only**.

---

## 3. API routes that touch server storage

| Route | Role |
|-------|------|
| `GET/PUT /api/admin/content` | Read/write **`data/admin-content.json`** |
| `GET /api/courses`, `GET /api/courses/[slug]` | Built from **`readAdminContent()`** + managed courses |
| `GET /api/categories` | Categories from **admin JSON** |
| `GET /api/health/mysql` | Smoke test **Prisma → MySQL** (`DATABASE_URL` required) |

Prisma reads **`DATABASE_URL`** from the environment; there is **no** embedded password in the repo.

---

## 4. MySQL (Prisma) — tables live in repo

| Item | Location |
|------|----------|
| Table definitions | `prisma/schema.prisma` |
| Initial migration SQL (paste in Workbench or `db:migrate`) | `prisma/migrations/20260214180000_init_lms_tables/migration.sql` |
| App client | `lib/prisma.ts` |

Full Workbench + CLI steps: **`docs/MYSQL_WORKBENCH.md`**.

---

## 5. Quick file pointers for a code walk

1. **Server JSON store:** `lib/server/content-store.ts` (path constant `data/admin-content.json`).
2. **Admin API:** `app/api/admin/content/route.ts`.
3. **Checkout → purchases in browser:** `app/checkout/page.tsx` (`sft_purchased_courses`).
4. **Enrollment helper:** `lib/enrollment-storage.ts`.
5. **MySQL / Prisma:** `prisma/schema.prisma`, `lib/prisma.ts`, `app/api/health/mysql/route.ts`.
