# Development setup

Tested on Ubuntu 24.04. Everything below runs from `chibi-story-engine/`.

```bash
bash scripts/setup_dev.sh        # system packages, venv (Python 3.13), PostgreSQL role + databases, migrations
source .venv/bin/activate
cp .env.example .env             # optional; defaults work for local development
```

What the script does, if you prefer to do it by hand:

1. `apt-get install ffmpeg espeak-ng fonts-noto-core postgresql` plus the GL/X libraries `bpy` links against.
2. `uv venv --python 3.13 .venv && uv pip install -e ".[render,backend,forge,llm,dev]"`.
   The Python version must match the `bpy` wheel (5.3.x is CPython 3.13).
3. PostgreSQL role `csae` (password `csae-dev`) and databases `csae_dev`, `csae_test`.
4. `alembic upgrade head`.

## Everyday commands

```bash
python -m pytest                              # everything; tests needing PostgreSQL/Blender/espeak skip if absent
python -m pytest -m "not render"              # fast tests only
alembic upgrade head                          # apply migrations
CSAE_USER_PASSWORD='a-long-password' python -m backend.cli create-user you@example.com --role admin
python -m backend.cli serve                   # API on http://127.0.0.1:8000, docs at /api/docs
python -m tools.asset_forge.build             # regenerate the procedural asset library
python -m engine.cli --help                   # validate / plan / render stories without the backend
cd frontend && npm install && npm run dev     # dashboard on http://localhost:5173
```

## Configuration

All settings are environment variables with the `CSAE_` prefix (see `.env.example` and `backend/settings.py`).
`CSAE_JWT_SECRET` is mandatory unless `CSAE_ENV` is `development` or `test`.
