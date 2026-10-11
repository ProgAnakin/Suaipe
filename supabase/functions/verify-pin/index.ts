// verify-pin — Staff PIN verification Edge Function
//
// PRIMARY path  → checks the STAFF_PIN secret directly (no DB required).
//   Setup:  Supabase Dashboard → Edge Functions → verify-pin → Secrets
//           Add secret  STAFF_PIN = <your-pin>
//
// FALLBACK path → bcrypt comparison against app_config.staff_pin_hash in the DB.
//   Used automatically when STAFF_PIN secret is not set.
//   Setup:  run migration 20260507000004 in the Supabase SQL Editor.
//
// Rate limiting is handled in-memory (resets on cold start, fine for kiosk use).

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const STAFF_PIN      = Deno.env.get("STAFF_PIN") ?? "";
const SUPABASE_URL   = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY    = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const ALLOWED_ORIGIN = Deno.env.get("ALLOWED_ORIGIN") ?? "";
const SILENT         = JSON.stringify({ valid: false, locked_seconds: 0 });

// In-memory rate limiter keyed by IP. Acceptable for kiosk — cold starts reset it.
const ipAttempts = new Map<string, { count: number; resetAt: number }>();
const MAX_FAILURES = 5;
const WINDOW_MS    = 5 * 60 * 1000; // 5-minute counting window
const LOCKOUT_MS   = 2 * 60 * 1000; // 2-minute lockout after MAX_FAILURES

function makeHeaders(origin: string) {
  // Fail-closed origin handling: only echo Access-Control-Allow-Origin when the
  // request origin matches the configured allowlist (or wildcard). When
  // ALLOWED_ORIGIN is unset and the request carries an Origin, the header is
  // omitted so the browser blocks cross-origin reads. Server-to-server callers
  // (no Origin header) are unaffected.
  let allowOrigin: string | null = null;
  if (ALLOWED_ORIGIN === "*") allowOrigin = "*";
  else if (ALLOWED_ORIGIN && origin === ALLOWED_ORIGIN) allowOrigin = origin;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info",
  };
  if (allowOrigin) headers["Access-Control-Allow-Origin"] = allowOrigin;
  return headers;
}

// The address the platform saw, not one the caller wrote. The FIRST entry of x-forwarded-for is
// whatever the client put in the header (anyone can send `X-Forwarded-For: 1.2.3.4` and rotate it
// to dodge a per-address lockout); `cf-connecting-ip` is set by the CDN, and the LAST x-forwarded-for
// entry is the one the nearest trusted proxy appended.
function getClientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  const last = xff ? xff.split(",").map((p) => p.trim()).filter(Boolean).pop() : undefined;
  return (
    req.headers.get("cf-connecting-ip")?.trim() ||
    req.headers.get("x-real-ip")?.trim() ||
    last ||
    "unknown"
  );
}

// Constant-time comparison — prevents timing oracle on PIN length/value.
function safeEqual(a: string, b: string): boolean {
  // Consume time proportional to b.length even when lengths differ.
  let diff = a.length !== b.length ? 1 : 0;
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) {
    diff |= (a.charCodeAt(i) ?? 0) ^ (b.charCodeAt(i) ?? 0);
  }
  return diff === 0;
}

function checkRateLimit(ip: string): { blocked: boolean; remaining: number } {
  const now = Date.now();
  const entry = ipAttempts.get(ip);
  if (!entry) return { blocked: false, remaining: 0 };
  if (now >= entry.resetAt) { ipAttempts.delete(ip); return { blocked: false, remaining: 0 }; }
  if (entry.count >= MAX_FAILURES) {
    return { blocked: true, remaining: Math.ceil((entry.resetAt - now) / 1000) };
  }
  return { blocked: false, remaining: 0 };
}

function recordFailure(ip: string): void {
  const now = Date.now();
  const cur = ipAttempts.get(ip) ?? { count: 0, resetAt: now + WINDOW_MS };
  cur.count += 1;
  if (cur.count >= MAX_FAILURES) cur.resetAt = now + LOCKOUT_MS;
  ipAttempts.set(ip, cur);
  recentFailures.push(now);
}

