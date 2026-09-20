# Atma Sanyam — Architecture & Design

Multilingual AI family-news video platform for India. This document is the
"first task" deliverable required before implementation: project structure,
database schema, API architecture, AI/news pipeline, server-vs-client split,
technology choices, external services, cost projections, and legal/privacy
considerations. Implementation follows this document module-by-module.

## 1. Editorial scope (recap)

Primary content: family disputes, husband-wife conflicts, in-law disputes,
sibling/parent-child disputes, property & inheritance disputes, family crime
(including family murder), domestic violence, missing/kidnapping cases tied
to families, neighbour disputes rooted in family/property issues, and other
human-interest stories strongly tied to family life. General news is out of
scope. A story only becomes a video if it can **naturally** support a 2–4
minute narration (target 2–3 min) — short wire items are discarded, never
padded.

## 2. High-level system

```
Android App (Kotlin/Compose)
        │  REST/JSON + JWT
        ▼
API Gateway (Express/TS)  ── Admin Dashboard (React/Vite) ─┐
        │                                                   │ REST/JSON + admin JWT
        ▼                                                   │
PostgreSQL  ◄──────────────── Backend services ─────────────┘
        ▲                        │
        │                        ▼
        │                 Redis + BullMQ (job queues)
        │                        │
        │        ┌───────────────┼─────────────────────────────┐
        │        ▼               ▼                              ▼
        │  Ingestion workers  AI workers (classify/score/    Video render workers
        │  (NewsSourceProvider  script/translate/safety)      (TTS + template video)
        │  implementations)          │                              │
        └────────────────────────────┴──────────────────────────────┘
                                     │
                                     ▼
                        Object storage (S3-compatible) + CDN
                        (audio, video, thumbnails, subtitle files)
```

Design principle: the Android app never talks to News/AI/TTS providers
directly and never holds their API keys. It only talks to our own backend
API, which fronts Postgres, Redis-backed queues, and object storage. This is
required both for security (§37) and for cost control (§29 — dedup/filtering
must happen server-side, in bulk, before any paid API call).

## 3. Repository layout

```
atma-sanyam/
├── ARCHITECTURE.md
├── docs/
│   ├── COST_ESTIMATES.md
│   ├── LEGAL_AND_PRIVACY.md
│   └── PIPELINE.md
├── backend/                        # Node.js + TypeScript API + workers
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── seed.ts
│   ├── src/
│   │   ├── config/                 # env loading & typed config
│   │   ├── lib/                    # prisma client, logger, storage client
│   │   ├── data/                   # static reference data (languages, states/districts, categories)
│   │   ├── middleware/             # auth, rateLimit, validation, errorHandler
│   │   ├── api/
│   │   │   ├── routes/             # stories, videos, categories, locations, search, auth, preferences, engagement, admin
│   │   │   └── controllers/
│   │   ├── modules/
│   │   │   ├── news-ingestion/     # NewsSourceProvider interface + providers
│   │   │   ├── classification/     # family relevance + category classifier
│   │   │   ├── dedup/              # duplicate/master-story detection
│   │   │   ├── scoring/            # suitability + quality scoring engine
│   │   │   ├── safety/             # journalistic-safety + content moderation
│   │   │   ├── script-generation/  # LLM script generator
│   │   │   ├── translation/        # per-language localization
│   │   │   ├── tts/                # text-to-speech providers
│   │   │   ├── subtitles/          # subtitle (SRT/VTT) generation
│   │   │   └── video-rendering/    # template-based video renderer
│   │   ├── pipeline/               # orchestrator wiring the modules together
│   │   ├── queue/                  # BullMQ queue + worker definitions
│   │   └── server.ts
│   ├── tests/
│   ├── docker-compose.yml
│   ├── package.json
│   └── .env.example
├── admin-dashboard/                 # React + Vite admin SPA
│   └── src/
└── android/                         # Kotlin + Jetpack Compose app
    └── app/src/main/
        ├── java/.../ui/{onboarding,home,player,search,location,settings}
        ├── java/.../data/{remote,local,repository}
        ├── java/.../domain/
        └── res/values{,-hi,-bn,-as,-ta,-te,-kn,-mr,-ml}/strings.xml
```

## 4. Database schema (PostgreSQL via Prisma)

Canonical, language-neutral story data is separated from per-language
presentation (`StoryTranslation`), per the spec's §6/§8 requirement. See
`backend/prisma/schema.prisma` for the authoritative version; summary:

