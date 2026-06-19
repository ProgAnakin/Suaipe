# Documentation

Reference material for the suaipe codebase.

| Document | What it covers |
|----------|----------------|
| [`edge-functions.md`](./edge-functions.md) | The three Supabase Edge Functions — triggers, secrets, request/response shapes, local dev and deploy |
| [`runbook.md`](./runbook.md) | Operational triage for the most common incidents (email not delivered, kiosk stuck, PIN lockout, etc.) |
| [`adr/`](./adr/) | Architecture Decision Records — the *why* behind the key technical choices |
| [`screenshots/`](./screenshots/) | UI screenshots referenced by the top-level `README.md` |

## Architecture Decision Records

| ADR | Decision |
|-----|----------|
| [001](./adr/001-supabase-over-firebase.md) | Supabase over Firebase |
| [002](./adr/002-pwa-over-native.md) | PWA over a native iOS app |
| [003](./adr/003-pii-encryption-at-rest.md) | PII protection — access-control over app-layer encryption |
| [004](./adr/004-swipe-quiz-over-form.md) | Tinder-style swipe quiz over a traditional form |
| [005](./adr/005-synchronous-pii-encryption.md) | Synchronous PII encryption — *superseded by 003* |
| [006](./adr/006-english-only-staff-ui.md) | Staff dashboards English-only (kiosk stays multilingual) |

For the project overview, stack and setup, see the [root `README.md`](../README.md).
The full release history is in [`CHANGELOG.md`](../CHANGELOG.md).
