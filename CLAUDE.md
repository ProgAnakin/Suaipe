# CLAUDE.md — Suaipe

Read [AGENTS.md](AGENTS.md), [the current handoff](docs/AI-HANDOFF.md), and [deployment instructions](docs/DEPLOY-2.1.0.md).

Suaipe is an iPad-first React/TypeScript product-discovery kiosk backed by Supabase, Brevo and optional Sheets. Version 2.1.0 changes the SQL/Edge/frontend contract together.

The earlier notes about direct session INSERT, public PIN RPC fallback, browser-defined coupon expiry and fallback catalog during failed configuration are obsolete. Never restore those flows.

Vercel previews default to synthetic demo without customer data or staff credentials. Real operation requires role/MFA checks, recent privacy maintenance and configured privacy identity/contact. Verify remote deployment, gateway, Auth, delivery, backup, alerts and legal/asset rights separately. Do not claim they are proven by local tests or a Git push.
