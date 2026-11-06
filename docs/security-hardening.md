# Security release: deployment and validation

> Historical first-round notes. Current rules and deployment are in [AI-HANDOFF.md](AI-HANDOFF.md) and [DEPLOY-2.1.0.md](DEPLOY-2.1.0.md).

This branch changes the database contract. Deploy the migration, Edge Functions and frontend together in a maintenance window. No hosted database changes or deployment were performed by the implementation task.

## Changes

- Public claims go through `submit_quiz_session`. It validates store, active product and consent; normalizes email; derives commercial snapshots and discount from the catalog; serializes per-address limits; and deduplicates retries by request UUID and immutable payload fingerprint. Direct public INSERT/UPDATE is revoked.
- Session deletion requires manager + MFA and at least seven days of retention. Store-scoped operators cannot request global deletion.
- Redemption requires manager/responsible-store role + MFA, a matching store, accepted email, valid code and unexpired server timestamp. Direct redemption UPDATE is revoked.
- Restrictive MFA policies protect session PII, guides, audit data and configuration writes. Administrative SECURITY DEFINER RPCs also enforce MFA internally.
- Discounts expire 24 hours after creation, using a persisted timestamp. Browser-local TTL preferences no longer override business rules.
- Email delivery uses an atomic reservation and canonical database data. Duplicate/ambiguous attempts do not resend automatically. Failure to persist provider acceptance is reported. FAQ lookup is scoped by store; provider error bodies are not logged. Manual Sheets relay requires manager + MFA authorization.
- Kiosks refuse personal-data collection without a configured store and usable catalog. Matching refuses empty/inactive product sets. Cache survives partial refresh failures; abandoned welcome forms reset; late callbacks cannot revive an abandoned form.
- Login audit RPC builders are consumed and transport failures clear the loading state. This does not replace Supabase Auth's native rate limits.
- Analytics funnel queries share the selected date/store filters. Browser zoom is enabled. Browser tests use positive assertions instead of swallowing missing-field timeouts or checking obsolete dashboard text.
- The service worker no longer caches REST responses, which could retain customer data across staff sessions. Activation deletes the legacy `supabase-rest` cache. Offline catalog snapshots remain managed explicitly by `startupCache`.
- Compatible dependency updates plus Vite 6/Vitest 5 address observed high/critical advisories. Node 24 LTS is configured in `.nvmrc` and CI.

## Deployment order

1. Validate in an isolated staging Supabase project. Verify backups/restoration separately before changing production. Confirm existing migrations are applied.
2. Pause kiosk submissions and drain active webhook deliveries. Old frontend clients use direct INSERT and will fail after this migration; do not mix old/new writers during rollout.
3. Apply `20261103000001_release_security.sql` once. It adds image/video columns missing from migration history, expiry/fingerprint/email-processing state, restricted grants/policies and new RPCs. Existing expiry is initialized to creation + 24 hours.
4. Deploy `on-session-created` and `relay-to-sheets`. Keep `WEBHOOK_SECRET` configured on both the database webhook and the function. Verify webhook gateway authentication; keep service-role credentials server-side.
5. Deploy frontend, check staff MFA enrollment and store/catalog configuration, and refresh installed kiosk PWAs.
6. Run a synthetic staging claim: one session, server-derived discount, one provider acceptance, same code on retry, correct store FAQ, authorized redemption and expired-code refusal. Verify actual inbox delivery separately from provider acceptance.
7. Resume kiosks only after validation. If rollout fails, keep submissions paused and repair the secured contract; do not restore broad grants as a shortcut.

The correction in `20260507000002_cleanup_legacy_product_ids.sql` changes its conflict target to the already-existing composite key. It fixes fresh replay; already-applied databases do not need that seed rerun.

## Email reconciliation

Only `pending` and `failed` can be reserved. `sending`, `uncertain`, `sent` and `suppressed` do not resend automatically. A timeout/crash after reservation may leave an unsent email locked. The design prefers operator reconciliation over duplicate messages and conflicting codes; it is not an exactly-once delivery guarantee.

Check the provider history before deciding whether to mark a session sent or return it to pending and redeliver its webhook. Keep its code unchanged. Never bulk-reset sending/uncertain rows blindly. A durable queue with provider idempotency remains follow-up work. Sheets relay is awaited with failure logging but is not a durable outbox.

## Validation

Observed on 2026-11-03: typecheck passed; lint passed with four existing warnings; 155 tests in 22 files and 24 SQL checks passed; production build and local dev/preview HTTP checks passed. The built service worker imports the legacy-cache cleanup, has no REST runtime cache, and its activation handler deletes `supabase-rest`. Browser activation itself remains untested here.

The npm audit snapshot reports zero high/critical advisories: production has six moderate advisories; the full tree has 25 moderate and two low. Playwright lists 16 tests in three files; listing does not constitute execution.

Use Node 24 and `npm ci`.

```bash
npm run typecheck
npm run lint
npm test -- --maxWorkers=2
npm run test:db
VITE_SUPABASE_URL=https://placeholder.supabase.co \
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder \
npm run build
npm audit --omit=dev --audit-level=high
```

`test:db` uses disposable PostgreSQL 17 with no exposed port. Minimal Supabase auth/storage stand-ins support a replay of all migrations and 24 real SQL checks for grants, roles, MFA, RLS, idempotency, commercial snapshots and expiration. It does not validate a hosted gateway or live ACLs. CI runs this regression.

For WebKit, run `npx playwright install --with-deps webkit` and `npm run test:e2e -- --workers=2`. Cloud browser downloads were denied by network policy; the official Playwright container was also denied. Browser checks still need execution in an allowed environment. Keep the CI gate; do not update visual baselines merely to obtain a passing result.

## Remaining boundaries

- An unconfigured public visitor receives an unavailable message. This is not a dedicated demo mode. Prepare an isolated demo store/catalog before advertising an unrestricted walkthrough.
- Failed/ambiguous claims retry their original payload. Restart the quiz to submit a different email after a submission attempt.
- Moderate advisories remain in the router and Capacitor tooling chains, plus development tooling. Track them separately; absence of high/critical advisories is not an absence of all risk.
- PIN verification retains its historical direct-RPC fallback and in-memory Edge limiter. Review it separately before treating a shared PIN as a strong boundary. Staff data access requires Auth, role and MFA checks.
- The public email-cooldown RPC reveals recent address activity and uses a per-address limiter. A public demo needs a separate abuse/privacy review; current claim limits do not prevent an attacker rotating email addresses.
- Complete export pagination/CSV hardening, live email/ACL validation, Sheets retention, verified backup restoration and an iPad accessibility/visual pass remain follow-up items.
- Verify real production/store claims and identify synthetic metrics before publishing the portfolio. This branch does not establish external business facts or GDPR/LGPD compliance.
