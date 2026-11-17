# Changelog

## 0.1.0 — MVP

- **Phase 0–1:** repository audit; FastAPI + SQLAlchemy + Alembic backend; JWT auth with roles; project and story API.
- **Phase 2:** rule-based Hindi/English story analyser driven by language packs; LLM provider interface with a Claude
  adapter and strict validation of model output; storyboard builder that stages scenes from library metadata.
- **Phase 3:** file-based asset library with manifests, checksums, immutable versions, search; character registry.
- **Phase 4:** layered cutout rigs (`biped_chibi`, `quadruped_reptile`), forward kinematics, rig validation;
  procedurally drawn characters: monkey, crocodile, crocodile's wife, lion, rabbit, jackal, blue jackal, farmer, rich man.
- **Phase 5:** layered environments with parallax, moving water and foliage, lighting and weather presets; guarded
  2.5D camera with eleven presets; seven environments.
- **Phase 6:** 48 animation clips, state machine, transitions, constraints, lip-sync and blink overlays.
- **Phase 7:** voice providers (espeak-ng, Sarvam AI adapter, test adapter), voice registry, audio cache, timing,
  mixer with ducking and limiting, synthesised music and sound effects.
- **Phase 8:** scene composer producing deterministic ScenePlans; props, effects, riding, travel.
- **Phase 9:** Blender (Cycles) worker, FFmpeg assembly, scene cache, retry, resume, cancellation, validation.
- **Phase 10:** production dashboard (React, TypeScript, Tailwind) with twelve sections; browser end-to-end test.
- **Phase 11:** quality control, visual regression, backup/restore, time limits, container deployment files.
- **Phase 12:** four stories rendered by the same engine: Monkey and the Crocodile, Lion and the Clever Rabbit,
  The Blue Jackal, The Farmer and the Rich Man.
