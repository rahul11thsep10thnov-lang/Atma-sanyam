#!/usr/bin/env bash
# Development environment for the Chibi Story Animation Engine on Debian/Ubuntu.
# Idempotent. Run from chibi-story-engine/:  bash scripts/setup_dev.sh
set -euo pipefail
cd "$(dirname "$0")/.."

SUDO=""; [ "$(id -u)" -ne 0 ] && SUDO="sudo"
export DEBIAN_FRONTEND=noninteractive
$SUDO apt-get update -qq
# FFmpeg: encoding. espeak-ng: local Hindi voice. Noto: Devanagari glyphs. libegl/libgl...: needed to import bpy.
$SUDO apt-get install -y -qq ffmpeg espeak-ng fonts-noto-core postgresql \
  libegl1 libgl1 libxrender1 libxi6 libxkbcommon0 libsm6 libxfixes3 libxxf86vm1

command -v uv >/dev/null || pip install uv
[ -d .venv ] || uv venv --python 3.13 .venv
# bpy 5.3 ships CPython 3.13 wheels only; the venv's Python must match the wheel.
uv pip install --python .venv/bin/python -e ".[render,backend,forge,llm,dev]"

# PostgreSQL: one role, a development and a test database.
$SUDO service postgresql start || $SUDO pg_ctlcluster 16 main start || true
as_pg() { if [ "$(id -u)" -eq 0 ]; then su postgres -c "$1"; else sudo -u postgres bash -c "$1"; fi; }
as_pg "psql -tAc \"select 1 from pg_roles where rolname='csae'\" | grep -q 1 || psql -qc \"create role csae login password 'csae-dev' createdb\""
for db in csae_dev csae_test; do
  as_pg "psql -tAc \"select 1 from pg_database where datname='$db'\" | grep -q 1 || createdb -O csae $db"
done

.venv/bin/alembic upgrade head
echo "Ready. Activate with: source .venv/bin/activate"
