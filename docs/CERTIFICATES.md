# Certificates — tech stack & IDs

> **Registration IDs** (permanent user/org numbers starting at 101) are separate — see [`REGISTRATION_IDS.md`](./REGISTRATION_IDS.md).  
> You can issue certificate PDFs via **n8n** using `registrationCode` from `/api/registration/lookup`.

## Recommended technology (this project)

| Layer | Choice | Why |
|--------|--------|-----|
| **Storage** | MySQL (`LmsCertificate`, `LmsUser.identificationNumber`, `LmsOrganization`) | One row per issued certificate; verify by number |
| **Template** | JPG/PNG in `public/certificates/` + HTML overlay | Matches your HACCP design; easy to tune text position in admin |
| **PDF download** | Browser **Print → Save as PDF** (phase 1) | No extra server deps; works today |
| **PDF server-side** (phase 2) | **pdf-lib** on fixed PDF, or **Puppeteer** HTML→PDF | Use when you need automated email attachments |
| **Badge** | Separate PNG URL on certificate row | Optional image top-right on certificate |
| **Extra docs** | JSON list of `{ title, url }` | Transcripts, annexes linked under certificate |

**Not recommended for v1:** Blockchain (complex); manual Photoshop per learner (does not scale).

## ID format

- **Learner identification ID** (permanent): `101`, `102`, `103`… assigned at registration (starts at **101**).
- **Organisation identification ID** (MySQL table `lms_organization`, starts at **101**): same numbering sequence, separate table.
- **Individual certificate number**: `{learnerId}/{MM-YYYY}/{sequence}` — e.g. `101/05-2026/001`
- **Organisation certificate number**: `{orgId}-org/{MM-YYYY}/{sequence}` — e.g. `101-org/05-2026/001`

Organisation accounts get a row in `lms_organization` when they register with account type **Organisation** and a company name.

## Admin setup

1. **Admin → Self-paced courses → Certificates**
2. Upload template to `public/certificates/` (e.g. `haccp-certificate-template.jpg`)
3. Set text position % (name, number, date)
4. Add optional badge URL and supplementary documents
5. **Core Section** — set final exam pass %

## Issue a certificate (API)

```http
POST /api/certificates/issue
Content-Type: application/json

{
  "learnerEmail": "learner@example.com",
  "learnerName": "Jane Doe",
  "courseSlug": "food-safety-masterclass",
  "scorePercent": 85
}
```

## Learner UI

- **My Learning → Certificates** — list and download
- **`/my-learning/certificates/[id]`** — print/PDF
- **`/certificates/verify?number=101/05-2026/001`** — public verification (also accepts `101-org/05-2026/001`)

## Database

```bash
npm run db:push
npm run db:generate
```

Restart `npm run dev` after schema changes.

### MySQL Workbench — organisation table

Run `prisma/migrations/organization_identification/migration.sql` or use `db:push`.

| Column | Description |
|--------|-------------|
| `identificationNumber` | Permanent org ID from **101** |
| `companyName` | Display name on certificate |
| `workEmail` | Unique login email |
| `personalEmail`, `industryType`, `companySize` | Profile fields |

Admin API: `GET /api/admin/organizations` — lists all organisation rows.
