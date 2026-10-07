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
  3× retry w/ backoff. A DB webhook then fires `on-session-created` to send the email.
- Hard guard: no `store_id` configured → claim aborted (protects per-store analytics).
- Funnel events: `quiz_started → result_shown → claimed` (fire-and-forget).

## Matching algorithm (`src/data/products.ts` → `getMatchedProduct`)

8 fixed tags: `audio, productivity, recovery, sport, style, tech, travel, wellness`.
Each quiz question maps to one tag; a "yes" activates that tag. Each product has
~3 tags. Score = overlap count; ties broken **randomly**. `matchPercent =
round(score / product.tags.length * 100)`, clamped to **[45, 98]**. Covered by
unit tests — don't change behaviour without updating `src/__tests__/getMatchedProduct.test.ts`.

## Admin areas (lazy-loaded, never in the kiosk bundle)

- **`/manager`** — PIN → Supabase session + MFA. Tabs: Catalog, Sessions & Codes,
  History (audit), Management(→ Global catalog, Quiz Cards, Email, Roles, Guide).
  Role-gated: `manager` sees all + Management; `consulente_responsabile` is
  locked to its own store, no Management.
- **`/stats`** — login + TOTP MFA. Funnel, product leaderboard, match histogram,
  hourly distribution, GDPR CSV export.
- **`/consulente`** — login + role. Read-only product training guides (IT/EN).
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
  `SUP-XXXXXXXX##` (## = discount %), builds the HTML email in the customer's
  language, sends via Brevo, relays to Google Sheets. Gated by `WEBHOOK_SECRET`
  + a `store_id` allowlist. **Rate limit: 1 email/hour per address** (server-side,
  bypass-proof). Reads the editable `email_template` row **at send time**.
- **`verify-pin`** — staff PIN, constant-time compare, in-memory IP lockout
  (5 fails → 2 min), bcrypt DB fallback.
- **`relay-to-sheets`** — server-side proxy that keeps the Sheets webhook URL off the client.

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
   persists in `localStorage.wb_store_id`.
9. **Security headers / CSP** live in `vercel.json` (strict; scripts `'self'` only).

## Dev commands

```bash
npm run dev         # Vite dev server (http://localhost:8080)
npm run typecheck   # tsc --noEmit (tsconfig.app.json)
npm run lint        # eslint
npm test            # vitest (127 unit tests)
npm run test:e2e    # Playwright (WebKit / iPad project)
npm run build       # production build (needs VITE_SUPABASE_URL + VITE_SUPABASE_PUBLISHABLE_KEY)
```

Before pushing code changes, run **typecheck + lint + test + build** — that's what CI gates on.

## Where things live

```
src/pages/            Index (kiosk), Manager, Stats, Consulente, ResetPassword, Privacy
src/components/        Attract/Welcome/Quiz/SwipeCard/MatchResult/Success + manager/ stats/ consulente/
src/data/             products.ts (algorithm + fallback), questions.ts, quiz-cards.ts, stores.ts
src/hooks/            kiosk hooks (wake lock, inactivity, kiosk mode, bg music, sound, …)
src/i18n/             translations.ts (5 langs) + LanguageContext
src/lib/              validators, imageProcessing, startupCache, verifyStaffPin, haptic, clientId
supabase/functions/   on-session-created, verify-pin, relay-to-sheets
supabase/migrations/  versioned SQL (RLS, RPCs, schema) — apply manually
docs/adr/             architecture decision records · docs/runbook.md · docs/edge-functions.md
video/                LinkedIn product film (Remotion) — ISOLATED project: own package.json/node_modules, never imported
                      by src/, excluded from the app's eslint. Real-app capture + synthesised soundtrack; see video/README.md, ADR 007
```
