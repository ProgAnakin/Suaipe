#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
name="suaipe-sql-test-$$"
docker run -d --rm --name "$name" -e POSTGRES_HOST_AUTH_METHOD=trust postgres:17-alpine >/dev/null
trap 'docker rm -f "$name" >/dev/null' EXIT
for attempt in {1..30}; do
  if docker exec "$name" pg_isready -U postgres >/dev/null 2>&1; then break; fi
  sleep 1
done
{
  cat supabase/tests/bootstrap.sql
  for migration in supabase/migrations/*.sql; do cat "$migration"; done
  cat supabase/tests/release-security.sql
} | docker exec -i "$name" psql -U postgres -v ON_ERROR_STOP=1
