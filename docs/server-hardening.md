# Server hardening — status and deploy guide

Security/correctness work on the Supabase side. **Edge Functions and migrations do NOT auto-deploy** —
only the Vercel front end does (on push to `main`). Nothing in this file affects production until the
commands below are run. The account of how these holes were found is in
[`qa/QA-REPORT.md`](./qa/QA-REPORT.md); the checks that keep them closed are `supabase/tests/`.

---

## Status

| # | Item | Status |
|---|------|--------|
| 1 | `on-session-created`: idempotency guard, no provider error leak, shared and tested code generation | ✅ in the code — redeploy the function |
| 2 | `relay-to-sheets` fails closed when its auth environment is missing | ✅ in the code — redeploy the function |
| 3 | Unique discount codes (`20260617000001`) | ✅ migration |
| 4 | **Privileged functions, retention purge, `quiz_sessions` INSERT, PIN lockout, e-mail limits, audit log, login helpers** | ✅ migration **`20261011000001_security_hardening.sql` — apply it first** |
| 4b | Funnel events readable by managers and the store's own responsible only | ✅ migration `20261011000002_funnel_events_scope.sql` |
| 5 | The e-mail's discount, product, price, image and video come from the database, not the browser's row; case-insensitive limit; spreadsheet-formula defusing | ✅ in the code — redeploy `on-session-created` |
| 6 | `verify-pin`: address from the platform, not the client; global throttle | ✅ in the code — redeploy `verify-pin` |
| 7 | MFA (TOTP) required to open any staff area | ✅ in the **UI** (`/stats` and `/consulente` walk an account without a factor through enrolment; `/manager` sends anyone below `aal2` back to `/stats`) — ⚠ **not** in the database, see [A](#a-mfa-in-the-database) |
| 8 | Atomic claim in `on-session-created` | ⏳ optional, see [B](#b-race-proof-idempotency) |
| 9 | `WHITELIST_EMAILS` bypass | ⏳ keep the secret empty in production, see [C](#c-the-cooldown-bypass) |

### Deploy order

```bash
supabase db push                                     # 1. the migration — it closes the holes
supabase functions deploy on-session-created verify-pin relay-to-sheets   # 2. the functions
# 3. the front end deploys itself when this branch reaches main
```

Apply the migration **before** the functions: the new e-mail code expects the columns and policies it
sets up, and it is the migration that stops an anonymous caller from deleting leads.

The migration is idempotent and rewrites no rows, so it is safe on a live project. It does not need the
duplicate-code check that `20260617000001` needed unless that migration has not run yet:

```sql
SELECT discount_code, count(*) FROM public.quiz_sessions
WHERE discount_code IS NOT NULL GROUP BY discount_code HAVING count(*) > 1;   -- must be empty
```

---

## Still open — decide and schedule

### A. MFA in the database — shipped, **off** until you turn it on

Every staff area demands TOTP in the **browser**: `/stats` and `/consulente` walk an account without a
factor through enrolment, and `/manager` sends anyone below `aal2` back to `/stats`. The database, until
`20261011000003`, accepted any signed-in user's token whatever its assurance level: someone who had a staff
**password** could sign in through the REST API, get an `aal1` session, and read what the role's policies
allow — the authenticator code was never asked for.

`20261011000003_mfa_gate_in_database.sql` adds the check and a switch (`app_config.require_mfa`, shipped **`off`**,
so applying it changes nothing). With the switch on, a token that is not `aal2` is refused:

| | |
|---|---|
| **Tables** (restrictive policies, signed-in users only) | leads (read / update / delete), roles, audit log, funnel events, e-mail template, training guides — every command; the catalogue tables and the `product-images` bucket — writes only |
| **RPCs** | `list_/upsert_/delete_store_role_admin`, `purge_sessions_older_than`, `purge_audit_log_older_than`, `mark_code_redeemed` raise `42501 mfa required`; `get_my_store_role` returns no row |
| **Never gated** (the kiosk keeps working even on an iPad holding a half-finished staff session) | the claim (`INSERT` into `quiz_sessions`), funnel-event inserts, the cooldown RPC, every read of the public catalogue |

**To turn it on** — after every staff account has enrolled an authenticator (the query is in
[`deployment.md`](./deployment.md) step 8):

```sql
UPDATE public.app_config SET value = 'on' WHERE key = 'require_mfa';   -- effective immediately
-- roll back:   … SET value = 'off' …   (any value other than 'off' enforces: a typo fails closed)
```

Proven by `supabase/tests`: the whole attack suite runs a second time with the switch on (as `aal2` users — it
must break nothing), `mfa.sql` checks `aal1` against `aal2` table by table, and a guard fails if a later migration
adds a staff-only `SECURITY DEFINER` function that does not call `private.require_mfa()`.

**Not proven here:** the behaviour against a real Supabase Auth session. Turn it on in a Supabase *branch* (or at a quiet
hour) and walk through: sign in on `/stats` → enter the code → `/manager` → Sessions & Codes (check that live updates
still arrive — the realtime channel must carry the `aal2` token) → mark a code as used → Management → Roles.

### B. Race-proof idempotency

The shipped guard (re-read `email_sent`) covers sequential webhook retries. Two deliveries racing each
other could both pass it. The obvious "claim by setting `email_sent = true` first" **violates the
`quiz_sessions_discount_code_required_when_sent` CHECK** (`email_sent` requires a `discount_code`), so use
the code as the claim instead:

```ts
const { data: claimed } = await supabase
  .from("quiz_sessions")
  .update({ discount_code: code, discount_percent: discountPct })
  .eq("id", record.id)
  .is("discount_code", null)          // only the first delivery wins
  .select("id");
if (!claimed?.length) return new Response(JSON.stringify({ ok: true, deduped: true }), { status: 200 });
// … send via Brevo; if Brevo refuses, release the claim so a genuine retry can resend:
//   await supabase.from("quiz_sessions").update({ discount_code: null }).eq("id", record.id);
```

This changes the retry semantics (a failed send must release the claim), so test it against a real
Supabase before shipping.

### C. The cooldown bypass

`on-session-created` still reads `WHITELIST_EMAILS` (for staff testing). Confirm the production secret is
empty, or delete the branch in the code.

---

## Production verification (nothing to deploy — confirm against the live project)

Migrations are applied by hand, so confirm the security-critical ones actually ran.

**1. The retention purge must refuse the public anon key** — the hole that let anyone delete every lead. The probe names
a store that does not exist, so it cannot delete anything whichever version of the function is live:

```bash
curl -s -X POST "$SUPABASE_URL/rest/v1/rpc/purge_sessions_older_than" \
  -H "apikey: $ANON_KEY" -H "Authorization: Bearer $ANON_KEY" -H "Content-Type: application/json" \
  -d '{"p_days": 365, "p_store_id": "zz-no-such-store"}'
# patched:    {"code":"42501", … "permission denied for function purge_sessions_older_than"}
# unpatched:  {"code":"PGRST202", … "Could not find the function public.purge_sessions_older_than(p_days, p_store_id)"}
#             → the old, world-callable version is live: apply 20261011000001 NOW
```

(Do **not** probe the old function with a bare `{"p_days": …}`: it deletes every store's leads older than that.)

**2. In the SQL Editor:**

```sql
-- The anon-lockdown and hardening migrations MUST be present:
SELECT version FROM supabase_migrations.schema_migrations
WHERE version IN ('20260519000002', '20260528000001', '20261011000001', '20261011000002');   -- four rows

-- Anonymous visitors must not be able to run any of these (every row must say false):
SELECT p.proname, has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_can_run
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('purge_sessions_older_than', 'mark_code_redeemed', 'get_my_store_role',
                    'purge_audit_log_older_than', 'list_store_roles_admin',
                    'upsert_store_role_admin', 'delete_store_role_admin');

-- Only staff read funnel events (expected: {authenticated}):
SELECT roles FROM pg_policies WHERE tablename = 'quiz_funnel_events' AND policyname = 'allow_select_auth';
```

**3. Settings**

- Authentication → Providers → Email: **"Allow new users to sign up" is off.** Several policies accept "any
  signed-in user" as the lowest tier.
- The `WHITELIST_EMAILS` Edge Function secret is empty.
- `WEBHOOK_SECRET` is set (without it no e-mail is ever sent) and `STAFF_PIN` has six digits or more.
- Every staff auth user has a TOTP factor.
- To prove the policies on a copy of the schema, run `supabase/tests/run.sh` against a **disposable**
  PostgreSQL (see `supabase/tests/README.md`) — never against the project.
