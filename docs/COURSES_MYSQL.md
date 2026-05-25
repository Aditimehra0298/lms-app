# Courses in MySQL (`lms_course`)

Catalog content still lives in `data/admin-content.json` for the website.  
Each course also gets a **MySQL row** with a permanent **course ID** for n8n, certificates, and reports.

## Course ID

| Column | Example | Meaning |
|--------|---------|---------|
| `courseIdentificationNumber` | `101` | Permanent ID (starts **101**) |
| `courseCode` | `"101"` | Same number as string (API/n8n) |
| `slug` | `food-safety-masterclass` | URL slug (unique) |
| `id` | cuid | Internal row id |

## When rows are created

- **Admin saves** self-paced courses (Save in Admin workspace) → sync to `lms_course`
- **Certificate request** for a course → ensures course row exists

## API

```http
GET /api/courses/db
GET /api/courses/db?slug=food-safety-masterclass
```

Example:

```json
{
  "ok": true,
  "course": {
    "courseIdentificationNumber": 101,
    "courseCode": "101",
    "slug": "food-safety-masterclass",
    "title": "Food Safety Masterclass"
  }
}
```

## n8n webhook payload

When a certificate is requested, n8n receives:

```json
{
  "course": {
    "courseIdentificationNumber": 101,
    "courseCode": "101",
    "slug": "food-safety-masterclass",
    "title": "..."
  },
  "registration": { "identificationNumber": 101, "registrationCode": "101", ... }
}
```

## Workbench

```sql
USE sft_lms;

SELECT courseIdentificationNumber, slug, title, published
FROM lms_course
ORDER BY courseIdentificationNumber;
```

## Apply schema

```powershell
npx.cmd prisma db push
npm.cmd run db:generate
```
