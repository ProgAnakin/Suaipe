import { describe, expect, it } from "vitest";
import { claimIdentityFor } from "@/lib/claimIdentity";

// A claim retried after a lost answer must reuse its id (the database then answers "duplicate" and the kiosk
// calls it done) — but a claim for a corrected address is a different claim: reusing the old id would store
// the lead for the FIRST address and tell the customer it went to the second.

let n = 0;
const ids = () => `id-${++n}`;

describe("claimIdentityFor", () => {
  it("mints an identity for the first attempt", () => {
    n = 0;
    expect(claimIdentityFor(null, "ana@example.com", ids)).toEqual({ id: "id-1", email: "ana@example.com" });
  });

  it("a retry for the same address keeps the id", () => {
    n = 0;
    const first = claimIdentityFor(null, "ana@example.com", ids);
    const retry = claimIdentityFor(first, "ana@example.com", ids);
    expect(retry).toBe(first);
    expect(n).toBe(1); // no second id was minted
  });

  it("an address that differs only in case or spaces is the same address", () => {
    n = 0;
    const first = claimIdentityFor(null, "ana@example.com", ids);
    expect(claimIdentityFor(first, "  Ana@Example.COM ", ids)).toBe(first);
  });

  it("a corrected address is a new claim with a new id", () => {
    n = 0;
    const first = claimIdentityFor(null, "ana@exmaple.com", ids);
    const corrected = claimIdentityFor(first, "ana@example.com", ids);
    expect(corrected.id).not.toBe(first.id);
    expect(corrected.email).toBe("ana@example.com");
  });

  it("correcting back to the first address mints yet another id (the earlier identity is gone)", () => {
    n = 0;
    const a = claimIdentityFor(null, "a@example.com", ids);
    const b = claimIdentityFor(a, "b@example.com", ids);
    const a2 = claimIdentityFor(b, "a@example.com", ids);
    expect(new Set([a.id, b.id, a2.id]).size).toBe(3);
  });

  it("uses crypto.randomUUID by default", () => {
    expect(claimIdentityFor(null, "x@example.com").id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });
});
