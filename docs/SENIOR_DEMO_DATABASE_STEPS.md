# Senior demo: database setup, storage, and queries

Use this as a **script** for a 10–15 minute walkthrough. Your senior will see: **where tables live**, **how SQL stores rows**, and **how that differs from JSON + browser storage** in this app.

---

## Before the meeting (do this once)

| Step | Action |
|------|--------|
| 1 | **MySQL Server** is running (Windows Service, XAMPP, or cloud). |
| 2 | **MySQL Workbench** opens and connects to that server. |
| 3 | In Workbench, run **`CREATE DATABASE sft_lms`** (full SQL is in **`docs/MYSQL_WORKBENCH.md`** Part A, Step 3). |
| 4 | In the project folder: **`npm install`**. |
| 5 | Copy **`.env.example`** → **`.env.local`**, set **`DATABASE_URL`** to your `sft_lms` database (see **`docs/MYSQL_WORKBENCH.md`**). |
| 6 | Run **`npm run db:migrate`** (or paste **`prisma/migrations/20260214180000_init_lms_tables/migration.sql`** in Workbench). |
| 7 | Run **`npm run dev`**, confirm **`http://localhost:3000/api/health/mysql`** returns **`"ok": true`**. |

If any step fails, fix it before the demo using **`docs/MYSQL_WORKBENCH.md`** → Troubleshooting.

---

## During the demo (what to say and click)

### 1) “This is the schema in code” (1 minute)

In **Cursor / VS Code**, open:

- **`prisma/schema.prisma`**

Say: *“Tables and columns are defined here. Prisma turns this into SQL migrations and a type-safe client.”*

Point to **`LmsUser`** and **`LmsPurchase`** → these become MySQL tables **`lms_user`** and **`lms_purchase`**.

---

### 2) “This is the SQL that created the tables” (1 minute)

Open:

- **`prisma/migrations/20260214180000_init_lms_tables/migration.sql`**

Say: *“This is the actual DDL. You can run it in Workbench; Prisma also applied it when we ran migrate.”*

---

### 3) “Here is the live database in MySQL Workbench” (3–4 minutes)

1. Open **MySQL Workbench**, connect, run:

```sql
USE sft_lms;
SHOW TABLES;
```

**Expected:** at least **`lms_user`**, **`lms_purchase`**, and if you used Prisma migrate, **`_prisma_migrations`**.

2. Show structure:

```sql
DESCRIBE lms_user;
DESCRIBE lms_purchase;
```

Say: *“These are the columns; this is how MySQL stores our LMS-related rows.”*

3. Show it is empty (or show current row count):

```sql
SELECT * FROM lms_user;
SELECT * FROM lms_purchase;
```

---

### 4) “Here is data being stored — INSERT + SELECT” (3 minutes)

In Workbench, still with **`USE sft_lms;`**, run:

```sql
INSERT INTO lms_user (id, email, name, role, createdAt)
VALUES (
  'demo-user-1',
  'learner@example.com',
  'Demo Learner',
  'learner',
  NOW(3)
);

INSERT INTO lms_purchase (id, userId, learnerEmail, courseSlug, title, createdAt)
VALUES (
  'demo-purchase-1',
  'demo-user-1',
  'learner@example.com',
  'advanced-cyber-security-professional',
  'Advanced Cyber Security Professional',
  NOW(3)
);
```

Then run:

```sql
SELECT u.email, u.name, p.title, p.courseSlug, p.createdAt
FROM lms_user u
LEFT JOIN lms_purchase p ON p.userId = u.id;
```

Say: *“This is a normal relational query. Rows live on the server; any app with the connection string can read them.”*

---

### 5) “The app can talk to the same database” (1 minute)

In the browser:

- Open **`http://localhost:3000/api/health/mysql`**

Say: *“This route uses Prisma to run `SELECT 1` — it proves the Next.js server reaches MySQL with `DATABASE_URL`.”*

Optional: open **`lib/prisma.ts`** and **`app/api/health/mysql/route.ts`** — *“Here is the connection and the query in code.”*

---

### 6) “Where the rest of the LMS data still lives” (2–3 minutes)

Say clearly:

| Storage | What it holds | How to “show” it |
|---------|----------------|------------------|
| **MySQL** (`sft_lms`) | Demo tables `lms_user`, `lms_purchase` — ready for real users/purchases | Workbench **`SELECT`** (above) |
| **JSON file** on server | Courses, admin content, tutor-led programs | Open **`data/admin-content.json`** in the editor |
| **Browser `localStorage`** | Cart, demo login, purchases in the current UI | Browser **F12 → Application → Local Storage** → your site URL |

Say: *“Today the product mostly uses JSON + localStorage. MySQL is wired for the next step: moving enrollments and users server-side.”*

---

### 7) Optional: Prisma Studio (1 minute)

In a terminal:

```bash
npm run db:studio
```

Say: *“This is a quick GUI on top of the same MySQL tables — good for non-SQL demos.”*

---

## One-page cheat sheet (queries only)

```sql
USE sft_lms;
SHOW TABLES;
DESCRIBE lms_user;
DESCRIBE lms_purchase;
SELECT COUNT(*) FROM lms_user;
SELECT COUNT(*) FROM lms_purchase;
SELECT * FROM lms_user;
SELECT * FROM lms_purchase;
```

---

## Files to have open in tabs (optional)

1. `prisma/schema.prisma`  
2. `prisma/migrations/20260214180000_init_lms_tables/migration.sql`  
3. `lib/prisma.ts`  
4. `app/api/health/mysql/route.ts`  
5. `data/admin-content.json`  
6. `docs/DATA_STORAGE_AND_CONNECTIONS.md`  

---

## Longer setup reference

Full install steps (MySQL service, `.env.local`, migrate vs paste SQL): **`docs/MYSQL_WORKBENCH.md`**.
