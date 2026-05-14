# From 0 to full: MySQL Workbench + this LMS (every step)

Do the steps **in order**. Step numbers run **0 → 14** so you can follow one list from nothing to a working connection.

---

## Workbench first, then the database, then the app

**Yes — you connect in MySQL Workbench first.**

| Order | Where | What it is |
|------:|-------|------------|
| **1** | **MySQL Workbench** | **Connection** = how you log into the **MySQL Server** (host `127.0.0.1`, port `3306`, user `root`, password). That is **Step 2**. You are connecting to the **engine**, not “creating the LMS app database” yet. |
| **2** | **MySQL Workbench** (still, after you are connected) | **Create the database** `sft_lms` with SQL — **Step 4**. That is the empty schema where tables will go. |
| **3** | **This LMS project** | **`.env.local`** tells the Next.js app how to log into the **same** server and use the **same** database name. Prisma migrations then create the **tables** inside `sft_lms`. |

The **project does not create** your Workbench connection. Workbench is for **you** (run SQL, refresh schemas, check data). The app and Workbench are **two separate clients** talking to one server — both need correct host, user, password, and database name.

---

## Step 0 — What you must have installed

| You need | Why |
|----------|-----|
| **MySQL Server** (the database engine) | **MySQL Workbench is only a tool** to talk to the server. If you installed **only** Workbench, install **MySQL Server** too (from mysql.com installer, or **XAMPP/WAMP** includes MySQL). |
| **Node.js LTS** | For `npm install` and the Next.js app. |
| This **LMS project** folder on your PC | Unzipped / cloned so you see `package.json`. |

**Check MySQL is running (Windows):** press `Win + R`, type `services.msc`, find **MySQL** or **MySQL80**, status should be **Running**.

---

## Step 1 — Open MySQL Workbench

1. Press the **Windows** key and type **`MySQL Workbench`**.  
2. Open **MySQL Workbench**.  
3. You should see the **home** screen. Under **MySQL Connections** you may see a tile such as **Local instance MySQL80** or **Local instance MySQL…**.

---

## Step 2 — Connect to your MySQL server (how to “log in”)

This step only checks that **Workbench can reach your MySQL Server**. You are **not** choosing the LMS database here yet — that comes in **Step 4**.

### Way A — You already have a connection tile (most common)

1. On the **home** screen, find **MySQL Connections**.  
2. **Single‑click** or **double‑click** the tile (for example **Local instance MySQL80**).  
3. A small window **“Connect to MySQL Server”** may open and ask for **Password**.  
   - Type the **root** password for your MySQL Server (the one from installation or **MySQL Installer → Reconfigure**).  
   - **XAMPP** with no password: leave the password **blank** and click **OK**.  
4. Optional: tick **“Save password in vault”** if you do not want to type it every time (only on your own PC).  
5. Click **OK**.

**Success:** a big window opens with a **menu bar**, **left sidebar** (Navigator / Schemas), and a **SQL** area — you are “inside” the server.

### Way B — No tile, or you want a new connection

1. On the **home** screen, next to **MySQL Connections**, click the **+** icon (**Setup New Connection**).  
2. Fill in:

| Field | Typical value for a PC install |
|-------|--------------------------------|
| **Connection Name** | Anything you like, e.g. `Local MySQL` |
| **Hostname** | `127.0.0.1` |
| **Port** | `3306` (change only if you know your server uses another port) |
| **Username** | `root` |
| **Password** | Click **Store in Vault…** and type your MySQL **root** password (or leave empty for XAMPP with no password). |

3. Click **Test Connection**. If it says **Successfully made the MySQL connection**, click **OK** to close the test dialog.  
4. Click **OK** at the bottom to **save** the connection.  
5. On the home screen, **double‑click** your new tile to open it.

### If it does not connect

- **Cannot Connect / Access denied:** wrong user/password, or user not allowed from this host → use the **MySQL password** section below, or reset password via **MySQL Installer → Reconfigure**.  
- **Failed to connect / Can’t reach server:** MySQL service not running → **Step 0** (`services.msc`, start **MySQL** / **MySQL80**).  
- **Wrong port:** XAMPP or a second install may use **3307** (or another). Put that port in the connection and later in **`DATABASE_URL`**.

---

