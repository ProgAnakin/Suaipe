#!/usr/bin/env bash
# Applies every migration, from zero, to a throw-away database on a PostgreSQL server you point it
# at, then runs the security attack suite (security.sql) against it.
#
#   PGHOST=localhost PGUSER=postgres PGPASSWORD=… supabase/tests/run.sh
#   VERBOSE=on supabase/tests/run.sh        # list every check, not only the failures
#
# It creates (and finally drops) a database called suaipe_sql_test_<pid>, and the cluster-wide API
# roles of supabase-shim.sql — use a DISPOSABLE server (a local container, a CI service), never a
# real Supabase project. Needs `psql`; exits non-zero when a migration fails to apply or a check fails.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MIGRATIONS="$HERE/../migrations"
export PGHOST="${PGHOST:-localhost}" PGPORT="${PGPORT:-5432}" PGUSER="${PGUSER:-postgres}"
DB="suaipe_sql_test_$$"
q() { psql -X -q -v ON_ERROR_STOP=1 "$@"; }

cleanup() { psql -X -q -d postgres -c "DROP DATABASE IF EXISTS $DB" >/dev/null 2>&1 || true; }
trap cleanup EXIT

q -d postgres -c "CREATE DATABASE $DB" >/dev/null
q -d "$DB" -f "$HERE/supabase-shim.sql" >/dev/null

applied=0
for f in $(ls "$MIGRATIONS"/*.sql | sort); do
  if ! q -d "$DB" -f "$f" >/dev/null 2>"$HERE/.last-error"; then
    echo "✗ migration failed to apply on an empty database: $(basename "$f")" >&2
    sed -n '1,5p' "$HERE/.last-error" >&2
    rm -f "$HERE/.last-error"
    exit 1
  fi
  applied=$((applied + 1))
done
rm -f "$HERE/.last-error"
echo "✓ $applied migrations applied from zero"

# security.sql keeps going after an individual failure and records every outcome
psql -X -q -d "$DB" -v verbose="${VERBOSE:-off}" -f "$HERE/security.sql" 2>&1 \
  | grep -v -E '^$|NOTICE|DETAIL|^drop cascades' || true

failed="$(psql -X -At -d "$DB" -c 'SELECT count(*) FROM qa.results WHERE NOT ok')"
if [ "$failed" != "0" ]; then
  echo "✗ $failed security check(s) failed" >&2
  exit 1
fi
echo "✓ all security checks passed"
