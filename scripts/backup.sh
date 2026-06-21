#!/usr/bin/env bash
set -euo pipefail
STAMP=$(date +%Y%m%d-%H%M%S)
OUT="./backups/folio-${STAMP}.sql.gz"
docker compose exec -T db pg_dump -U "${POSTGRES_USER:-folio}" "${POSTGRES_DB:-folio}" | gzip > "$OUT"
echo "Backup written: $OUT"
ls -1t ./backups/folio-*.sql.gz | tail -n +15 | xargs -r rm --
