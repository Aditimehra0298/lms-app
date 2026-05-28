# Certificate PDF & transcript — study guide (read this first)

This document matches your **actual sample designs** (Certificate of Attainment + Program Transcript + badge).  
**Study this before n8n or further LMS work.**

Samples in repo (for reference):

- Certificate page: `storage/private/admin/1779899374591-ztfljbwm-advanced_food_fraud.pdf_1_-1.png`
- Transcript page: `storage/private/admin/1779899521541-f48bqfg4-advanced_food_fraud.pdf_1_-2.png`
- Badge: `storage/private/admin/1779899404760-352cefqq-Copy_of_badge_-_iso_45001_lv.png`

---

## How the system works (simple)

| Upload | Where | How often |
|--------|--------|-----------|
| Certificate background (PDF/image) | Admin → **Certificates** | Once for all courses |
| Transcript layout (PDF/image) | Admin → **Certificates** | Once for all courses |
| Badge image | Admin → **Certificates** | **Same file for every learner and every course** |
| Turn certificates on | Self-paced course → **Certificates** tab | Per course |

**n8n** (or your PDF tool) receives **keys + values** and places text on the fixed design.  
The LMS does not edit the artwork — only sends the data below.

---

## Document 1 — Certificate PDF (`certificateFields`)

### Fixed on the design (never change per learner)

| Area on sample | Notes |
|----------------|--------|
| Red left border, SFT header, tree logo | Branding |
| Title “CERTIFICATE OF ATTAINMENT” | Static text |
| “This is to certify that” | Static text |
| “has attended and successfully completed…” | Static text |
| Course description **paragraph** (4–5 lines under course title) | **Per course**, not per learner — see below |
| Program Director signature + name | Static (Col SS Khetarpal) |
| Footer accreditation logos (Exemplar, IEB, INARTE, UNESCO) | Static |
| Badge graphic position | Same **badge image** file for everyone |

### Changes per learner / per issue (must be filled)

| # | Label on your sample | LMS / n8n key | Example | Notes |
|---|----------------------|---------------|---------|--------|
| 1 | **CANDIDATE NAME** (large italic) | `certificateFields.candidateName` | `Aditi Sharma` | From registration / profile |
| 2 | **Course title** (bold block) | `certificateFields.courseName` | `ADVANCED FOOD FRAUD MITIGATION…` | Course title from catalog |
| 3 | **Duration** | `certificateFields.duration` | `3 hours` | From course `duration` field |
| 4 | **Mode** | `certificateFields.mode` | `E-Learning, Video-based, Self-paced` | From course format (mapped to label) |
| 5 | **Issue Date** | `certificateFields.issueDate` | `27 May 2026` | Date certificate is issued |
| 6 | **Certificate No.** | `certificateFields.certificateNumber` | `2026-05-101-001/123` | See format below |
| 7 | **Unique Delegate No.** | `certificateFields.delegateNumber` | `123` | SFT registration ID (101, 102…) |
| 8 | **QR code** (top left) | `certificateFields.verifyUrl` *(planned)* | `https://…/certificates/verify?number=…` | Links to public verify page |

### Per course (same for all learners of that course)

| Label on sample | Suggested key | Source |
|-----------------|---------------|--------|
| Course description paragraph (under title) | `certificateFields.courseDescription` *(planned)* | Course marketing / accredited description in admin |

### Certificate number format (agreed)

```
YYYY-MM-{courseId}-{trainingId}/{userId}
```

Example: **`2026-05-101-001/123`**

| Part | Meaning |
|------|---------|
| `2026` | Year issued |
| `05` | Month issued |
| `101` | Course ID (`courseIdentificationNumber` in MySQL) |
| `001` | Training issue # for that course in that month |
| `123` | Learner user ID (`identificationNumber`) |
| `123-org` | Organisation accounts (suffix `-org`) |

---

## Document 2 — Program transcript PDF (`transcriptFields`)

### Fixed on the design