## MySQL password — set it, find it, or use “no password” (read this if you never set one)

The **password belongs to the MySQL Server user** (usually **`root`**), not to Workbench. Workbench only asks for whatever the server expects.

### Case A — You installed **MySQL** from **mysql.com** (Windows Installer)

1. During installation there was a screen **Accounts and Roles** (or similar) where you typed **MySQL Root Password**.  
2. **That same password** is what you use when Workbench asks for a password, and what goes in **`DATABASE_URL`** after `root:`

If you truly **never** set one: run **MySQL Installer** again → **Reconfigure** your server → set a **new root password** you will remember (see Case B).

### Case B — **Reconfigure** and set a new root password (Windows, recommended if you forgot)

1. Open **MySQL Installer** from the Start menu (search “MySQL Installer”).  
2. Under **MySQL Server**, click **Reconfigure** (not only Workbench).  
3. Click **Next** through the wizard until you see **Authentication** / **Accounts and Roles**.  
4. Set **Root password** to something you will remember (example: `LmsDemo2026!` — use your own).  
5. Finish the wizard and **restart** the MySQL service if the installer asks.

Then in **`.env.local`** (see Step 8):

```env
DATABASE_URL="mysql://root:LmsDemo2026!@127.0.0.1:3306/sft_lms"
```

(Replace `LmsDemo2026!` with **your** password. If the password has `@`, `#`, etc., see **Special characters** below.)

### Case C — **XAMPP** (or similar) — often **no password** for `root`

Many XAMPP installs use user **`root`** with an **empty** password.

In **`.env.local`** use — note **`root:`** then **nothing** then **`@`** (empty password):

```env
DATABASE_URL="mysql://root:@127.0.0.1:3306/sft_lms"
```

If XAMPP MySQL uses another port (e.g. **3307**), change it: `127.0.0.1:3307`.

### Case D — Password has special characters (`@`, `#`, `%`, space)

Put the password in the URL using **percent-encoding**, or use a simpler password until everything works.

Examples:

| Real password | In URL after `root:` |
|---------------|----------------------|
| `pass@word` | `pass%40word` |
| `p#1` | `p%231` |

### Quick test in Workbench

After you know the password: **Step 2** should connect. If it connects, your **`DATABASE_URL`** uses the **same** user and password.

---

## Step 3 — Open a SQL tab

After a successful connection you should see:

- A **menu bar** at the top  
- A **left sidebar** (Navigator / Schemas)  
- A big **SQL editor** area (white or dark) with a tab like **“Query 1”**

If you do not see a query tab: menu **File → New Query Tab**, or click the **SQL +** icon.

---

## Step 4 — Create the LMS database

1. Click inside the **SQL editor**.  
2. **Paste** this whole block:

```sql
CREATE DATABASE IF NOT EXISTS sft_lms
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE sft_lms;
```

3. Run it: click the **lightning bolt** icon (**Execute**), or press **`Ctrl + Enter`** (Windows).

**Success:** the **Output** panel at the bottom shows no red errors.

---

## Step 5 — Confirm the database appears

1. On the **left**, find **Schemas** (you may need to expand **Navigator**).  
2. Click the **refresh** icon (two circular arrows) next to **Schemas**.  
3. You should see a schema named **`sft_lms`**.

You now have an **empty** database. **Tables are not there yet** until Step 10 or 11.

---

## Step 6 — Open the LMS project in Cursor (or VS Code)

