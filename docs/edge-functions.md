# Supabase Edge Functions — 2.1.0

Read [AI-HANDOFF.md](AI-HANDOFF.md), [DEPLOY-2.1.0.md](DEPLOY-2.1.0.md) and [runbook.md](runbook.md) for the current contract. Functions do not auto-deploy with a Vercel frontend push.

| Function | Authentication | Behavior |
|---|---|---|
| on-session-created | Required WEBHOOK_SECRET header | Canonical session lookup, atomic email reservation, persisted code, provider acceptance ID, expiry check; optional minimized Sheets copy |
| verify-pin | PIN plus trusted managed gateway origin/IP | Persistent server-side origin limiter; secret comparison or server hash fallback. No browser SQL fallback |
| relay-to-sheets | Supabase user JWT, manager role and aal2 | Authorized manual relay; bounded/safe cells and timeout; provider failure is reported |
| privacy-maintenance | Required MAINTENANCE_SECRET header | Daily retention cleanup, external-erasure queue and reconciliation counters; updates kiosk readiness |

All functions use the configured session proxy/TLS trust when tested in the managed environment. Runtime secrets belong in Supabase settings, not VITE variables or source. Optional Sheets is off unless ENABLE_SHEETS_RELAY=true. See .env.example for names only.

Database, Edge and frontend must be released together. Do not re-open public grants or ignore readiness when an old frontend fails. The config explicitly disables gateway JWT verification only for handlers that authenticate internally with their secret/PIN; this does not make the service PIN RPC public. Verify the gateway's IP behavior in staging before using the PIN limiter as an abuse boundary.

Local `typecheck:edge` checks contracts against minimal Deno declarations and SDK types. Handler tests mock the network. Neither proves live gateway configuration, inbox delivery, provider erasure, scheduler execution or production restoration. Record those outcomes separately in the release handoff.
