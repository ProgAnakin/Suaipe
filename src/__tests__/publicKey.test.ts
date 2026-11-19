import { describe, it, expect } from "vitest";
import { assertPublicSupabaseKey } from "@/lib/publicKey";

// A wrong paste in the hosting dashboard (the service-role key instead of the anon key) would ship a key that
// bypasses every Row Level Security policy to every browser. The guard runs at start-up and at build time.

const b64url = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const jwt = (claims: object) => `${b64url({ alg: "HS256", typ: "JWT" })}.${b64url(claims)}.c2lnbmF0dXJl`;

describe("assertPublicSupabaseKey", () => {
  it("accepts the legacy anon key", () => {
    expect(() => assertPublicSupabaseKey(jwt({ iss: "supabase", ref: "abc", role: "anon", exp: 2_000_000_000 }))).not.toThrow();
  });

  it("accepts a new-style publishable key", () => {
    expect(() => assertPublicSupabaseKey("sb_publishable_AbCdEf123456")).not.toThrow();
  });

  it("accepts the stub the browser suites and the documentation screenshots build with", () => {
    expect(() => assertPublicSupabaseKey("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder")).not.toThrow();
  });

  it("accepts a key that is not a JWT at all, and an empty one (reported elsewhere)", () => {
    expect(() => assertPublicSupabaseKey("demo-public-key")).not.toThrow();
    expect(() => assertPublicSupabaseKey("")).not.toThrow();
    expect(() => assertPublicSupabaseKey(undefined)).not.toThrow();
  });

  it("rejects the service-role key", () => {
    expect(() => assertPublicSupabaseKey(jwt({ iss: "supabase", ref: "abc", role: "service_role" }))).toThrow(/public/i);
  });

  it("rejects any other role — an authenticated user's token is not the public key either", () => {
    expect(() => assertPublicSupabaseKey(jwt({ role: "authenticated" }))).toThrow();
    expect(() => assertPublicSupabaseKey(jwt({ role: "supabase_admin" }))).toThrow();
  });

  it("rejects a secret key and a personal access token", () => {
    expect(() => assertPublicSupabaseKey(["sb", "secret", "AbCdEf123456"].join("_"))).toThrow(/private/i);
    expect(() => assertPublicSupabaseKey(["sbp", "0123456789abcdef0123456789abcdef01234567"].join("_"))).toThrow(/private/i);
    expect(() => assertPublicSupabaseKey(["SB", "SECRET", "AbCdEf123456"].join("_"))).toThrow(/private/i);
  });

  it("ignores the whitespace a copy-paste adds", () => {
    expect(() => assertPublicSupabaseKey(`  ${jwt({ role: "service_role" })}\n`)).toThrow();
    expect(() => assertPublicSupabaseKey(`\n${jwt({ role: "anon" })} `)).not.toThrow();
  });

  it("reads base64url payloads without padding (the characters - and _)", () => {
    // claims whose base64 contains + and / (hence - and _ in base64url) and needs padding
    const claims = { role: "service_role", note: "???>>>~~~" };
    const token = jwt(claims);
    expect(token.split(".")[1]).toMatch(/[-_]/);
    expect(() => assertPublicSupabaseKey(token)).toThrow();
  });

  it("never puts the key, or a piece of it, in the message", () => {
    const secret = jwt({ role: "service_role", ref: "very-private-project-ref" });
    for (const key of [secret, ["sb", "secret", "TopSecretValue987"].join("_"), ["sbp", "TopSecretValue987"].join("_")]) {
      let message = "";
      try { assertPublicSupabaseKey(key); } catch (e) { message = (e as Error).message; }
      expect(message).not.toBe("");
      expect(message).not.toContain("TopSecretValue987");
      expect(message).not.toContain("very-private-project-ref");
      expect(message).not.toContain(secret.split(".")[1]);
    }
  });
});
