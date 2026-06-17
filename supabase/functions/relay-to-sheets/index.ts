// Supabase Edge Function — server-side relay to Google Sheets Apps Script webhook.
// Keeps the webhook URL out of the client bundle (never exposed to the browser).
//
// Primary path: called by on-session-created (server-to-server, no auth needed).
// Secondary path: callable by authenticated admin users for manual relays.
//
// Required secret (set via Supabase Dashboard → Edge Functions → Secrets):
//   GOOGLE_SHEETS_WEBHOOK_URL — the Apps Script doPost URL
//
// Optional secret:
//   ALLOWED_ORIGIN — restrict CORS to a specific domain

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const WEBHOOK_URL    = Deno.env.get("GOOGLE_SHEETS_WEBHOOK_URL") ?? "";
const ALLOWED_ORIGIN = Deno.env.get("ALLOWED_ORIGIN") ?? "*";
const SUPABASE_URL   = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY    = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const SILENT_OK   = JSON.stringify({ ok: true });
// Payload is a fixed 7-field projection truncated to 500 chars each — a
// well-behaved client tops out well below 10 KB. Reject anything bigger early
// to avoid wasting function memory on malicious large bodies.
const MAX_BODY_SIZE = 16 * 1024;

serve(async (req) => {
  const CORS = {
    "Access-Control-Allow-Origin":  ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info",
  };

  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST") return new Response(SILENT_OK, { status: 200, headers: CORS });

  if (ALLOWED_ORIGIN !== "*") {
    const origin = req.headers.get("origin") ?? "";
    if (origin && origin !== ALLOWED_ORIGIN) {
      return new Response(SILENT_OK, { headers: { ...CORS, "Content-Type": "application/json" } });
    }
  }

  // Require a valid Supabase JWT — prevents unauthenticated external callers.
  // Calls from on-session-created use the service role key directly and bypass this,
  // so this guard only applies to browser/manual invocations.
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) {
    return new Response(SILENT_OK, { headers: { ...CORS, "Content-Type": "application/json" } });
  }
  // Fail closed: if we can't verify the caller because the auth env is unset,
  // refuse rather than skip validation and relay anyway. (Prod always has these
  // set; the primary on-session-created path relays to Sheets itself and never
  // calls this function, so this guard only affects manual/browser invocations.)
  if (!SUPABASE_URL || !SERVICE_KEY) {
    return new Response(SILENT_OK, { headers: { ...CORS, "Content-Type": "application/json" } });
  }
  {
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { error } = await admin.auth.getUser(token);
    if (error) {
      return new Response(SILENT_OK, { headers: { ...CORS, "Content-Type": "application/json" } });
    }
  }

  if (!WEBHOOK_URL) {
    return new Response(JSON.stringify({ ok: true, skipped: true }), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  // Reject oversized bodies before reading them into memory.
  const declaredLen = Number(req.headers.get("content-length") ?? 0);
  if (declaredLen > MAX_BODY_SIZE) {
    return new Response("Payload too large", { status: 413, headers: CORS });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response("Bad Request", { status: 400, headers: CORS });
  }

  const allowed = ["data", "nome", "cognome", "email", "prodotto", "match", "store_id"] as const;
  const safe: Record<string, string> = {};
  if (body && typeof body === "object") {
    for (const key of allowed) {
      const val = (body as Record<string, unknown>)[key];
      if (typeof val === "string") safe[key] = val.slice(0, 500);
    }
  }

  try {
    await fetch(WEBHOOK_URL, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(safe),
    });
  } catch {
    // Non-critical — Supabase is the source of truth
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...CORS, "Content-Type": "application/json" },
  });
});
