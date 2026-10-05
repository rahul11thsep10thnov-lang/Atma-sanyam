# Atma Sanyam

A multilingual (12 Indian languages) AI-assisted family-news video platform:
an Android app that surfaces 2–4 minute narrated videos about family
disputes, conflicts and crimes reported in Indian news, generated only when
a story is substantial enough to support real narration — never padded.

Start here:

- **[`ARCHITECTURE.md`](./ARCHITECTURE.md)** — system design, database
  schema, API architecture, the news→video AI pipeline, server-vs-Android
  split, technology choices, and cost estimates. Read this first.
- **[`docs/VIDEO_STUDIO.md`](./docs/VIDEO_STUDIO.md)** — the Video Studio:
  article → factual master script → 12-language animated videos (≤ 5 min)
  with base voices, safe visual substitution, subtitles, QC and approval.
- **[`docs/architecture/2.5d-target-architecture.md`](./docs/architecture/2.5d-target-architecture.md)**
  — the cinematic 2.5D production line: Story → Episode → Scene → Shot →
  layered scene package → 2.5D engine → master visual → per-language audio.
  Subsystem docs are in `docs/architecture/`; runbooks are in `docs/operations/`.
- **[`docs/COST_ESTIMATES.md`](./docs/COST_ESTIMATES.md)** — recurring cost
  projections at 1,000 / 10,000 / 100,000 published videos per month.
- **[`docs/LEGAL_AND_PRIVACY.md`](./docs/LEGAL_AND_PRIVACY.md)** —
  copyright, defamation/accuracy, and privacy considerations the pipeline
  is built to enforce.

## Repository layout

```
atma-sanyam/
├── ARCHITECTURE.md          # design doc — read first
├── docs/                    # cost, legal/privacy, architecture/, operations/, demo/
├── backend/                 # Node.js/TypeScript API, AI news/video pipeline, 2.5D engine, workers
├── admin-dashboard/         # React admin SPA: editorial review, Studio, Production (shots, assets, models, ops)
├── inference-server/        # reference GPU inference API (FastAPI) for self-hosted models
└── android/                 # Kotlin + Jetpack Compose app
```

Each subproject has its own README with setup instructions:
[`backend/README.md`](./backend/README.md),
[`admin-dashboard/README.md`](./admin-dashboard/README.md),
[`android/README.md`](./android/README.md).

## Status

MVP per `ARCHITECTURE.md` §12: the full pipeline (ingest → family-relevance
classification → duplicate detection → suitability/quality scoring →
script generation → journalistic safety/moderation → admin review →
translation → TTS → subtitles → template video render → publish) runs
end-to-end against a mock news provider with zero external API keys, and
every stage has a pluggable interface so a real News API, Anthropic Claude,
a TTS vendor, and object storage can be swapped in via environment
variables without code changes. Hindi and English are fully wired
end-to-end; all 12 languages are present in the schema and provider
interfaces (the Android app bundles UI strings for 8 of them and falls
back to English UI text for the rest).

### Video Studio

`docs/VIDEO_STUDIO.md` adds an editor-driven production line: paste an
article (or send a news story to the Studio), and the system extracts facts
with verification status, builds a timeline and characters, writes a
structured master script, classifies every scene SAFE / SENSITIVE /
RESTRICTED (restricted visuals are replaced, narration never is), localises
per scene into up to 12 languages, assigns the 8 reusable base voices,
synthesises speech, and renders per-language MP4s (plus an optional
multi-audio package) with SRT/VTT subtitles through FFmpeg. Every unit of
work is a tracked, retryable job; editing one scene or one language
regenerates only that part. Nothing is published without an administrator,
and sensitive stories are never auto-published. Without API keys it runs
end-to-end with placeholder art and silent placeholder voices, which QC
flags. The keys you need are listed in `docs/VIDEO_STUDIO.md` §11.

### Cinematic 2.5D production

Stories created with `productionMode: CINEMATIC_25D` go further. The
approved master script is directed into an episode of shots. Each shot is
a layered composition with:

* a background plate, midground elements, rigged characters, props and foreground
* depth
* a camera move
* acting beats
* lights, particles, focus and a grade

The assets come from self-hosted open-weight models through ComfyUI or the
internal inference API, or from the built-in procedural painter when no GPU
is available. Each asset is reused across shots and stories whenever it is
equivalent.

The TypeScript 2.5D engine renders each shot at 1080×1920 @ 30 on CPU
render hosts. The shots are joined into one master visual, and every
language adds only its audio, subtitles and a localized "Visual
reconstruction" disclosure.

Publishing is gated on all of the following:

* shot QC passes;
* no unapproved placeholder art remains;
* every asset comes from a licence-cleared model;
* the existing editorial approval is given.

Try the engine without any setup beyond `npm ci`:

```bash
cd backend && npm run demo:railway -- --out ./demo-output   # 5 s, 1080×1920 @ 30
```

Start with `docs/architecture/2.5d-target-architecture.md`, then
`docs/operations/gpu-deployment.md` for the deployment sequence.
