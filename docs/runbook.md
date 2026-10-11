# Operational Runbook

Triage guide for the most common incidents on a suaipe deployment. Each
section: **symptom → first checks → fix**. If none of the fixes apply, escalate
with a copy of the relevant Edge Function logs and the affected `quiz_sessions.id`.

---

## 1. Customer didn't receive the discount email

**Symptom:** customer finished the quiz, saw the success screen, but no email
arrived (including spam folder).

**Triage order:**

1. **Brevo log first.** Dashboard → Statistics → Emails. Search by recipient
   address.
   - `Consegnata` / `Inviata`: email left Brevo. Ask the customer to check
     spam + the address they typed. Compare with `quiz_sessions.email` row.
   - `Bloccata` / `Blocked`: recipient is on Brevo's suppression list (prior
     unsubscribe, hard bounce, or spam complaint). Fix: Brevo → Contacts →
     find the address → **Resubscribe** / **Remove from blocklist**. Send
     again only with the customer's explicit consent.
   - `Errore` / `Error`: usually the wrong sender or DKIM failure. Check the
     sender shown in the log — must match the `EMAIL_SENDER` Edge Function
     secret. If it's something else, the secret is unset (fallback is
     `noreply@suaipe.app`) or the Edge Function deployment is stale;
     redeploy `on-session-created` from the Dashboard.
   - **Nothing logged at all:** the Edge Function never called Brevo. Continue
     to step 2.

2. **Edge Function logs.** Supabase Dashboard → Edge Functions →
   `on-session-created` → Logs. Filter by the `session_id` (it's logged on
   the success line).
   - `[on-session-created] db update failed — aborting email`: the pre-send
     UPDATE to `discount_code` failed. Usually a transient DB issue. Check the
     row in `quiz_sessions` — if `discount_code` is NULL but `email_sent` is
     false, you can manually retrigger by re-firing the webhook (Database →
     Webhooks → `on-session-created` → Send test event with the row payload).
   - No log at all for the session: the webhook isn't firing. Continue to
     step 3.

3. **Webhook config.** Database → Webhooks → `on-session-created`.
   - Confirm: table = `quiz_sessions`, event = `Insert`, type = Edge Function.
   - HTTP Headers must include `x-webhook-secret` matching the `WEBHOOK_SECRET`
     secret on the Edge Function. Mismatched secrets cause silent 200 rejections.
   - Click **Send a test event** with a known row — if it doesn't trigger,
     the webhook is broken; recreate it.

4. **Rate limit.** Each email address gets one email/hour by design (server
   side, in `on-session-created`). Check `quiz_sessions` for another row
   from the same email with `email_sent = true` and `created_at > NOW() - '1
   hour'`. If you need to bypass for staff testing, add the address to the
   `WHITELIST_EMAILS` secret on the Edge Function (comma-separated list).

---

## 2. Kiosk stuck on the loading spinner

**Symptom:** customer taps "Start" and the rotating-card screen never advances
to the quiz.

**Triage:**

1. **Offline?** Look at the top of the screen — if the amber "offline" banner
   is showing, the kiosk lost network. Check the iPad's WiFi. The cache is
   designed to serve the last-known catalog so the quiz should still load
   from cache; if not, the cache was never written (first-time load on this
   device).

2. **First-time load on this iPad with bad network?** The startup `Promise.all`
   now has a `.catch` that forces `settingsLoadFailed = true` and lets the
   user proceed with the bundled fallback questions/products. The fallback
   timeout is 10 s. If you see a flash of the loading screen and then the
   welcome screen with an amber "Catalog offline" badge, the fallback fired.

3. **Catalog still loading after 10 s with good network?** Open DevTools
   (Brave: `Cmd+Shift+P`) and check the Network tab for failed Supabase calls.
   Typically one of `product_settings`, `custom_products`,
   `product_global_status`, `quiz_cards` returning a 401/403 — RLS broken
   for the anon role. Check the latest migrations for any policy that may
   have been dropped.

---

## 3. PIN login failing repeatedly

**Symptom:** staff enters the right PIN and gets "Incorrect PIN" or the
lockout message.

**Triage:**

1. **STAFF_PIN secret matches what staff is entering?** Supabase Dashboard →
   Edge Functions → `verify-pin` → Secrets. The value is plaintext — confirm
   no leading/trailing spaces.

2. **Locked out?** There are three limits, and the countdown is shown in the UI:
   - **Per address:** 5 wrong PINs within 5 min lock that address for 2 min.
   - **Everyone:** 20 wrong PINs within 5 min, from anywhere, lock every address until the
     oldest of them is 5 min old (so guessing spread over many addresses is throttled too).
   - These two counters live in the Edge Function's memory and reset on a cold start (after
     ~15 min of idle) or a redeploy. If a staff member is convinced they were just blocked,
     wait two minutes, or redeploy `verify-pin`.
   - The "address" is what the platform saw (`cf-connecting-ip`, `x-real-ip`, the last
     `x-forwarded-for` entry) — never a value the browser sends. **Every iPad behind the same
     shop router shares one address**, so a customer mashing the PIN pad on one iPad can lock
     the others out of the staff overlay for two minutes.

