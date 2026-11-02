# DADU – Estimated development and operational costs

Estimates for building and running DADU as specified in `00-canon.md`, the ten phases in
`21-roadmap.md` and the asset counts in `22-assets.md`. All figures are **2026 planning
estimates to be validated with real quotes** before any budget is committed. They are
deliberately shown as ranges where the uncertainty is large.

Conventions used throughout:

| Assumption | Value |
|---|---|
| Exchange rate | 1 USD = 86 INR (round; revisit quarterly) |
| Lakh / crore | 1 lakh = 100,000 INR; 1 crore = 100 lakh = 10,000,000 INR |
| Salaries | Fully loaded monthly cost to company for staff based in India (tier-1 and tier-2 cities blended), including employer contributions, equipment amortisation and overhead of about 25 percent on gross pay |
| Contractor rates | Indian market rates for experienced freelancers and small studios; international rates would be 2–4 times higher |
| Scope | Everything in the master prompt through Phase 10. **Marketing, user acquisition and paid promotion are out of scope** and not included anywhere below |
| Timeline | Scenario A: 18 months to full release. Scenario B: 12 months to full release |

---

## 1. Two delivery scenarios

### Scenario A – lean Indian studio team (18 months)

| Role | Count | Monthly cost (INR) | Monthly subtotal (INR) |
|---|---|---|---|
| Product lead (acts as project manager) | 1 | 2,00,000 | 2,00,000 |
| Tech lead, React Native and architecture | 1 | 3,00,000 | 3,00,000 |
| React Native developer | 2 | 1,80,000 | 3,60,000 |
| Backend developer (Node, PostgreSQL, existing API) | 1 | 2,00,000 | 2,00,000 |
| Admin console developer (half time, Next.js) | 0.5 | 1,60,000 | 80,000 |
| Lead character artist (in-house, full time) | 1 | 1,80,000 | 1,80,000 |
| Background and prop artist | 1 | 1,20,000 | 1,20,000 |
| Rive animator | 1 | 1,50,000 | 1,50,000 |
| UI and UX designer | 1 | 1,40,000 | 1,40,000 |
| Curriculum lead (early-childhood and primary education) | 1 | 1,60,000 | 1,60,000 |
| Content writer, English and Hindi | 2 | 90,000 | 1,80,000 |
| QA engineer (manual plus automation) | 1 | 90,000 | 90,000 |
| Audio engineer (half time) | 0.5 | 1,20,000 | 60,000 |
| **Total** | **14 people** | | **22,20,000 per month** |

Over 18 months: **4.00 crore INR** (about 465,000 USD) in team cost.

### Scenario B – mid-size team, faster delivery (12 months)

| Role | Count | Monthly cost (INR) | Monthly subtotal (INR) |
|---|---|---|---|
| Product lead | 1 | 2,50,000 | 2,50,000 |
| Project manager and scrum lead | 1 | 1,60,000 | 1,60,000 |
| Tech lead | 1 | 3,50,000 | 3,50,000 |
| React Native developer | 4 | 1,90,000 | 7,60,000 |
| Backend developer | 2 | 2,00,000 | 4,00,000 |
| Admin console developer | 1 | 1,60,000 | 1,60,000 |
| DevOps and release engineer (half time) | 0.5 | 2,00,000 | 1,00,000 |
| Art director | 1 | 2,50,000 | 2,50,000 |
| Character artist | 2 | 1,60,000 | 3,20,000 |
| Background and prop artist | 2 | 1,20,000 | 2,40,000 |
| Rive animator | 2 | 1,50,000 | 3,00,000 |
| UI and UX designer | 2 | 1,40,000 | 2,80,000 |
| Curriculum lead | 1 | 1,80,000 | 1,80,000 |
| Subject specialists (maths, science, language, arts and music) | 2 | 1,20,000 | 2,40,000 |
| Content writer | 4 | 90,000 | 3,60,000 |
| Localisation manager | 1 | 1,20,000 | 1,20,000 |
| QA engineer | 2 | 90,000 | 1,80,000 |
| Audio engineer | 1 | 1,20,000 | 1,20,000 |
| Child-safety and privacy officer (half time) | 0.5 | 2,00,000 | 1,00,000 |
| **Total** | **31 people** | | **48,70,000 per month** |

