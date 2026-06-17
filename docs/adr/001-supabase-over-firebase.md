# ADR 001 — Supabase over Firebase

**Date:** 2026-04-01  
**Status:** Accepted

## Context

Suaipe needs a backend that handles:
- Storing quiz sessions with customer PII (name, email, matched product)
- Row-level authorisation so consultants only see their store's data
- Server-side logic for email dispatch and PIN authentication
- A real-time subscription so the manager dashboard updates without polling
- PII encryption at rest (GDPR baseline)

Firebase and Supabase were both serious candidates.

## Decision

**Supabase** (PostgreSQL + Edge Functions + RLS + Realtime).

## Rationale

| Requirement | Firebase (Firestore) | Supabase (PostgreSQL) |
|---|---|---|
| Column-level PII encryption | Not built-in — application layer only | `pgp_sym_encrypt` via `pgcrypto` extension — runs inside the DB |
| Row-level security | Security rules — custom DSL, tested manually | Standard SQL `CREATE POLICY` — composable, version-controlled, unit-testable |
| SHA-256 email hashing for dedup | Client-side only | `encode(digest(email, 'sha256'), 'hex')` inside DB trigger |
| Real-time subscriptions | Native (excellent) | Supabase Realtime — comparable for our scale |
| Server-side logic | Cloud Functions (Node.js, cold starts) | Edge Functions (Deno, V8 isolates, no cold start) |
| SQL-shaped analytics | Requires BigQuery export | Direct SQL aggregation, PostgREST auto-API |
| Store-role isolation | Custom claims in JWT | `store_roles` table + RLS `auth.uid()` checks |

The decisive factor was **RLS + pgcrypto together**: we can enforce per-store data isolation and encrypt sensitive columns inside the same transactional boundary, without shipping encryption keys to the client or adding an application-level encryption layer.

> **Update — partially superseded:** the `pgcrypto` column-encryption described above was implemented but never wired into the read paths and was **removed** in favour of access-control — see [ADR 003](./003-pii-encryption-at-rest.md) and [ADR 005](./005-synchronous-pii-encryption.md). RLS (per-store isolation) remains the load-bearing reason this decision still holds; column encryption is no longer part of it.

A secondary factor was **Supabase migrations** — SQL files in `supabase/migrations/`, version-controlled, reviewed in PRs, runnable against a fresh project. Firebase schema is implicit and harder to audit.

## Consequences

- All schema changes go through SQL migration files (`supabase/migrations/`), reviewed before merge.
- Edge Functions deploy independently via `supabase functions deploy <name>` and read secrets from the Supabase vault — no secrets in code or env files.
- Real-time subscriptions use `supabase.channel()` with `postgres_changes` events — sessions and KPI cards update live on the manager dashboard.
- If Supabase is unavailable, the kiosk quiz still runs (offline PWA), but session persistence and email dispatch are queued until connectivity returns.
