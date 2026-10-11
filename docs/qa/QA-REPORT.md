# QA report — the pre-sale test pass

Suaipe was about to be sold, so it was attacked instead of demonstrated: as every role against a real
PostgreSQL, through the real kiosk against a backend that misbehaves, and on every iPad size in every
language. This is the account of what broke, what was fixed, what was **not** fixed, and what the new owner
has to do.

> **Read this first.** Two things in the production project need action *before* anything else is
> shipped: apply the two new migrations and redeploy the three Edge Functions (see
> [Operator actions](#operator-actions-in-this-order)). Until then, anyone holding the public anon key —
> it ships in the browser bundle — can delete every lead, forge discount codes and guess the staff PIN
> without limit.

## Verdict

| Gate | Result |
|---|---|
| `npm run typecheck` · `npm run lint` | clean (lint: 0 errors, 4 known `react-refresh` warnings) |
| `npm test` | **208** unit tests, 26 files |
| `npm run build` | passes |
| `npm audit --omit=dev --audit-level=high` | passes — 2 *moderate* `react-router` advisories remain ([residual risks](#residual-risks-not-fixed)) |
| Database attack suite (`npm run test:sql`) | **84** attack checks (run twice: second factor off, then on) + **63** second-factor checks; 58 migrations applied to an **empty** PostgreSQL first |
| Browser suites (`npm run test:e2e`, Chromium, iPad viewport) | **82** tests green in ~10 min |
| WebKit (the iPad engine) | the smoke project is a required CI job and was green on the last full run; the resilience project is advisory — see [WebKit](#webkit-the-engine-the-ipads-use) |

What these numbers mean: the app has been exercised far beyond a happy path, and every hole found is closed
*and* pinned by a test that fails if it returns. What they do not mean: that nothing is left — the
[residual risks](#residual-risks-not-fixed) are real and listed.

## How it was attacked

1. **Static review of the risky parts** — every migration, RPC, policy and Edge Function; the kiosk's data
   flow; every place that totals, exports, searches or renders customer text.
2. **A database attack suite** (`supabase/tests/`). `run.sh` applies *all* migrations to an empty PostgreSQL
   (a Supabase shim provides `auth.uid()`, the roles and the JWT claims) and then, per role — anonymous,
   signed-in with no role, `consulente`, `consulente_responsabile`, `manager` — tries to do what that role
   must *not* be able to do: read other stores, delete leads, forge columns, call privileged functions,
   guess the PIN, flood the helpers. 84 checks; each prints expected vs actual.
3. **The real kiosk against a backend that misbehaves** (`e2e/`). `e2e/support/mock-backend.ts` is an
   in-memory PostgREST / RPC / Edge-Function stand-in with a request log, primary-key enforcement and
   fault injection per endpoint: HTTP errors, dropped connections, hangs, malformed bodies, slow answers and
   *lost responses* (written on the server, never acknowledged). The suites:
   - `kiosk-resilience` (~40 scenarios) — journey and clean-up, cached vs failing catalogue, refresh on
     wake / restart / idle, claim retries / lost response / hang / double tap / offline, cooldown failures,
     consent, names and hostile input, store configuration, corrupt device storage, reloads.
   - `kiosk-layout` — the whole visit in each of the 5 languages (no `undefined`, `NaN` or raw template on
     any screen) and every screen at 8 screen sizes (iPad Pro 12.9" / 11" / mini in both orientations, a
     phone, a desktop): every button the customer needs is on screen, tappable, and nothing covers it.
   - `kiosk-chaos` — six seeded runs of 90 random actions, after which the *next* customer must be served
     normally; and a soak run that completes many visits and asserts the DOM, JS heap and open
     `AudioContext`s stay bounded.
   - `admin-areas` — /manager, /stats and /consulente against 2,500 leads: totals, the status filter, the
     complete CSV with formulas defused, store scoping of a store responsible, purge errors, hostile names
     rendered as text, a backend answering 500 to everything.
4. **Dependency and build hygiene** — production audit, migrations from zero, the service worker's cache,
   the CSP.

## What broke, and what was done

### Security (found by attacking the schema as each role)

| # | Finding | Fix | Pinned by |
|---|---|---|---|
| S1 | **`purge_sessions_older_than` could be executed by anyone with the anon key** (`REVOKE … FROM anon` does nothing while the default `PUBLIC` grant exists), had no authorisation, and always deleted *every* store's leads | manager (any store) or store responsible (own store, named) only; `p_store_id` | `security.sql` · `e2e/admin-areas` |
| S2 | `quiz_sessions` INSERT accepted any column from the browser: a 90 % discount, a ready-made `discount_code` with `email_sent = true`, `code_redeemed`, no consent record, megabytes of text | server-owned columns must arrive untouched, consent record required, the rest bounded | `security.sql` |
| S3 | **Forged discount / forged e-mail:** the e-mail function used the row's `discount_percent`, `product_name`, price and video — written by a public client — so anyone could mail a 90 % code, or arbitrary text, from the shop's sender to any address | everything is read from `custom_products` / `product_settings`; discount clamped 0–99; unknown product → no e-mail | `discountCode.test.ts` (lockstep) |
| S4 | **PIN lockout bypass and crash:** the lockout was keyed on RPC *arguments* (`client_id`, `ip_address`), so a fresh `client_id` per guess defeated it; the lockout branch itself crashed (`column reference ip_address is ambiguous`); two weaker overloads were still callable; `verify-pin` trusted the first `X-Forwarded-For` entry | address taken from the platform, a global ceiling, one function left | `security.sql` |
| S5 | The 1-e-mail-per-hour limit was case-sensitive; no ceiling on inserts although every insert can trigger an e-mail | case/whitespace-insensitive; 5 per address per hour and 120 per minute overall | `security.sql` |
| S6 | The audit log accepted entries written in someone else's name | author is the caller | `security.sql` |
| S7 | `record_login_attempt` could be flooded; `check_email_cooldown` could be used to lock any address out of the kiosk | rate-limited / non-abusable | `security.sql` |
| S8 | `quiz_funnel_events` was readable by any signed-in account | manager (all) / store responsible (own store) | `security.sql` · `20261011000002` |
| S9 | CSV exports and the Google Sheets relay wrote customer text as-is: a lead named `=HYPERLINK(…)` / `=IMPORTXML(…)` ran as a formula in the owner's spreadsheet | `csvCell` / `sheetsSafe` | `csv.test.ts` · `discountCode.test.ts` · `e2e/admin-areas` |
| S10 | The service worker cached **every** Supabase REST GET: customer rows and staff data ended up in the device's Cache Storage | only the four public catalogue tables | configuration (`vite.config.ts`); no test |
| S11 | Migration `20260507000002` failed on an empty database, so `supabase db push` stopped on a fresh project; fresh installs shipped the author's personal name as the e-mail footer | fixed; neutral footer | `run.sh` (from zero) · CI `sql` job |

### The kiosk (found by driving it against a misbehaving backend)

| # | Finding | Fix |
|---|---|---|
| K1 | A failing `custom_products` request was cached and applied as an **empty catalogue**, silently turning into "recommend the bundled demo products" | an incomplete read keeps what is in use; cache is shape-checked |
| K2 | Catalogue, store settings and quiz cards were read **once at page load**: a manager's edits never reached an iPad that stays on | re-read when idle on the attract screen (5 min), on wake, on reconnect and on restart — never under a customer mid-visit |
| K3 | A lost response (saved on the server, never acknowledged) made the retry **store and e-mail the lead twice**; a request that never answered froze the result screen | one client-generated id per visit, `23505` counts as success; each attempt abandoned after 12 s |
| K4 | START could spin forever on a hanging cooldown check; a kiosk with no / a stale store let the customer finish the whole quiz before refusing | 6 s timeout; the refusal comes on START |
| K5 | **The result and success screens clipped on an iPad Pro 11" / iPad mini in landscape** and on phones: the page is locked against scrolling, so "I want it!" sat below the edge and the customer could not claim | the screens scroll inside themselves, a sticky CTA, a `short:` height variant |
| K6 | iPadOS "smart punctuation" apostrophes (`D’Angelo`) and combining marks were silently stripped; e-mail length unbounded | NFC, kept; RFC 5321 lengths |
| K7 | `<html lang>` stayed `it` whatever the customer chose (screen readers used an Italian voice for everything); the SVG ring logged `<circle> attribute r: undefined` | follows the language; fixed |

### Staff areas

| # | Finding | Fix |
|---|---|---|
| A1 | **Every total, KPI and "full" export stopped at 1000 rows** (PostgREST's page size); the toast even said "1000 exported" | read page by page; Stats says when its 50 000-row cap is hit |
| A2 | The Stats funnel / claim rate ignored the selected store and dates | follows the same filters |
| A3 | The Sessions status filter applied to the 20 rows on the page only | a database filter; the pager agrees |
| A4 | Search text containing `( ) , "` broke the PostgREST query and blanked the list | `ilikeAny` quotes and escapes |
| A5 | Product names came from the bundled demo catalogue (a product added in /manager showed as its id); date filters used UTC midnight; the price CSV lost `€64,00` on round-trip | name saved with the lead; local days; quoted CSV |
| A6 | The YouTube video in /consulente was blocked by the CSP (`frame-src` missing) | `frame-src` for `youtube-nocookie.com`, pinned by `csp.test.ts` |
| A7 | `ResetPassword` was in Italian although the staff UI is English-only (ADR 006); the Manager header said "Catalog" on every tab; the "No match" tile was an unexplained funnel number | fixed |

## WebKit, the engine the iPads use

The Playwright suites in the build sandbox run on Chromium (Playwright's WebKit cannot be downloaded there), so
WebKit was covered in two other ways.

**In CI (Playwright's WebKit build).** The *smoke* project is a required check and was green on the latest runs.
The *resilience* project (everything in `e2e/` except the smoke specs) is an **advisory** job. Its first WebKit
runs failed, almost entirely for reasons of the harness: the Chrome-only `interactive-widget` viewport hint is
logged as a warning, an abandoned request is reported as a page error, and software-rendered WebKit on a shared
runner animates several times slower than an iPad (60 s test timeouts, a 30 min job cap). One layout assertion
(the success screen's button at 1440×900, measured 47 px below the edge) could not be reproduced on a real WebKit
engine — see below — and was most likely measured while the entrance animation was still running. The harness now
ignores the two messages, waits for an element to stop moving before measuring it, and the job runs one spec file
per matrix entry with the iPad's *Reduce Motion* setting on (`E2E_REDUCED_MOTION=1`). The same 70 scenarios pass
locally on Chromium with Reduce Motion on — the app honours it everywhere, and a kiosk operator can switch it on.
Treat the job as advisory until it has been green for a while.

**By hand, on a real WebKit engine.** WebKitGTK 2.52 (the GTK port of WebKit: the same WebCore layout and
JavaScriptCore engine as Safari — *not* iOS Safari itself) was driven through WebDriver against the same in-memory
backend (`MockBackend`, over HTTP, with its fault injection). Results:

| Probe | Result |
|---|---|
| Every kiosk screen at 6 sizes (iPad Pro 11" and mini landscape, iPad Pro 12.9" and mini portrait, a phone, a desktop) — is each button the customer needs on screen, tappable, uncovered? | **36 / 36.** Where a screen is taller than the display (result 853–880 px, success 918 px) its scroll container scrolls and the sticky "I want it!" / "Play again" button stays pinned at the bottom |
| Swipe gestures on the quiz card | a short drag (40 px) snaps back; eight full swipes, left and right, each advance; the visit ends on the success screen and restarts |
| Console errors and uncaught rejections during a whole visit | **0** |
| Faults: a lost response · two HTTP 500s · a request that never answers · dead catalogue endpoints on a device with an empty cache | one lead each (the lost response retried into a unique violation, counted as success) · the hang abandoned after 12 s and retried · the quiz still ran on the bundled fallback |
| All 5 languages × iPad mini landscape and portrait × 5 screens: any text clipped by its box, any horizontal overflow? | **none** |
| /manager (every tab), /stats, /consulente with 600 sample leads | all render; 0 console errors; no horizontal overflow |

What this does **not** prove: iOS-only behaviour (touch events and gestures, safe areas, standalone-PWA mode,
Guided Access, Safari's audio-autoplay policy, the device fonts) or anything against a real Supabase project.
Do an acceptance pass on a real iPad before the first store (go-live step 7).

## Residual risks (not fixed)

Stated plainly, so the buyer does not discover them:

1. **The second factor is enforced in the database only once you switch it on.** The browser always asks for the
   authenticator code, but until `app_config.require_mfa = 'on'` someone with a staff *password* can sign in through
   the REST API, get an `aal1` session and read whatever that role's policies allow. Migration `20261011000003` adds
   the check behind a switch that ships **off** (so applying it locks nobody out); the 63 checks in `mfa.sql` and a
   second run of the whole attack suite with the switch on prove it table by table, and that the kiosk is unaffected.
   What is not proven is the behaviour against a real Supabase Auth session — turn it on in a branch first
   ([`../server-hardening.md`](../server-hardening.md) §A, [`../deployment.md`](../deployment.md) step 8).
2. **There is no offline claim queue.** If the backend stays down through three attempts the customer sees
   an error and can retry; if they walk away, that lead is lost.
3. **The kiosk's bundled demo catalogue** (`src/data/products.ts`) is the fallback when no catalogue can be
   loaded at all. A customer matched to a demo product has their lead stored but gets **no e-mail**, because
   the e-mail function (correctly) refuses a product that is not in `custom_products`. The kiosk shows the
   "Catalog offline" badge in that mode.
4. **The code validity window is a per-browser setting.** The 6 / 12 / 24 / 48 / 72 h choice in the Manager changes
   what *that browser* marks as "expired"; it is not stored in the database (which enforces no expiry), and the
   e-mail text says 24 hours. Staff decide at the till.
5. **Product copy is single-language** (the description, FAQ and training text are one string each); the
   quiz cards and the e-mail template are per language.
6. **`react-router` 6 has two moderate advisories** (open redirect via backslash; SSR hydration). The app
   has no user-controlled navigation target and no SSR; the only fix is a major upgrade (v7).
7. **`product_settings.store_id` has a legacy `DEFAULT 'corso-vercelli'`**; harmless while the app always
   sends the store, but a manual insert without one lands in that store.
8. **The welcome and attract screens are not scroll-safe on very short phones** (landscape phones and the
   iPhone SE are not supported sizes; this is a tablet kiosk).
9. **Edge Function changes cannot be run in this repo's dev setup** (no Deno). They were reviewed, a
   TypeScript syntax check was run, and the shared logic is unit-tested with a lockstep check on the inline
   copies — but the first real e-mail after deploying is the real test (go-live step 7.4).
10. **The default store list is the previous owner's four cities.** Set `VITE_STORES` to your own.
11. **`docs/socialpreview.png` and `public/og-image.png` still carry the author's byline and tech chips.**
    Replace them with your own artwork before publishing the repository or the link preview.

## Operator actions, in this order

1. `supabase db push` — applies `20261011000001_security_hardening.sql`, `20261011000002_funnel_events_scope.sql`
   and `20261011000003_mfa_gate_in_database.sql` (that last one changes nothing until step 7). Safe on a live
   database (idempotent, rewrites no rows).
2. `supabase functions deploy on-session-created verify-pin relay-to-sheets`.
3. Authentication → Providers → Email: turn **off** "Allow new users to sign up".
4. Secrets: `WEBHOOK_SECRET` (**required** — without it no e-mail is ever sent), `STAFF_PIN` of six digits or
   more, `ALLOWED_ORIGIN`, `SITE_URL`, `EMAIL_SENDER` on a verified Brevo domain. Leave `WHITELIST_EMAILS` empty.
5. Storage: create the **public** `product-images` bucket (the migrations add its policies, not the bucket).
6. Run the verification checks in [`../server-hardening.md`](../server-hardening.md), then one full visit with
   your own address: the e-mail should arrive within a minute and the lead should appear in /manager.
7. When every staff account has an authenticator: `UPDATE public.app_config SET value = 'on' WHERE key = 'require_mfa';`
   ([`../deployment.md`](../deployment.md) step 8).

Full go-live order: [`../deployment.md`](../deployment.md). Triage: [`../runbook.md`](../runbook.md).

## Re-running everything

```bash
npm run typecheck && npm run lint && npm test && npm run build
PGHOST=localhost PGUSER=postgres PGPASSWORD=postgres npm run test:sql   # a DISPOSABLE PostgreSQL, never the project
npm run test:e2e                                                          # all browser suites (WebKit; add E2E_BROWSER=chromium CHROMIUM_PATH=… where it cannot be installed)
npm run docs:screenshots                                                  # regenerate docs/screenshots from the running app
```
