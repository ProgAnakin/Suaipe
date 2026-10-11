#!/usr/bin/env bash
# Applies every migration, from zero, to a throw-away database on a PostgreSQL server you point it
# at, then runs the security attack suite (security.sql) against it — and runs that suite a SECOND
# time on a fresh database with the second-factor switch ON (require_mfa), to prove that enforcing it
# breaks nothing a signed-in aal2 user does. mfa.sql checks aal1 against aal2, table by table.
#
#   PGHOST=localhost PGUSER=postgres PGPASSWORD=… supabase/tests/run.sh
#   VERBOSE=on supabase/tests/run.sh        # list every check, not only the failures
#
# It creates (and finally drops) databases called suaipe_sql_test_<pid>_1/2, and the cluster-wide API
# roles of supabase-shim.sql — use a DISPOSABLE server (a local container, a CI service), never a
# real Supabase project. Needs `psql`; exits non-zero when a migration fails to apply or a check fails.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MIGRATIONS="$HERE/../migrations"
export PGHOST="${PGHOST:-localhost}" PGPORT="${PGPORT:-5432}" PGUSER="${PGUSER:-postgres}"
DB1="suaipe_sql_test_$$_1"
DB2="suaipe_sql_test_$$_2"
q() { psql -X -q -v ON_ERROR_STOP=1 "$@"; }

cleanup() {
  for db in "$DB1" "$DB2"; do psql -X -q -d postgres -c "DROP DATABASE IF EXISTS $db" >/dev/null 2>&1 || true; done
}
trap cleanup EXIT

# a fresh database with the shim and every migration applied, in filename order
build_db() {
  local db="$1" applied=0
  q -d postgres -c "CREATE DATABASE $db" >/dev/null
  q -d "$db" -f "$HERE/supabase-shim.sql" >/dev/null
  for f in $(ls "$MIGRATIONS"/*.sql | sort); do
    if ! q -d "$db" -f "$f" >/dev/null 2>"$HERE/.last-error"; then
      echo "✗ migration failed to apply on an empty database: $(basename "$f")" >&2
      sed -n '1,5p' "$HERE/.last-error" >&2
      rm -f "$HERE/.last-error"
      exit 1
    fi
    applied=$((applied + 1))
  done
  rm -f "$HERE/.last-error"
  APPLIED="$applied"
}

# a suite keeps going after an individual failure and records every outcome in qa.results
run_suite() {
  psql -X -q -d "$1" -v verbose="${VERBOSE:-off}" -f "$HERE/$2" 2>&1 | grep -v -E '^$|NOTICE|DETAIL|^drop cascades' || true
}
failures() { psql -X -At -d "$1" -c 'SELECT count(*) FROM qa.results WHERE NOT ok'; }

# ── pass 1: the second-factor switch as shipped (OFF), then mfa.sql turns it on and off ───────────────
build_db "$DB1"
echo "✓ $APPLIED migrations applied from zero"
run_suite "$DB1" security.sql
run_suite "$DB1" mfa.sql
failed="$(failures "$DB1")"
if [ "$failed" != "0" ]; then
  echo "✗ $failed security check(s) failed" >&2
  exit 1
fi

# ── pass 2: the same attack suite, with the second factor ENFORCED, as an aal2 user ───────────────────
build_db "$DB2"
q -d "$DB2" -c "UPDATE public.app_config SET value = 'on' WHERE key = 'require_mfa'" >/dev/null
echo "… the attack suite again, with require_mfa = on"
run_suite "$DB2" security.sql
failed="$(failures "$DB2")"
if [ "$failed" != "0" ]; then
  echo "✗ $failed security check(s) failed with the second factor enforced" >&2
  exit 1
fi
echo "✓ all security checks passed"