Over 12 months: **5.84 crore INR** (about 680,000 USD) in team cost. Scenario B costs more in
total because parallel work needs coordination roles that Scenario A avoids, but it brings launch
forward by six months and produces more content in the first year (more sections and languages
complete at release).

---

## 2. Phase-by-phase development cost

Team cost only; content, licensing and tooling are added in sections 3–6. Phase durations come
from `21-roadmap.md`.

### Scenario A (22.2 lakh per month)

| Phase | Scope | Weeks | Team cost (INR lakh) | Team cost (USD) |
|---|---|---|---|---|
| 1 | Character and Miniverse foundation | 8 | 41 | 47,700 |
| 2 | Interactive rooms, objects and environments | 10 | 51 | 59,300 |
| 3 | Language, character voice and audio systems | 8 | 41 | 47,700 |
| 4 | Academic Learning | 10 | 51 | 59,300 |
| 5 | Remaining seven learning sections | 12 | 62 | 72,100 |
| 6 | Stories and cultural exploration | 6 | 31 | 36,000 |
| 7 | Real-world activities and assignments | 5 | 26 | 30,200 |
| 8 | Assessments and gamification | 6 | 31 | 36,000 |
| 9 | Parent dashboard and screen-time controls | 5 | 26 | 30,200 |
| 10 | Admin panel, security, optimisation and release | 8 | 41 | 47,700 |
| **Total** | | **78 weeks** | **401** | **466,000** |

### Scenario B (48.7 lakh per month)

| Phase | Weeks | Team cost (INR lakh) | Team cost (USD) |
|---|---|---|---|
| 1 | 6 | 67 | 78,000 |
| 2 | 7 | 79 | 91,900 |
| 3 | 5 | 56 | 65,100 |
| 4 | 7 | 79 | 91,900 |
| 5 | 8 | 90 | 104,700 |
| 6 | 4 | 45 | 52,300 |
| 7 | 3 | 34 | 39,500 |
| 8 | 4 | 45 | 52,300 |
| 9 | 3 | 34 | 39,500 |
| 10 | 5 | 56 | 65,100 |
| **Total** | **52 weeks** | **585** | **680,000** |

Several phases overlap in Scenario B (art for Phase 2 starts during Phase 1; content writing for
Phase 4 starts during Phase 3), which is how 52 weeks of calendar time holds 78 weeks of work.

---

## 3. Content production cost (external to the team)

These are contracted costs on top of staff. Quantities are from `22-assets.md`. Both scenarios
need the same content; Scenario B simply buys it sooner.

### 3.1 Voice recording

Human actors for English and Hindi (seven characters), per `14-voice-audio.md`.

| Item | Basis | Per language (INR lakh) |
|---|---|---|
| Studio time | ~45 finished hours needs ~180 studio hours at 2,000 INR per hour | 3.6 |
| Voice actors | ~200 actor-hours across seven characters at 4,000–8,000 INR per hour (Dadaji and Gopu at the top of the range) | 10.0 |
| Voice direction | 180 hours at 1,200 INR | 2.2 |
| Editing, mastering, line splitting, viseme generation | 34,000 lines at 20 INR per line | 6.8 |
| Pick-ups and re-records (10 percent) | | 2.3 |
| **Per human-recorded language** | | **24.9** |

Licensed neural text-to-speech languages with native proofreading:

| Item | Basis | Per language (INR lakh) |
|---|---|---|
| TTS generation | ~2.1 million characters at about 1,400 INR per million | 0.03 |
| Native listener proofreading | 135 hours at 1,500 INR | 2.0 |
| Corrections and re-generation | | 0.5 |
| Mastering and splitting | 34,000 lines at 8 INR | 2.7 |
| **Per TTS language** | | **5.2** |

Roadmap total: 2 human languages (49.8 lakh) + 12 TTS languages (62.4 lakh) = **112 lakh**.
Launch (English and Hindi only): **49.8 lakh**. If four more languages later move to human
actors as recommended once they pass 10 percent of active children, add about 20 lakh each.

### 3.2 Translation and proofreading

| Item | Basis | Per language (INR lakh) |
|---|---|---|
| Translation | ~377,000 words at 2.00 INR per word | 7.5 |
| Proofreading (separate linguist) | 377,000 words at 0.80 INR per word | 3.0 |
| Screen-by-screen linguistic QA (Urdu RTL doubles this line) | 80 hours at 1,500 INR | 1.2 |
| **Per language** | | **11.7** |

