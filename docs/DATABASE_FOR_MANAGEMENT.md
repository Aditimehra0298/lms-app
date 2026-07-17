# Database FAQ for management (MySQL & phpMyAdmin)

Use this page when a manager, client, or auditor asks **how learner data is stored** and **whether phpMyAdmin is required**.

---

## Short answers (say these first)

| Question | Answer |
|----------|--------|
| **What database do we use?** | **MySQL** — industry-standard relational database. |
| **Do we need phpMyAdmin?** | **No.** phpMyAdmin is only an optional browser tool. The LMS does **not** depend on it. |
| **Can we install it for safety only?** | **Yes.** You may install phpMyAdmin (or Workbench) **only for backups, checks, and emergencies**. It does not change how the LMS runs. |
| **How does the website use the database?** | The Next.js app connects to MySQL with **Prisma** using `DATABASE_URL` in the server environment. Learners never see database passwords. |
| **How do we look at data without phpMyAdmin?** | **Prisma Studio** (`npm run db:studio`), **MySQL Workbench**, DBeaver, TablePlus, or the MySQL command line — any of these is enough. |
| **Is XAMPP / phpMyAdmin mandatory?** | **No.** XAMPP is one way to run MySQL on a developer PC. Production usually uses a managed MySQL service or a server install **without** phpMyAdmin. |

---

## What MySQL stores in this LMS

Typical learner / business data (when `DATABASE_URL` is set):

- User accounts and roles  
- Organisations and team access  
- Purchases / payments records  
- Certificates  
- Related LMS tables defined in `prisma/schema.prisma`

Website course *content* (pages, catalogs) may also use JSON files on the server — see `docs/DATA_STORAGE_AND_CONNECTIONS.md`.

---

## Why phpMyAdmin is optional

```text
┌──────────────────┐     ┌─────────────────┐     ┌──────────────────┐
│  LMS website     │────▶│  MySQL Server   │◀────│  Optional tools  │
│  (Prisma / Node) │     │  (the database) │     │  Workbench /     │
│  REQUIRED        │     │  REQUIRED       │     │  Prisma Studio /  │
└──────────────────┘     └─────────────────┘     │  phpMyAdmin       │
                                                 │  OPTIONAL         │
                                                 └──────────────────┘
```

- **MySQL Server** = the actual database (required).  
- **phpMyAdmin** = a PHP website for clicking through tables (optional).  
- Our app is **Node/Next.js**, not PHP — so phpMyAdmin is never part of the product stack.

---

## Optional setup for safety purposes only

You **may** install phpMyAdmin (or prefer MySQL Workbench) **only as a safety / operations tool**. That is a good practice and does **not** mean the LMS needs it.

| Safety use | What you do | Does the LMS need it? |
|------------|-------------|------------------------|
| **Emergency view** | Open tables if something looks wrong in Admin | No |
| **Backup check** | Confirm data exists before/after a backup | No |
| **Support** | Let a trusted admin inspect a row (user, payment) | No |
| **Recovery** | Help a DBA restore from backup | No |

### Safety rules if you do install it

1. **Do not expose it publicly** — localhost, VPN, or IP allow-list only.  
2. **Strong password** — never the same as the LMS admin password.  
3. **Limited accounts** — prefer a MySQL user with read-only access for day-to-day checks; use full access only for recovery.  
4. **Prefer Workbench / Prisma Studio** on a trusted PC when possible (same safety goal, often safer than a web UI).  
5. **Never put phpMyAdmin on the public LMS domain** as an open path like `/phpmyadmin` without protection.

### One sentence for your boss

> We can keep phpMyAdmin (or Workbench) **only for safety and backups**; the live LMS does not depend on it and will keep working if that tool is turned off.

---

## Steps: set up phpMyAdmin for safety only (Windows)

Do this **after** MySQL is already working for the LMS (`DATABASE_URL` + `npm run db:push`).

### Path A — XAMPP (easiest on a local PC)

