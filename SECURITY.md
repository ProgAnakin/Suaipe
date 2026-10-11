# Security Policy

## Reporting a Vulnerability

If you believe you have found a security vulnerability in Suaipe, please **do not open a public GitHub issue**. Instead, report it privately so the issue can be triaged and a fix can be coordinated before disclosure.

Send a private report by either:

- Using GitHub's [private vulnerability reporting](https://docs.github.com/en/code-security/security-advisories/guidance-on-reporting-and-writing-information-about-vulnerabilities/privately-reporting-a-security-vulnerability) flow on this repository, **or**
- Emailing the maintainer privately at `costatocb@gmail.com`

Please include, where possible:

- A clear description of the issue and its potential impact
- Steps to reproduce (or a proof-of-concept)
- The version / commit hash where the issue was observed
- Whether the issue affects production, staging, or local environments
- Any relevant logs, request payloads, or screenshots — **excluding real customer PII**

You should receive an acknowledgement within **3 business days**. The maintainer will work with you on a remediation timeline, typically aiming for a fix within 14 days for high-severity issues and 30 days for medium / low severity.

## Scope

In scope:

- The kiosk web app (`/`)
- The manager dashboard (`/manager`)
- The stats dashboard (`/stats`)
- The Supabase Edge Functions (`on-session-created`, `verify-pin`, `relay-to-sheets`)
- SQL migrations and database functions
- Build / CI configuration

Out of scope:

- Third-party services (Supabase, Brevo, Vercel, Sentry, Google Sheets) — please report directly to the vendor
- Issues that require a privileged role already (e.g. a malicious authenticated `manager` user) unless they break the privilege boundary itself
- Denial-of-service via traffic volume — the deployment lives behind a CDN/edge platform
- Social engineering of the store staff

## Hardening Already In Place

Suaipe was built defensively from day one. The following protections are part of the current codebase:

### Authentication & Authorisation
- Supabase Auth with TOTP MFA required to open any staff area (`/stats`, `/manager`, `/consulente`). It is enforced in the browser; enforcing it in the database policies as well is a documented follow-up ([`docs/server-hardening.md`](./docs/server-hardening.md) §A)
- Staff PIN (kiosk overlay only): constant-time comparison; lockout per address (5 wrong → 2 min) and a global ceiling (20 wrong in 5 min); the address is what the platform saw, never a header the client writes; bcrypt database fallback with its own limits
- Row-Level Security on every table; privileged functions are executable by `authenticated` only and check the caller's role themselves
- Role-based access via `store_roles` (`manager` / `consulente_responsabile` / `consulente`) — managers see all stores, store consultants only their own, junior consultants get a read-only training zone

### PII Protection
- Customer `email` / `nome` / `cognome` are readable only by authenticated staff — managers (all stores) and `consulente_responsabile` (own store). No anonymous access.
- Access is enforced by Row-Level Security plus column-level GRANTs, scoped to the caller's role and store
- Encrypted at rest by the Supabase storage layer (platform-level)
- Stale customer data is removed by the `purge_sessions_older_than` retention RPC
- Note: app-layer AES encryption was evaluated and intentionally **not** adopted (see [ADR 003](./docs/adr/003-pii-encryption-at-rest.md)) — encrypting these columns would break the dashboard's partial-match search. Access control + at-rest encryption + retention purge were chosen instead.

### Rate Limiting
- Server-side 1-email-per-hour cooldown per address, case-insensitive (cannot be bypassed from the client)
- The database caps lead inserts: 5 per address per hour and 120 per minute overall, and only lets a browser write client-owned columns
- DB-level failed-login tracking whose helpers cannot be flooded, nor used to lock an address out of the kiosk
- PIN endpoint rate-limited per address and globally

### Injection Defence
- All session search inputs escape `%`, `_`, `\` before interpolation into PostgREST `.or()` filter
- `escHtml()` applied to every user-supplied field rendered in transactional emails
- `safeUrl()` validates `https://` prefix on all product URLs before injecting into emails
- `stripHtml()` sanitises custom-product name and description on save
- The e-mail's product name, price, image, video and discount are read from the catalogue — never from the row a public client inserted
- CSV exports (Sessions, Stats, audit log) and the Google Sheets relay defuse spreadsheet formulas (`= + - @`)
- The service worker caches only the four public catalogue tables — never customer or staff responses

### Transport & CORS
- HTTPS-only (HSTS via `vercel.json`)
- Strict `ALLOWED_ORIGIN` allowlist on Edge Functions — no wildcard fallback in production
- Silent rejection of unexpected origins (no information leakage)
- CSP and SameSite cookie settings declared in `vercel.json`

### Webhook Surface
- The database webhook is gated by a shared secret (`x-webhook-secret`); the function fails closed when it is unset
- Rows with a malformed `store_id`, and calls with a bad secret, are silently dropped (no fingerprinting)

### Observability
- Sentry error tracking + session replay (replay on error only)
- Audit log of every dashboard write action (`manager_audit_log`)
- PIN access log with IP and user-agent (`admin_access_log`)

### Build & CI
- Typecheck, lint, test, build and a production `npm audit` run on every push, PR, and feature branch
- A database job applies every migration to an empty PostgreSQL and attacks the result as anonymous, role-less, `consulente`, `consulente_responsabile` and `manager` users (84 checks, `supabase/tests/`)
- Browser suites drive the real kiosk and the staff areas against a backend that misbehaves (`e2e/`)
- The account of the pre-sale test pass is in [`docs/qa/QA-REPORT.md`](./docs/qa/QA-REPORT.md)
- Bundle is code-split — admin routes lazy-loaded so secrets paths never reach the kiosk bundle
- Stub env vars in CI (`VITE_SUPABASE_URL=https://placeholder.supabase.co`) — real secrets only live in Vercel / Supabase

## Out-of-Band Disclosure

If a fix requires coordinated disclosure (e.g. a vulnerability impacting customer PII), the maintainer will publish a `GitHub Security Advisory` and credit the reporter (with consent) in the changelog.

Thank you for helping keep Suaipe safe.
