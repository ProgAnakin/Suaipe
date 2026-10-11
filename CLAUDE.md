# CLAUDE.md — Suaipe

Onboarding + working notes for AI agents (and humans) on this repo. Read this
first; it captures the architecture and the **non-obvious gotchas** that aren't
visible from any single file.

## What this is

**Suaipe** — an iPad-first, PWA **product-discovery kiosk** for physical retail.
A customer answers **8 Tinder-style swipe questions**, a matching algorithm
recommends **one product**, generates a **unique discount code**, and emails a
**personalised, multilingual** follow-up. Business goal: **first-party,
GDPR-consented lead capture + in-store conversion**, across **multiple stores**.

Author: Costanzo Annichini (solo). In production on iPad across 4 stores.

## Tech stack

React 18 + TypeScript · Vite/SWC · Tailwind + shadcn/ui · Framer Motion ·
React Query · React Router · Supabase (Postgres + RLS + Edge Functions +
Storage + Realtime) · Brevo (email) · Google Sheets (CRM relay) · Sentry · PWA
(vite-plugin-pwa/Workbox) · Capacitor (iOS/Android) · Vitest + Playwright (WebKit/iPad).

## Customer flow (`src/pages/Index.tsx` is the orchestrator)

`splash`(attract) → `welcome`(language + nome/cognome/email + GDPR consent) →
`[loading_quiz]` → `quiz`(8 swipes) → `result`(product + match% + claim) →
`success`. Inactivity reset (45s quiz / 90s result). Restart wipes the previous
visitor's cooldown marker.

- **Claim** = INSERT into `quiz_sessions` (with product snapshot + `consent_given_at`),
  3× retry w/ backoff, each attempt abandoned after 12 s. The row carries one
  client-generated `id` per visit and `23505` (unique violation) counts as success, so a
  retry after a *lost* response cannot store/e-mail the lead twice. A DB webhook then
  fires `on-session-created` to send the email.
- Hard guard: no (or an unknown) `store_id` configured → START is refused on the welcome
  screen and the claim is aborted (protects per-store analytics).
- Funnel events: `quiz_started → result_shown → claimed` (fire-and-forget).
- **Startup data** (catalogue, store settings, quiz cards) is read at load and **re-read**
  when the kiosk idles on the attract screen (5 min), wakes, reconnects or restarts — never
  swapped under a customer mid-visit. A half-answered refresh keeps what is in use
  (`fetchStartupSnapshot` returns `null`) instead of caching an empty catalogue.

## Matching algorithm (`src/data/products.ts` → `getMatchedProduct`)

8 fixed tags: `audio, productivity, recovery, sport, style, tech, travel, wellness`.
Each quiz question maps to one tag; a "yes" activates that tag. Each product has
~3 tags. Score = overlap count; ties broken **randomly**. `matchPercent =
round(score / product.tags.length * 100)`, clamped to **[45, 98]**. Covered by
unit tests — don't change behaviour without updating `src/__tests__/getMatchedProduct.test.ts`.

## Admin areas (lazy-loaded, never in the kiosk bundle)

- **`/manager`** — no login of its own: it sends anyone who is not signed in **and** at
  TOTP level `aal2` to `/stats`. Tabs: Catalog, Sessions & Codes,
  History (audit), Management(→ Global catalog, Quiz Cards, Email, Roles, Guide).
  Role-gated: `manager` sees all + Management; `consulente_responsabile` is
  locked to its own store, no Management.
- **`/stats`** — login + TOTP MFA (an account with no factor is walked through enrolment).
  Funnel, product leaderboard, match histogram, hourly distribution, GDPR CSV export.
- **`/consulente`** — login + TOTP + role. Read-only product training guides (IT/EN).
- MFA is enforced in the **UI only**; the database does not check `aal` — see
  `docs/server-hardening.md` §A.
- Staff entry on the kiosk: **6-tap the logo** or tap the **store badge** →
  `AdminPinOverlay` (PIN → store selection + nav to /stats, /consulente + kiosk toggle).

## Database (Supabase, RLS fail-closed on every table)

Key tables: `quiz_sessions` (leads + codes + PII), `quiz_funnel_events`,
`product_settings` (per-store overrides: active/price/image/video/discount/FAQ),
`custom_products` (**the live catalog**), `product_global_status`, `quiz_cards`
(per-language questions), `email_template` (per-language email content),
`product_guides` (training), `store_roles`, `manager_audit_log`,
`admin_access_log`, `app_config` (bcrypt PIN hash).

