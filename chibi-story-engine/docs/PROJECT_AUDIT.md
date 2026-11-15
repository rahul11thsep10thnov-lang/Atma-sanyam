# Project audit (Phase 0)

Audited 2026-11-15 on the branch this work lives on.

## What the repository already contains

The repository is **Tame**, a shipped focus-timer product. It has nothing to do with animation.

| Area | Path | Stack | Notes |
|---|---|---|---|
| Mobile app | `/` (`App.tsx`, `src/`, `assets/`) | Expo SDK 57, React Native 0.86, TypeScript | 2,328 tracked files in total, most of them art under `assets/` |
| API | `/backend` | Node 22, Express 5, Drizzle, PostgreSQL | 105 integration tests (vitest) |
| Admin console | `/admin` | Next.js 16, React 19 | |
| Art tooling | `/tools/balcony-render` | Python + `bpy` (Blender as a module), Cycles | renders the app's pictures; documents that Cycles needs no GPU |
| Docs, CI | `/docs`, `.github/workflows/ci.yml` | | CI: backend tests, admin build, mobile typecheck + bundles |
| Loose files | `/banana_1.png` … `banana_7.png` | | plant growth pictures from the last commit ("Add files via upload") |

No story, character, rig, audio or video-pipeline code exists. There are no chibi character or
environment assets to reuse.

## Decision: where the engine lives

The engine is a new, self-contained project in **`/chibi-story-engine`**. Reasons:

- The instruction is to preserve existing work; the Tame app, API and admin console are untouched.
- The two products share no code, runtime or deployment (Python/Blender vs Node/Expo).
- One folder can later be moved to its own repository with `git subtree split` without rewriting anything.

Changes outside that folder are limited to: `/.easignore` (so EAS app builds do not upload the engine)
and `/.github/workflows/chibi-engine.yml` (a separate workflow that only runs when the engine changes).

## Baseline of the existing project

| Check | Result |
|---|---|
| `backend`: `npm test` (PostgreSQL 16) | 105 passed. One run showed a single failure that did not reproduce on the next run with no code change, so it is a pre-existing flaky test, not something introduced here. |
| `tools/checks/growth_sizes.mjs` | all checks passed |
| `tools/checks/paradise_layout.mjs` | all checks passed |
| Mobile typecheck / bundles, admin build | not run (no files they compile were changed) |

## Environment found

| Item | Found | Action |
|---|---|---|
| OS | Ubuntu 24.04, x86-64, 4 CPU cores, 15 GB RAM, no GPU | |
| Python | 3.13 and 3.12 | venv on 3.13 (the `bpy` 5.3 wheel is CPython 3.13 only) |
| Blender | not installed | installed as the `bpy` 5.3.0 wheel |
| FFmpeg / ffprobe | 6.1.1 present | |
| PostgreSQL | client only | installed server 16.15, created role and databases |
| Redis | present | not used (see ARCHITECTURE: in-process job runner) |
| Docker | client only, no daemon | Dockerfiles are written but cannot be built here |
| Hindi speech | none | installed `espeak-ng` (Hindi voice) |
| Devanagari fonts | none | installed `fonts-noto-core` |
| Node | 22 | used for the dashboard |
| Network | package registries only (pip, apt, npm); blender.org, huggingface.co, font and model hosts are blocked | no model or asset downloads; all art and audio assets are generated locally |
| API keys | none (no Sarvam, no LLM key) | provider adapters are implemented; local providers are used |

## Measurements that shaped the design

A 30-layer textured cutout scene, rendered headless with `bpy`:

| Engine | 1920x1080 | 640x360 |
|---|---|---|
| Cycles, CPU, 1 sample | about 0.5 s per frame | about 0.1 s per frame |
| EEVEE (software GL) | 38–48 s per frame | — |
| Workbench | fails to start without a GPU | — |

Cycles on CPU is therefore the render path. Cutout layers are emission shaders, so one sample
gives the exact colour and a few samples only add edge anti-aliasing.