1. **Install XAMPP** from [https://www.apachefriends.org](https://www.apachefriends.org) (if you do not have it).  
2. Open **XAMPP Control Panel**.  
3. Start **Apache** and **MySQL** (both must show green / running).  
4. In a browser open: `http://localhost/phpmyadmin`  
5. Log in:
   - **Username:** `root`  
   - **Password:** usually **blank** on fresh XAMPP (or the MySQL root password you set)  
6. In the left sidebar, open your LMS database (often `sft_lms`).  
7. **Safety check:** you should see tables (users, payments, etc.). Do **not** delete or edit rows unless a DBA asked you to.  
8. **Lock it down:** only use this on your own PC (`localhost`). Do not publish `/phpmyadmin` on the live LMS website.  
9. **Optional password:** in phpMyAdmin → User accounts → set a password for `root` (or create a read-only user). Then update LMS `.env.local` `DATABASE_URL` to match.  
10. **Export backup (safety):** select database → **Export** → **Go** → save the `.sql` file somewhere safe (Drive / USB / backup folder).

### Path B — MySQL already installed (no XAMPP)

1. Confirm MySQL is running (`Win + R` → `services.msc` → start **MySQL** / **MySQL80**).  
2. Download phpMyAdmin from [https://www.phpmyadmin.net](https://www.phpmyadmin.net) **or** use **MySQL Workbench** instead (often simpler): see `docs/MYSQL_WORKBENCH.md`.  
3. If using phpMyAdmin: put it behind local Apache/Nginx, open only on `http://127.0.0.1/...`, never on the public domain.  
4. Connect with the **same** host / user / password / database as in `DATABASE_URL`.  
5. Open the LMS database → **Export** a backup `.sql` file.

### Path C — Safety without phpMyAdmin (recommended for developers)

1. In the LMS project folder, confirm `.env.local` has `DATABASE_URL`.  
2. Run: `npm run db:studio`  
3. Browse tables in Prisma Studio (localhost only).  
4. For file backups, use MySQL Workbench **Data Export** or `mysqldump` (ask your technical team).

### After setup — what to do regularly (safety)

| When | Action |
|------|--------|
| Weekly | Export / backup the LMS database |
| After a big change | Export again before and after |
| If Admin looks wrong | Open phpMyAdmin or Workbench → check the related table → do not guess-delete |
| Production | Prefer host backup tools; keep phpMyAdmin off the public internet |

---

## Recommended tools (pick one)

| Tool | Best for | Notes |
|------|----------|--------|
| **Prisma Studio** | Developers on this project | `npm run db:studio` — matches app tables |
| **MySQL Workbench** | Official Oracle GUI | Step-by-step: `docs/MYSQL_WORKBENCH.md` |
| **DBeaver / TablePlus** | General DB browsing | Free / paid options |
| **phpMyAdmin** | Optional **safety / emergency** browser UI | Install only if you want it; lock it down; not required by the LMS |

---

## What to tell your boss in one paragraph

> Our LMS stores accounts, payments, and certificates in **MySQL**. The application connects to MySQL directly through a secure server setting. **phpMyAdmin is not required** — it is only an optional admin UI some hosting panels include. If we install it, it is **for safety and emergency checks only** (backups, inspection), not for running the LMS. Day-to-day we can use Prisma Studio or MySQL Workbench instead. Production can run on any standard MySQL host without phpMyAdmin.

---

## Quick health check (technical)

1. Confirm MySQL service is running.  
2. Confirm `DATABASE_URL` is set (see `.env.example`).  
3. Run `npm run db:push` (or migrations) so tables exist.  
4. Optional: open `GET /api/health/mysql` or Admin → **Settings** → Database card.  

More detail: `docs/MYSQL_WORKBENCH.md`, `docs/SENIOR_DEMO_DATABASE_STEPS.md`, `docs/DATA_STORAGE_AND_CONNECTIONS.md`.
