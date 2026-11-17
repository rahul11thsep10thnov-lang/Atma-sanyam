# Testing guide

```bash
python -m pytest                        # everything
python -m pytest -m "not render"        # no Blender: about 20 seconds
python -m pytest tests/acceptance/test_phase09_rendering.py
cd frontend && npm run build && npm run e2e      # browser end-to-end (starts its own server and database)
python -m tools.make_references         # re-approve visual reference frames (only after reviewing a look change)
```

Tests that need something this machine lacks skip themselves: `render` (bpy + FFmpeg), `db` (PostgreSQL at
`CSAE_TEST_DATABASE_URL`), `tts` (espeak-ng).

## Layout

| Path | What it covers |
|---|---|
| `tests/integration/test_phase1_foundation.py` | migrations, constraints, auth and roles, project/story API, error shape |
| `tests/integration/test_production_api.py` | the whole production flow over HTTP: analysis → storyboard → edits → audio → render jobs → exports → publishing; uploads; cancel and restart recovery |
| `tests/acceptance/test_phase02…12_*.py` | one file per phase; test names follow the numbered acceptance criteria |
| `tests/rendering/test_visual_regression.py` | approved reference frames vs fresh Blender renders, with tolerances |
| `frontend/e2e/production.e2e.mjs` | the ten dashboard acceptance steps in a real browser; writes `docs/screenshots/` |

## Principles

- Rendering tests assert on real files made by Blender and FFmpeg (frame counts, sizes, decoded frames). Nothing in
  the render path is mocked. The only stand-ins are for external services: `ToneProvider` for a voice service and
  `FakeLLM` for a language model.
- API tests run against a real PostgreSQL database migrated by Alembic, and against a copy of the asset library so
  uploads and approvals never change the shipped one.
- Tests that produce pictures, sound or video copy them to `renders/test_artifacts/` so a person can look and listen.
  A selection is kept in `docs/samples/`.

## Visual regression

`engine/quality_control/visual.py` compares a candidate with a reference using three measures: mean difference, share
of noticeably changed pixels, and the worst coarse block (which catches a missing or moved object). Tolerances are a
`Tolerance` value; the defaults pass encoder-level noise and fail a displaced character. A failing comparison is a
request for review, not proof of a bug: if the new look is intended, regenerate the references.

## Continuous integration

`.github/workflows/chibi-engine.yml` runs the Python suite (with real preview-size renders) whenever files under
`chibi-story-engine/` change.
