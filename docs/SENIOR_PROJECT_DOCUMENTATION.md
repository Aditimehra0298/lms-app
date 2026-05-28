# SF Trainings LMS — Senior Technical Documentation

**Project name:** `sft-app` (SF Trainings Learning Management System)  
**Repository:** https://github.com/Aditimehra0298/lms-app.git  
**Stack:** Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · Prisma · MySQL (optional)  
**Primary brand:** SF Trainings — self-paced and tutor-led professional training (food safety, cyber security, etc.)

This document is a handoff for senior engineering review: technologies used, icon system, user-facing functionality, admin capabilities, APIs, and data architecture.

---

## 1. Executive summary

The application is a **marketing + enrollment + learning** platform:

1. **Public site** — Home, categories, course catalog, tutor-led programs, about page (mostly CMS-driven from admin JSON).
2. **Pre-payment course landing** — Rich marketing page per self-paced course (`/courses/[slug]`) with tabs: Overview, Course Content, Instructor, Reviews, Q&A.
3. **Checkout flow** — Cart → checkout; learners must view the course landing before paying (session gate).
4. **Post-payment learning** — Video player, module curriculum, exams, progress (`/my-learning/course/[slug]`).
5. **Admin panel** — `/admin` for content, self-paced courses, tutor-led programs, Q&A moderation (main admin Google account only).

Content is **hybrid**: shared marketing data in `data/admin-content.json`, learner session/cart/progress in **browser localStorage**, and optional **MySQL** for users, OTP, and purchases via Prisma.

---

## 2. Technology stack

| Layer | Technology | Version (package.json) | Role |
|--------|------------|------------------------|------|
| Framework | **Next.js** (App Router) | 16.2.3 | SSR/SSG, API routes, routing |
| UI library | **React** | 19.2.0 | Components, client state |
| Language | **TypeScript** | 5.9.3 | Type safety across app + lib |
| Styling | **Tailwind CSS** | 4.x | Utility-first layout, dark theme |
| Icons | **Lucide React** | 1.14.x | Consistent SVG icon set |
| ORM | **Prisma** | 6.19.x | MySQL access (`LmsUser`, `LmsPurchase`, `LmsEmailOtp`) |
| Database | **MySQL** | — | Optional; required for auth/OTP persistence |
| Email | **Nodemailer** | 6.10.x | Registration OTP (optional SMTP) |
| Image crop | **react-easy-crop** | 5.5.x | Profile/avatar cropping |
| IDs | **nanoid** / **cuid** | — | Client IDs; Prisma default cuid |
| Lint | **ESLint** + eslint-config-next | 9.x | Code quality |
| Deploy config | **Netlify** | `netlify.toml` | Static/hosting hints |

### Build & dev scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Dev server on port **3000** (webpack) |
| `npm run dev:fresh` | Kill old dev, clear `.next`, restart |
| `npm run build` | Prisma generate + production build |
| `npm run db:push` / `db:migrate` | Apply MySQL schema |
| `npm run env:init` | Create `.env.local` from template |

### Environment variables (see `.env.example`)

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | MySQL connection for Prisma |
| `GOOGLE_CLIENT_ID` / `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Google Sign-In |
| `MAIN_ADMIN_EMAIL` | Only this account may open `/admin` |
| `ADMIN_PASSWORD` | Admin password login (optional) |
| `SMTP_*` / `OTP_USE_SMTP` | Email OTP delivery |
| `ZOOM_*` | Tutor-led Zoom meetings & recordings |

**Security:** `.env.local`, `env`, and secrets are gitignored. Never commit credentials.

---

## 3. High-level architecture

```mermaid
flowchart TB
  subgraph Browser
    LS[localStorage: cart, purchases, progress, session]
    SS[sessionStorage: landing viewed gate]
  end

  subgraph NextJS[Next.js Server]
    Pages[App Router pages]
    API[API Routes /app/api]
    CS[content-store.ts]
    Prisma[Prisma Client]
  end

  subgraph Disk
    JSON[data/admin-content.json]
    QA[data/course-qa.json]
    Uploads[public/uploads/admin]
  end

  subgraph MySQL[(MySQL optional)]
    Users[lms_user]
    Purchases[lms_purchase]
    OTP[lms_email_otp]
  end

  Browser --> Pages
  Browser --> API
  Pages --> CS
  API --> CS
  CS --> JSON
  API --> QA
  API --> Prisma
  Prisma --> MySQL
  Pages --> Uploads
