# Cost Estimates

Estimates for the AI/news pipeline described in `ARCHITECTURE.md` §6/§10.
These are planning-level order-of-magnitude figures, not vendor quotes —
recompute against actual contracted rates before committing budget.

## Assumptions

- Funnel ratios follow §29: roughly 100 ingested articles → 1 published
  video (10,000 → 6,000 after dedup → 1,500 after family-relevance →
  300 after suitability → 100 after safety/quality → 100 scripts/videos).
- Classification + suitability scoring runs on **every** ingested article
  using a small/cheap LLM call (~500 input tokens, ~150 output tokens).
- Script generation + safety pass runs only on articles that reach the
  script stage (~3,000 input tokens incl. source text, ~1,200 output
  tokens for a 2–4 min script).
- Translation runs per published story per enabled language beyond the
  source language (assume 8 additional languages at MVP steady state),
  each ~1,200 input + 1,200 output tokens.
- TTS runs per published story per language: ~2–3 minutes of narration ≈
  1,800–2,700 characters per language.
- Video rendering is self-hosted ffmpeg (compute only, no per-second
  vendor fee).
- Storage/CDN: ~15 MB average per finished video (H.264, 720p, ~3 min).

## Per-unit rough pricing used

- LLM (Claude, blended small+large model usage): ~$0.25–$3 per million
  input tokens, ~$1.25–$15 per million output tokens depending on model
  tier used for each stage (cheap model for classification/scoring, larger
  model for script generation/translation/safety).
- TTS: ~$4–$16 per million characters depending on voice tier/provider.
- News API: licensing/subscription tiers vary widely; modeled as a flat
  monthly subscription band rather than per-call.
- Object storage + CDN egress (R2-style, no egress fee): ~$0.015/GB stored.
- Compute (ingestion/AI orchestration/video render workers): a handful of
  small-to-medium cloud instances, scaling with video-render concurrency.

## Estimated monthly cost by volume

| Published videos/month | Articles ingested | Classification/scoring LLM | Script+safety LLM | Translation LLM (8 langs) | TTS (9 langs) | Storage+CDN | News API + infra (Postgres/Redis/compute) | **Total (approx.)** |
|---|---|---|---|---|---|---|---|---|
| 1,000 | ~100,000 | ~$40–$120 | ~$120–$300 | ~$150–$400 | ~$60–$150 | ~$15–$30 | ~$400–$600 | **~$800–$1,600** |
| 10,000 | ~1,000,000 | ~$400–$1,200 | ~$1,200–$3,000 | ~$1,500–$4,000 | ~$600–$1,500 | ~$150–$300 | ~$1,500–$3,000 | **~$5,300–$13,000** |
| 100,000 | ~10,000,000 | ~$4,000–$12,000 | ~$12,000–$30,000 | ~$15,000–$40,000 | ~$6,000–$15,000 | ~$1,500–$3,000 | ~$6,000–$12,000 (needs horizontal scaling: more DB read replicas, worker fleets, CDN tier) | **~$45,000–$110,000** |

## Where to optimize first

1. **Never skip the cheap pre-filters.** The rule-based keyword pre-filter
   before the LLM classification call is the single biggest lever — it
   should reject obviously irrelevant articles (sports, general politics,
   markets, entertainment with no family-dispute terms) before spending any
   LLM tokens.
2. **Batch classification calls** where the provider supports batching/
   prompt caching to cut effective per-article cost.
3. **Cache TTS/translation** per canonical story+language — never regenerate
   audio/translation for a story that hasn't changed (`AudioAsset`/
   `StoryTranslation` are keyed for reuse, see schema).
4. **Reuse the visual template render** across languages where the visual
   track doesn't depend on language (only audio + subtitle track differ),
   cutting render compute roughly 1/N languages.
5. Revisit News API licensing cost once real source volume/terms are known
   — it is the least predictable line item here.
