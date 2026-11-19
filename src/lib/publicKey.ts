/**
 * The browser may hold exactly one Supabase credential: the PUBLIC one — the legacy `anon` JWT or a
 * `sb_publishable_…` key. Anything that bypasses Row Level Security (the legacy `service_role` JWT, a
 * `sb_secret_…` key) or manages the project (a personal access token, `sbp_…`) is shipped, as plain text, to
 * every visitor's browser the moment it sits in a `VITE_*` variable.
 *
 * Checked twice, so a wrong paste in the hosting dashboard fails loudly instead of going live:
 *   - when the app starts (`src/integrations/supabase/client.ts`), and
 *   - when it is BUILT (`vite.config.ts`) — the deploy stops before the key reaches a bundle.
 *
 * The messages never contain the key or its decoded claims.
 */
export function assertPublicSupabaseKey(rawKey: string | undefined | null): void {
  const key = (rawKey ?? "").trim();
  if (!key) return; // nothing to leak; a missing key is reported where it is needed

  if (/^(sb_secret_|sbp_)/i.test(key)) {
    throw new Error("A private Supabase credential cannot be used in the browser — use the public (anon / publishable) key.");
  }

  const role = jwtRole(key);
  if (role !== undefined && role !== "anon") {
    throw new Error("Only the public (anon) Supabase key may be used in the browser — this one carries another role.");
  }
}

/** The `role` claim of a JWT, or undefined when the value is not a decodable JWT (a stub, a publishable key, …). */
function jwtRole(token: string): unknown {
  const payload = token.split(".")[1];
  if (!payload) return undefined;
  try {
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    return (JSON.parse(atob(padded)) as { role?: unknown }).role;
  } catch {
    return undefined;
  }
}