1. **File → Open Folder** → choose the folder that contains **`package.json`** (your `lms-app-main` root).  
2. Open a terminal in that folder: **Terminal → New Terminal** (or `` Ctrl+` ``).

---

## Step 7 — Install project dependencies

In the terminal, run:

```bash
npm install
```

Wait until it finishes (no errors). This installs **Prisma** and runs **`prisma generate`**.

---

## Step 8 — Tell the app how to log in to MySQL

1. In the project root, copy the file **`.env.example`**.  
2. Rename the copy to **`.env.local`** (exact name).  
3. Open **`.env.local`** in the editor.  
4. Add this line to **`.env.local`**. Pick **one** format:

**You set a password (normal case):**

```env
DATABASE_URL="mysql://root:YOUR_PASSWORD_HERE@127.0.0.1:3306/sft_lms"
```

**Empty password (common XAMPP):**

```env
DATABASE_URL="mysql://root:@127.0.0.1:3306/sft_lms"
```

Replace **`root`** if your MySQL username is different. Replace **`3306`** if your port is different. Database name **`sft_lms`** must match **Step 4**.

5. Rules:

- No spaces around `=`.  
- Special characters in the password → **URL-encode** them (see **MySQL password** section above).  

6. **Save** the file.

---

## Step 9 — Create the tables (pick **ONE** way)

### Way A — From the terminal (recommended)

In the same project folder:

```bash
npm run db:migrate
```

- If Prisma asks for a **migration name**, type **`init`** and press Enter.  
- If it says migrations are already applied, that is OK.

### Way B — Only inside Workbench

1. In Cursor, open: **`prisma/migrations/20260214180000_init_lms_tables/migration.sql`**.  
2. **Select all** → Copy.  
3. In **Workbench**, in a query tab, run **`USE sft_lms;`** then paste the file contents → **Execute**.

---

## Step 10 — Confirm tables in Workbench

In Workbench, run:

```sql
USE sft_lms;
SHOW TABLES;
```

You should see at least:

- **`lms_user`**  
- **`lms_purchase`**  
- **`_prisma_migrations`** (only if you used **Way A** in Step 9)

---

## Step 11 — Run a simple read query (prove “query + storage”)

Still in Workbench:

```sql
USE sft_lms;
DESCRIBE lms_user;
SELECT COUNT(*) AS how_many_users FROM lms_user;
SELECT * FROM lms_user;
```

Right after setup, **`how_many_users`** is usually **0** — the table exists and is empty until you insert data.

---

## Step 12 — Start the Next.js app

In the project terminal:

```bash
npm run dev
```

Wait until you see **Ready** and a URL like **`http://localhost:3000`**.

---

## Step 13 — Test that the website can reach MySQL

1. Open **Chrome / Edge**.  
2. Go to:

```text
http://localhost:3000/api/health/mysql
```

3. You should see JSON with **`"ok": true`**.

If you see **`ok": false`**: fix **`.env.local`**, save, **stop** the terminal (`Ctrl+C`) and run **`npm run dev`** again, then reload the URL.

---

## Step 14 — Optional: insert demo rows and query them

In **Workbench**, run:

```sql
USE sft_lms;

INSERT INTO lms_user (id, email, name, role, createdAt)
VALUES ('demo-1', 'learner@example.com', 'Demo Learner', 'learner', NOW(3));

INSERT INTO lms_purchase (id, userId, learnerEmail, courseSlug, title, createdAt)
VALUES ('pur-1', 'demo-1', 'learner@example.com', 'demo-course', 'Demo Course', NOW(3));

SELECT u.email, p.title FROM lms_user u
JOIN lms_purchase p ON p.userId = u.id;
```

You should see **one row** — good demo for a senior that data **stores** in MySQL and **queries** return it.

---

## Troubleshooting (short)

| Symptom | Fix |
|---------|-----|
| Workbench cannot connect | Start **MySQL** service; check password. |
| `Unknown database 'sft_lms'` | Repeat **Step 4** in Workbench. |
| `Access denied` in browser / Prisma | Fix user/password in **`.env.local`**. |
| `npm` not found | Install **Node.js LTS**, restart terminal. |
| `/api/health/mysql` 503 after fixing env | Restart **`npm run dev`**. |

---

## Files your senior may want to see

| Topic | Path |
|-------|------|
| Table design in code | `prisma/schema.prisma` |
| SQL that creates tables | `prisma/migrations/20260214180000_init_lms_tables/migration.sql` |
| App connection helper | `lib/prisma.ts` |
| HTTP test route | `app/api/health/mysql/route.ts` |
| Where catalog still lives (not MySQL yet) | `data/admin-content.json` |
| Full senior demo script | `docs/SENIOR_DEMO_DATABASE_STEPS.md` |

---

## Remember

- **Workbench** = window into the server; it does **not** auto-create **`sft_lms`** when you open it.  
- **You** create **`sft_lms`** once (**Step 4**).  
- **Project** creates **tables** (**Step 9**).  
- **Queries** = anything you run in the Workbench SQL tab (**Steps 11–14**).
