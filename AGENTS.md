# Working on Suaipe

- Read `docs/AI-HANDOFF.md` and `docs/DEPLOY-2.1.0.md`. The earlier audit in `docs/audits/2026-11-06/` is historical evidence, not current validation.
- Use this checkout and Node 24. Preserve user changes; no worktree unless requested.
- Claims use `submit_quiz_session` and immutable UUID/body retries. Never restore direct INSERT, public PIN fallback or client-written login/audit/cooldown authority.
- Vercel previews default to synthetic demo. They must not collect credentials, write contacts, send messages or connect to the real backend.
- A frontend push does not deploy migrations or Edge Functions. Follow the coordinated release order and report only observed provider results.
- Validate types (app/config and Edge contract), lint, unit tests, SQL, synthetic restore, both builds and both WebKit suites. Preserve failure/timeout/role regressions; do not change screenshots merely to make checks green.
- Use synthetic fixtures. Keep credentials and customer data out of source, reports and chat. Public Supabase keys are not service-role credentials.
- Distinguish local tests, synthetic recovery, staging, hosted deployment, provider acceptance and inbox delivery. Honor the user's scope; never invent success when credentials/network are unavailable.
