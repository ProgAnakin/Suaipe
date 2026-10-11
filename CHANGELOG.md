# Changelog

All notable changes to Suaipe are documented here.
Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
versioning follows [SemVer](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased] — Pre-sale hardening pass

The app was attacked as every role (anonymous visitor, role-less account, `consulente`,
`consulente_responsabile`, `manager`), driven against a backend that misbehaves, and opened on every
iPad size in every language. What broke is fixed below; the full account is in
[`docs/qa/QA-REPORT.md`](docs/qa/QA-REPORT.md).

### ⚠ Operator action required — in this order

1. **Apply `supabase/migrations/20261011000001_security_hardening.sql` (and the small
   `20261011000002_funnel_events_scope.sql` and the switch-off-by-default `20261011000003_mfa_gate_in_database.sql`)
   to the live database now** (`supabase db push`). Until it is applied, anyone holding the public anon key can delete every
   lead, forge discount codes and guess the staff PIN without limit.
2. **Redeploy the three Edge Functions:** `supabase functions deploy on-session-created verify-pin relay-to-sheets`.
3. Authentication → Providers → Email: turn **off** "Allow new users to sign up".
4. Check the secrets listed in [`docs/deployment.md`](docs/deployment.md) (`WEBHOOK_SECRET` is required;
   `STAFF_PIN` should have six digits or more).

### Security
- `purge_sessions_older_than` was executable by anonymous visitors, had no authorisation and always
  deleted every store's leads. It is now `manager` (any store) or store responsible (own store only).
- `quiz_sessions` INSERT accepted any column from the browser (a 90 % discount, a ready-made code,
  `code_redeemed`, megabytes of text). Server-owned columns must now arrive untouched, the consent
  record is required, the rest is bounded.
- The e-mail's discount, product, price, image and video come from the database, not from the row the
  browser wrote — a forged row can no longer be e-mailed from our sender to any address.
- Staff PIN lockout is keyed on what the gateway saw (not on arguments the caller chooses), no longer
  crashes, has a global ceiling, and the two weaker overloads are gone.
- The 1-e-mail-per-hour limit is case-insensitive and there is a global ceiling on inserts;
  `check_email_cooldown` can no longer be used to lock an address out of the kiosk.
- The audit log rejects entries written in someone else's name; the login-attempt helpers cannot be
  flooded; funnel events are readable by managers and the store's own responsible only.
- CSV exports (Sessions, Stats, audit log) defuse spreadsheet formulas; the Google Sheets relay does
  the same for values that begin with `= + - @`.
- The service worker no longer caches customer or staff REST responses — only the four public
  catalogue tables.
- Production dependencies: `npm audit --omit=dev` is down to 2 moderate `react-router` advisories
  (open redirect and SSR hydration — the app has no user-controlled navigation targets and no SSR).

### Fixed
- **Kiosk — a half-answered refresh wiped the catalogue.** A failing `custom_products` request was cached
  and applied as an empty catalogue. Any incomplete read now keeps what is in use; the cache is
  shape-checked.
- **Kiosk — edits in `/manager` never reached an iPad that stays on.** Catalogue, store settings and
  quiz cards are re-read when the kiosk is idle on the attract screen (5 min), wakes, reconnects or
  restarts — never under a customer mid-visit.
- **Kiosk — a lost response stored (and e-mailed) the lead twice.** The claim carries one
  client-generated id per visit; a unique violation counts as success. Each attempt is abandoned
  after 12 s, so a request that never answers no longer freezes the result screen.
- **Kiosk — START could spin forever.** The cooldown pre-check times out after 6 s; a kiosk with no
  store says so when START is pressed, not after the quiz.
- **Kiosk — the result and success screens clipped on an iPad Pro 11" / iPad mini in landscape**
  and on phones, hiding the "I want it!" button. The screens scroll inside themselves and compact
  on short displays.
- **Kiosk — names:** curly apostrophes (`D’Angelo`) and combining marks are kept (stored as NFC);
  e-mail addresses are limited to RFC 5321 lengths; one validator for the whole app.
- `<html lang>` follows the customer's language (screen readers used an Italian voice for everything).
- The SVG ring no longer logs `<circle> attribute r: undefined`.
- The consultant guide's YouTube video was blocked by the Content-Security-Policy (no `frame-src`).
- **Manager / Stats — every total, KPI and "full" export was cut at 1000 rows** (PostgREST's page size);
  they now read page by page, and Stats says when its 50 000-row safety cap is reached.
- The Stats funnel and claim rate ignored the selected store and dates.
- The Sessions status filter (sent / processing / no e-mail / failed) was applied to the 20 rows on the
  page only; it is now a database filter and the pager agrees with it.
- Search text containing `( ) , "` no longer breaks the query and blanks the list.
- Product names come from the name saved with the lead (and the live catalogue) instead of the bundled
  demo catalogue; date filters use the viewer's local days; the price CSV round-trips (`€64,00`).
- "No match" (an unexplained funnel number) is now "Not claimed", with a tooltip; the Manager header
  names the active tab; the Failed counter agrees with the "Processing" window.
- `ResetPassword` was in Italian although the staff UI is English-only (ADR 006).
- Leftovers of the rebrand: the footers read "© 2026 Suaipe · Suaipe" (kiosk) and "Suaipe · Analytics · Suaipe" (staff).
- The migration chain applies to an **empty** database (`20260507000002` failed on a fresh project).

### Added
- **The second factor in the database** — migration `20261011000003`: restrictive RLS policies and a check in every
  staff-only RPC require an `aal2` token. Behind a switch (`app_config.require_mfa`) that ships **off**, so applying it
  changes nothing; `UPDATE public.app_config SET value = 'on' …` enforces it once every staff account has an
  authenticator (`docs/deployment.md` step 8). Without it, a staff *password* alone could read every lead through the
  REST API.
- **Test suites:** 208 unit tests · 82 browser tests (kiosk resilience, layout in 5 languages × 8
  screens, seeded chaos and a soak run, staff areas against 2 500 leads) · 147 database checks that
  attack the schema as every role (84 of them run again with the second factor enforced). `npm run test:e2e`, `test:e2e:smoke`, `test:e2e:resilience`,
  `test:sql`; CI runs them (the resilience job is advisory). See `supabase/tests/README.md`.
- `VITE_STORES` — define your own stores at build time (one line of JSON) instead of editing code.
- `VITE_PRIVACY_CONTROLLER` / `VITE_PRIVACY_EMAIL` — the GDPR notice names the company that operates the kiosks and a
  contact it reads (it said "Suaipe" / `privacy@suaipe.app` in five hard-coded translations); `EMAIL_REPLY_TO` for the
  e-mail's Reply-To (it was hard-coded to the product's own domain).
