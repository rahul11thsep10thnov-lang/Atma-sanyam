# Project status

Last verified: 2026-11-17. Environment: Ubuntu 24.04, 4 CPU cores, no GPU, Python 3.13, Blender 5.3 (`bpy` wheel),
FFmpeg 6.1, PostgreSQL 16, Node 22.

| Phase | State |
|---|---|
| 0 Repository inspection and foundation | done |
| 1 Core backend foundation | done |
| 2 Story intelligence | done |
| 3 Character and asset manager | done |
| 4 Character rigging | done |
| 5 Environment engine | done |
| 6 Animation engine | done |
| 7 Audio engine | done |
| 8 Scene composition | done |
| 9 Rendering engine | done |
| 10 Production dashboard | done |
| 11 Quality and hardening | done, with the limits listed below |
| 12 Story reusability | done |

## Test results (this checkout)

| Run | Result |
|---|---|
| `python -m pytest` (full run, PostgreSQL stopped) | 102 passed, 23 skipped (all 23 need PostgreSQL), 7 min 16 s |
| PostgreSQL-backed tests (`tests/integration`, Phase 11 database tests) | 30 passed, 1 min 6 s |
| `npm run e2e` (browser, ten dashboard acceptance steps) | 10 passed, 2 min 2 s |
| Existing Tame backend (`/backend`, 105 tests) | 105 passed on the baseline run; one test failed once on an earlier run and passed on re-run with no change |

Nothing failed. Nothing is marked as passing that was skipped: the 23 skipped tests were run separately after
PostgreSQL was restarted (the one `render` test in that group, the full end-to-end story, had already passed in the full run).

## Delivered films (1920×1080, 24 fps, H.264 + AAC, all passed the automatic quality checks)

| Story | Length | Frames | File |
|---|---|---|---|
| Monkey and the Crocodile (बंदर और मगरमच्छ) | 2:21 | 3,379 | `renders/final/monkey_and_crocodile/` |
| Lion and the Clever Rabbit | 1:11 | 1,703 | `renders/final/lion_and_clever_rabbit/` |
| The Blue Jackal | 1:09 | 1,658 | `renders/final/blue_jackal/` |
| The Farmer and the Rich Man | 1:03 | 1,504 | `renders/final/farmer_and_rich_man/` |

Render time at 1080p with 2–3 worker processes on 4 cores: about 40 minutes for the first film, 15–25 minutes for each
of the others.

## What exists

- **Engine** (`engine/`, ~12,000 lines with backend and tools): story analysis (Hindi, English), storyboard builder,
  asset library with versions and checksums, layered rigs, 48 animation clips, 2.5D camera, scene composer, Blender
  worker, FFmpeg wrapper, render service (cache, retry, resume, cancel), audio (providers, cache, timing, mixer),
  quality control, visual regression.
- **Backend** (`backend/`): 18 tables, one Alembic migration, JWT auth with four roles, 41 endpoints, in-process
  render job runner with restart recovery.
- **Dashboard** (`frontend/`): 12 sections, built and tested in a real browser; screenshots in `docs/screenshots/`.
- **Library** (`asset_library/`): 9 characters, 7 environments, 3 props, particle effects, 2 music tracks, 7 sound
  effects, 9 voices, 2 rig templates.

## Acceptance criteria by phase

Each phase's numbered criteria map to a test of the same number in `tests/acceptance/test_phaseNN_*.py` (see
`docs/TESTING_GUIDE.md`). Rendering criteria are verified on real Blender and FFmpeg output; sample outputs are in
`docs/samples/` and `renders/final/`.

## Limitations (what is not done, or not as good as it sounds)

1. **Art and voice are placeholders of the procedural kind.** No image generator or neural voice service was
   reachable. Characters and backgrounds are vector drawings; speech is espeak-ng, which is intelligible but
   robotic. Every shipped design is `pending` approval. The design is built so that hand-painted layers or Sarvam AI
   voices replace them as ordinary assets/providers, but that swap has not been done.
2. **Sarvam AI and the LLM analyser were never run against the real services** (no credentials here). They are
   tested against recorded/fake transports only.
3. **Docker files were not built** (no Docker daemon). `Dockerfile` and `docker-compose.yml` are unverified.
4. **No security review by a third party.** Checks done: input validation, path confinement, upload checks, role
   checks, password hashing, token expiry, no secrets in the tree, all covered by tests. No penetration test, no rate
   limiting, no account lockout. Put the service behind a TLS reverse proxy.
5. **No performance testing beyond timing renders.** The API was not load-tested; one render job at a time per
   machine is the design.
6. **Visual regression** compares four reference frames of one story; it is a safety net, not full coverage.
7. **Animation is cutout-style**: characters have one view each and turn by flipping. Camera moves and effects are
   generic. Quality is that of a clean children's cartoon, not premium anime.
8. **The rule-based analyser** knows the vocabulary in its language packs. New stories may need entries there (or the
   LLM analyser) and a review of the generated storyboard; the four shipped stories were checked by eye.
9. **Celery/Redis were deliberately not used**; scaling beyond one machine needs a queue (see the deployment guide).
10. **Continuous integration workflow** (`.github/workflows/chibi-engine.yml`) has not run on GitHub.

## Next steps

Replace the procedural art with painted layers and approve the designs; connect Sarvam AI (set
`CSAE_SARVAM_API_KEY`) and compare voices; build the container image; add rate limiting; widen the lexicon with more
stories.