- **Language** — code, nativeName, englishName, isEnabled, isDefault
- **NewsSource** — name, homepageUrl, sourceType (API/RSS/LICENSED), reliabilityScore, isBlacklisted
- **RawArticle** — one row per fetched article: sourceId, externalId, url, headline, publishedAt, rawText/summary, fetchedAt, dedupStatus
- **MasterStory** — the canonical deduplicated incident: title, eventType (enum), location fields, eventDate, peopleInvolved (JSON), relationships (JSON), whatHappened, background, policeAction, legalStatus, currentStatus, familyRelevanceScore, suitabilityScore, qualityScore, pipelineStatus (enum matching §25 workflow), masterStoryHash (for near-duplicate lookup)
- **StorySource** — join table: masterStoryId, rawArticleId, sourceId, sourceUrl, publishedAt (supports many-to-many "multiple sources per master story")
- **StoryScript** — masterStoryId, language, sectionised script JSON (intro/location/people/background/sequence/authorities/status/context/end), wordCount, estimatedDurationSeconds, status (DRAFT/SAFETY_CHECKED/APPROVED), safetyFlags (JSON)
- **StoryTranslation** — masterStoryId, language, localizedTitle, localizedSummary, localizedScriptId → StoryScript
- **AudioAsset** — storyScriptId, language, voiceId, storageUrl, durationSeconds, provider
- **SubtitleAsset** — storyScriptId, language, format (SRT/VTT), storageUrl
- **VideoAsset** — masterStoryId, language, storageUrl, thumbnailUrl, durationSeconds, resolution, renderStatus, templateVersion
- **Category** — enum-backed lookup for the primary categories in §5
- **Location** — state, district, city (seeded from the full India state/UT + district list)
- **User** — id, deviceId/authId, preferredLanguage, createdAt (minimal PII — §33)
- **UserPreference** — userId, categories[], states[], notificationsEnabled
- **View / Like / Share / Save / Report** — engagement events, keyed by userId + videoAssetId
- **AdminUser** — id, email, passwordHash, role
- **AdminReview** — masterStoryId, adminUserId, action (APPROVE/REJECT/EDIT/REGENERATE_*), notes, createdAt
- **AdminAuditLog** — adminUserId, action, entity, entityId, diff, createdAt

`MasterStory.pipelineStatus` enum mirrors §25 exactly:
`COLLECTED → AI_CLASSIFIED → DUPLICATE_CHECKED → QUALITY_CHECKED →
SCRIPT_GENERATED → SAFETY_CHECKED → PENDING_REVIEW → APPROVED →
VIDEO_GENERATED → PUBLISHED` (plus `REJECTED` and `FAILED` terminal states
usable at any stage).

## 5. API architecture

REST, JSON, versioned under `/api/v1`. JWT auth for end users (issued
against a lightweight device/anonymous or email-based account — no
GPS/location permission is ever requested per §20) and a separate admin JWT
scope for `/api/v1/admin/*`.

Public/app endpoints:
- `GET  /languages`
- `GET  /categories`
- `GET  /locations/states`, `/locations/states/:state/districts`
- `GET  /feed?lang=&category=&state=&district=&cursor=` — cursor-paginated video feed
- `GET  /stories/:id?lang=`
- `GET  /videos/:id/manifest?lang=` — playback URL, subtitle URLs, source attribution
- `GET  /search?q=&lang=&state=&category=&dateFrom=&dateTo=`
- `POST /auth/anonymous`, `POST /auth/login`
- `GET/PUT /me/preferences`
- `POST /engagement/{view,like,share,save,report}`
- `POST /devices/register` (FCM token)

Admin endpoints (`/api/v1/admin/*`, role-gated, all writes audit-logged):
- `GET /pipeline/stats` (§24 dashboard numbers)
- `GET /stories?status=` , `GET /stories/:id`
- `POST /stories/:id/approve|reject`
- `PUT  /stories/:id` (edit script/metadata/category)
- `POST /stories/:id/regenerate-script|regenerate-audio|regenerate-video`
- `DELETE /videos/:id`
- `GET/PUT /config/thresholds` (suitability/quality thresholds, auto-publish toggle)
- `GET/POST/PUT /sources` (add source, blacklist source)
- `PUT /languages/:code` (enable/disable)

Async work (ingestion, classification, scoring, script gen, translation,
TTS, render) never happens inline on a request — the API only enqueues jobs
and returns state; workers process the BullMQ queues.

## 6. AI/news pipeline (server-side only)

Implements §44 exactly, as a queue-chained state machine
(`src/pipeline/PipelineOrchestrator.ts`):