Hindi is written in-house alongside English by the bilingual writers, so it is not counted here.
Twelve remaining languages: **140 lakh** over the roadmap, of which the four Phase 7–8 languages
(Tamil, Telugu, Bengali, Marathi) are **47 lakh**. This is the single largest content line after
lessons themselves; see section 9 on reducing it.

### 3.3 Illustration and animation (contracted share)

In Scenario A the in-house artists cover characters, the UI kit and style-lock pieces; the volume
work below is contracted. In Scenario B about 40 percent of this is absorbed by the larger in-house
art team, reducing the contracted figure to about 60 lakh.

| Item | Quantity | Rate (INR) | Total (INR lakh) |
|---|---|---|---|
| Environment layer paintings (contracted share) | ~100 | 12,000 | 12.0 |
| Object sprites, 3 states | ~500 | 800 | 4.0 |
| Object Rive loops | ~60 | 4,000 | 2.4 |
| Plant growth sprites | 480 | 500 | 2.4 |
| Story illustrations and covers | ~1,300 | 2,500 | 32.5 |
| Story animated panels | ~240 | 4,000 | 9.6 |
| Lesson hero illustrations | 480 | 1,500 | 7.2 |
| Concept diagrams (SVG) | ~1,200 | 600 | 7.2 |
| Activity sprites | ~900 | 400 | 3.6 |
| Animated demonstrations (Rive) | ~180 | 8,000 | 14.4 |
| Virtual lab kits | 8 | 1,50,000 | 12.0 |
| Guest character rigs | 16 | 60,000 | 9.6 |
| Badges and decorations | ~270 | 1,200 | 3.2 |
| Store screenshots and marketing art (production only) | ~250 | 500 | 1.3 |
| **Total** | | | **121.4** |

### 3.4 Music and sound

| Item | Quantity | Rate (INR) | Total (INR lakh) |
|---|---|---|---|
| Original instrumental and nature beds, composed and recorded | 45 | 25,000 | 11.3 |
| Bhajans and devotional pieces, newly recorded with rights assigned | 12 | 40,000 | 4.8 |
| Stingers, themes and lullabies | 18 | 10,000 | 1.8 |
| Sound effects, original and CC0 with records | 360 | 800 | 2.9 |
| **Total** | | | **20.8** |

### 3.5 Lesson and assessment authoring

Writing is largely in-house (writers and curriculum lead in both scenarios). External costs:

| Item | Basis | Total (INR lakh) |
|---|---|---|
| Subject-matter reviewers (educational review and factual verification steps of the CMS workflow) | 480 lessons and 2,400 items at an average 1,500 INR per lesson package | 7.2 |
| Curriculum alignment consultants (NCERT, CBSE, ICSE, IB, Cambridge mapping) | 4 consultants, 15 days each at 8,000 INR | 4.8 |
| Child-development advisory board (quarterly reviews, 6 sessions) | | 3.0 |
| Cultural and religious sensitivity panel for `08-temple-courtyard.md` | 5 reviewers, 20 days total | 2.0 |
| **Total** | | **17.0** |

### 3.6 Content total

| Line | Launch (INR lakh) | Full roadmap (INR lakh) |
|---|---|---|
| Voice | 49.8 | 112.2 |
| Translation | 0 (Hindi in-house) | 140.4 |
| Illustration and animation (Scenario A contracted) | 85 | 121.4 |
| Music and sound | 15 | 20.8 |
| Review and advisory | 10 | 17.0 |
| **Total** | **~160** | **~412** |

---

## 4. Licensing

Story rights as assessed in `13-story-library.md`. Figures are indicative; publishers and estates
negotiate case by case and often prefer a royalty with a recoupable advance. Treat these as
placeholders until the rights officer has written quotes.

