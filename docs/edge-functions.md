# Edge Functions

Three Deno-based Edge Functions on Supabase, under `supabase/functions/`.

> **They do not deploy by themselves.** Only the front end does (Vercel, on push to `main`). After every
> change under `supabase/functions/`, run `supabase functions deploy <name>`.

Code that has to be identical in the browser and in a function lives in `supabase/functions/_shared/`
and is covered by unit tests (`src/__tests__/discountCode.test.ts`, `validators.test.ts`). A function
keeps an inline copy so it stays a single file that can be pasted into the Dashboard; a test fails if the
copy drifts from the reference.

| Function | Called by | Secrets |
|---|---|---|
| [`on-session-created`](#on-session-created) | database webhook, on every `quiz_sessions` INSERT | `BREVO_API_KEY`, **`WEBHOOK_SECRET`**, `EMAIL_SENDER`, `SITE_URL`, `ALLOWED_ORIGIN`, optional `GOOGLE_SHEETS_WEBHOOK_URL`, `WHITELIST_EMAILS` |
| [`verify-pin`](#verify-pin) | the kiosk's staff overlay | `STAFF_PIN`, `ALLOWED_ORIGIN` |
| [`relay-to-sheets`](#relay-to-sheets) | signed-in staff (manual relays) | `GOOGLE_SHEETS_WEBHOOK_URL`, optional `ALLOWED_ORIGIN` |

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected by the runtime.

---

## on-session-created

**Trigger:** Supabase database webhook — Database → Webhooks → table `quiz_sessions`, event **Insert**,
type *Supabase Edge Functions*, HTTP header `x-webhook-secret: <WEBHOOK_SECRET>`.

Generates the discount code, sends the personalised HTML e-mail through Brevo in the customer's
language, and optionally copies the lead to a Google Sheet.

### Secrets

| Secret | Required | Description |
|--------|----------|-------------|
| `BREVO_API_KEY` | ✅ | Brevo API key for transactional e-mail |
| `WEBHOOK_SECRET` | ✅ | Compared (constant time) with the `x-webhook-secret` header. **If it is unset the function rejects every call** — no customer gets an e-mail, and the log says so |
| `EMAIL_SENDER` | recommended | The Brevo `sender` address. Must be a verified sender/domain with SPF/DKIM or the mail lands in spam. Falls back to `noreply@suaipe.app` |
| `SITE_URL` | recommended | The deployed origin; turns root-relative product images (`/products/x.png`) into absolute URLs so they render in the mail. Keep equal to the front end's `VITE_SITE_URL` |
| `ALLOWED_ORIGIN` | optional | CORS allow-list for browser callers. The database webhook sends no `Origin` and is unaffected |
| `GOOGLE_SHEETS_WEBHOOK_URL` | optional | Apps Script `doPost` URL — if set, every sent e-mail is also appended to the Sheet |
| `WHITELIST_EMAILS` | optional | Comma-separated addresses that skip the 1-e-mail-per-hour limit (for staff testing). **Leave empty in production** |

### What it does, in order

1. Rejects the call unless the secret matches (a silent `200`, so the URL is not an oracle).
2. Ignores rows without an e-mail or with a malformed `store_id` (shape `^[a-z0-9][a-z0-9-]{1,49}$` — any
   store slug works; there is no fixed list).
3. **Idempotent:** if the session's `email_sent` is already `true` it answers `{ ok: true, deduped: true }`
   — a webhook retry neither regenerates the code nor sends twice.
4. **Reads the product from the database, never from the row.** The row is written by a public (anon-key)
   browser, so a forged name, price, image, video or discount must not reach a customer's inbox.
   The facts come from `custom_products`, overridden per store by `product_settings` (price, image,
   video, discount). An unknown product gets **no e-mail** (`{ ok: true, skipped: "unknown product" }`).
5. Builds the code `SUP-` + 8 hex characters + the 2-digit discount (`SUP-A1B2C3D410` = 10 %). The discount
   is the store's configured one for that product (5 % if none), clamped to 0–99.
6. **Rate limit — one e-mail per address per hour**, case-insensitive (`Foo@x.com` = `foo@x.com`).
   If the address already received one, the code is saved on the lead (staff see it in /manager →
   Sessions & Codes) but no e-mail is sent. The kiosk checks the same rule before the quiz starts
   (`check_email_cooldown`), so a customer is told up front rather than left waiting for a mail.
   Addresses in `WHITELIST_EMAILS` bypass the limit.
7. Writes `discount_code` **before** sending; if that write fails it aborts with `500` rather than mail a
   code that was never stored.
8. Reads the editable `email_template` row for the customer's language **at send time** (a manager's edit
   in /manager → Management → Email is live for the next e-mail — no redeploy) and the store/product FAQ.
9. Sends through Brevo. `email_sent = true` is written only after Brevo accepts the message. A Brevo
   error returns `{ ok: false }` (`500`) and logs the provider's reply server-side only.
10. Copies the lead to the Sheet (fire-and-forget; never delays or fails the e-mail). Values that begin
    with `= + - @` are stored as text (`sheetsSafe`), so a name like `=IMPORTXML(…)` cannot run inside
    the CRM sheet.

### Request (Supabase webhook payload — only these fields are read)

```json
{
  "type": "INSERT",
  "record": {
    "id": "uuid",
    "email": "customer@example.com",
    "nome": "Mario",
    "cognome": "Rossi",
    "match_percent": 92,
    "matched_product_id": "<custom_products.id>",
    "language": "it",
    "store_id": "my-store"
  }
}
```

### Responses

| Body | Meaning |
|---|---|
| `{ "ok": true, "code": "SUP-A1B2C3D410", "emailId": "<brevo id>" }` | sent |
| `{ "ok": true }` | rejected silently (bad secret/origin/store), or rate-limited |
| `{ "ok": true, "deduped": true }` | already sent for this session |
| `{ "ok": true, "skipped": "unknown product" }` | product not in the catalogue |
| `{ "ok": false }` / `{ "ok": false, "error": "discount code persistence failed" }` (`500`) | Brevo refused / the code could not be stored — the webhook may retry |

The database enforces the rest (`20261011000001_security_hardening.sql`): `quiz_sessions` only lets a
browser insert client-owned columns (no code, no discount, no `email_sent`), accepts at most 5 rows per
address per hour and 120 per minute overall, and has a unique index on `discount_code`.

---

## verify-pin

**Trigger:** HTTP POST from the kiosk's staff overlay (6-tap on the logo, or the store badge).

Checks the staff PIN with a constant-time comparison. The PIN only unlocks the kiosk's staff overlay
(store selection, kiosk mode); the dashboards sign in with an account and an authenticator code.

### Secrets

| Secret | Required | Description |
|--------|----------|-------------|
| `STAFF_PIN` | recommended | Plaintext PIN — **use six digits or more**. If absent, the function falls back to the bcrypt hash in `app_config.staff_pin_hash` (migration `20260507000004`) through the `verify_staff_pin` RPC |
| `ALLOWED_ORIGIN` | ✅ for browsers | The kiosk's origin. With it unset, any request that carries an `Origin` header (every browser) is silently answered `valid: false` |

### Request / response

```
POST /functions/v1/verify-pin
{ "pin_input": "<staff-pin>" }
```

```json
{ "valid": true, "locked_seconds": 0 }
```

While locked: `{ "valid": false, "locked_seconds": 87 }`.

### Rate limiting

- **Per address:** 5 wrong PINs within 5 minutes → that address is locked for 2 minutes.
- **Everyone:** 20 wrong PINs within 5 minutes, from anywhere → every address is locked for the rest of
  the window.
- The "address" is what the platform saw (`cf-connecting-ip`, `x-real-ip`, the last `x-forwarded-for`
  entry) — never the first `x-forwarded-for` entry, which the caller writes. All iPads behind one shop
  router therefore share an address.
- These counters live in the function's memory and reset on a cold start or a redeploy. The database path
  keeps its own, in `admin_access_log`: 3 per device in 2 min, 10 per address in 10 min, 20 for everyone
  in 5 min.

---

## relay-to-sheets

**Trigger:** HTTP POST by a signed-in staff user for a manual relay. Nothing in the app calls it today:
the automatic copy to the Sheet is made by `on-session-created` itself. It stays as a server-side proxy so
the Apps Script URL never has to be in a browser bundle.

### Secrets

| Secret | Required | Description |
|--------|----------|-------------|
| `GOOGLE_SHEETS_WEBHOOK_URL` | ✅ | Apps Script `doPost` endpoint |
| `ALLOWED_ORIGIN` | optional | Restricts CORS (default `*`) |

### Request

```
POST /functions/v1/relay-to-sheets
Authorization: Bearer <a signed-in user's access token>
Content-Type: application/json

{ "data": "2026-05-17T10:00:00Z", "nome": "Mario", "cognome": "Rossi",
  "email": "customer@example.com", "prodotto": "…", "match": "92%", "store_id": "my-store" }
```

Without a valid session token (the public anon key is not one) the call is answered `{ "ok": true }` and
nothing is relayed. Only the seven fields above are forwarded; each value is cut to 500 characters, line
breaks become spaces, and a value that begins with `= + - @` gets a leading apostrophe. Bodies over 16 KB
are refused. A failure to reach the Sheet is logged and swallowed — never a 5xx. If the auth environment is
missing the function refuses instead of relaying unauthenticated.

---

## Local development

```bash
# Start all functions locally (requires Supabase CLI)
supabase functions serve

# Local secrets
supabase secrets set STAFF_PIN=000000

# Invoke a function locally
curl -X POST http://localhost:54321/functions/v1/verify-pin \
  -H "Content-Type: application/json" \
  -d '{"pin_input": "000000"}'
```

## Deploying

```bash
supabase functions deploy on-session-created verify-pin relay-to-sheets

supabase secrets set \
  BREVO_API_KEY=… EMAIL_SENDER=noreply@your-domain.com \
  WEBHOOK_SECRET=$(openssl rand -hex 24) \
  STAFF_PIN=<six or more digits> \
  ALLOWED_ORIGIN=https://your-kiosk-domain.com SITE_URL=https://your-kiosk-domain.com
```

The full go-live order (database first, then functions, then the front end) is in
[`deployment.md`](./deployment.md).