```
fetch (NewsSourceProvider)
  → classify (family relevance + category)      -- discard if NOT_RELEVANT / low score
  → dedup (attach to MasterStory or merge)       -- merge into existing master story's StorySource
  → suitability scoring (STORY_VIDEO_SUITABILITY_SCORE, default min 70)
  → quality scoring (5-factor, default min 70/100)
  → script generation (LLM, section-structured, source-grounded)
  → journalistic safety pass (allegation-vs-fact rewriting, sensitive-topic filtering, PII scrub)
  → content moderation pass (fabrication/defamation/hallucination flags)
  → PENDING_REVIEW (admin dashboard) — or auto-publish if enabled for low-risk categories
  → APPROVED
  → translation (per enabled language, natural journalistic rewrite, not literal)
  → TTS (per language)
  → subtitle generation (from narration timing)
  → template video render (per language, or shared visual track + per-language audio/subtitle mux)
  → PUBLISHED (video + thumbnail pushed to object storage/CDN, feed cache invalidated)
```

Every discard/reject records a reason so the admin dashboard can show
"collected vs rejected vs approved" funnels (§24, §29).

### Interfaces (server-side, provider-swappable)

- `NewsSourceProvider` — `fetchLatest(): RawArticleDTO[]`. Implementations:
  `NewsApiOrgProvider`, `RssFeedProvider` (generic RSS/Atom), `MockProvider`
  (dev/offline). New providers register in `src/modules/news-ingestion/registry.ts`
  without touching pipeline code.
- `FamilyClassifier` — category + `family_relevance_score`. LLM-backed
  (`AnthropicClassifier`) with a cheap rule/keyword-based pre-filter
  (`RuleBasedClassifier`) to cut LLM calls (§29 cost control).
- `SuitabilityScorer` / `QualityScorer` — deterministic scoring functions
  combining LLM-extracted "information completeness" signals with source
  count, source reliability and text length heuristics.
- `ScriptGenerator` — produces the §9 section-structured script strictly
  from extracted facts; enforces §10 allegation/fact language via a
  post-generation linter (`JournalisticSafetyService`) that rejects/flags
  unhedged claims.
- `TranslationService` — natural per-language rewrite (not transliteration)
  of the script and headline.
- `TextToSpeechProvider` — per-language narration; providers pluggable
  (Google Cloud TTS / Azure Neural TTS have the best Indian-language voice
  coverage; a `MockTtsProvider` generates silent placeholder audio for dev).
- `VideoRenderer` — template-based renderer: a fixed set of animated
  "scenes" (headline card, location/map card, timeline card, source card)
  driven by the script JSON, muxed with narration audio and subtitle burn-in
  via ffmpeg. No AI-generated faces; silhouette/icon illustrations only.

## 7. Server vs. Android split

**Server (backend):** news ingestion, all AI calls (classification, scoring,
script generation, translation, safety/moderation), TTS, video rendering,
deduplication, storage, admin workflow, auth, analytics aggregation, push
notification dispatch. This is mandated by §27 ("Do not make the Android
application perform expensive AI/video-processing tasks") and §37 (keys
never ship in the APK).

**Android (client):** onboarding + language picker, feed browsing,
category/state/district filters (client-side selection UI only — no GPS),
video playback (ExoPlayer/Media3) with subtitles, search UI, save/like/share/report
actions (thin API calls), settings (language, notification prefs), local
caching (Room) of feed metadata/thumbnails for offline browsing, FCM
registration.

## 8. Cheapest practical technology choices (MVP)

| Concern | MVP choice | Why |
|---|---|---|
| Backend runtime | Node.js + TypeScript (Express) | fast to build, huge ecosystem, easy queue integration |
| DB | PostgreSQL (managed, e.g. Neon/Supabase/RDS free-tier to start) | relational integrity for the story graph, JSON columns for flexible fields |
| Queue | Redis + BullMQ | simplest reliable job queue, one Redis instance covers all queues at MVP scale |
| Object storage/CDN | Cloudflare R2 (or S3) + Cloudflare CDN | R2 has no egress fee, cheapest at MVP video-serving scale |
| LLM (classify/score/script/translate) | Claude (Anthropic API), Haiku-tier model for classification/scoring, Sonnet-tier for script generation/translation | one vendor, strong Indian-language quality, cheap small model for the high-volume filtering steps |
| TTS | Google Cloud TTS (Chirp/Neural2 Indian-language voices) | broadest good-quality coverage of the 9 target languages incl. Assamese/regional accuracy |
| Video render | Self-hosted ffmpeg-based template renderer (no third-party video-AI API) | avoids per-second video-AI cost entirely; only compute cost |
| Push notifications | Firebase Cloud Messaging | free, standard for Android |
| Admin dashboard | React + Vite, static hosted | no separate backend needed, talks to same API |
| Android | Kotlin, Jetpack Compose, Media3/ExoPlayer, Retrofit, Room, Hilt, DataStore | matches §36 requirement exactly |