| Work | Likely rights holder | Indicative advance (INR lakh) | Royalty | Notes |
|---|---|---|---|---|
| Malgudi Days (R. K. Narayan) | Estate via Indian Thought Publications | 8–15 | 8–12 percent of attributable revenue | Adaptation, translation into 14 languages, narration and animation rights all needed |
| Ruskin Bond stories | Author and publishers (Penguin Random House India, Rupa) | 6–12 | 8–10 percent | Different stories sit with different publishers |
| Satyajit Ray stories | Estate (Sandip Ray) and Penguin | 6–12 | 8–10 percent | Feluda and Professor Shonku are separately licensed properties |
| Grandma's Bag of Stories (Sudha Murty) | Author and Puffin | 6–12 | 8–10 percent | |
| The Jungle Book (Kipling) | Public domain | 0 | 0 | Must not resemble any film adaptation |
| Traditional collections (Panchatantra, Jataka, Hitopadesha, Akbar–Birbal, Tenali Raman, Vikram–Betaal, Gopal Bhar, Mullah Nasruddin, Kathasaritsagara), Tagore, Sukumar Ray | Public domain or folk | 0 | 0 | Own retellings only; existing modern translations are themselves copyrighted |
| Music | Original work-for-hire | 0 beyond section 3.4 | 0 | |
| Fonts | SIL OFL | 0 | 0 | |
| Photo references | CC0 and CC BY via the existing Wikimedia ingest | 0 | 0 | Attribution screen required |
| **Total advances** | | **26–51** | plus royalties | Legal drafting 3–5 lakh extra |

Launch can proceed with the 60 public-domain stories while these four negotiations run.

---

## 5. Tooling and infrastructure during development

| Item | Monthly (USD) | Monthly (INR) | 18 months (INR lakh) |
|---|---|---|---|
| Rive team seats (4) | 120 | 10,300 | 1.9 |
| Figma professional seats (5) | 75 | 6,500 | 1.2 |
| Expo EAS production plan plus build overage | 150 | 12,900 | 2.3 |
| GitHub Team (12 seats) and CI minutes | 70 | 6,000 | 1.1 |
| Error reporting and monitoring (Sentry or similar) | 30 | 2,600 | 0.5 |
| Staging hosting (API, PostgreSQL, storage, CDN) | 120 | 10,300 | 1.9 |
| Translation management platform | 90 | 7,700 | 1.4 |
| Audio tools and plug-in licences | 25 | 2,200 | 0.4 |
| **Subtotal** | **680** | **58,500** | **10.7** |
| Budget test devices (12 Android, 2 iPhone, 2 tablets), one-off | | | 3.5 |
| Mac build machine, one-off | | | 1.8 |
| Recording equipment for pick-ups, one-off | | | 1.2 |
| **Total** | | | **17.2** |

Scenario B over 12 months with more seats: about 15 lakh.

---

## 6. Legal, compliance and store

| Item | Cost (INR lakh) | Notes |
|---|---|---|
| DPDP Act compliance: counsel, consent flows review, privacy notice in 14 languages, data-protection impact assessment | 6–9 | Required before any child data is collected; see `19-parent-dashboard.md` |
| Child-safety and pedagogy audit by an external body | 4–6 | Recommended before store submission |
| Accessibility audit | 2–3 | |
| Terms, parental consent language, subscription terms (lawyer-drafted, translated) | 3–4 | |
| Trademark search and registration for DADU in relevant classes (India plus Madrid filing) | 1.5–3 | |
| Apple Developer Program (99 USD per year) and Google Play (25 USD once) | 0.1 | Reuse the existing accounts in `docs/STORE_SUBMISSION.md` with new identifiers |
| Penetration test of the API and parent gate | 3–5 | |
| **Total** | **20–30** | |

---

## 7. Development totals

| Line | Scenario A (INR lakh) | Scenario A (USD) | Scenario B (INR lakh) | Scenario B (USD) |
|---|---|---|---|---|
| Team | 401 | 466,000 | 585 | 680,000 |
| Content production (full roadmap) | 412 | 479,000 | 350 (more in-house art) | 407,000 |
| Licensing advances (midpoint) | 40 | 46,500 | 40 | 46,500 |
| Tooling and hardware | 17 | 19,800 | 15 | 17,400 |
| Legal, compliance, store | 25 | 29,100 | 25 | 29,100 |
| Contingency (15 percent) | 134 | 156,000 | 152 | 177,000 |
| **Total to full release** | **~1,030** | **~1.20 million** | **~1,167** | **~1.36 million** |

In words: **about 10.3 crore INR for the lean plan over 18 months, about 11.7 crore INR for the
faster plan over 12 months.**

A smaller first release is possible. A "Phase 1–4 plus stories" launch (Miniverse, characters,
English and Hindi, Academic Learning, 60 stories, basic assessments and the parent gate) in
Scenario A costs about 4.2 crore INR including its share of content and contingency, and can be
in stores in about nine months. The remaining phases then run on early revenue or the next funding
round.