Roles: `manager` / `consulente_responsabile` / `consulente`. RPCs are
`SECURITY DEFINER`: `verify_staff_pin`, `check_email_cooldown`,
`check_login_rate_limit`/`record_login_attempt`, `get_my_store_role`,
`mark_code_redeemed`, `purge_sessions_older_than`, `purge_audit_log_older_than`,
`*_store_roles_admin`.

## Edge Functions (`supabase/functions/`, Deno)

- **`on-session-created`** — DB webhook on `quiz_sessions` INSERT. Generates code
  `SUP-XXXXXXXX##` (## = the store's configured discount, **read from the DB**, clamped
  0–99), builds the HTML email in the customer's language, sends via Brevo, relays to
  Google Sheets. Gated by `WEBHOOK_SECRET` (**required** — unset = every call rejected)
  + a `store_id` shape check. Product name/price/image/video also come from the DB —
  the inserted row is written by a public client and is never trusted. **Rate limit:
  1 email/hour per address**, case-insensitive. Reads the editable `email_template` row
  **at send time**.
- **`verify-pin`** — staff PIN, constant-time compare, in-memory lockout (5 fails/address →
  2 min; 20 from anywhere in 5 min → everyone), bcrypt DB fallback (`verify_staff_pin`,
  `admin_access_log`). The address is what the platform saw, never the client's header.
- **`relay-to-sheets`** — server-side proxy that keeps the Sheets webhook URL off the
  client (signed-in staff only; nothing in the app calls it today).

## ⚠️ Non-obvious gotchas (read before changing things)

1. **The real catalog is the `custom_products` DB table (per active status), not
   `src/data/products.ts`.** That array is a bundled fallback / test fixture only.
   The kiosk loads catalog + quiz cards from Supabase (stale-while-revalidate cache,
   10s fallback timeout).
2. **Edge Functions do NOT auto-deploy.** Only the frontend auto-deploys (Vercel,
   on push to **`main`**). After editing `supabase/functions/*`, redeploy manually:
   `supabase functions deploy <name>`.
3. **Migrations are applied manually** to Supabase (CLI `supabase db push` or the
   SQL editor) — they don't run themselves on push.
4. **Production = `main`.** Dev branches: `claude/*`, `feat/*`, `fix/*` (CI runs on these).
5. **Email content is DB-driven** (`email_template`, one row per language). Editing
   it in Manager → Email changes the **next** email immediately — no redeploy. Code
   holds only fallback defaults (`EmailTemplateTab.tsx` + `on-session-created`).
   In the UI: "Sender name" = `sender_name`; "Consultant name" = `footer_store_name`.
6. **PII is protected by access control, NOT app-layer encryption.** AES/email-hash
   scaffolding was removed in migration `20260530000001` (see ADR 003). `email/nome/
   cognome` are plaintext, readable only by role-scoped authenticated staff.
7. **i18n**: 5 languages (it/en/pt/es/fr); **Italian is authoritative/fallback**.
   `src/i18n/translations.ts`. Quiz cards + email templates are also per-language in the DB.
8. **Store ids** (`src/data/stores.ts`; the edge fn validates the slug shape, not a
   fixed list): `rio-de-janeiro`, `lisboa`, `dublino`, `milano`. Selected store
   persists in `localStorage.wb_store_id`. A deployment can define its own stores at build
   time with `VITE_STORES` (one line of JSON, see `.env.example`) — no code edit.
9. **Security headers / CSP** live in `vercel.json` (strict; scripts `'self'` only).
   A new third-party origin (embed, font, API) needs adding there — the YouTube embed was
   blocked once for want of `frame-src`. `src/__tests__/csp.test.ts` guards the policy.
