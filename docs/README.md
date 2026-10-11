# Documentation

Reference material for the Suaipe codebase.

| Document | What it covers |
|----------|----------------|
| [`deployment.md`](./deployment.md) | **Go-live checklist** — Supabase project, migrations, first manager, stores, Edge Functions and their secrets, Vercel, every iPad |
| [`edge-functions.md`](./edge-functions.md) | The three Supabase Edge Functions — triggers, secrets, request/response shapes, rate limits, local dev and deploy |
| [`runbook.md`](./runbook.md) | Operational triage for the usual incidents (e-mail not delivered, kiosk stuck, PIN lockout, empty dashboards, retention) |
| [`server-hardening.md`](./server-hardening.md) | What was hardened on the Supabase side, the deploy order, what is still open, and the SQL to verify production |
| [`qa/QA-REPORT.md`](./qa/QA-REPORT.md) | The pre-sale test pass — how the app was attacked, what broke, what was fixed, the residual risks |
| [`adr/`](./adr/) | Architecture Decision Records — the *why* behind the key technical choices |
| [`screenshots/`](./screenshots/) | The screenshots used by the top-level `README.md` (regenerate with `npm run docs:screenshots`) |

Tests have their own guides: [`../supabase/tests/README.md`](../supabase/tests/README.md) (database attack suite) and
the `e2e/` folder (browser suites; see the scripts in `package.json`).

## Architecture Decision Records

| ADR | Decision |
|-----|----------|
| [001](./adr/001-supabase-over-firebase.md) | Supabase over Firebase |
| [002](./adr/002-pwa-over-native.md) | PWA over a native iOS app |
| [003](./adr/003-pii-encryption-at-rest.md) | PII protection — access-control over app-layer encryption |
| [004](./adr/004-swipe-quiz-over-form.md) | Tinder-style swipe quiz over a traditional form |
| [005](./adr/005-synchronous-pii-encryption.md) | Synchronous PII encryption — *superseded by 003* |
| [006](./adr/006-english-only-staff-ui.md) | Staff dashboards English-only (kiosk stays multilingual) |
| [007](./adr/007-product-film-with-remotion.md) | The product film is made with Remotion from the real app, in an isolated `video/` project |

For the project overview, stack and setup, see the [root `README.md`](../README.md).
The full release history is in [`CHANGELOG.md`](../CHANGELOG.md).
