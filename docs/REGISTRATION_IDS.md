# Registration IDs (MySQL) — not certificates

## Purpose

When a user **registers**, the LMS assigns a **permanent unique identification number** in MySQL.  
This is for **accounts**, not for certificate PDFs. **Certificates** can be built in **n8n** using these IDs.

## What is stored in MySQL

| Account type | Table | Column | Example value |
|--------------|-------|--------|---------------|
| Individual | `lms_user` | `identificationNumber` (INT, unique) | `101`, `102`, `103` |
| Organisation | `lms_organization` | `identificationNumber` (INT, unique) | `101`, `102`, `103` |

**Month and year at signup** are stored automatically (today’s date when the user registers):

| Column | Example | Meaning |
|--------|---------|---------|
| `registrationMonth` | `5` | Month number 1–12 (May) |
| `registrationYear` | `2026` | Full year |
| `registrationMonthYear` | `05-2026` | Display format MM-YYYY |

These are set **once** on registration and are **not** changed on later logins.

## Display codes (for n8n / UI)

| Type | Code format | Example |
|------|-------------|---------|
| Individual | `{number}` | `101` |
| Organisation | `{number}-org` | `101-org` |

Built in code: `lib/registration-ids.ts`

## When IDs are assigned

- **Individual:** on registration → `ensureUserIdentificationNumber` → `lms_user.identificationNumber`
- **Organisation:** on registration with company name → `ensureOrganizationProfile` → `lms_organization.identificationNumber`

First ID is always **101**, then **102**, **103**, …

## API for n8n

After registration, read the profile from:

```http
POST /api/auth/record
```

Response includes (when DB save succeeded):

```json
{
  "profile": {
    "identificationNumber": 101,
    "registrationCode": "101",
    "registrationMonth": 5,
    "registrationYear": 2026,
    "registrationMonthYear": "05-2026",
    "accountType": "individual"
  }
}
```

Organisation example:

```json
{
  "profile": {
    "identificationNumber": 101,
    "registrationCode": "101-org",
    "accountType": "organisation",
    "organizationId": "clx..."
  }
}
```

Lookup by email:

```http
GET /api/registration/lookup?email=user@company.com
```

## Workbench queries

```sql
USE sft_lms;

SELECT email, identificationNumber FROM lms_user
WHERE identificationNumber IS NOT NULL
ORDER BY identificationNumber;

SELECT identificationNumber, companyName, workEmail FROM lms_organization
ORDER BY identificationNumber;
```

## Certificates (n8n)

Use `registrationCode` or `identificationNumber` from MySQL as input to your n8n workflow.  
The LMS does not require a fixed certificate number format for n8n.
