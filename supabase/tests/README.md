# SQL tests

`run.sh` builds a database from **every migration in `supabase/migrations`, starting from an empty
PostgreSQL**, then attacks it as each role and checks what each may read, write, delete and call.
It needs no Supabase CLI and no Docker — just a PostgreSQL server and `psql`.

```bash
# any disposable PostgreSQL 15/16 (a local container, the CI service…)
docker run --rm -d --name pg -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres:16
PGHOST=localhost PGUSER=postgres PGPASSWORD=postgres supabase/tests/run.sh
VERBOSE=on PGHOST=… supabase/tests/run.sh      # list every check, not only the failures
```

| file | what it is |
|---|---|
| `supabase-shim.sql` | a stand-in for what the migrations expect from a Supabase project: the API roles, `auth.uid()` / `auth.role()`, `auth.users`, the storage tables, `extensions`, Supabase's default privileges |
| `security.sql` | ~80 checks: what an anonymous browser may insert (and may not: forged discounts, pre-made codes, no consent, megabytes of text), who may read which store's leads, who may purge / redeem / manage roles, PIN brute-force lockout, rate-limit helpers, audit-log integrity |
| `run.sh` | applies the migrations, runs the checks, exits non-zero on any failure |

⚠ The shim creates cluster-wide roles (`anon`, `authenticated`, `service_role`, `authenticator`).
Run it against a **disposable** server, never a real Supabase project.

The suite found real holes in the schema as it stood — see `docs/qa/QA-REPORT.md` — and it is what
keeps them closed: add a check here whenever a policy or an RPC changes.

## Reading a failure

Each line of the report is `FAIL | check | expected | actual`. `expected` is a prefix of what
`actual` must start with (`ok rows=1`, `ERROR 42501`…); `ERROR` alone means "refused, for any reason".