---

## 8. Operational costs per month

Usage assumptions per monthly active child: 20 minutes a day on 20 days; about 60 MB of new
pack downloads a month on average (the first month is 150–250 MB, later months far less); about
250 API requests a month (progress sync is batched); 10 percent of parents attach one 2 MB photo
to an assignment each month; 20 percent of monthly active children are new in any given month and
need one or two SMS one-time passwords for the parent.

| Line | 10,000 MAC | 100,000 MAC | 1,000,000 MAC | Notes |
|---|---|---|---|---|
| API hosting (containers, autoscaling) | 50 USD | 450 USD | 4,500 USD | Existing Express service; 2 small instances to 20 medium instances with a load balancer |
| PostgreSQL (managed, backups, replica at scale) | 25 USD | 180 USD | 1,500 USD | High availability and a read replica from 100k upwards |
| Object storage (packs, media, private photos) | 10 USD | 60 USD | 500 USD | 1 TB growing to 25 TB |
| CDN egress (0.6 TB, 6 TB, 60 TB at about 0.015 USD per GB with volume pricing) | 15 USD | 90 USD | 900 USD | The biggest variable; see section 9 |
| Push notifications | 0 | 0 | 0 | Expo push is free at these volumes; Firebase and APNs are free |
| SMS one-time passwords (about 4,000, 40,000, 400,000 at 0.20 INR) | 800 INR | 8,000 INR | 80,000 INR | Domestic transactional rate; e-mail OTP fallback is free |
| TTS regeneration for corrected lines | 10 USD | 20 USD | 50 USD | Voice is pre-generated; no runtime TTS |
| Monitoring, logging, error reporting | 30 USD | 150 USD | 900 USD | |
| Payment processing (if subscriptions exist) | revenue share | revenue share | revenue share | App stores take 15 percent (small-business tier) rising to 30 percent above 1 million USD a year; not a fixed cost |
| Parent support (people) | 1 agent, 40,000 INR | 3 agents, 1,20,000 INR | 15 agents plus a lead, 7,00,000 INR | Based on 0.4 percent of parents writing in each month |
| Content maintenance and new content (people) | 2 writers, 1 artist, 1 curriculum reviewer: 4,20,000 INR | plus 2 writers, 1 animator, 1 localisation coordinator: 9,00,000 INR | full content studio of 20: 24,00,000 INR | Keeps the "Dadaji's plan" fresh and adds languages |
| Engineering maintenance (people) | 1 developer half time, 1,00,000 INR | 2 developers, 1 QA: 4,70,000 INR | 6 developers, 2 QA, 1 DevOps: 17,00,000 INR | Store updates, OS changes, Expo SDK upgrades |
| Trust, safety and privacy operations | shared, 20,000 INR | 1 officer half time, 1,00,000 INR | 2 officers, 2,50,000 INR | DPDP requests, deletion, consent audits |
| **Cloud subtotal (USD)** | **140** | **950** | **8,350** | |
| **Cloud subtotal (INR)** | **12,000** | **82,000** | **7,18,000** | |
| **People subtotal (INR)** | **5,80,000** | **16,00,000** | **50,50,000** | |
| **Total per month (INR)** | **~6.0 lakh** | **~17 lakh** | **~58 lakh** | |
| **Total per month (USD)** | **~7,000** | **~19,800** | **~67,500** | |
| **Per active child per month (INR)** | **60** | **17** | **5.8** | |

Reading the last row: cloud cost per child is tiny at every scale (under 1 INR a child a month at
one million); people, mainly content maintenance and support, dominate operations. At one million
children a 5.8 INR monthly cost per child sits comfortably under any plausible family subscription
price, and the pack-based offline design keeps the CDN line from running away.

---

## 9. Sensitivity and the top five cost drivers

**Sensitivity.** The total development figure moves by roughly plus or minus 25 percent with the
following: salary inflation in India (8–12 percent a year is common for senior React Native and
art talent), whether illustrators are Indian freelancers or studios (studios cost 1.5–2 times),
the number of languages at launch (each full language adds about 17 lakh in translation and voice
proofreading), and the licensing negotiations (zero if the four licensed collections are deferred).
The operational figure is most sensitive to pack size per child (doubling average downloads doubles
the CDN line) and support contact rate.

