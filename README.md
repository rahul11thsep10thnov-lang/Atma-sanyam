# Atma Sanyam

A multilingual (9 Indian languages) AI-assisted family-news video platform:
an Android app that surfaces 2–4 minute narrated videos about family
disputes, conflicts and crimes reported in Indian news, generated only when
a story is substantial enough to support real narration — never padded.

Start here:

- **[`ARCHITECTURE.md`](./ARCHITECTURE.md)** — system design, database
  schema, API architecture, the news→video AI pipeline, server-vs-Android
  split, technology choices, and cost estimates. Read this first.
- **[`docs/COST_ESTIMATES.md`](./docs/COST_ESTIMATES.md)** — recurring cost
  projections at 1,000 / 10,000 / 100,000 published videos per month.
- **[`docs/LEGAL_AND_PRIVACY.md`](./docs/LEGAL_AND_PRIVACY.md)** —
  copyright, defamation/accuracy, and privacy considerations the pipeline
  is built to enforce.

## Repository layout

```
atma-sanyam/
├── ARCHITECTURE.md          # design doc — read first
├── docs/                    # cost + legal/privacy analysis
├── backend/                 # Node.js/TypeScript API + AI news/video pipeline workers
├── admin-dashboard/         # React admin SPA for the editorial review workflow
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
end-to-end; all 9 languages are present in the schema, string resources,
and provider interfaces from day one.