| Area on sample | Notes |
|----------------|--------|
| Top accreditation logos row | Static |
| “PROGRAM TRANSCRIPT” title | Static |
| Intro line template (“This transcript outlines the curriculum…”) | Wording fixed; **program name inside** changes |
| **Course curriculum** table (modules + descriptions) | **Per course** — same for every learner who took that course |
| **Course completion requirements** (8 bullets) | **Per course** — same for every learner |
| Footer note about Certificate of Attainment | Static |
| Program Director signature block | Static |

### Changes per learner / per issue

| # | Label on your sample | LMS / n8n key | Example | Notes |
|---|----------------------|---------------|---------|--------|
| 1 | **Name :** | `transcriptFields.candidateName` | `Aditi Sharma` | Same as certificate name |
| 2 | **Overall Grade:** | `transcriptFields.grade` | `85%` or `A` | From final exam score (format TBD) |
| 3 | **Training Program :** | `transcriptFields.trainingProgram` | Same as course title | |
| 4 | **Certificate Number** (footer left) | `transcriptFields.certificateNumber` | `2026-05-101-001/123` | **Same** as certificate |
| 5 | **Issue Date** (footer centre) | `transcriptFields.issueDate` | `27 May 2026` | **Same** as certificate |
| 6 | **Unique Delegate No.** *(if you add to transcript)* | `transcriptFields.delegateNumber` | `123` | Same as certificate |

### Per course (not per learner — inject once per course in n8n)

| Area on sample | Suggested key | Source |
|----------------|---------------|--------|
| Curriculum table rows | `transcriptFields.curriculumRows` *(planned)* | Course modules from admin curriculum |
| Completion requirements bullets | `transcriptFields.completionRequirements` *(planned)* | Course certification rules text in admin |
| Intro paragraph (program + standards) | `transcriptFields.programIntro` *(planned)* | Built from course title + standards |

---

## Document 3 — Badge image (`assets.badge`)

Your sample badge includes course-specific wording (“FSSC 22000 V6”, “LEAD VERIFIER”).  
You said the **badge file stays the same for all users**.

| Approach | When to use |
|----------|-------------|
| **One global badge** (current plan) | Same PNG for every course — use a **generic** SFT badge without course-specific lines |
| **Different badge per course family** (later) | Only if you upload different badges per program — not in v1 |

**Fixed:** border, “SUSTAINABLE FUTURES TRAININGS”, tree logo, IEB / Exemplar seals (on your artwork).  
**Not filled by code in v1** if you use one static PNG.

---

## What the LMS sends today (already implemented)

```json
{
  "assets": {
    "certificateTemplate": "…",
    "badge": "…",
    "transcriptTemplate": "…"
  },
  "certificateFields": {
    "candidateName": "",
    "courseName": "",
    "duration": "",
    "mode": "",
    "issueDate": "",
    "certificateNumber": "",
    "delegateNumber": ""
  },
  "transcriptFields": {
    "candidateName": "",
    "trainingProgram": "",
    "grade": "",
    "certificateNumber": "",
    "issueDate": "",
    "delegateNumber": ""
  }
}
```

---

## What we still need to add (next phase — after you confirm this map)

| Item | Document | Why |
|------|----------|-----|
| `verifyUrl` / QR payload | Certificate | QR on sample |
| `courseDescription` | Certificate | Paragraph under course title |
| Letter grade (`A`, `B`…) vs `%` | Transcript | Sample shows “Overall Grade: A” |
| `curriculumRows[]` | Transcript | Module table |
| `completionRequirements[]` | Transcript | Bullet list |
| `programIntro` | Transcript | First paragraph |

---

## Checklist before building n8n PDF steps

- [ ] Confirm certificate number format: `YYYY-MM-courseId-trainingId/userId`
- [ ] Confirm delegate number = learner registration ID (101, 102…)
- [ ] Confirm grade on transcript: **percent** (`85%`) or **letter** (`A`)
- [ ] Confirm mode text: e.g. `E-Learning, Video-based, Self-paced` for all self-paced courses
- [ ] Decide: one **generic** badge for all courses, or course-specific badges later
- [ ] Mark on sample **where** each dynamic line sits (X/Y) in n8n or Canva — optional but helps

When this study doc is approved, next step is: extend LMS payload + n8n workflow to place each key on your PDF.