| # | Cost driver | Share of the total | Ways to reduce it |
|---|---|---|---|
| 1 | Engineering and art salaries | ~40 percent | Keep the Tame codebase (API, admin, auth, i18n, EAS pipeline) rather than rebuilding; lock the art style early so contracted artists can scale without rework; ship Scenario A if calendar time is less important than cash |
| 2 | Translation and proofreading across 14 languages | ~14 percent of development, recurring for every new lesson | Stage languages by demand; write lessons with SVG text slots and shared templates to cut word counts; reuse the reaction system and Mitthu's Echo lines across lessons; use machine translation only for first drafts with mandatory human proofreading |
| 3 | Voice recording | ~11 percent | Human actors for English and Hindi only at launch; TTS with native proofreading elsewhere; record reaction lines and templated feedback once; keep lines short and template-driven so pick-ups are rare |
| 4 | Story and lesson illustration volume | ~12 percent | Little and Explorer adaptations share illustrations; animated panels only for the four hero scenes a story; lesson media as SVG so one asset serves all languages; generative under-painting with human finish where the licence policy allows |
| 5 | Content maintenance after launch | the largest operating line | Build the CMS workflow (`20-admin-cms.md`) so that educators, not engineers, publish content; template lessons; plan content in quarterly packs rather than continuous trickle |

---

## 10. Cash flow by quarter (Scenario A, 18 months)

Team cost is flat; content and licensing cluster in the middle quarters; legal and store costs
sit at the start and the end. Contingency is spread evenly.

| Quarter | Months | Phases active | Team (INR lakh) | Content and licensing (INR lakh) | Tooling, legal, hardware (INR lakh) | Contingency (INR lakh) | Quarter total (INR lakh) | Cumulative (INR lakh) |
|---|---|---|---|---|---|---|---|---|
| Q1 | 1–3 | 1, start of 2 | 67 | 12 (style lock, first environments, music starts) | 12 (hardware, tooling, DPDP counsel, trademark) | 22 | 113 | 113 |
| Q2 | 4–6 | 2, 3 | 67 | 48 (environments, object sprites, voice recording English and Hindi reaction and object lines, SFX) | 4 | 22 | 141 | 254 |
| Q3 | 7–9 | 4, start of 5 | 67 | 78 (academic lesson media, voice for lessons, subject reviewers) | 3 | 22 | 170 | 424 |
| Q4 | 10–12 | 5, 6 | 67 | 112 (seven sections' media, story illustration, story voice, licensing advances, sensitivity panel) | 3 | 22 | 204 | 628 |
| Q5 | 13–15 | 7, 8, 9 | 67 | 92 (four-language translation and TTS proofreading, badges and decorations, assignment media) | 3 | 22 | 184 | 812 |
| Q6 | 16–18 | 10, release | 66 | 30 (pick-ups, store art, residual translation QA) | 17 (penetration test, audits, store, final legal) | 24 | 137 | 949 |
| **Total** | | | **401** | **372** | **42** | **134** | **949** | |

The cash-flow total (949 lakh) is lower than the section 7 total (1,030 lakh) because the
remaining eight languages' translation and voice (about 80 lakh) fall after month 18 and are
funded from operations. Peak quarterly spend is Q4 at about 2.0 crore INR; a financing plan should
cover at least 6.5 crore INR committed by the end of Q3 to avoid stalling content production
mid-roadmap.

For Scenario B the same 1,167 lakh is spent over four quarters at roughly 230, 320, 350 and 267
lakh, with the same back-loaded language work.

---

## 11. Summary

| Headline | Scenario A (lean, 18 months) | Scenario B (mid-size, 12 months) |
|---|---|---|
| Team | 14 people, 22.2 lakh a month | 31 people, 48.7 lakh a month |
| Development to full release (with 15 percent contingency) | ~10.3 crore INR (~1.20 million USD) | ~11.7 crore INR (~1.36 million USD) |
| Smaller first release (Phases 1–4 plus stories, English and Hindi) | ~4.2 crore INR in about 9 months | ~5.0 crore INR in about 6 months |
| Operations at 10k / 100k / 1M monthly active children | ~6 / ~17 / ~58 lakh INR a month | same |
| Cloud share of operations | under 15 percent at every scale | same |
| Biggest levers | reuse the existing codebase, stage languages, template content, educator-run CMS | same |

Every figure above should be replaced by a quote or a signed rate card before it is used in a
funding document; the structure of the estimate, not its exact numbers, is what this file is for.
