# Server hardening — deploy guide

Security/correctness fixes for the Supabase side. **Edge Functions and migrations
do NOT auto-deploy** — only the Vercel frontend does (on push to `main`). Nothing
in this file affects production until you run the commands below.

---

## Shipped in this change set (committed — deploy to activate)

### 1. `on-session-created` — idempotency guard + no error leak + shared code-gen
- **Idempotency guard:** re-reads `email_sent` for the session and returns early
  if the email already went out, so a Supabase webhook **retry no longer
  regenerates the discount code or re-sends** the email (covers the common
  retry-after-success case).
- **No error leak:** the Brevo failure response no longer returns the raw provider
  error body (could expose internals / the recipient address); it's logged
  server-side and the caller gets a generic `{ ok: false }`.
- **`genDiscountCode`** moved to `supabase/functions/_shared/discountCode.ts` and
  is now unit-tested (`src/__tests__/discountCode.test.ts`).

```bash
supabase functions deploy on-session-created
```

### 2. `relay-to-sheets` — fail closed
If the auth env (`SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY`) is ever unset, the
function now **refuses** instead of skipping JWT validation and relaying anyway.
Prod has these set, so legitimate calls are unaffected.

```bash
supabase functions deploy relay-to-sheets
```

### 3. Migration — unique discount codes
`supabase/migrations/20260617000001_discount_code_unique.sql` adds a partial
unique index on `quiz_sessions.discount_code`.

**Before applying, check for existing duplicates** (the index creation fails if any exist):
```sql
SELECT discount_code, count(*) FROM public.quiz_sessions
WHERE discount_code IS NOT NULL GROUP BY discount_code HAVING count(*) > 1;
```
Then:
```bash
supabase db push      # or paste the migration in the SQL editor
```

---

## Recommended next — review, test in a Supabase branch, then deploy

Higher impact, but they touch auth / the critical email path — validate in a
preview/branch before prod.

### A. MFA enforcement — highest security ROI
Today MFA is **opt-in**. Every gate checks
`aal.nextLevel === "aal2" && aal.currentLevel !== "aal2"`. An account with **no
TOTP factor enrolled** has `nextLevel = "aal1"`, so the MFA step is skipped →
**password-only** access to `/manager` and `/stats`.

Fix in two parts:
1. **Enroll** every staff auth user in TOTP (one-time, via the existing MFA setup
   screens).
2. **Enforce:** in `Manager.tsx`, `Stats.tsx`, `Consulente.tsx`, `LoginForm.tsx`,
   treat `currentLevel !== "aal2"` as "must step up" **regardless** of
   `nextLevel`, and route un-enrolled users to MFA *enrollment* instead of
   letting them in. Because client checks can't stop a holder of a valid session,
   also gate sensitive RPCs/policies on `auth.jwt() ->> 'aal' = 'aal2'` where
   feasible.

> Left to you deliberately: enforce **after** everyone is enrolled, or you'll
> lock staff out.

### B. Race-proof idempotency (supersedes the shipped guard)
The shipped guard covers sequential retries. For full concurrency-safety, claim
atomically before sending and revert on failure:
```ts
const { data: claimed } = await supabase
  .from("quiz_sessions")
  .update({ email_sent: true })
  .eq("id", record.id)
  .eq("email_sent", false)
  .select("id");
if (!claimed?.length) {
  return new Response(JSON.stringify({ ok: true, deduped: true }), { status: 200 });
}
// ... send via Brevo ...
if (!brevoRes.ok) {
  // release the claim so a genuine retry can resend
  await supabase.from("quiz_sessions").update({ email_sent: false }).eq("id", record.id);
  return new Response(JSON.stringify({ ok: false }), { status: 500 });
}
// (drop the trailing `update({ email_sent: true })` — already claimed above)
```

### C. Funnel metrics — scope to store (low severity)
`quiz_funnel_events` SELECT is `auth.role() = 'authenticated'`, so any
authenticated user reads every store's funnel counts. Mirror the store-scoped
`quiz_sessions` SELECT policy (manager = all, `consulente_responsabile` = own
store). No PII; tidy-up only. RLS change → re-test dashboard access afterwards.

### D. Remove the cooldown bypass
`on-session-created` still reads `WHITELIST_EMAILS` ("Remove when testing is
complete"). Confirm the prod secret is empty/unset, then delete the branch in code.

---

## Production verification (no code — just confirm against the live DB)

Migrations are applied manually, so confirm the security-critical ones actually ran:
```sql
-- Both anon-lockdown migrations MUST be present (else early RLS holes are open):
SELECT version FROM supabase_migrations.schema_migrations
WHERE version IN ('20260519000002', '20260528000001');

-- No anon-writable policies should linger (INSERT on quiz_sessions is the one legit case):
SELECT tablename, policyname, roles, cmd FROM pg_policies
WHERE schemaname = 'public' AND 'anon' = ANY (roles) AND cmd <> 'INSERT';
```
- Confirm the `WHITELIST_EMAILS` Edge Function secret is empty in prod.
- Confirm every staff auth user has a TOTP factor **before** enforcing MFA (A).
