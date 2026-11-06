# Runbook — Suaipe 2.1.0

Read [AI-HANDOFF.md](AI-HANDOFF.md) and [DEPLOY-2.1.0.md](DEPLOY-2.1.0.md). Do not copy credentials/customer data into general logs, tickets or chats.

## Kiosk unavailable

Check configured store, active catalog and `kiosk_ready`. Maintenance must have run within 48 hours. Management → Privacy shows the last run and pending work. Investigate failed scheduler execution before repeating: maintenance deletes expired data. Do not bypass readiness or collect contacts using fixtures. Use isolated demo for presentation.

## Email missing

Check the protected session's status, expiry and provider ID. `sent`/`email_sent` means provider acceptance, not inbox delivery. Inspect provider delivery/bounce/spam/sender/DKIM before retrying. `pending/failed` can reserve before expiry; fix the error/configuration first. `sending/uncertain` may already have been accepted: reconcile, preserve the code and never bulk-reset. `suppressed` enforces recent-address sending limits. Verify webhook secret, function version and gateway. An expired code must not be resent by a delayed webhook.

## Staff or PIN denied

Check Auth, role, store and aal2. Do not remove RLS/MFA to repair an empty screen. Auth controls password login limits. PIN requires the Edge service, trusted gateway IP, permitted origin and persistent limiter. Five failures in two minutes block the origin; rotating client ID must not unlock it. Never restore direct public PIN verification. Returning to the kiosk ends the local staff session by design.

## Customer erasure

Verify the request and use Management → Privacy as manager with MFA. Local erasure queues tasks for Brevo/Sheets. Verify each provider, relevant logs/history and backup/CSV policy before confirming external completion. Use not applicable only when that integration never received this customer's data. Confirmation minimizes the task and records the staff member. A green local delete is not proof of full provider erasure.

## Reports or CSV fail

Check permissions/network and narrow the date range. Denied/partial/inconsistent pages must not produce a success notification. Preserve formula neutralization. Downloaded CSVs contain personal data and need their own access/retention rules.

## Incident, restore and rollback

Pause collection/sending if needed; preserve minimal IDs/timestamps and reconcile ambiguous delivery. Inspect costs, quotas and external tasks. Assign an operator and confirm alert reception. `test:restore` is a synthetic rehearsal; validate real backups/files and measure RPO/RTO separately. Do not roll back only the frontend to the incompatible old contract. Repair or restore a tested coordinated release, then resume gradually.

After deployment record the real URL, `/release.json`, commit, migrations/functions and evidence for the next IA. A push/build is not provider confirmation.
