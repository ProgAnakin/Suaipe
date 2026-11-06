#!/usr/bin/env bash
# Historical vulnerable database snapshot through 2026-11-03 only.
# Current security regressions run via npm run test:db. Never a CI approval gate.
set -euo pipefail
cd "$(dirname "$0")/../../.."
name="suaipe-prelaunch-probes-$$"
docker run -d --rm --name "$name" -e POSTGRES_HOST_AUTH_METHOD=trust postgres:17-alpine >/dev/null
trap 'docker rm -f "$name" >/dev/null' EXIT
for attempt in {1..30}; do
  # The image's temporary init server accepts Unix sockets before restart.
  # TCP readiness avoids racing that restart.
  if docker exec "$name" pg_isready -h 127.0.0.1 -U postgres >/dev/null 2>&1; then break; fi
  sleep 1
done
{
  cat supabase/tests/bootstrap.sql
  for migration in supabase/migrations/*.sql; do
    if [[ "${migration##*/}" < "20261106000000" ]]; then cat "$migration"; fi
  done
  cat docs/audits/2026-11-06/probes.sql
} | docker exec -i "$name" psql -U postgres -v ON_ERROR_STOP=1
python docs/audits/2026-11-06/concurrency.py "$name"
