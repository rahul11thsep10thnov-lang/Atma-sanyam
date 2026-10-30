# Blueprint: build another exam-prep website like PoliceChayan

How to use: start a new project in Claude Code, paste **Part A** as your first message, fill the `[BRACKETS]`, and keep **Part B** open (or attach this file) as the specification. Claude builds in the order of **Part C**.

---

## Part A. Kickoff prompt (paste this)

> Build a Hinglish exam-preparation platform for **[EXAM FAMILY, e.g. SSC / Railway / Banking / Teaching]**, modelled on an existing product called PoliceChayan (spec attached: NEW_EXAM_SITE_BLUEPRINT.md). Brand name: **[NAME]**, motto: **[MOTTO]**, languages: **[Hinglish / Hindi / English]**.
>
> Exams, subjects and chapters (the taxonomy): **[LIST. For each exam: states/boards, subjects, chapters]**.
> Price: **[₹ / year]**, free quota: **[e.g. 2 full + 2 subject-wise mock tests]**.
> Brand colours: **[hex pair, or "reuse mint #25D482 → coral #FF6A5A"]**. Logo: **[file]**. Background photo: **[file]**.
>
> Follow the blueprint's architecture, UI/UX rules, content-quality rules and build order. Work in a **new, empty Git repository**. Use the blueprint's "Lessons learned" list to avoid known problems. Ask me only for decisions I must make (taxonomy, price, brand, hosting accounts). Verify by running the tests and by taking phone-size (360 px and 390 px) and desktop screenshots before saying anything is done. Do not publish question content you could not verify; mark unverified items for human review.

---

## Part B. Specification

### 1. Product
A state-wise / exam-wise preparation site: practice by chapter, full-length and subject-wise **mock tests with a real timer and solutions**, previous-year papers (PYQ), state GK, daily quiz, current affairs, physical-test info, study notes, exam updates, search, login (guest + optional Supabase Google/mobile OTP), results dashboard, bookmarks, "my mistakes", leaderboard. A paid **annual pass** (Razorpay) unlocks all mock tests; a free quota is given to everyone. A separate **admin console** creates, validates, reviews and publishes the questions and mock tests. Tone: friendly Hinglish. The site states it is independent, not an official body.

### 2. Architecture (three apps, one repo)
| Part | Stack | Notes |
|---|---|---|
| Website (`/`) | Next.js 16 App Router, React 19, Tailwind 4, TypeScript | Reads Next docs in `node_modules/next/dist/docs` first (breaking changes). Works with built-in demo data when no API is set |
| API (`/backend`) | Node 22, Express 5, Drizzle ORM, PostgreSQL 16 (PGlite embedded DB for zero-setup dev), zod | Admin auth with roles and audit log; public API; generation worker; Razorpay order + signature + webhook; server-made PDFs (pdfkit, Hind + Noto fonts, worker thread); health `/api/health`, `/api/health/deep` |
| Admin console (`/admin`) | Next.js 16 | Proxies `/api/backend/*` to the API so the browser never sees the API address or token |
Hosting: Neon (Postgres), Render (API, Docker, root dir `backend`), Vercel (website, and admin with root dir `admin`).

### 3. UI/UX rules (what makes it look the same)
- **Tokens:** background `#F3F5F9`, text `#1C2333`, cards white with border `#E6E9F1`, radius 18 px cards / 14 px buttons. Accents: orange `#FF6A13`, green `#10A760`, blue `#1D78D8`, purple `#6D4FE0`, gold `#D99A1B`, red `#DC3B2F`. **Brand pair mint `#25D482` → coral `#FF6A5A`** paints every heading (gradient text) and the main buttons (animated gradient).
- **Fonts:** Rubik (headings, buttons, numbers), Hind (body, supports Devanagari), Cinzel (site name wordmark), Yatra One (Devanagari motto under the name).
- **Header:** logo mark + wordmark with the motto under it (wraps to 2 lines on phones), search icon, hamburger. Desktop: full nav bar + Login button.
- **Mobile:** fixed **bottom tab bar** (Home, Exams, Practice, Mock, More). "More" lists the rest. Full-screen menu drawer with grouped sections. 16 px form text, ≥44 px tap targets, **no sideways scroll at 360 px**.
- **Background:** one full-screen photo as a fixed watermark at about 13% opacity behind all pages; cards stay readable on top.
- **Home order:** hero (eyebrow, big gradient H1, one short line on phones, search box) → "Quiz of the Day" strip → exams covered (state cards with coloured left border) → subject-wise tests → exam updates. Two columns on large screens.
- **Exam attempt screen:** header/footer/tab bar hidden; timer; question palette (answered / marked / unseen colours); bottom sheet palette on phones; submit confirmation; result page with section scores and solutions.
- **Enrolment:** a popup (headline, price with strike-through, % off, "free: N tests") and a payment page; quote text editable in the console.
- **Admin console:** left sidebar (phone: Menu button), KPI cards, sortable/filterable tables with a column chooser, review queue with keyboard shortcuts, **phone layouts: tables become cards, filters fold behind a Filters button, button bars wrap**.

