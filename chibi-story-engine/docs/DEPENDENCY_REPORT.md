# Dependency report

## System packages

| Package | Version found | Used for | Required |
|---|---|---|---|
| ffmpeg, ffprobe | 6.1.1 | encoding, assembly, probing, black-frame and decode checks | yes |
| postgresql | 16.15 | stories, assets, jobs, audit | yes (backend) |
| espeak-ng | 1.51 | local Hindi narration and dialogue | one voice provider is needed |
| fonts-noto-core | 20201225 | Devanagari text in generated art | only for the asset forge |
| libegl1, libgl1, libxrender1, libxi6, libxkbcommon0, libsm6, libxfixes3, libxxf86vm1 | distro | shared libraries `bpy` links against | yes (rendering) |
| node | 22 | dashboard build and Playwright tests | dashboard only |

## Python packages (`pyproject.toml`)

| Group | Packages | Why |
|---|---|---|
| core | pydantic 2, pydantic-settings, numpy, pillow | schemas, audio DSP, image inspection |
| `render` | bpy 5.3 | Blender as a Python module (Cycles) |
| `backend` | fastapi, uvicorn, sqlalchemy 2, alembic, psycopg 3, python-multipart, bcrypt, pyjwt | API, ORM, migrations, auth |
| `forge` | cairosvg | rasterising the procedurally drawn SVG art |
| `llm` | anthropic | optional LLM story analysis |
| `dev` | pytest, httpx | tests |

## Deliberately not used

| Suggested | Decision | Why |
|---|---|---|
| Redis + Celery | not used in the MVP | One render at a time saturates the CPU (Cycles uses every core). Jobs run in an in-process worker with state in PostgreSQL and each scene in its own subprocess, which already gives progress, cancellation, retry, timeouts and restart recovery. `backend/workers/runner.py` is the seam where a Celery task would call the same `RenderService`. |
| Kubernetes | not used | not required for the MVP |
| Paid generative video/image APIs | not used | the renderer only uses library assets |
| Piper / neural TTS | not available | model hosts are unreachable from this environment; `VoiceProvider` makes adding one a single class |

## Unavailable here

- Docker daemon: `Dockerfile` and `docker-compose.yml` are provided but were not built in this environment.
- Sarvam AI and LLM credentials: adapters exist; they are exercised only against recorded/fake transports in tests.
