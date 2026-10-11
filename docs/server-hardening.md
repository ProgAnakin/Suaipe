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

### A. MFA in the database

Every staff area demands TOTP in the **browser**: `/stats` and `/consulente` walk an account without a
factor through enrolment, and `/manager` sends anyone below `aal2` back to `/stats`. But the database
policies and RPCs accept any signed-in user's token whatever its assurance level. Someone who has a staff **password**
can sign in through the REST API directly, get an `aal1` session, and read what the role's policies allow
— the authenticator code is never asked for.

The fix is a restrictive policy per sensitive table (Supabase's documented pattern), and the same check at
the top of the `SECURITY DEFINER` role-admin and purge functions:

```sql
CREATE POLICY require_mfa ON public.quiz_sessions AS RESTRICTIVE
  FOR SELECT TO authenticated
  USING ((SELECT auth.jwt() ->> 'aal') = 'aal2');
```

Do **not** apply it to the catalogue tables (the kiosk reads them, and a kiosk iPad can hold an abandoned
`aal1` staff session) nor to `quiz_sessions` INSERT (the claim). Roll it out only after every staff account has
enrolled, or you lock staff out; test it in a Supabase branch with a real `aal1` and `aal2` session.

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

## Production verification (nothing to deploy — confirm against the live database)

Migrations are applied by hand, so confirm the security-critical ones actually ran:

```sql
-- The anon-lockdown and hardening migrations MUST be present:
SELECT version FROM supabase_migrations.schema_migrations
WHERE version IN ('20260519000002', '20260528000001', '20261011000001', '20261011000002');   -- four rows

-- No anon-writable policy should linger (INSERT on quiz_sessions is the one legitimate case):
SELECT tablename, policyname, roles, cmd FROM pg_policies
WHERE schemaname = 'public' AND 'anon' = ANY (roles) AND cmd <> 'INSERT';

-- Anonymous visitors must not be able to run any of these (every row must say false):
SELECT p.proname, has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_can_run
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('purge_sessions_older_than', 'mark_code_redeemed', 'get_my_store_role',
                    'purge_audit_log_older_than', 'list_store_roles_admin',
                    'upsert_store_role_admin', 'delete_store_role_admin');
```

- Authentication → Providers → Email: **"Allow new users to sign up" is off.** Several policies accept "any
  signed-in user" as the lowest tier.
- The `WHITELIST_EMAILS` Edge Function secret is empty.
- `WEBHOOK_SECRET` is set (without it no e-mail is ever sent) and `STAFF_PIN` has six digits or more.
- Every staff auth user has a TOTP factor.
- To prove the policies on a copy of the schema, run `supabase/tests/run.sh` against a **disposable**
  PostgreSQL (see `supabase/tests/README.md`) — never against the project.
