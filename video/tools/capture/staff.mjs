// Shared by the staff-screen captures (admin.mjs: /manager + /stats, consult.mjs: /consulente): the CORS headers of the Supabase stand-in
// and an injected, already MFA-verified (aal2) session, so the app's real login / TOTP gates are passed without being touched.
// Nothing here comes from production: the user is "manager@example.com".
const NOW = Date.now();
export const CORS = { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*", "access-control-expose-headers": "content-range" };
const jwt = (payload) => {
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
  return `${b64({ alg: "HS256", typ: "JWT" })}.${b64(payload)}.c2FtcGxl`;
};
export function staffSession(email = "manager@example.com") {
  const exp = Math.floor(NOW / 1000) + 24 * 3600;
  const iat = Math.floor(NOW / 1000) - 60;
  const user = {
    id: "11111111-1111-4111-8111-111111111111", aud: "authenticated", role: "authenticated", email,
    app_metadata: { provider: "email" }, user_metadata: {}, created_at: new Date(NOW - 90 * 86400_000).toISOString(),
    factors: [{ id: "22222222-2222-4222-8222-222222222222", friendly_name: "Authenticator", factor_type: "totp", status: "verified", created_at: new Date(NOW - 80 * 86400_000).toISOString(), updated_at: new Date(NOW - 80 * 86400_000).toISOString() }],
  };
  const access_token = jwt({ aud: "authenticated", exp, iat, sub: user.id, email: user.email, role: "authenticated", aal: "aal2", amr: [{ method: "password", timestamp: iat }, { method: "totp", timestamp: iat }], session_id: "33333333-3333-4333-8333-333333333333" });
  return { access_token, token_type: "bearer", expires_in: 24 * 3600, expires_at: exp, refresh_token: "sample-refresh-token", user };
}

export const respond = (route, body, extra = {}) => route.fulfill({ status: 200, headers: { ...CORS, "content-type": "application/json", ...extra }, body: JSON.stringify(body) });