- `docs/deployment.md` — the go-live checklist; `npm run docs:screenshots` regenerates the screenshots
  from the running app with neutral sample data.

### Changed
- README rewritten for the Suaipe brand; the old WebiMatch screenshots are gone — `docs/screenshots/`
  and `public/screenshots/` hold the current app. `public/manifest.json` points at them.
- Capacitor app id/name and the default e-mail footer no longer carry the previous brand or a personal name.
- `tailwindcss-animate` and `@capacitor/cli` moved to `devDependencies`.

---

## [2.0.1] — 2026-06-04 — Promote Suaipe to `main`

`main` was kept on the historical Webi-Match v1.7.2 commit as a safety
fallback while 2.0.0 was being validated on the rebrand branch. This
release fast-forwards `main` to the rebranded code and
preserves the original production tip on a dedicated `webi-match`
branch for rollback.

### Topology
- New branch **`webi-match`** snapshots the pre-rebrand production tip
  (`dab4d2b`, Webi-Match v1.7.2). Treat it as a read-only safety net.
- `main` now contains the Suaipe code — Vercel production deploys from
  this commit.
- Brand assets, palette, logo, and discount-code prefix (`SUP-`)
  unchanged from 2.0.0; this release is the promotion event, not a new
  code change.

### Operator action required (post-merge)
- Redeploy the `on-session-created` Edge Function from `main` so new
  emails carry the `SUP-` prefix.
- Ensure `SENTRY_ORG` / `SENTRY_PROJECT` in Vercel env vars match the
  Sentry project slug (rename Sentry project to `suaipe` if desired).

---

## [2.0.0] — 2026-06-03 — Rebrand to **Suaipe**

Independent product identity, fully decoupled from any prior employer
branding. Everything user-facing has been replaced; runtime behaviour,
data model, security posture and feature set are unchanged.

### Brand identity
- **Name:** Webi-Match → **Suaipe**. Package, manifest, HTML title,
  apple-mobile-web-app-title, OG/Twitter cards, every README and ADR.
- **Palette:** Webidoo orange (`hsl(27,92%,55%)` + `hsl(16,100%,50%)`
  gradient) → **electric blue → cyan** (`hsl(217,91%,60%)` →
  `hsl(188,86%,53%)`) on deep navy. Success/CTA accent is now mint
  (`hsl(168,76%,52%)`). All ~150 colour hardcodes rewritten across the
  attract / welcome / quiz / result / success / manager screens, the
  three animated background components, the confetti palette, the
  shadow-glow utility and the email-template preview. CSS variables in
  `src/index.css` are the single source of truth and cascade through
  every `bg-primary` / `text-primary` / `gradient-primary` usage.
- **Logo:** new `<SuaipeLogo>` inline SVG component (electric-blue → cyan
  gradient on a stylised "S" with soft glow) replaces the legacy
  webidoo-logo.webp in the attract / welcome / kiosk-lock screens. The
  raster asset has been removed.
- **Social preview:** `docs/socialpreview.png` regenerated in the new
  palette.
- **Email/contact domains:** `@webidoo.com` → `@suaipe.app` (sender
  fallback, privacy-notice contact). SECURITY.md disclosure email
  routed to the maintainer's personal address.
- **Email discount-code prefix:** `WEBI-XXXXXXXXNN` → `SUP-XXXXXXXXNN`
  (purely cosmetic — same generation algorithm, same DB shape).

### Migration note
- Existing data referencing the old discount-code prefix (`WEBI-…`) is
  still valid and redeemable; only newly-issued codes use the `SUP-`
  prefix.
- The legacy `src/assets/webidoo-logo.webp` asset has been deleted from
  the bundle.
- `src/assets/webidoo-envelope.png` (already orphaned) cleaned up.

---

For the full pre-rebrand history (1.x — Webi-Match era), see the
[`webi-match`](../../tree/webi-match) branch which preserves the
original `CHANGELOG.md` intact at `dab4d2b` (Webi-Match v1.7.2). It is
kept as a read-only rollback snapshot and intentionally not merged
into `main`.