10. **PostgREST returns at most 1000 rows per request.** Anything that totals, exports or
    paginates must read page by page (`src/lib/fetchAllPages.ts`) — KPIs and "full" CSVs
    used to freeze at 1000. Search terms go through `ilikeAny` (`postgrestFilter.ts`),
    dates through `dayRange.ts` (the viewer's local day, not UTC).
11. **Exports/relays are formula-safe.** Every CSV goes through `csvCell`/`toCsv`
    (`src/lib/csv.ts`); values sent to Google Sheets go through `sheetsSafe`
    (`supabase/functions/_shared/discountCode.ts`). A lead named `=HYPERLINK(...)` is
    public input.
12. **Never trust the `quiz_sessions` row.** It is inserted by the public anon key. The DB
    restricts what a browser may write (server-owned columns must arrive untouched) and
    the e-mail function re-reads everything it sends from the catalogue.
13. **`REVOKE … FROM anon` does nothing while the default `PUBLIC` EXECUTE grant exists.**
    A new `SECURITY DEFINER` function must `REVOKE ALL … FROM PUBLIC, anon` and `GRANT` to
    the roles that need it, check the caller's `store_roles` row inside, and get a case in
    `supabase/tests/security.sql`.
14. **The kiosk locks page scroll**, so a screen taller than the iPad is clipped, not
    scrollable. Result/Success scroll inside themselves (`my-auto`, sticky CTA) and compact
    with the `short:` Tailwind screen (`max-height: 900px`). `e2e/kiosk-layout.spec.ts`
    checks every screen at 8 sizes in 5 languages.
15. **Edge-function inline copies** (`genDiscountCode`, `clampDiscountPercent`,
    `sheetsSafe`, `escapeLike`, store-id regex) must equal `_shared/discountCode.ts` /
    `src/lib/validators.ts`; `src/__tests__/discountCode.test.ts` fails when they drift.
    There is no Deno in this repo's dev setup, so edge-function changes are untested
    until deployed — keep them small and re-read them.

## Dev commands

```bash
npm run dev         # Vite dev server (http://localhost:8080)
npm run typecheck   # tsc --noEmit (tsconfig.app.json)
npm run lint        # eslint (4 known react-refresh warnings, 0 errors)
npm test            # vitest (197 unit tests)
npm run test:e2e    # Playwright — all projects (82 browser tests, in-memory backend)
npm run test:e2e:smoke       # only the ipad-landscape smoke project (what CI requires)
npm run test:e2e:resilience  # kiosk resilience / layout / chaos + staff areas
npm run test:sql    # migrations from zero + 84 attack checks on a DISPOSABLE PostgreSQL
npm run docs:screenshots     # regenerate docs/screenshots from the running app (neutral sample data)
npm run build       # production build (needs VITE_SUPABASE_URL + VITE_SUPABASE_PUBLISHABLE_KEY)
```

Before pushing code changes, run **typecheck + lint + test + build** — that's what CI gates on.
Touching a policy, an RPC or a migration → also `npm run test:sql`. Touching the kiosk flow, a
layout or an admin tab → also the Playwright suites. The browser suites never talk to a real
Supabase: `e2e/support/mock-backend.ts` is a PostgREST/RPC/Edge-Function stand-in with fault
injection (HTTP errors, dropped connections, hangs, "lost response").

Where WebKit cannot be installed, run the same suite on an installed Chromium:
`E2E_BROWSER=chromium CHROMIUM_PATH=/path/to/chromium npx playwright test` (the WebKit-only
pixel diffs are skipped; CI keeps WebKit, the engine the iPads use).

When piping a gate into `tail`/`head`, use `set -o pipefail` — otherwise a failing lint exits 0.

## Where things live

```
src/pages/            Index (kiosk), Manager, Stats, Consulente, ResetPassword, Privacy
src/components/        Attract/Welcome/Quiz/SwipeCard/MatchResult/Success + manager/ stats/ consulente/
src/data/             products.ts (algorithm + fallback), questions.ts, quiz-cards.ts, stores.ts
src/hooks/            kiosk hooks (wake lock, inactivity, kiosk mode, bg music, sound, …)
src/i18n/             translations.ts (5 langs) + LanguageContext
src/lib/              validators, csv, fetchAllPages, postgrestFilter, dayRange, withTimeout, imageProcessing,
                      startupCache, verifyStaffPin, haptic, clientId
supabase/functions/   on-session-created, verify-pin, relay-to-sheets, _shared/ (tested reference code)
supabase/migrations/  versioned SQL (RLS, RPCs, schema) — apply manually; must apply to an EMPTY database
supabase/tests/       run.sh + security.sql + supabase-shim.sql — the database attack suite
e2e/                  Playwright: support/ (mock backend, kiosk + staff drivers), kiosk-resilience, kiosk-layout,
                      kiosk-chaos (seeded random actions + soak), admin-areas, docs-screenshots
docs/                 deployment.md (go-live) · runbook.md · edge-functions.md · server-hardening.md · qa/ · adr/
video/                LinkedIn product film (Remotion) — ISOLATED project: own package.json/node_modules, never imported
                      by src/, excluded from the app's eslint. Real-app capture + synthesised soundtrack + AI-generated in-store
                      hand stills (hands only, tools/people); see video/README.md, ADR 007
```