### 4. Content pipeline and quality rules
Steps: plan → generate (AI or import) → sanitize → duplicate check → rule validator (about 16 rules: one correct option, distinct options, language/script, explanation present, metadata, answer/explanation agreement, arithmetic recomputed from a `computation` expression) → independent AI review → human review → publish → mock-test builder.
- Everything imported or generated lands in **NEEDS_REVIEW**; nothing is published without a person (a console "Approve & publish all" exists for trusted batches; questions with errors are skipped).
- **Calibrate difficulty to a real previous paper** (analyse one paper's mix and style first). Use a rubric, not the labels in a supplied file.
- **Never accept** filler wrong options ("unrelated topic", "only sports"), repeated copies of one question, stems with no content, answer stated in the question, passages or figures that are missing, current-affairs facts you cannot verify.
- Recompute every numeric/reasoning answer by program; read GK/Hindi/literature by a human or a second checker.
- Non-verbal reasoning: a seeded **figure engine** draws SVG question figures with computed answers; stored in the database.
- Import columns: `exam, subject, chapter, topic, question, option_a..d, correct_option, explanation, difficulty, language, source_name, source_reference, valid_as_of` plus optional bank columns (`external_id, topic_label, subtopic, concept, cognitive_level, year, variation_*, difficulty_label, answer_verified, ai_verified, verification_method, qa_grade, qa_flags, qa_fixes`). `external_id` makes re-imports safe. Max 2,000 rows per console upload; a CLI imports any size.
- Hindi: do not drop function words (ने, को, से) when comparing options; short generic stems only count as duplicates when options match too.

### 5. Operations and safety
Nightly encrypted `pg_dump` with an automatic **test restore** (GitHub Actions); alerts to Slack/Discord/Telegram on 500s, crashes, DB outage, failed jobs, payment-signature failures; uptime check of site, API and console. Razorpay webhook with exactly-once activation. Security headers on all apps; secrets only in host environment variables, never in Git. Backup/uptime/alert secrets must be re-added in every new repository.

### 6. Lessons learned (avoid these)
1. Use a **new empty repository** per product. Mixing two projects in one repo caused conflicting pull requests.
2. Never leave a second clone inside the project folder; the type checker scans it and the build fails.
3. Windows: avoid `${PORT:-3001}` in npm scripts (use `next start -p 3001`); delete the `.next` folder after a crash before building again.
4. Low-RAM laptops: development servers are very slow. Build once and run the production build, or just deploy.
5. Free hosting sleeps; free database connections can drop during long seeding. Seeds must be re-runnable and skip existing rows.
6. Public `NEXT_PUBLIC_*` values are baked at build time. Set them before deploying the website.
7. Verify with phone-size screenshots; admin tables and review pages overflow unless built mobile-first.
8. Hosted-environment preview files may be wiped. Keep generated question files and scripts in the repo or your own storage.
9. A Claude subscription does not provide API access. AI-generated content needs an API key (priced per use); otherwise Claude can write verified question files that you import.

---

## Part C. Build order (each step ends with tests and screenshots)
1. Taxonomy JSON + database schema and migrations; embedded dev database; seed script.
2. API: admin auth/roles/audit, taxonomy, questions CRUD and statuses, import, public endpoints, tests (also on PostgreSQL 16).
3. Validator, duplicate detection, generation worker with a free **mock AI mode**, cost estimator.
4. Admin console: dashboard, exams tree, question bank (sort/filter), review queue, import, generate, mock tests (build, swap, edit, print/PDF), settings, users, analytics, audit log; phone layouts.
5. Website: layout, home, exam/state pages, practice, mock-test engine, PYQ, GK, quiz, notes, updates, search, login, dashboard.
6. Payments (Razorpay order, signature, webhook), enrolment popup, free quota.
7. Real content: plan file → generation or verified import → human review → publish → build mock tests.
8. Safety net: backups, alerts, uptime. Security review.
9. Deploy in order: database → API → seed data → admin → website → CORS → domain.

Inputs only you can supply: exam list and syllabus (taxonomy), one or two previous papers for calibration, brand name/logo/photo, price, official source links, payment and hosting accounts, and a subject teacher to review.