```

### Key design decisions

- **CMS without a headless CMS product:** Marketing and course definitions live in `data/admin-content.json`, edited via Admin UI.
- **Demo-friendly enrollment:** Checkout writes to `localStorage` immediately; MySQL purchase rows are written when DB is available.
- **Fixed UI templates:** Self-paced landing and learning player use **fixed layouts**; copy/images are admin-editable per course.
- **Q&A moderation:** Learner questions/answers stored in `data/course-qa.json` with `pending` / `approved` workflow.

---

## 4. Application routes (user-facing)

| Route | Purpose |
|-------|---------|
| `/` | Marketing home (`LearnlyLanding`) |
| `/courses` | Course catalog |
| `/courses/[slug]` | **Self-paced pre-payment landing** (tabs: overview, curriculum, instructor, reviews, qa) |
| `/courses/category/[category]` | Category-filtered listing |
| `/tutor-led` | Tutor-led program list |
| `/tutor-led/[slug]` | Tutor-led program detail + learner dashboard when enrolled |
| `/cart` | Shopping cart |
| `/checkout` | Payment/checkout (requires landing viewed + login for full flow) |
| `/account` | Login, register, forgot password, Google sign-in |
| `/profile` | Learner profile |
| `/my-learning` | Learner hub (tabs: learning, exams, certificates, calendar) |
| `/my-learning/course/[slug]` | **Post-payment course player** (video + modules) |
| `/my-learning/course/[slug]/exam` | Module/final exams |
| `/my-learning/calendar` | Calendar placeholder |
| `/about` | About page (CMS) |
| `/admin` | Admin dashboard (restricted) |

---

## 5. Core user journeys & functionality

### 5.1 Discovery → enroll (self-paced)

1. User browses `/courses` or category pages.
2. Opens `/courses/[slug]` — sees hero, stats, enroll card, tabbed content.
3. **Enroll / Add to cart** requires login redirect if guest (`/account?redirect=...`).
4. **Checkout gate:** `lib/course-landing.ts` — user must `markCourseLandingViewed(slug)` in sessionStorage before checkout/cart redirect for that course.
5. Checkout merges purchases into `sft_purchased_courses` (localStorage) and optionally `LmsPurchase` in MySQL.

### 5.2 Self-paced landing page (`SelfPacedCourseLanding.tsx`)

| Tab | Component | Content source |
|-----|-----------|----------------|
| Overview | Inline sections | `hero.aboutText`, `overviewSection`, `faqs`, templates in `lib/course-landing-content.ts` |
| Course Content | `SelfPacedCourseCurriculum` | `course.curriculum` or `getCurriculumForCourse()` demo template |
| Instructor | `SelfPacedInstructorSection` | `course.instructorSection` + resolvers |
| Reviews | `SelfPacedReviewsSection` | Sample reviews + `reviewsSection` / `highlights` from admin |
| Q&A | `SelfPacedQASection` | API `/api/courses/[slug]/qa` + `data/course-qa.json` |

**Hero stats bar icons (Lucide):** `Clock`, `MonitorPlay`, `BarChart3`, `FolderKanban`, `Award`, `Infinity`, `Share2` — mapped to duration, lectures, level, projects, certificate, access, shareable.

**“What you’ll learn” grid icons:** Rotating palette — `Shield`, `MonitorPlay`, `ClipboardList`, `FolderKanban`, `Award`, `Users`.

### 5.3 Learning player (`/my-learning/course/[slug]`)

| Feature | Description |
|---------|-------------|
| Video player | HTML5 `<video>`; URL from curriculum item `videoUrl` |
| Certified branding | Overlay badge + SF logo watermark (admin: `learningSection`) |
| Learning Tools | Notes, Captions, PDF, Podcast, Resources, Download — highlights when lesson has content |
| Module sidebar | Expandable curriculum; exams link to exam page |
| Progress | `sft_completed_modules_{slug}` in localStorage |
| Certification rule | 60% overall module exam average (display + local score map) |

### 5.4 Course Q&A (community)

| Step | Actor | Behavior |
|------|-------|----------|
| Ask question | Enrolled logged-in learner | POST → status **pending** |
| Moderate | Main admin | Admin → **Course Q&A** → approve/reject |
| Answer | Enrolled learner | POST → answer **pending** until approved |
| Official answer | Admin | Optional SFT Expert Team reply on approve |

APIs: `GET/POST /api/courses/[slug]/qa`, `POST .../answers`, `GET/PATCH /api/admin/course-qa`.

### 5.5 Tutor-led programs

- Separate catalog: `tutorLedPrograms` in admin JSON.
- Routes under `/tutor-led/[slug]`.
- Zoom integration hooks: `lib/server/zoom-client.ts`, admin create meeting / sync recordings.
- Learner UI: `TutorLedProgramClient`, live session cards, certificate preview.

### 5.6 Authentication

| Method | Implementation |
|--------|----------------|
| Email + password | `/api/auth/login`, `/api/auth/record` (register) |
| Email OTP | `/api/auth/otp/send`, `/api/auth/otp/verify` |
| Google Sign-In | Google Identity Services + `/api/auth/google` |
| Admin | `MAIN_ADMIN_EMAIL` via Google; `ADMIN_PASSWORD` for admin-login route |
| Session (client) | `sft_logged_in`, `sft_learner_email`, `sft_user_role` in localStorage |

Docs: `docs/GOOGLE_SIGNIN.md`, `docs/EMAIL_OTP.md`, `docs/ADMIN_GOOGLE.md`.

### 5.7 Regional pricing

- Geo IP → country → pricing region (`/api/geo/country`, `lib/country-pricing.ts`).
- Cached in localStorage: `sft_pricing_region`, `sft_country_code`.
- `PricingProvider`, `CoursePrice`, `KnowPriceButton`, `SignInToViewPrices`.

---

## 6. Admin panel (`/admin`)

**Access control:** `GET /api/auth/admin-access` — only `MAIN_ADMIN_EMAIL` (Google sign-in) may use the panel.

### 6.1 Menu structure (sidebar)

| Section | Menu items | Status |
|---------|------------|--------|
| — | Dashboard | Demo stats UI |
| Website Management | Home Page, About Page, Courses Page, Contact, FAQ, Testimonials | Home/About/Courses editors **wired** |
| Course Management | Categories, **Self-paced courses**, **Course Q&A**, Lessons, Tutor Led, Workshops, Batches | Self-paced + Q&A + Tutor Led **wired** |
| Users & Access | Users, Roles & Permissions | Placeholder |
| Orders & Payments | Orders, Payments, Invoices, Refunds | Placeholder |
| Other | Settings, Newsletter, Analytics, Reports | Placeholder |

### 6.2 Self-paced course workspace tabs

| Tab | Function |
|-----|----------|
| **Course Info** | Slug, title, subtitle, hero, instructor tab, **before/after payment copy**, FAQs, highlights, category, image |
| **Core Section** | Curriculum builder: modules → lessons (video/reading/exam) |
| **Pricing** | Price, old price, discount display |
| **Settings / SEO / Students / Certificates / Publish** | Partially placeholder |

### 6.3 Curriculum content types (admin icons)

Defined in `AdminCoursesWorkspace.tsx` — each type maps to `CourseCurriculumItem.kind`:

| Admin label | Lucide icon | `kind` | Gradient color |
|-------------|-------------|--------|----------------|
| Video | `Video` | `video` | violet → indigo |
| PDF / Doc | `FileText` | `reading` | rose → orange |
| Quiz | `ClipboardList` | `exam` | emerald → teal |
| Assignment | `FileText` | `reading` | sky → blue |
| Tutor Led | `Mic` | `video` | fuchsia → purple |
| Text | `Type` | `reading` | slate |
| Timer | `Timer` | `reading` | amber → yellow |
| Survey | `BarChart3` | `exam` | cyan → blue |

**File uploads:** `POST /api/admin/upload` → `public/uploads/admin/` (videos, PDFs, images, CSV).

### 6.4 Admin-editable course fields (schema summary)

`ManagedCourse` in `lib/content-schema.ts`:

- **Catalog:** slug, title, subtitle, category, level, duration, rating, learners, price, image, published, `learningFormat`
- **Hero:** background, preview image, stats labels, enroll/wishlist buttons, certificate preview
- **Overview tab:** headings, learn outcomes, what-you-learn grid, requirements
- **Instructor tab:** headline, team image, pillars, expertise, sidebar instructors
- **Reviews / Q&A tab:** marketing copy (sample review cards still templated)
- **Learning player:** logo URL, all button labels, default lesson text, certification message
- **Curriculum:** `CourseCurriculumModule[]` with nested items
- **Final exam:** `CourseFinalExam` (timed, passing %, materials URL)

Editor UI: `components/admin/AdminSelfPacedPageContentEditor.tsx` (before/after payment blocks).

---

## 7. Icon system (Lucide React)

**Library:** [Lucide](https://lucide.dev/) via `lucide-react` — stroke icons, consistent 24px grid, used as React components.

**Dynamic icons:** `lib/lucide-icon-resolve.ts` resolves string names from CMS JSON (home/about/category pages) to Lucide components, with fallback `ScrollText`.

### 7.1 Icons by feature area

#### Global chrome (`SiteHeader`, `SiteFooter`)

| Icon | Usage |
|------|--------|
| `Menu`, `X` | Mobile navigation |
| `Search` | Search affordance |
| `ShoppingCart` | Cart + badge count |
| `Bell` | Notifications placeholder |
| `Sun`, `Moon` | Theme toggle |
| `Globe` | Language selector |
| `LogOut` | Sign out |

#### Self-paced landing hero & tabs

| Icon | Usage |
|------|--------|
| `Play` | Preview course / video CTA |
| `Star` | Ratings |
| `Users` | Students enrolled |
| `Globe`, `Captions` | Language / subtitles |
| `Heart` | Wishlist |
| `Link2`, `Share2` | Share course |
| `Shield`, `CheckCircle2` | Trust / learn outcomes |
| `ChevronDown`, `ChevronRight` | FAQ accordion, breadcrumbs |
| `Award`, `BarChart3`, `Clock`, `FolderKanban`, `Infinity`, `MonitorPlay` | Hero stat bar |
| `ClipboardList`, `Cog` | Misc section affordances |

#### Reviews tab

| Icon | Usage |
|------|--------|
| `Star` | Star ratings (filled/empty) |
| `ThumbsUp` | Helpful votes on reviews |
| `Check` | “Learners love” checklist |
| `ChevronDown` | Sort dropdown |
| Headphones, `Award`, `BookOpen`, etc. | Sidebar “course includes” (via `landingCourseIncludes`) |

#### Q&A tab

| Icon | Usage |
|------|--------|
| `Search` | Search questions |
| `MessageCircle` | Answer count |
| `ThumbsUp`, `Star` | Helpful / follow |
| `Shield` | Official SFT Expert answer |
| `MessageCircle`, `Search`, `Target`, `Ban`, `Shield` | Community guidelines (sidebar) |
| `Headphones` | Need help / contact support |

#### Learning player

| Icon | Usage |
|------|--------|
| `BadgeCheck` | Certified course badge |
| `Bookmark` | Bookmark lesson |
| `Play`, `Circle` | Lesson vs reading in module list |
| `ChevronUp`, `ChevronDown` | Module expand/collapse |
| `CheckCircle2` | Completed module |
| `StickyNote`, `Subtitles`, `FileText`, `Headphones`, `FolderOpen`, `Download` | Learning Tools |
| `MessageCircle`, `CalendarDays`, `Search`, `FileText` | Quick tools footer |

#### Cart & checkout

| Icon | Usage |
|------|--------|
| `Trash2`, `ArrowRight` | Cart |
| `ShieldCheck`, `CheckCircle2`, `CreditCard`, `Landmark`, `Smartphone` | Checkout trust/payment |

#### Tutor-led

| Icon | Usage |
|------|--------|
| `Calendar`, `Clock`, `Video`, `Users` | Session schedule |
| `BadgeCheck`, `Download`, `Share2`, `Shield` | Certificate preview |
| `CircleDot` | Live session indicator |
| `ChevronRight` | Curriculum explorer |

#### Admin panel

| Icon | Usage |
|------|--------|
| `Home`, `LayoutGrid`, `FileText`, `BookOpen` | Menu sections |
| `Layers`, `MessageSquare`, `Video`, `Users` | Courses / Q&A / tutor-led |
| `Settings`, `Calendar`, `CreditCard` | Other sections |
| `Pencil`, `Trash2`, `Eye`, `Filter` | Table actions |
| `LogOut`, `Menu`, `Search`, `Bell`, `Moon` | Header chrome |
| `Video`, `FileText`, `ClipboardList`, `Mic`, `Type`, `Timer`, `BarChart3` | Curriculum content types |
| `Check`, `X` | Q&A approve/reject |

#### Account / auth UI

| Icon | Usage |
|------|--------|
| `Lock` | Sign in to view prices |
| `Loader2`, `MapPin`, `X` | Pricing region modal |
| Password fields | Custom `PasswordField` components |

### 7.2 Brand assets (not Lucide)

| Asset | Path | Usage |
|-------|------|--------|
| SF white logo | `/SF-WHITE-LOGO.png`, `@/SF-WHITE-LOGO.png` | Header, learning player, certified card |
| Expert team photo | `/sft-expert-team.png`, `/instructor-team.png` | Instructor tab |
| Course / category images | `/public/*`, admin upload URLs | Heroes, cards |
| Certificate previews | `/public/certificates/*` | Sidebar marketing |

---

## 8. API reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/PUT | `/api/admin/content` | Read/write full CMS JSON |
| POST | `/api/admin/upload` | Upload media to `public/uploads/admin` |
| GET/PATCH | `/api/admin/course-qa` | Q&A moderation queue |
| GET | `/api/courses` | Published managed courses list |
| GET | `/api/courses/[slug]` | Course + curriculum + learningSection resolved |
| GET/POST | `/api/courses/[slug]/qa` | List / ask questions |
| POST | `/api/courses/[slug]/qa/[id]/answers` | Post answer |
| GET | `/api/categories` | Categories from CMS |
| GET | `/api/tutor-led/programs` | Tutor-led programs |
| POST | `/api/auth/login` | Email login |
| POST | `/api/auth/record` | Register / upsert user |
| POST | `/api/auth/google` | Google token exchange |
| GET | `/api/auth/me` | Profile by email |
| GET | `/api/auth/admin-access` | Admin gate check |
| POST | `/api/auth/otp/send`, `verify` | Email OTP |
| GET | `/api/geo/country` | IP → country for pricing |
| GET | `/api/pricing/region` | User pricing region |
| GET | `/api/health/mysql` | DB connectivity check |
| POST | `/api/admin/zoom/*` | Zoom meeting lifecycle |

All admin write routes expect main-admin authentication context (email header / session patterns in admin UI).

---

## 9. Data storage

| Store | Path / key | Contents |
|-------|------------|----------|
| CMS | `data/admin-content.json` | Categories, `managedCourses`, tutor-led, home/about/courses page config |
| Q&A | `data/course-qa.json` | Questions, answers, moderation status |
| MySQL | Prisma models | Users, OTP, purchases |
| localStorage | `sft_*` keys | Session, cart, purchases, progress, exams, theme, pricing |
| sessionStorage | `sft_landing_viewed_{slug}` | Pre-checkout landing gate |
| Uploads | `public/uploads/admin/` | Admin-uploaded binaries |

See also: `docs/DATA_STORAGE_AND_CONNECTIONS.md`, `docs/MYSQL_WORKBENCH.md`, `docs/SENIOR_DEMO_DATABASE_STEPS.md`.

### Prisma models

| Model | Table | Purpose |
|-------|-------|---------|
| `LmsUser` | `lms_user` | Account, profile, geo fields |
| `LmsEmailOtp` | `lms_email_otp` | Hashed OTP codes |
| `LmsPurchase` | `lms_purchase` | Enrollment purchase rows |

---

## 10. Key source directories

```text
app/                    # Routes (pages + API)
components/             # React UI (landing, admin, shared)
lib/                    # Business logic, resolvers, schemas
lib/server/             # Server-only: content-store, catalogs, zoom
data/                   # JSON persistence (git-tracked samples)
prisma/                 # Schema + migrations
public/                 # Static assets + uploads
docs/                   # Operational documentation
scripts/                # env init, postinstall, nodemailer helpers
```

### Important libraries (`lib/`)

| Module | Role |
|--------|------|
| `content-schema.ts` | TypeScript types + `defaultAdminContent` |
| `course-hero-resolve.ts` | Hero/enroll card field resolution |
| `course-landing-content.ts` | Default copy by category (e.g. cyber) |
| `course-detail-template.ts` | Generic curriculum templates |
| `course-overview-resolve.ts` | Overview tab admin → UI |
| `course-learning-resolve.ts` | Learning player admin → UI |
| `course-instructor-section.ts` | Instructor tab resolution |
| `course-reviews-section.ts` | Reviews tab data |
| `course-qa-section.ts` | Q&A copy + guidelines |
| `course-landing.ts` | Pre-payment URLs + landing viewed gate |
| `learner-session-client.ts` | Client auth session helpers |
| `enrollment-storage.ts` | Enrollment log (localStorage) |

---

## 11. Styling & UX conventions

- **Theme:** Dark UI — backgrounds `#0a0a0a`, `#060b17`, cards `#141414` / `#0c1324`.
- **Accent:** Gold enroll CTAs (`#f4c150`), purple/violet for links and active states.
- **Typography:** System / Geist via Next.js font optimization on marketing pages.
- **Layout:** Max width ~1760px shell on course marketing pages; two-column hero + sidebar enroll card.
- **Responsive:** Tailwind breakpoints `sm`, `md`, `lg`, `xl` throughout.

---

## 12. Deployment & operations

| Item | Notes |
|------|--------|
| **GitHub** | https://github.com/Aditimehra0298/lms-app.git |
| **Dev** | `npm install` (use `--ignore-scripts` if `NODE_OPTIONS` breaks postinstall), `npm run env:init`, `npm run db:push`, `npm run dev` |
| **Port** | 3000 |
| **Large files** | Some videos excluded in `.gitignore` (>100MB); host via CDN or upload separately |
| **Netlify** | `netlify.toml` present; ensure API routes + env vars configured for host |

---

## 13. Known limitations (for senior review)

1. **Dual storage:** Purchases and progress are primarily **per-browser** localStorage; MySQL purchases are secondary.
2. **Reviews:** Review **cards** are still sample data in `lib/course-reviews-section.ts`; only **copy/checklists** are fully admin-driven.
3. **Admin placeholders:** Many sidebar menu items (Orders, Users, Analytics) are UI shells only.
4. **Auth:** Client-side session flags; not HTTP-only secure cookies for all flows.
5. **Q&A:** File-based store — not horizontally scalable without moving to DB.
6. **Next.js 16:** Project uses webpack dev mode; refer to `node_modules/next/dist/docs/` for framework deltas vs older Next versions (`AGENTS.md`).

---

## 14. Related documentation index

| Document | Topic |
|----------|--------|
| `docs/DATA_STORAGE_AND_CONNECTIONS.md` | JSON vs localStorage vs MySQL |
| `docs/MYSQL_WORKBENCH.md` | Database setup |
| `docs/SENIOR_DEMO_DATABASE_STEPS.md` | Demo walkthrough for DB |
| `docs/GOOGLE_SIGNIN.md` | Google OAuth client setup |
| `docs/ADMIN_GOOGLE.md` | Admin access |
| `docs/EMAIL_OTP.md` | SMTP / OTP registration |
| `AGENTS.md` | Agent rules for Next.js in this repo |

---

## 15. Document history

| Date | Author | Note |
|------|--------|------|
| 2026-05-25 | Engineering handoff | Initial senior documentation covering stack, icons, flows, admin CMS, Q&A moderation, and architecture |

---

*For questions about implementation details, start with `lib/content-schema.ts` (data model), `components/SelfPacedCourseLanding.tsx` (pre-payment UX), and `app/my-learning/course/[slug]/page.tsx` (post-payment UX).*
