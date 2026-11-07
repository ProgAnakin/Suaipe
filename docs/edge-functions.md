# Supabase Edge Functions — 2.1.0

Read [AI-HANDOFF.md](AI-HANDOFF.md), [DEPLOY-2.1.0.md](DEPLOY-2.1.0.md) and [runbook.md](runbook.md) for the current contract. Functions do not auto-deploy with a Vercel frontend push.

| Function | Authentication | Behavior |
|---|---|---|
| on-session-created | Required WEBHOOK_SECRET header | Canonical lookup/reservation/code, provider acceptance ID, expiry check; optional Sheets only for unwithdrawn separate marketing opt-in |
| verify-pin | PIN plus trusted managed gateway origin/IP | Persistent server-side origin limiter; secret comparison or server hash fallback. No browser SQL fallback |
| relay-to-sheets | Supabase user JWT verified by Auth, manager role and aal2 | Body only `{session_id}`; canonical authorized row, explicit feature flag and unwithdrawn opt-in; safe cells, vendor/redirect allowlist and timeout |
| privacy-maintenance | Required MAINTENANCE_SECRET header | GET is read-only health; POST applies retention and updates readiness. Separate operations, never use POST as a harmless probe |

Runtime secrets belong in Supabase settings, not VITE variables/source. Optional Sheets is off unless ENABLE_SHEETS_RELAY=true. The manual relay requires ALLOWED_ORIGIN and configured service credentials, refuses fabricated contact fields and cannot create a marketing permission. Only script.google.com/script.googleusercontent.com are accepted as configured destinations/redirects; provider refusal is 502, missing Auth 401, denied role/origin 403, unavailable consent 409, disabled/unconfigured service 503. No responses promise successful delivery or synchronization without the corresponding operation.

Local package installation uses the managed proxy/TLS trust. Native tests cover shared handlers without contacting real providers; hosted Edge runs in the provider infrastructure and still requires explicit gateway/secrets/configuration checks. See .env.example for names only. Do not copy local test tokens to a hosted service or treat the screenshot fixture as Auth proof.

Database, Edge and frontend must be released together. Do not re-open public grants or ignore readiness when an old frontend fails. The config explicitly disables gateway JWT verification only for handlers that authenticate internally with their secret/PIN; this does not make the service PIN RPC public. Verify the gateway's IP behavior in staging before using the PIN limiter as an abuse boundary.

Local `typecheck:edge` checks contracts against minimal Deno declarations and SDK types. `test:edge:runtime` also executes three native Deno boundary tests. Network dependencies are mocked in handler tests. These checks do not prove live SDK/gateway/Auth configuration, inbox delivery, provider erasure, scheduler execution or production restoration. Record those outcomes separately in the release handoff.