3. **Fallback to DB path active?** If `STAFF_PIN` is NOT set, the function
   falls back to bcrypt against `app_config.staff_pin_hash`. Confirm migration
   `20260507000004` ran. The DB path uses the `verify_staff_pin` RPC, which logs
   every attempt in `admin_access_log` and has its own limits (3 wrong PINs per
   device in 2 min, 10 per address in 10 min, 20 for everyone in 5 min); query the
   table to see what the server saw:
   ```sql
   select created_at, client_id, ip_address, success
     from admin_access_log
    order by created_at desc
    limit 50;
   ```
   Prefer the `STAFF_PIN` secret and use six digits or more: four digits fall to
   a patient attacker even at 20 guesses per five minutes.

---

## 4. /manager dashboard shows empty data or "forbidden"

**Symptom:** signed-in user reaches /manager but tabs are empty or show 403.

**Triage:**

1. **Does this user have a `store_roles` row?** Supabase → SQL Editor:
   ```sql
   select sr.role, sr.store_id, u.email
     from store_roles sr
     join auth.users u on u.id = sr.user_id
    where u.email = '<their-email>';
   ```
   If no row, they have no permissions. Insert one via **/manager → Management →
   Roles** (signed in as another manager) or via SQL in the SQL Editor. The very
   first manager has to be created in SQL — see `docs/deployment.md`, step 3.

2. **A store responsible sees nothing in History?** Expected — they only see audit
   entries for their own `store_id`. If the historical rows were inserted
   before the `store_id` column was added (migration `20260429000004`), their
   `store_id` is NULL and consulenti can't see them. Managers still see all.

3. **"forbidden: caller is not a manager":** The Roles tab uses
   `*_store_roles_admin` RPCs that explicitly require the `manager` role.
   Consulenti can't manage other users by design.

---

## 5. Email rendering looks broken (raw `<strong>` tags etc.)

**Symptom:** customer received the email but it shows literal HTML tags.

**Cause:** the `header_title` / `header_subtitle` template fields are
intentionally rendered as raw HTML. If a manager pasted text containing
`<` that wasn't a real tag, the email client renders the rest of the body
incorrectly.

**Fix:** /manager → Management → Email → pick the affected language → either
remove the stray `<`/`>` characters or wrap them in HTML entities (`&lt;`,
`&gt;`). Save. The next email uses the new template (no deploy needed).

---

## 6. Storage usage growing fast

**Cause:** `quiz_sessions` and `manager_audit_log` grow unbounded by default.

**Fix:**

- Old leads: **/manager → Sessions & Codes → Delete > 7d old** (a manager deletes every store's,
  a store responsible only their own store's). The button calls `purge_sessions_older_than`,
  which checks the signed-in user's role — so it cannot be called from the SQL Editor, which
  runs as the database owner with no user. From the SQL Editor delete directly:
  ```sql
  delete from quiz_sessions where created_at < now() - interval '30 days';
  ```
- Audit log older than 2 years (manager-only, from the signed-in app):
  ```sql
  select purge_audit_log_older_than(730);
  ```
  The function refuses to purge less than 180 days of history. From the SQL Editor:
  `delete from manager_audit_log where created_at < now() - interval '730 days';`

Decide the retention period with your data-protection officer — the leads hold names and e-mail
addresses.

---

## 7. Edge Function redeploy didn't take effect

**Symptom:** updated code in repo but production still behaves as before.

**Cause:** Vercel auto-deploys frontend from GitHub on push to `main`. Supabase
Edge Functions do **not** auto-deploy. You must redeploy manually.

**Fix:**

```bash
# Locally with the Supabase CLI
supabase functions deploy on-session-created
supabase functions deploy verify-pin
supabase functions deploy relay-to-sheets
```

Or via the Dashboard → Edge Functions → click the function → copy/paste
`supabase/functions/<name>/index.ts` from the repo → Deploy.

---

## Useful queries

```sql
-- Sessions with NULL discount_code that should have one
select id, email, created_at, email_sent
  from quiz_sessions
 where email_sent = true and discount_code is null;
-- Should return zero rows after migration 20260518000003.

-- Last 50 emails sent
select created_at, email, store_id, discount_code, match_percent
  from quiz_sessions
 where email_sent = true
 order by created_at desc
 limit 50;

-- Wrong staff PINs in the last day, by address (database path only)
select ip_address, count(*) as failures, max(created_at) as last_try
  from admin_access_log
 where not success and created_at > now() - interval '1 day'
 group by ip_address
 order by failures desc;
```
