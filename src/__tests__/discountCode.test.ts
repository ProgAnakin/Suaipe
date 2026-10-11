import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  DEFAULT_DISCOUNT_PERCENT,
  MAX_DISCOUNT_PERCENT,
  clampDiscountPercent,
  escapeLike,
  genDiscountCode,
} from "../../supabase/functions/_shared/discountCode";

// Covers the discount-code generator extracted from the on-session-created Edge
// Function — previously trapped inside serve() and untested. The format is a
// contract: store consultants read the last two digits as the discount %.

describe("genDiscountCode", () => {
  it("matches the SUP-XXXXXXXX## contract", () => {
    for (const pct of [5, 10, 15]) {
      expect(genDiscountCode(pct)).toMatch(/^SUP-[0-9A-F]{8}\d{2}$/);
    }
  });

  it("encodes the discount percent in the last two digits", () => {
    expect(genDiscountCode(5).slice(-2)).toBe("05");
    expect(genDiscountCode(10).slice(-2)).toBe("10");
    expect(genDiscountCode(15).slice(-2)).toBe("15");
  });

  it("is high-entropy — no hex collisions across 5000 draws", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 5000; i++) {
      seen.add(genDiscountCode(10).slice(4, 12)); // the 8-hex random segment
    }
    expect(seen.size).toBeGreaterThan(4990);
  });
});

// The discount in an e-mailed code must be the one the STORE configured — the quiz_sessions row
// that triggers the e-mail is written by a public (anon-key) client, so its discount_percent is
// untrusted input.
describe("clampDiscountPercent", () => {
  it("passes a sane percentage through (rounded)", () => {
    expect(clampDiscountPercent(5)).toBe(5);
    expect(clampDiscountPercent(10)).toBe(10);
    expect(clampDiscountPercent("8")).toBe(8);
    expect(clampDiscountPercent(7.6)).toBe(8);
    expect(clampDiscountPercent(0)).toBe(0);
  });
  it("clamps absurd values into 0–99, so a forged 999 / -5 / 100 cannot reach the code", () => {
    expect(clampDiscountPercent(999)).toBe(MAX_DISCOUNT_PERCENT);
    expect(clampDiscountPercent(100)).toBe(MAX_DISCOUNT_PERCENT);
    expect(clampDiscountPercent(-5)).toBe(0);
    expect(clampDiscountPercent(Number.POSITIVE_INFINITY)).toBe(DEFAULT_DISCOUNT_PERCENT);
  });
  it("falls back to the default when there is no usable number", () => {
    for (const v of [undefined, null, "", "  ", "abc", Number.NaN, {}, [], [7], true, "10%"]) {
      expect(clampDiscountPercent(v)).toBe(DEFAULT_DISCOUNT_PERCENT);
    }
  });
});

describe("genDiscountCode with untrusted percentages", () => {
  it("always ends in exactly two digits", () => {
    for (const v of [0, 5, 99, 100, 999, -5, Number.NaN, 1.5]) {
      expect(genDiscountCode(v as number)).toMatch(/^SUP-[0-9A-F]{8}\d{2}$/);
    }
  });
  it("a forged 90 stays 90 only if it is within range — and 999 can no longer break the format", () => {
    expect(genDiscountCode(999).slice(-2)).toBe("99");
    expect(genDiscountCode(-5).slice(-2)).toBe("00");
  });
});

describe("escapeLike", () => {
  it("escapes the LIKE wildcards so an address is matched literally", () => {
    expect(escapeLike("a_b%c\\d@x.com")).toBe("a\\_b\\%c\\\\d@x.com");
    expect(escapeLike("plain@x.com")).toBe("plain@x.com");
  });
});

// The Edge Function deploys as one self-contained file, so it carries INLINE copies of these
// helpers. This test fails the moment the copy drifts from the tested reference.
describe("on-session-created keeps its inline copies in lockstep with _shared/discountCode.ts", () => {
  const edge = readFileSync(resolve(__dirname, "../../supabase/functions/on-session-created/index.ts"), "utf8");
  const shared = readFileSync(resolve(__dirname, "../../supabase/functions/_shared/discountCode.ts"), "utf8");
  const body = (src: string, name: string) => {
    const m = src.match(new RegExp(`(?:export )?function ${name}\\([^)]*\\)[^{]*\\{[\\s\\S]*?\\n\\}`));
    expect(m, `${name} not found`).not.toBeNull();
    return m![0].replace(/^export /, "").replace(/\s+/g, " ");
  };
  for (const fn of ["genDiscountCode", "clampDiscountPercent", "escapeLike"]) {
    it(`${fn} is identical`, () => {
      expect(body(edge, fn)).toBe(body(shared, fn));
    });
  }
  it("uses the same limits", () => {
    expect(edge).toContain(`const DEFAULT_DISCOUNT_PERCENT = ${DEFAULT_DISCOUNT_PERCENT};`);
    expect(edge).toContain(`const MAX_DISCOUNT_PERCENT = ${MAX_DISCOUNT_PERCENT};`);
  });
  it("never trusts the discount the browser sent", () => {
    expect(edge).not.toMatch(/Number\(record\.discount_percent/);
  });
});
