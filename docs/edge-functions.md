# Edge Functions

Three Deno-based Edge Functions deployed on Supabase. All live under `supabase/functions/`.

---

## on-session-created

**Trigger:** Supabase database webhook — fires on every `quiz_sessions` INSERT.

Generates a unique discount code, sends a personalised HTML email via Brevo in the customer's language, and optionally relays session data to Google Sheets.

### Secrets required

| Secret | Required | Description |
|--------|----------|-------------|
| `BREVO_API_KEY` | ✅ | Brevo (Sendinblue) API key for transactional email |
| `WEBHOOK_SECRET` | ✅ recommended | Shared secret verified against the `x-webhook-secret` header. Without it the function accepts any caller who knows the URL. Configure the matching header in Supabase Dashboard → Database → Webhooks → on-session-created |
| `EMAIL_SENDER` | optional | Address used as the Brevo `sender` (DKIM-aligned with the verified domain). Falls back to `noreply@suaipe.app` if unset |
| `SITE_URL` | optional | Deployed PWA origin used to turn root-relative product images (`/products/x.png`) into absolute URLs so they render in the email. Falls back to `https://suaipe.vercel.app`. Keep in sync with the front-end `VITE_SITE_URL` |
| `GOOGLE_SHEETS_WEBHOOK_URL` | optional | Apps Script doPost URL — if set, relays session data to a Sheet |
| `WHITELIST_EMAILS` | optional | Comma-separated emails that bypass the 1 email/hour rate limit |

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are auto-injected by the runtime.

### Webhook payload

```json
{
  "type": "INSERT",
  "record": {
    "id": "uuid",
    "email": "customer@example.com",
    "nome": "Mario",
    "cognome": "Rossi",
    "match_percent": 92,
    "product_name": "HEAD HDTW01 – Conduzione Ossea",
    "product_price": "€99,00",
    "product_image": "https://...",
    "product_video": "https://youtube.com/...",
    "matched_product_id": "uuid",
    "language": "it",
    "discount_percent": 10,
    "store_id": "corso-vercelli"
  }
}
```

Valid `store_id` values: `corso-vercelli`, `5-giornate`, `verona`, `bergamo`. Any other value causes the webhook to return `{ ok: true }` silently without sending an email.

### Response

```json
{ "ok": true, "code": "SUP-A1B2C3D410", "emailId": "brevo-message-id" }
```

Discount code format: `SUP-` + 4 random hex bytes + 2-digit discount percentage. Example: `SUP-A1B2C3D410` = 10% discount.

### Rate limiting

One email per hour per email address (server-side check). If the limit is hit, the code is saved but no email is sent. Whitelisted emails bypass this limit.

---

## verify-pin

**Trigger:** HTTP POST from the kiosk or manager UI to unlock the manager dashboard.

Verifies the staff PIN with constant-time comparison to prevent timing attacks. Falls back to bcrypt hash in the database if `STAFF_PIN` secret is not set.

### Secrets required

| Secret | Required | Description |
|--------|----------|-------------|
| `STAFF_PIN` | recommended | Plaintext staff PIN. If absent, falls back to the DB bcrypt path |

### Request

```
POST /functions/v1/verify-pin
Content-Type: application/json

{ "pin_input": "<staff-pin>" }
```

### Response

```json
{ "valid": true, "locked_seconds": 0 }
```

If the IP has 5+ failures in a 5-minute window, `valid` is `false` and `locked_seconds` > 0 (2-minute lockout).

### Rate limiting

In-memory per-IP: 5 failures → 2-minute lockout. Resets on success.

---

## relay-to-sheets

**Trigger:** HTTP POST — called internally by `on-session-created` or by authenticated admin users for manual relays.

Server-side proxy that forwards session data to a Google Sheets Apps Script webhook, keeping the webhook URL secret (never exposed to the browser).

### Secrets required

| Secret | Required | Description |
|--------|----------|-------------|
| `GOOGLE_SHEETS_WEBHOOK_URL` | ✅ | Apps Script `doPost` endpoint URL |

### Request

```
POST /functions/v1/relay-to-sheets
Authorization: Bearer <supabase-jwt>   (optional)
Content-Type: application/json

{
  "data": "2026-05-17T10:00:00Z",
  "nome": "Mario",
  "cognome": "Rossi",
  "email": "customer@example.com",
  "prodotto": "HEAD HDTW01",
  "match": "92%",
  "store_id": "corso-vercelli"
}
```

Only the listed fields are forwarded — any extra keys are stripped. Each value is truncated to 500 characters.

### Response

```json
{ "ok": true }
```

Failures to reach the webhook are logged and silently swallowed — they never cause a 5xx response.

---

## Local development

```bash
# Start all functions locally (requires Supabase CLI)
supabase functions serve

# Set a secret for local dev
supabase secrets set STAFF_PIN=0000

# Invoke a function locally
curl -X POST http://localhost:54321/functions/v1/verify-pin \
  -H "Content-Type: application/json" \
  -d '{"pin_input": "0000"}'
```

## Deploying

```bash
# Deploy all functions
supabase functions deploy

# Deploy a single function
supabase functions deploy on-session-created

# Set production secrets
supabase secrets set BREVO_API_KEY=your_key
supabase secrets set STAFF_PIN=your_pin
```
