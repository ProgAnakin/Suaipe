# CLAUDE.md — Suaipe

Read [AGENTS.md](AGENTS.md), [the current handoff](docs/AI-HANDOFF.md), and [deployment instructions](docs/DEPLOY-2.1.0.md).

Suaipe is an iPad-first React/TypeScript product-discovery kiosk backed by Supabase, Brevo and optional Sheets. Version 2.1.0 changes the SQL/Edge/frontend contract together.

The earlier notes about direct session INSERT, public PIN RPC fallback, browser-defined coupon expiry and fallback catalog during failed configuration are obsolete. Never restore those flows.

The current personal portfolio defaults to synthetic demo in every build, including Production, without customer data or staff credentials. Real collection requires the separate explicit safeguard, role/MFA, recent privacy maintenance and a real monitored privacy contact for production. Marketing campaigns are not implemented. Read the current 317-control register and follow-up report before changing those defaults. Verify hosted deployment, gateway, Auth, delivery, recovery, alerts and legal/asset rights separately; local tests and a Git push do not prove them.
