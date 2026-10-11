// A signed-in staff member for the tests of /manager, /stats and /consulente: a session that
// already passed the password AND the TOTP step (an `aal2` token), stored where the app's Supabase
// client looks for it, plus the role the backend reports for it. Nothing here comes from production.
import type { Page } from "@playwright/test";
import type { MockBackend, Row } from "./mock-backend";

const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString("base64url");
const jwt = (payload: unknown) => `${b64({ alg: "HS256", typ: "JWT" })}.${b64(payload)}.c2FtcGxl`;

export type StaffRole = "manager" | "consulente_responsabile" | "consulente";

export function staffSession(email = "manager@example.com") {
  const now = Date.now();
  const iat = Math.floor(now / 1000) - 60;
  const exp = iat + 24 * 3600;
  const user = {
    id: "11111111-1111-4111-8111-111111111111", aud: "authenticated", role: "authenticated", email,
    app_metadata: { provider: "email" }, user_metadata: {}, created_at: new Date(now - 90 * 86_400_000).toISOString(),
    factors: [{ id: "22222222-2222-4222-8222-222222222222", friendly_name: "Authenticator", factor_type: "totp", status: "verified",
      created_at: new Date(now - 80 * 86_400_000).toISOString(), updated_at: new Date(now - 80 * 86_400_000).toISOString() }],
  };
  const access_token = jwt({
    aud: "authenticated", exp, iat, sub: user.id, email, role: "authenticated", aal: "aal2",
    amr: [{ method: "password", timestamp: iat }, { method: "totp", timestamp: iat }], session_id: "33333333-3333-4333-8333-333333333333",
  });
  return { access_token, token_type: "bearer", expires_in: 24 * 3600, expires_at: exp, refresh_token: "sample-refresh-token", user };
}

/** Sign the page in as `role` (placeholder.supabase.co → the client's storage key is sb-placeholder-auth-token). */
export async function signInAs(page: Page, backend: MockBackend, role: StaffRole = "manager", storeId: string | null = null) {
  await page.context().addInitScript((session) => {
    try { sessionStorage.setItem("sb-placeholder-auth-token", JSON.stringify(session)); } catch { /* storage unavailable */ }
  }, staffSession());
  const store = role === "manager" ? null : storeId;
  backend.rpc.set("get_my_store_role", () => [{ role, store_id: store }]);
  // /consulente reads its own row of store_roles directly (RLS: "roles_self_read")
  backend.tables.store_roles = [{ id: "44444444-4444-4444-8444-444444444444", user_id: "11111111-1111-4111-8111-111111111111", role, store_id: store }];
}

/** n fictional leads, newest first, spread over `days` days and two stores. Ids/e-mails are unique. */
export function sampleSessions(n: number, { days = 20, products = ["aurae-pulse-pro", "brevia-gopress"], now = Date.now() } = {}): Row[] {
  return Array.from({ length: n }, (_, i) => {
    const created = new Date(now - (i / n) * days * 86_400_000 - 60_000);
    const old = now - created.getTime() > 5 * 60_000;
    const kind = i % 10; // 0-6 sent, 7 sent + redeemed, 8 no e-mail (code but not sent), 9 failed (no code)
    return {
      id: `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`,
      email: `lead${i}@example.com`,
      nome: i % 97 === 0 ? null : `Name${i}`,
      cognome: i % 89 === 0 ? null : `Surname${i}`,
      matched_product_id: products[i % products.length],
      product_name: i % 3 === 0 ? `Snapshot name ${i % products.length}` : null,
      match_percent: 45 + (i % 54),
      email_sent: old ? kind < 8 : false,
      discount_code: old ? (kind < 9 ? `SUP-${String(i).padStart(8, "0").toUpperCase()}10` : null) : null,
      created_at: created.toISOString(),
      store_id: i % 2 === 0 ? "milano" : "lisboa",
      code_redeemed: old && kind === 7,
      code_redeemed_at: old && kind === 7 ? created.toISOString() : null,
    };
  });
}
