#!/usr/bin/env bash
# Back up the database and the files that cannot be regenerated.
#   scripts/backup.sh [output-directory]          (default: ./backups)
# Uses CSAE_DATABASE_URL (SQLAlchemy form) or PG* variables. Renders are not included: they are reproducible.
set -euo pipefail
cd "$(dirname "$0")/.."
OUT="${1:-backups}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
DEST="$OUT/csae_$STAMP"
URL="${CSAE_DATABASE_URL:-postgresql+psycopg://csae:csae-dev@localhost:5432/csae_dev}"
PG_URL="postgresql://${URL#*://}"
DATA_ROOT="${CSAE_DATA_ROOT:-.}"
LIBRARY="${CSAE_ASSET_LIBRARY:-$DATA_ROOT/asset_library}"

mkdir -p "$DEST"
pg_dump --format=custom --no-owner --file "$DEST/database.dump" "$PG_URL"
tar -czf "$DEST/asset_library.tar.gz" -C "$(dirname "$LIBRARY")" "$(basename "$LIBRARY")"
[ -d "$DATA_ROOT/stories" ] && tar -czf "$DEST/stories.tar.gz" -C "$DATA_ROOT" stories
(cd "$DEST" && sha256sum database.dump ./*.tar.gz > SHA256SUMS)
echo "$DEST"
