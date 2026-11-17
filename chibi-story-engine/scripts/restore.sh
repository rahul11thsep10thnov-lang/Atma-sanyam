#!/usr/bin/env bash
# Restore a backup made by scripts/backup.sh.
#   scripts/restore.sh <backup-directory> [--files-to DIR]
# The target database (CSAE_DATABASE_URL) must exist and be empty. Files are only unpacked when --files-to is given.
set -euo pipefail
SRC="${1:?usage: restore.sh <backup-directory> [--files-to DIR]}"
URL="${CSAE_DATABASE_URL:?set CSAE_DATABASE_URL to the database to restore into}"
PG_URL="postgresql://${URL#*://}"

(cd "$SRC" && sha256sum --check --quiet SHA256SUMS)          # refuse a damaged backup
pg_restore --no-owner --exit-on-error --dbname "$PG_URL" "$SRC/database.dump"
if [ "${2:-}" = "--files-to" ]; then
  DEST="${3:?--files-to needs a directory}"
  mkdir -p "$DEST"
  for archive in "$SRC"/*.tar.gz; do tar -xzf "$archive" -C "$DEST"; done
fi
echo "restored from $SRC"
