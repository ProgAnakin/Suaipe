#!/usr/bin/env bash
# Synthetic restore rehearsal. Never uses a production connection string.
set -euo pipefail
cd "$(dirname "$0")/../.."
name="suaipe-restore-$$"
docker run -d --rm --name "$name" -e POSTGRES_HOST_AUTH_METHOD=trust postgres:17-alpine >/dev/null
trap 'docker rm -f "$name" >/dev/null' EXIT
for attempt in {1..30}; do
 if docker exec "$name" pg_isready -h 127.0.0.1 -U postgres >/dev/null 2>&1; then break; fi
 sleep 1
done
docker exec "$name" createdb -U postgres source
docker exec "$name" createdb -U postgres restored
{
 cat supabase/tests/bootstrap.sql
 for migration in supabase/migrations/*.sql; do cat "$migration"; done
 cat <<'SQL'
INSERT INTO custom_products(id,name,description,price) VALUES('restore-probe','Synthetic','Restore test','EUR 100');
INSERT INTO quiz_sessions(email,matched_product_id,match_percent,store_id) VALUES('restore-probe@example.com','restore-probe',80,'lisboa');
SQL
} | docker exec -i "$name" psql -U postgres -d source -v ON_ERROR_STOP=1 >/dev/null
docker exec "$name" sh -c 'pg_dump -U postgres -Fc source > /tmp/snapshot.dump && pg_restore -U postgres -d restored --exit-on-error /tmp/snapshot.dump'
docker exec -i "$name" psql -U postgres -d restored -v ON_ERROR_STOP=1 <<'SQL'
DO $$ BEGIN
 IF (SELECT count(*) FROM quiz_sessions WHERE email='restore-probe@example.com')<>1
 OR to_regprocedure('public.submit_quiz_session(uuid,jsonb)') IS NULL
 OR NOT (SELECT relrowsecurity FROM pg_class WHERE oid='public.quiz_sessions'::regclass) THEN
  RAISE EXCEPTION 'Restore data/schema/RLS verification failed'; END IF;
END $$;
SET ROLE anon;
DO $$ BEGIN
 IF (SELECT count(*) FROM quiz_sessions)<>0 THEN RAISE EXCEPTION 'Restore lost privacy protection'; END IF;
END $$;
SELECT 'PASS: synthetic backup restored with data, functions and RLS';
SQL