// Guesses spread over many addresses (or a spoofed header) are throttled too: more than
// GLOBAL_MAX_FAILURES wrong PINs in GLOBAL_WINDOW_MS, from anywhere, locks everybody for the
// rest of the window. (Per instance, like the per-address limiter; the database keeps its own.)
const recentFailures: number[] = [];
const GLOBAL_MAX_FAILURES = 20;
const GLOBAL_WINDOW_MS    = 5 * 60 * 1000;

function checkGlobalThrottle(): { blocked: boolean; remaining: number } {
  const now = Date.now();
  while (recentFailures.length && now - recentFailures[0] > GLOBAL_WINDOW_MS) recentFailures.shift();
  if (recentFailures.length >= GLOBAL_MAX_FAILURES) {
    return { blocked: true, remaining: Math.ceil((recentFailures[0] + GLOBAL_WINDOW_MS - now) / 1000) };
  }
  return { blocked: false, remaining: 0 };
}

serve(async (req) => {
  const origin = req.headers.get("origin") ?? "";
  const h = makeHeaders(origin);

  // CORS preflight
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: h });

  // Silent origin rejection. When ALLOWED_ORIGIN is unset we reject any caller
  // that carried an Origin header (browser cross-origin); server-to-server
  // callers (no Origin) still pass through.
  if (ALLOWED_ORIGIN === "*") {
    // wildcard — allow everything
  } else if (ALLOWED_ORIGIN) {
    if (origin && origin !== ALLOWED_ORIGIN) {
      return new Response(SILENT, { status: 200, headers: h });
    }
  } else if (origin) {
    // ALLOWED_ORIGIN unset + browser request → fail closed.
    return new Response(SILENT, { status: 200, headers: h });
  }

  if (req.method !== "POST") return new Response(SILENT, { status: 200, headers: h });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return new Response(SILENT, { status: 200, headers: h });
  }

  const ip       = getClientIp(req);
  const pinInput = String(body.pin_input ?? "");

  // Rate limit check (per address, then global)
  const rl = checkRateLimit(ip);
  if (rl.blocked) {
    return new Response(
      JSON.stringify({ valid: false, locked_seconds: rl.remaining }),
      { status: 200, headers: h }
    );
  }
  const gl = checkGlobalThrottle();
  if (gl.blocked) {
    return new Response(
      JSON.stringify({ valid: false, locked_seconds: Math.max(1, gl.remaining) }),
      { status: 200, headers: h }
    );
  }

  // ── PRIMARY: STAFF_PIN secret (set this in Supabase Dashboard) ────────────
  if (STAFF_PIN) {
    const valid = safeEqual(pinInput, STAFF_PIN);
    if (valid) {
      ipAttempts.delete(ip); // clear any prior failures on success
    } else {
      recordFailure(ip);
    }
    return new Response(JSON.stringify({ valid, locked_seconds: 0 }), { status: 200, headers: h });
  }

  // ── FALLBACK: bcrypt hash in database ─────────────────────────────────────
  // Activated only when STAFF_PIN secret is absent.
  // Requires migration 20260507000004 to have been run in Supabase SQL Editor.
  console.warn("[verify-pin] STAFF_PIN secret not set — falling back to DB bcrypt.");

  if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error("[verify-pin] Missing Supabase env — cannot verify PIN.");
    return new Response(SILENT, { status: 200, headers: h });
  }

  const supabase   = createClient(SUPABASE_URL, SERVICE_KEY);
  const ip_address = getClientIp(req) === "unknown" ? null : getClientIp(req);

  const { data, error } = await supabase.rpc("verify_staff_pin", {
    pin_input:  pinInput,
    client_id:  String(body.client_id  ?? "default"),
    user_agent: String(body.user_agent ?? ""),
    ip_address,
  });

  if (error) {
    console.error("[verify-pin] rpc error:", error.message);
    return new Response(SILENT, { status: 200, headers: h });
  }

  // Mirror rate limiting for DB path too (DB tracks its own, but keep in sync)
  const result = data as { valid: boolean; locked_seconds: number } | null;
  if (result?.valid === true) {
    ipAttempts.delete(ip);
  } else if (result?.locked_seconds === 0) {
    recordFailure(ip);
  }

  return new Response(JSON.stringify(data), { status: 200, headers: h });
});
