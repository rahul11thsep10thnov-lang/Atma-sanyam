# Implementation plan

Phases follow the specification. A phase is closed only when its acceptance tests pass
(`tests/acceptance/test_phaseNN_*.py` or the named integration test) and `PROJECT_STATUS.md` is updated.

| Phase | Scope | Acceptance evidence |
|---|---|---|
| 0 | Audit, architecture, environment | `docs/PROJECT_AUDIT.md`, baseline tests |
| 1 | Backend foundation: models, migrations, auth, project/story API | `tests/integration/test_phase1_foundation.py` |
| 2 | Story intelligence: Hindi analysis, storyboard, LLM interface | `tests/acceptance/test_phase02_story_intelligence.py` |
| 3 | Asset library: manifests, versions, checksums, registries | `tests/acceptance/test_phase03_assets.py` |
| 4 | Rigs: templates, kinematics, validation, Blender rig build | `tests/acceptance/test_phase04_rigging.py` + rendered sequence |
| 5 | Environments: layers, parallax, water, leaves, lighting, camera | `tests/acceptance/test_phase05_environment.py` + renders |
| 6 | Animation: catalogue, state machine, transitions | `tests/acceptance/test_phase06_animation.py` + rendered sequence |
| 7 | Audio: voices, cache, timing, mixing, lip-sync | `tests/acceptance/test_phase07_audio.py` + WAV samples |
| 8 | Scene composition from JSON, previews | `tests/acceptance/test_phase08_composition.py` + preview MP4 |
| 9 | Rendering: queue, cache, recovery, final encode | `tests/acceptance/test_phase09_rendering.py` + MP4 |
| 10 | Dashboard | Playwright `frontend/e2e/production.spec.ts` |
| 11 | Hardening: e2e, security, backup, deployment | `tests/acceptance/test_phase11_hardening.py`, full story render |
| 12 | Reusability: four stories, one engine | `tests/acceptance/test_phase12_reusability.py`, four MP4s |

## Ordering inside the code

The engine is built bottom-up so each layer is tested before the next depends on it:
schemas → asset library → rigs → clips → camera → composition → Blender worker → FFmpeg → services → API → dashboard.

## Known constraints carried through the plan

- No image-generation or neural-voice service is reachable, so the character and environment art is
  drawn procedurally (vector shapes rasterised to layers) and speech uses espeak-ng. Both sit behind
  the same manifests and provider interfaces that hand-painted art or a neural voice would use, and
  both are marked `pending` approval.
- One 1080p frame costs roughly 0.5–1.5 s of CPU, so previews render at 640×360.
