"""Synthetic local PostgreSQL concurrency and query-plan probes. No network load."""
import concurrent.futures
import json
import subprocess
import sys

container = sys.argv[1]


def sql(statement, full=False):
    result = subprocess.run(
        ['docker', 'exec', '-i', container, 'psql', '-U', 'postgres', '-At', '-v', 'ON_ERROR_STOP=1'],
        input=statement, text=True, capture_output=True, check=True,
    )
    return result.stdout.strip() if full else result.stdout.strip().splitlines()[-1]


sql("SELECT run_privacy_maintenance(); INSERT INTO custom_products(id,name,description,price) VALUES ('concurrency-probe','Synthetic','Audit','EUR 100'); SELECT 1;")
claim_id = '90000000-0000-4000-8000-000000000099'
claim = f"""SET ROLE anon; SELECT submit_quiz_session('{claim_id}', '{{
"consent_notice_version":"2026-11-06","email":"audit-concurrency@example.com","nome":"Synthetic","cognome":"Customer",
"language":"en","consent_given_at":"2026-11-06T12:00:00Z","store_id":"lisboa",
"answers":{{}},"matched_product_id":"concurrency-probe","match_percent":80}}'::jsonb
 || jsonb_build_object('consent_given_at',date_trunc('day',now())+interval '12 hours'));"""
# Use one identical timestamp for every request, including when run before noon.
timestamp = sql('SELECT now()::text;')
claim = claim.replace("date_trunc('day',now())+interval '12 hours'", f"'{timestamp}'::timestamptz")
with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
    ids = list(pool.map(lambda _: sql(claim), range(12)))
count = int(sql(f"SELECT count(*) FROM quiz_sessions WHERE id='{claim_id}';"))
assert len(set(ids)) == 1 and count == 1
with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
    reservations = list(pool.map(lambda _: sql(f"SET ROLE service_role; SELECT begin_session_email('{claim_id}') IS NOT NULL;"), range(12)))
assert reservations.count('t') == 1
print(json.dumps({'concurrent_claims': 12, 'persisted_sessions': count,
                  'concurrent_email_attempts': 12, 'email_reservations': reservations.count('t')}))

# A second lead for the same address must not get a second concurrent delivery.
second_id = '90000000-0000-4000-8000-000000000098'
sql(f"INSERT INTO quiz_sessions(id,email,matched_product_id,match_percent,store_id) VALUES('{second_id}','audit-concurrency@example.com','concurrency-probe',80,'lisboa'); SELECT 1;")
second = sql(f"SET ROLE service_role; SELECT begin_session_email('{second_id}') IS NULL;")
assert second == 't'
print(json.dumps({'same_address_second_session_suppressed': True}))

# Bulk synthetic seed bypasses application triggers solely in this disposable DB.
sql("""SET session_replication_role=replica;
INSERT INTO quiz_sessions(email,matched_product_id,match_percent,store_id)
SELECT 'audit-load-'||n||'@example.com','concurrency-probe',80,'lisboa' FROM generate_series(1,20000) n;
SET session_replication_role=origin; ANALYZE quiz_sessions; SELECT 1;""")
plan = json.loads(sql("""EXPLAIN (ANALYZE,BUFFERS,FORMAT JSON)
SELECT count(*) FROM quiz_sessions WHERE lower(trim(email))='audit-load-10000@example.com'
AND created_at > now()-interval '1 hour';""", full=True))
print(json.dumps({'synthetic_rows': 20000, 'email_lookup_plan': plan}))
