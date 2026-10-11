# Go-live checklist

Everything that has to exist before a store puts Suaipe in front of customers, in the order to do it.
Budget about an hour. The one step that is easy to forget — and expensive to forget — is **step 2**.

## 1. Supabase project

1. Create a project (any region close to the stores).
2. **Authentication → Providers → Email:** turn **off** "Allow new users to sign up". Staff accounts are
   created by you (Authentication → Users → *Add user*); several policies and RPCs accept "any signed-in
   user" as the lowest tier, so open sign-ups would hand strangers that tier.
3. **Authentication → Multi-Factor:** TOTP stays enabled. Every staff area demands it — a new account is
   walked through enrolling an authenticator app the first time it signs in.
4. **Storage:** create a **public** bucket named `product-images` (the migrations add its policies, not the
   bucket). Set its file-size limit (5 MB is plenty) and restrict it to image types. Managers upload
   product, store and quiz-card photos there; the Manager shrinks them to ≤ 1024 px JPEG first.

## 2. Database — apply every migration, in order, from empty

```bash
npm i -g supabase            # or: npx supabase …
supabase login
supabase link --project-ref <your-project-ref>
supabase db push             # applies supabase/migrations/*.sql in filename order
```

All 58 migrations apply to an empty database (CI proves it on every push). The last three are the pre-sale
hardening. `20261011000001_security_hardening.sql` and `20261011000002_funnel_events_scope.sql` are **not
optional**: before them, anyone holding the public anon key could delete leads, forge discounts and guess the
staff PIN without limit, and any signed-in account could read every store's funnel. `20261011000003` adds the
second-factor switch of step 8 — it changes nothing until you turn it on. If you are updating an existing
project rather than starting a new one, apply them first (`supabase db push` applies whatever is missing).

Then check it took:

```bash
# any disposable PostgreSQL — never the project itself; see supabase/tests/README.md
PGHOST=localhost PGUSER=postgres PGPASSWORD=postgres supabase/tests/run.sh
```

## 3. The first manager

Roles are granted by managers, so the first one is created in the SQL editor. Sign in once with the account
(so it exists in `auth.users`), then:

```sql
INSERT INTO public.store_roles (user_id, role)
SELECT id, 'manager' FROM auth.users WHERE email = 'you@your-company.com';
```

From then on, **/manager → Management → Roles** grants `manager`, `consulente_responsabile` (one store) and
`consulente` to everybody else.

## 4. Stores

Set `VITE_STORES` where the front end is built (step 6) — one line of JSON, an `id` per store that you will
never change (it is stored with every lead):

```
VITE_STORES=[{"id":"store-a","name":"My Brand Store A","shortName":"Store A"},{"id":"store-b","name":"My Brand Store B","shortName":"Store B"}]
```

Without it the built-in list applies. Remember to replace the demo products that the migrations seed
(**/manager → Management → Global catalogue**) and the quiz cards (**Quiz Cards**).

## 5. Edge Functions

```bash
supabase functions deploy on-session-created verify-pin relay-to-sheets

supabase secrets set \
  BREVO_API_KEY=… \
  EMAIL_SENDER=noreply@your-domain.com \
  WEBHOOK_SECRET=$(openssl rand -hex 24) \
  STAFF_PIN=<six or more digits> \
  ALLOWED_ORIGIN=https://your-kiosk-domain.com \
  SITE_URL=https://your-kiosk-domain.com
# optional: GOOGLE_SHEETS_WEBHOOK_URL=…   WHITELIST_EMAILS=…
```

- `EMAIL_SENDER` must be a sender (domain) verified in Brevo with SPF/DKIM, or the e-mails land in spam.
- `WEBHOOK_SECRET` is **required**: without it the e-mail function rejects every call, and no customer gets
  an e-mail.
- `STAFF_PIN`: the kiosk's staff PIN. Use six digits or more: wrong guesses are limited per device and per
  address, and to 20 for everyone within five minutes, which makes brute force impractical — a longer PIN makes
  it hopeless.
- **Edge Functions do not deploy by themselves** — redeploy after every change under `supabase/functions/`.

**Database webhook** (Database → Webhooks → *Create*): table `quiz_sessions`, event **Insert**, type
*Supabase Edge Functions* → `on-session-created`, with the HTTP header `x-webhook-secret: <the same value>`.

Then edit the e-mail wording (**/manager → Management → Email**): the sender name and the "consultant name"
that appears in the footer both start as `Suaipe` — make them yours. The wording is read at send time, so
the next e-mail already uses it.

## 6. Front end (Vercel)

Import the repository; production is the `main` branch. Environment variables:

| variable | value |
|---|---|
| `VITE_SUPABASE_URL` | the project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | the **anon / publishable** key — never the service-role key |
| `VITE_STORES` | step 4 |
| `VITE_SITE_URL` | your production origin |
| `VITE_PRIVACY_CONTROLLER`, `VITE_PRIVACY_EMAIL` | **the company that operates the kiosks** and a contact it reads — they are printed in the GDPR notice the customer accepts. Have the notice reviewed by your legal adviser / DPO before launch |
| `VITE_SENTRY_DSN`, `SENTRY_*` | optional, see `.env.example` |

`vercel.json` already carries the security headers, the CSP and the SPA routing. If your Supabase project is
served from a custom domain (not `*.supabase.co`), add that domain to `connect-src`, `img-src` and `media-src`
in the CSP, or the kiosk will not reach it.

## 7. Every iPad

1. Open the site in Safari → *Share* → **Add to Home Screen**. Open it from the Home Screen icon.
2. Tap the **logo six times** (or the store badge) → enter the PIN → **choose the store** of this iPad.
   A kiosk with no store refuses to start a quiz and says so.
3. Settings → Accessibility → **Guided Access** (or MDM single-app mode) to keep customers inside the app;
   keep the iPad powered (the app holds a wake lock), and Auto-Lock off.
4. Do one full visit with your own address: the e-mail should arrive within a minute, the lead should show
   in **/manager → Sessions & Codes** with its code, and **Mark as used** should work.

## 8. Require the authenticator code in the database too

Every staff page asks for the TOTP code, but only in the browser: someone with a staff *password* could call the
REST API directly and never be asked for it. Migration `20261011000003` closes that — behind a switch, **off** until you
are ready, so applying it locks nobody out. Once every staff account has enrolled an authenticator:

```sql
-- accounts that hold a role but have no verified authenticator yet (they would be locked out)
SELECT u.email, sr.role
FROM public.store_roles sr
JOIN auth.users u ON u.id = sr.user_id
WHERE NOT EXISTS (SELECT 1 FROM auth.mfa_factors f WHERE f.user_id = u.id AND f.status = 'verified');
-- … must return no rows. Then:
UPDATE public.app_config SET value = 'on' WHERE key = 'require_mfa';   -- effective immediately
```

Sign in at `/stats`, enter the code, open `/manager`: everything works as before. A session that is
password-only now sees no leads and cannot call the staff functions. To roll back, set the value to `'off'`.
The kiosk is unaffected either way (claims, funnel events and catalogue reads never need the code).

## 9. After go-live

- The catalogue, prices, store settings and quiz cards you change in the Manager reach the iPads within
  five minutes of being idle (and at every restart) — no reload needed.
- `docs/runbook.md` has the triage for the usual incidents; `supabase/tests/run.sh` is the regression net for
  any change to a policy or an RPC.
- Retention: **/manager → Sessions & Codes → Delete > 7d old** removes old leads (a store responsible can only
  delete their own store's). Decide your retention period with your data-protection officer.