This keeps the only true per-unit recurring costs to: News API calls, LLM
tokens, TTS characters, and storage/CDN egress — everything else is fixed
infra cost.

## 9. External APIs/services required

- A licensed News API (e.g. NewsAPI.org/NewsData.io or a direct licensing
  deal with an Indian news aggregator) and/or public RSS feeds of Indian
  outlets that permit syndication under their terms.
- Anthropic API (Claude) for classification, scoring assistance, script
  generation, translation, and safety/moderation linting.
- A TTS API with Indian-language coverage (Google Cloud TTS chosen for MVP;
  Azure Neural TTS as a swappable alternative).
- Firebase (Cloud Messaging + optionally Auth) for notifications.
- Object storage + CDN (Cloudflare R2/CDN or S3/CloudFront).
- Managed Postgres + Redis hosting.
- Error/monitoring (e.g. Sentry) — operational, not user-facing.

## 10. Cost estimates

Rough, LLM/TTS-dominated estimates; see `docs/COST_ESTIMATES.md` for the
full breakdown and assumptions (per-article LLM token counts, per-minute TTS
character counts, funnel ratios from §29). Order-of-magnitude summary:

| Volume (published stories/month) | Articles ingested (est., 100:1 funnel) | Approx. monthly cost |
|---|---|---|
| 1,000 | ~100,000 | ~$800–$1,500 |
| 10,000 | ~1,000,000 | ~$6,000–$12,000 |
| 100,000 | ~10,000,000 | ~$45,000–$90,000 |

Cost is dominated by (a) the classification LLM pass run over *every*
ingested article (cheap per call, but highest volume) and (b) TTS characters
× 9 languages for every published story. Video rendering (ffmpeg, self
hosted) and storage/CDN are comparatively small until very high volume.

## 11. Legal, copyright & privacy considerations

- **Copyright**: never store/republish full article bodies or scraped
  photographs; store only headline, URL, publish date, and short factual
  extracts needed for scripting; always show "Source: X" + "Read original
  report" deep link; video visuals are original illustrations only.
- **Defamation/accuracy**: enforce the allegation-vs-fact language rules
  (§10) programmatically, not just via prompt instructions — the safety
  linter must be able to block publication, and admin review is the backstop
  before any auto-publish is enabled.
- **Privacy of private individuals**: redact addresses, phone numbers,
  Aadhaar/financial numbers; especially conservative handling for minors
  (no imagery, no identifying details) per §11.
- **Presumption of innocence**: never state a criminal allegation as fact;
  always attribute to police/FIR/court as applicable; keep the accused's
  legal status current if it changes (conviction, acquittal, discharge).
- **Data minimization**: no GPS/location permission ever requested (§20);
  user accounts collect minimal PII; analytics avoid unnecessary personal
  data (§33).
- **Content licensing**: any News API / RSS usage must be reviewed against
  that provider's terms of service before enabling in production; the
  `NewsSourceProvider` registry includes a `licenseNotes` field so this is
  tracked per source.
- **Sensitive-topic handling**: sexual offences, minors, suicide, domestic
  violence get extra moderation gates and more conservative default
  thresholds (configurable by admins), consistent with common
  newsroom guidelines (e.g. suicide-reporting guidelines: no method
  detail, helpline info instead).
- **Admin accountability**: every admin action is audit-logged (`AdminAuditLog`)
  so editorial decisions are traceable.

## 12. MVP scope for this implementation pass

Per §41/§43: build incrementally, test each module, start with
Hindi + English fully wired (TTS/translation) while architecting for all 9
languages from day one (schema, string resources, and provider interfaces
already support all 9).

1. Backend: Prisma schema, static reference data (languages, categories,
   India states/districts), news ingestion module + mock provider,
   classification (rule-based fallback + Anthropic-backed), dedup engine,
   scoring engine, safety/moderation module, script generator, translation
   module, TTS module (mock + Google adapter), subtitle generator,
   video-render module (ffmpeg template renderer + mock), pipeline
   orchestrator + BullMQ workers, public REST API, admin REST API, tests.
2. Admin dashboard: pipeline funnel stats, story review/approve/reject/edit,
   regenerate actions, source management, threshold config.
3. Android app: language onboarding (9 languages), home feed with category
   tabs, video player with captions, search, India→State→District→City
   filter (no GPS), settings (language + notifications), Retrofit/Room data
   layer against the backend API.
4. Docs: this file, cost estimates, legal/privacy notes, pipeline diagram.

Real provider API keys (Anthropic, News API, TTS, Firebase, storage) are
never committed; `.env.example` documents every required variable and every
module has a mock implementation so the system runs end-to-end offline for
development and tests.
